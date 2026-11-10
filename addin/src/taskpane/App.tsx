import { Button } from "@eylulg/ui/button";
import { AppShell } from "@eylulg/ui/chrome";
import { Switch } from "@eylulg/ui/switch";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { analyzeDocument, LONG_SENTENCE_WORDS } from "@/analysis/analyze";
import type { DocumentAnalysis, Issue } from "@/analysis/types";
import type { RewriteClient } from "@/api/rewrite-client";
import { useGateway } from "@/office/gateway-context";
import type { SentenceRef } from "@/office/types";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { IssueList } from "./IssueList";
import { RewritePanel } from "./RewritePanel";
import { ScoreCard } from "./ScoreCard";
import { useSettings } from "./settings";
import { SettingsPanel } from "./SettingsPanel";

const HIGHLIGHT_COLOR = "Yellow";
const READ_ERROR = "Could not read the document. Select Analyse to try again.";

function analysisStatus(result: DocumentAnalysis): string {
  return `Analysed ${result.stats.words} words. Found ${result.issues.length} issues.`;
}

export function App({ client }: { client: RewriteClient }) {
  const gateway = useGateway();
  const [settings, updateSettings] = useSettings();
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(false);
  const [busy, setBusy] = useState(true);
  /** What is highlighted in Word right now, so it can be cleared after a re-analysis. */
  const highlightedRefs = useRef<SentenceRef[]>([]);
  /** Each Word call bumps this; a result is only shown if no newer call started. */
  const latestCall = useRef(0);

  const longSentences: SentenceRef[] =
    analysis?.issues
      .filter((i) => i.type === "long-sentence")
      .map((i) => ({ paragraphIndex: i.paragraphIndex, text: i.sentence })) ?? [];

  useEffect(() => {
    let active = true;
    gateway
      .readParagraphs()
      .then((paragraphs) => {
        if (!active) return;
        const result = analyzeDocument(paragraphs);
        setAnalysis(result);
        setStatus(analysisStatus(result));
      })
      .catch(() => {
        if (active) setError(READ_ERROR);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [gateway]);

  async function handleAnalyse() {
    const call = ++latestCall.current;
    setBusy(true);
    setError(null);
    try {
      const result = analyzeDocument(await gateway.readParagraphs());
      if (call !== latestCall.current) return;
      setAnalysis(result);
      setStatus(analysisStatus(result));
    } catch {
      if (call === latestCall.current) setError(READ_ERROR);
    } finally {
      if (call === latestCall.current) setBusy(false);
    }
  }

  async function handleSelectIssue(issue: Issue) {
    const call = ++latestCall.current;
    setError(null);
    try {
      const found = await gateway.selectSentence({
        paragraphIndex: issue.paragraphIndex,
        text: issue.sentence,
      });
      if (call !== latestCall.current) return;
      if (found) setStatus("Sentence selected in the document.");
      else setError("Could not find that sentence. The document may have changed, so analyse it again.");
    } catch {
      if (call === latestCall.current) setError("Could not select that sentence. Try again.");
    }
  }

  async function handleHighlightChange(on: boolean) {
    const call = ++latestCall.current;
    const refs = on ? longSentences : highlightedRefs.current;
    setError(null);
    try {
      const count = await gateway.highlightSentences(refs, on ? HIGHLIGHT_COLOR : null);
      highlightedRefs.current = on ? refs : [];
      if (call !== latestCall.current) return;
      setHighlighted(on);
      setStatus(
        on ? `Highlighted ${count} long ${count === 1 ? "sentence" : "sentences"}.` : "Highlights removed.",
      );
    } catch {
      if (call === latestCall.current) setError("Could not change the highlights. Try again.");
    }
  }

  return (
    <AppShell header={<AppHeader isPreview={gateway.kind === "preview"} />} footer={<AppFooter />}>
      <div className="flex flex-col gap-4">
        <Button
          size="sm"
          variant="secondary"
          iconLeading={RefreshCw}
          isLoading={busy}
          onPress={handleAnalyse}
        >
          Analyse
        </Button>

        <p role="status" className="sr-only">
          {status}
        </p>
        {error && (
          <p role="alert" className="rounded-lg bg-error-subtle p-3 text-sm text-error">
            {error}
          </p>
        )}

        {analysis && (
          <>
            <ScoreCard analysis={analysis} targetGrade={settings.targetGrade} />
            <Switch
              size="sm"
              hint={`${longSentences.length} over ${LONG_SENTENCE_WORDS} words`}
              isSelected={highlighted}
              isDisabled={!highlighted && longSentences.length === 0}
              onChange={handleHighlightChange}
            >
              Highlight long sentences
            </Switch>
            <RewritePanel client={client} settings={settings} onInserted={handleAnalyse} />
            <IssueList paragraphs={analysis.paragraphs} onSelect={handleSelectIssue} />
          </>
        )}

        <SettingsPanel settings={settings} onChange={updateSettings} />
      </div>
    </AppShell>
  );
}
