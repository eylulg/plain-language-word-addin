import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { RewriteError } from "@/api/rewrite-client";
import { GatewayProvider, ParagraphChangedError, type WordGateway } from "@/office";
import { createFakeClient, createFakeGateway, LONG_PARAGRAPH, REWRITE } from "../../test/fakes";
import { App } from "./App";

function renderApp(gateway: WordGateway = createFakeGateway(), client = createFakeClient()) {
  const user = userEvent.setup();
  const view = render(
    <GatewayProvider gateway={gateway}>
      <App client={client} />
    </GatewayProvider>,
  );
  return { user, gateway, client, ...view };
}

beforeEach(() => {
  localStorage.clear();
});

describe("App", () => {
  it("analyses the document on load and shows the score card", async () => {
    renderApp();
    const score = await screen.findByRole("region", { name: "Document score" });
    expect(within(score).getByText("grade level")).toBeInTheDocument();
    expect(within(score).getByText(/above grade 8/)).toBeInTheDocument();
    expect(within(score).getByText("Long sentence: 1")).toBeInTheDocument();
  });

  it("groups issues by paragraph with counts", async () => {
    renderApp();
    const group = await screen.findByRole("region", { name: "Paragraph 2" });
    expect(within(group).getByText(/1 long sentence/)).toBeInTheDocument();
    expect(within(group).getByText(/jargon/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Paragraph 1" })).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderApp();
    await screen.findByRole("region", { name: "Document score" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("selects the sentence in Word when an issue is clicked", async () => {
    const { user, gateway } = renderApp();
    const group = await screen.findByRole("region", { name: "Paragraph 2" });
    await user.click(within(group).getAllByRole("button")[0]!);
    expect(gateway.selectSentence).toHaveBeenCalledWith({ paragraphIndex: 1, text: LONG_PARAGRAPH });
  });

  it("explains when the sentence can no longer be found", async () => {
    const gateway = createFakeGateway({ selectSentence: async () => false });
    const { user } = renderApp(gateway);
    const group = await screen.findByRole("region", { name: "Paragraph 2" });
    await user.click(within(group).getAllByRole("button")[0]!);
    expect(await screen.findByRole("alert")).toHaveTextContent(/analyse it again/);
  });

  it("toggles the highlight on long sentences", async () => {
    const { user, gateway } = renderApp();
    const toggle = await screen.findByRole("switch", { name: /Highlight long sentences/ });
    await user.click(toggle);
    expect(gateway.highlightSentences).toHaveBeenLastCalledWith(
      [{ paragraphIndex: 1, text: LONG_PARAGRAPH }],
      "Yellow",
    );
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(gateway.highlightSentences).toHaveBeenLastCalledWith(
      [{ paragraphIndex: 1, text: LONG_PARAGRAPH }],
      null,
    );
    expect(toggle).not.toBeChecked();
  });

  it("rewrites the selected paragraph, shows a diff and inserts it as a tracked change", async () => {
    const { user, gateway, client, container } = renderApp();
    await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));

    expect(client.rewrite).toHaveBeenCalledWith({
      text: LONG_PARAGRAPH,
      targetGrade: 8,
      tone: "neutral",
      protectedTerms: [],
    });
    const diff = await screen.findByTestId("diff");
    expect(diff.querySelector("ins")).not.toBeNull();
    expect(diff.querySelector("del")).not.toBeNull();
    expect(screen.getByText(REWRITE.changes[0]!)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Insert as tracked change" }));
    expect(gateway.replaceParagraphAsTrackedChange).toHaveBeenCalledWith(
      { index: 1, text: LONG_PARAGRAPH },
      REWRITE.rewrite,
    );
    expect(await screen.findByText(/Inserted as a tracked change/)).toBeInTheDocument();
    await waitFor(() => expect(gateway.readParagraphs).toHaveBeenCalledTimes(2));
  });

  it("sends the settings with the rewrite request", async () => {
    const { user, client } = renderApp();
    await screen.findByRole("region", { name: "Document score" });
    await user.click(screen.getByText("Settings"));
    await user.selectOptions(screen.getByLabelText(/^Target grade level/), "6");
    await user.selectOptions(screen.getByLabelText(/^Tone/), "friendly");
    await user.selectOptions(screen.getByLabelText(/^Model/), "claude-haiku-5-5");
    await user.type(screen.getByLabelText(/^Protected terms/), "Landlord{enter}Schedule 2");

    await user.click(screen.getByRole("button", { name: "Rewrite in plain language" }));
    expect(client.rewrite).toHaveBeenCalledWith({
      text: LONG_PARAGRAPH,
      targetGrade: 6,
      tone: "friendly",
      model: "claude-haiku-5-5",
      protectedTerms: ["Landlord", "Schedule 2"],
    });
    expect(screen.getByRole("region", { name: "Document score" })).toHaveTextContent(/above grade 6/);
  });

  it("asks for a cursor position when nothing is selected", async () => {
    const { user, client } = renderApp(createFakeGateway({ getSelectedParagraph: async () => null }));
    await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Put the cursor in the paragraph/);
    expect(client.rewrite).not.toHaveBeenCalled();
  });

  it("shows server errors", async () => {
    const client = createFakeClient();
    client.rewrite.mockRejectedValueOnce(new RewriteError("Too many rewrites in a short time.", 429));
    const { user } = renderApp(createFakeGateway(), client);
    await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many rewrites in a short time.");
  });

  it("keeps the proposal and explains when the paragraph changed before inserting", async () => {
    const gateway = createFakeGateway({
      replaceParagraphAsTrackedChange: async () => {
        throw new ParagraphChangedError();
      },
    });
    const { user } = renderApp(gateway);
    await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));
    await user.click(await screen.findByRole("button", { name: "Insert as tracked change" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/paragraph changed/);
    expect(screen.getByTestId("diff")).toBeInTheDocument();
  });

  it("disables the insert when Word cannot track changes", async () => {
    const { user } = renderApp(createFakeGateway({ supportsTrackedChanges: () => false }));
    await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));
    expect(await screen.findByRole("button", { name: "Insert as tracked change" })).toBeDisabled();
    expect(screen.getByText(/cannot insert tracked changes/)).toBeInTheDocument();
  });

  it("labels demo rewrites", async () => {
    const { user } = renderApp(createFakeGateway(), createFakeClient({ ...REWRITE, demo: true }));
    await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));
    expect(await screen.findByText("Demo mode")).toBeInTheDocument();
  });
});
