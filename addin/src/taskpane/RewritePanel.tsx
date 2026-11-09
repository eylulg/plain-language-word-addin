import { Edit05 } from "@untitledui/icons";
import { useEffect, useRef, useState } from "react";
import { RewriteError, type RewriteClient, type RewriteResult } from "@/api/rewrite-client";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { useGateway } from "@/office/gateway-context";
import type { SelectedParagraph } from "@/office/types";
import { DiffView } from "./DiffView";
import { parseProtectedTerms, type Settings } from "./settings";
import { CARD } from "./styles";

interface RewritePanelProps {
  client: RewriteClient;
  settings: Settings;
  /** Called after a rewrite has been inserted, so the score can refresh. */
  onInserted: () => void;
}

type State =
  | { step: "idle" | "loading" | "done" }
  | { step: "proposal" | "inserting"; paragraph: SelectedParagraph; result: RewriteResult };

export function RewritePanel({ client, settings, onInserted }: RewritePanelProps) {
  const gateway = useGateway();
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const rewriteButtonRef = useRef<HTMLButtonElement>(null);

  const canTrack = gateway.supportsTrackedChanges();
  const proposal = state.step === "proposal" || state.step === "inserting" ? state : null;

  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleRewrite() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setError(null);
    setState({ step: "loading" });

    try {
      const paragraph = await gateway.getSelectedParagraph();
      if (controller.signal.aborted) return;
      if (!paragraph) {
        setError("Put the cursor in the paragraph you want to rewrite, then try again.");
        setState({ step: "idle" });
        return;
      }
      const result = await client.rewrite(
        {
          text: paragraph.text,
          targetGrade: settings.targetGrade,
          tone: settings.tone,
          protectedTerms: parseProtectedTerms(settings.protectedTerms),
          ...(settings.model ? { model: settings.model } : {}),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setState({ step: "proposal", paragraph, result });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof RewriteError ? e.message : "Something went wrong while rewriting. Try again.");
      setState({ step: "idle" });
    }
  }

  async function handleInsert() {
    if (state.step !== "proposal") return;
    const controller = new AbortController();
    requestRef.current = controller;
    setError(null);
    setState({ ...state, step: "inserting" });

    try {
      await gateway.replaceParagraphAsTrackedChange(state.paragraph, state.result.rewrite);
      if (controller.signal.aborted) return;
      setState({ step: "done" });
      rewriteButtonRef.current?.focus();
      onInserted();
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Could not insert the rewrite. Try again.");
      setState(state);
    }
  }

  function handleDiscard() {
    requestRef.current?.abort();
    setState({ step: "idle" });
    rewriteButtonRef.current?.focus();
  }

  return (
    <section aria-labelledby="rewrite-heading" className={`${CARD} p-4`}>
      <h2 id="rewrite-heading" className="text-sm font-semibold text-secondary">
        Rewrite
      </h2>
      <p className="mt-1 text-sm text-tertiary">
        Only the paragraph with your cursor is sent to the rewrite server.
      </p>
      <Button
        ref={rewriteButtonRef}
        className="mt-3 w-full"
        size="sm"
        iconLeading={Edit05}
        isLoading={state.step === "loading"}
        showTextWhileLoading
        onClick={handleRewrite}
      >
        Rewrite in plain language
      </Button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error-primary">
          {error}
        </p>
      )}

      <p role="status" className="mt-3 text-sm text-success-primary empty:hidden">
        {state.step === "proposal" && "Rewrite ready. Review the changes below."}
        {state.step === "done" && "Inserted as a tracked change. Accept or reject it in the Review tab."}
      </p>

      {proposal && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-primary">Proposed rewrite</h3>
            {proposal.result.demo && (
              <Badge type="pill-color" color="warning" size="sm">
                Demo mode
              </Badge>
            )}
          </div>
          <DiffView before={proposal.paragraph.text} after={proposal.result.rewrite} />
          {proposal.result.changes.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-secondary">What changed</h4>
              <ul className="list-disc pl-5 text-sm text-secondary">
                {proposal.result.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </>
          )}
          {proposal.result.warnings.length > 0 && (
            <ul aria-label="Warnings" className="text-sm text-warning-primary">
              {proposal.result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              isDisabled={!canTrack}
              isLoading={state.step === "inserting"}
              showTextWhileLoading
              onClick={handleInsert}
            >
              Insert as tracked change
            </Button>
            <Button size="sm" color="secondary" onClick={handleDiscard}>
              Discard rewrite
            </Button>
          </div>
          {!canTrack && (
            <p className="text-xs text-tertiary">
              This version of Word cannot insert tracked changes from add-ins. Copy the text instead.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
