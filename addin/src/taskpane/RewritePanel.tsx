import { useState } from "react";
import { Edit05 } from "@untitledui/icons";
import { RewriteError, type RewriteClient, type RewriteResult } from "@/api/rewrite-client";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { useGateway, type SelectedParagraph } from "@/office";
import { DiffView } from "./DiffView";
import { parseProtectedTerms, type Settings } from "./settings";

interface RewritePanelProps {
  client: RewriteClient;
  settings: Settings;
  /** Called after a rewrite has been inserted, so the score can refresh. */
  onInserted: () => void;
}

type State =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "proposal"; paragraph: SelectedParagraph; result: RewriteResult }
  | { step: "inserting"; paragraph: SelectedParagraph; result: RewriteResult }
  | { step: "done" };

export function RewritePanel({ client, settings, onInserted }: RewritePanelProps) {
  const gateway = useGateway();
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const canTrack = gateway.supportsTrackedChanges();

  async function requestRewrite() {
    setError(null);
    setState({ step: "loading" });
    try {
      const paragraph = await gateway.getSelectedParagraph();
      if (!paragraph) {
        setError("Put the cursor in the paragraph you want to rewrite, then try again.");
        setState({ step: "idle" });
        return;
      }
      const result = await client.rewrite({
        text: paragraph.text,
        targetGrade: settings.targetGrade,
        tone: settings.tone,
        protectedTerms: parseProtectedTerms(settings.protectedTerms),
        ...(settings.model ? { model: settings.model } : {}),
      });
      setState({ step: "proposal", paragraph, result });
    } catch (e) {
      setError(e instanceof RewriteError ? e.message : "Something went wrong while rewriting.");
      setState({ step: "idle" });
    }
  }

  async function insert() {
    if (state.step !== "proposal") return;
    setError(null);
    setState({ ...state, step: "inserting" });
    try {
      await gateway.replaceParagraphAsTrackedChange(state.paragraph, state.result.rewrite);
      setState({ step: "done" });
      onInserted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Word could not insert the rewrite.");
      setState({ ...state, step: "proposal" });
    }
  }

  const proposal = state.step === "proposal" || state.step === "inserting" ? state : null;

  return (
    <section
      aria-labelledby="rewrite-heading"
      className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary"
    >
      <h2 id="rewrite-heading" className="text-sm font-semibold text-secondary">
        Rewrite
      </h2>
      <p className="mt-1 text-sm text-tertiary">
        Only the paragraph with your cursor is sent to the rewrite server.
      </p>
      <Button
        className="mt-3 w-full"
        size="sm"
        iconLeading={Edit05}
        isLoading={state.step === "loading"}
        showTextWhileLoading
        onClick={requestRewrite}
      >
        Rewrite in plain language
      </Button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error-primary">
          {error}
        </p>
      )}

      <div role="status" className="mt-3 text-sm text-success-primary empty:hidden">
        {state.step === "done" ? "Inserted as a tracked change. Accept or reject it in the Review tab." : ""}
      </div>

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
              onClick={insert}
            >
              Insert as tracked change
            </Button>
            <Button size="sm" color="secondary" onClick={() => setState({ step: "idle" })}>
              Discard
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
