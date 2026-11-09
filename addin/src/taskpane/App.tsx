import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw01 } from "@untitledui/icons";
import { analyzeDocument, type DocumentAnalysis, type Issue } from "@/analysis";
import type { RewriteClient } from "@/api/rewrite-client";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { useGateway, type SentenceRef } from "@/office";
import { IssueList } from "./IssueList";
import { RewritePanel } from "./RewritePanel";
import { ScoreCard } from "./ScoreCard";
import { SettingsPanel } from "./SettingsPanel";
import { useSettings } from "./settings";

export const HIGHLIGHT_COLOR = "Yellow";

export function App({ client }: { client: RewriteClient }) {
  const gateway = useGateway();
  const [settings, updateSettings] = useSettings();
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(false);
  const [busy, setBusy] = useState(true);
  /** The sentences currently highlighted, so they can be cleared even after a re-analysis. */
  const highlightedRefs = useRef<SentenceRef[]>([]);

  const longSentences = useMemo<SentenceRef[]>(
    () =>
      analysis?.issues
        .filter((i) => i.type === "long-sentence")
        .map((i) => ({ paragraphIndex: i.paragraphIndex, text: i.sentence })) ?? [],
    [analysis],
  );

  const showAnalysis = useCallback((paragraphs: string[]) => {
    const result = analyzeDocument(paragraphs);
    setAnalysis(result);
    setStatus(`Analysed ${result.stats.words} words. Found ${result.issues.length} issues.`);
  }, []);

  const analyse = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      showAnalysis(await gateway.readParagraphs());
    } catch {
      setError("Could not read the document.");
    } finally {
      setBusy(false);
    }
  }, [gateway, showAnalysis]);

  // First analysis on open. State is only set once Word answers.
  useEffect(() => {
    let active = true;
    gateway
      .readParagraphs()
      .then(
        (paragraphs) => active && showAnalysis(paragraphs),
        () => active && setError("Could not read the document."),
      )
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [gateway, showAnalysis]);

  async function selectIssue(issue: Issue) {
    setError(null);
    try {
      const found = await gateway.selectSentence({
        paragraphIndex: issue.paragraphIndex,
        text: issue.sentence,
      });
      setStatus(found ? "Sentence selected in the document." : "");
      if (!found)
        setError("Could not find that sentence. The document may have changed, so analyse it again.");
    } catch {
      setError("Word could not select that sentence.");
    }
  }

  async function toggleHighlight(on: boolean) {
    setError(null);
    try {
      if (on) {
        const count = await gateway.highlightSentences(longSentences, HIGHLIGHT_COLOR);
        highlightedRefs.current = longSentences;
        setStatus(`Highlighted ${count} long ${count === 1 ? "sentence" : "sentences"}.`);
      } else {
        await gateway.highlightSentences(highlightedRefs.current, null);
        highlightedRefs.current = [];
        setStatus("Highlights removed.");
      }
      setHighlighted(on);
    } catch {
      setError("Word could not change the highlights.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-secondary p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-primary">Plain Language</h1>
          {gateway.kind === "preview" && (
            <p className="text-xs text-tertiary">Browser preview with a sample document</p>
          )}
        </div>
        <Button size="sm" color="secondary" iconLeading={RefreshCw01} isLoading={busy} onClick={analyse}>
          Analyse
        </Button>
      </header>

      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">
          {error}
        </p>
      )}

      {analysis && (
        <>
          <ScoreCard analysis={analysis} targetGrade={settings.targetGrade} />
          <Toggle
            size="sm"
            label="Highlight long sentences"
            hint={`${longSentences.length} over 25 words`}
            isSelected={highlighted}
            isDisabled={!highlighted && longSentences.length === 0}
            onChange={toggleHighlight}
          />
          <RewritePanel client={client} settings={settings} onInserted={analyse} />
          <IssueList paragraphs={analysis.paragraphs} onSelect={selectIssue} />
        </>
      )}

      <SettingsPanel settings={settings} onChange={updateSettings} />
    </main>
  );
}
