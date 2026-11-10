import { Badge } from "@eylulg/ui/badge";
import { Button } from "@eylulg/ui/button";
import { Card, CardBody, CardHeader } from "@eylulg/ui/card";
import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RewriteError, type RewriteClient, type RewriteResult } from "@/api/rewrite-client";
import { useGateway } from "@/office/gateway-context";
import type { SelectedParagraph } from "@/office/types";
import { DiffView } from "./DiffView";
import { parseProtectedTerms, type Settings } from "./settings";

interface RewritePanelProps {
  client: RewriteClient;
  settings: Settings;
  /** Called after a rewrite has been inserted, so the score can refresh. */
  onInserted: () => void;
}

type State =
  | { step: "idle" | "loading" | "done" }
  | { step: "proposal" | "inserting"; paragraph: SelectedParagraph; result: RewriteResult };

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

export function RewritePanel({ client, settings, onInserted }: RewritePanelProps) {
  const gateway = useGateway();
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const rewriteActionRef = useRef<HTMLButtonElement>(null);

  const canTrack = gateway.supportsTrackedChanges();
  const proposal = state.step === "proposal" || state.step === "inserting" ? state : null;

  const unchanged =
    proposal !== null && normalise(proposal.result.rewrite) === normalise(proposal.paragraph.text);

  useEffect(() => () => requestRef.current?.abort(), []);

  function focusRewriteButton() {
    rewriteActionRef.current?.focus();
  }

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
      focusRewriteButton();
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
    focusRewriteButton();
  }

  return (
    <Card role="region" aria-label="Rewrite">
      <CardHeader title="Rewrite" headingLevel={2} />
      <CardBody className="flex flex-col gap-3">
        <p className="text-tertiary">Only the paragraph with your cursor is sent to the rewrite server.</p>
        <Button
          ref={rewriteActionRef}
          className="w-full"
          size="sm"
          iconLeading={Pencil}
          isLoading={state.step === "loading"}
          onPress={handleRewrite}
        >
          Rewrite in plain language
        </Button>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <p role="status" className="text-sm text-success empty:hidden">
          {state.step === "proposal" &&
            (unchanged ? "Already plain, nothing to change." : "Rewrite ready. Review the changes below.")}
          {state.step === "done" && "Inserted as a tracked change. Accept or reject it in the Review tab."}
        </p>

        {proposal && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-primary">
                {unchanged ? "Rewrite result" : "Proposed rewrite"}
              </h3>
              {proposal.result.demo && (
                <Badge color="warning" size="sm">
                  Demo mode
                </Badge>
              )}
            </div>
            {!unchanged && <DiffView before={proposal.paragraph.text} after={proposal.result.rewrite} />}
            {!unchanged && proposal.result.changes.length > 0 && (
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
              <ul aria-label="Warnings" className="text-sm text-warning">
                {proposal.result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="flex-1"
                isDisabled={!canTrack || unchanged}
                isLoading={state.step === "inserting"}
                onPress={handleInsert}
              >
                Insert as tracked change
              </Button>
              <Button size="sm" variant="secondary" onPress={handleDiscard}>
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
      </CardBody>
    </Card>
  );
}
