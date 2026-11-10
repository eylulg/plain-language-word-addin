import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { GatewayProvider } from "@/office/GatewayProvider";
import { ParagraphChangedError } from "@/office/types";
import {
  createFakeGateway,
  createStubbedClient,
  LONG_PARAGRAPH,
  REWRITE,
  sentBody,
} from "@/test-utils/fakes";
import { App } from "../App";

function renderApp(
  gateway: ReturnType<typeof createFakeGateway> = createFakeGateway(),
  respond?: () => Response,
) {
  const { client, fetchStub } = createStubbedClient(respond);
  const user = userEvent.setup();
  const view = render(
    <GatewayProvider gateway={gateway}>
      <App client={client} />
    </GatewayProvider>,
  );
  return { user, gateway, fetchStub, ...view };
}

async function requestRewrite(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Rewrite in plain language" }));
}

async function choose(user: ReturnType<typeof userEvent.setup>, field: RegExp, option: string | RegExp) {
  await user.click(screen.getByRole("button", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => {
  localStorage.clear();
});

describe("App", () => {
  it("scores the document when it opens", async () => {
    renderApp();

    const score = await screen.findByRole("region", { name: "Document score" });

    expect(within(score).getByText(/above grade 8/)).toBeInTheDocument();
    expect(within(score).getByText("Long sentence: 1")).toBeInTheDocument();
  });

  it("lists issues under the paragraph they belong to, with counts", async () => {
    renderApp();

    const group = await screen.findByRole("region", { name: "Paragraph 2" });

    expect(within(group).getByText(/1 long sentence/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Paragraph 1" })).not.toBeInTheDocument();
  });

  it("selects the sentence in the document when an issue is clicked", async () => {
    const { user, gateway } = renderApp();

    await user.click(
      await screen.findByRole("button", { name: /^Long sentence in paragraph 2, sentence 1/ }),
    );

    expect(gateway.selectSentence).toHaveBeenCalledWith({ paragraphIndex: 1, text: LONG_PARAGRAPH });
  });

  it("explains when the clicked sentence is no longer in the document", async () => {
    const { user } = renderApp(createFakeGateway({ selectSentence: async () => false }));

    await user.click(await screen.findByRole("button", { name: /^Long sentence in paragraph 2/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/analyse it again/);
  });

  it("highlights long sentences and clears them again", async () => {
    const { user, gateway } = renderApp();
    const toggle = await screen.findByRole("switch", { name: /Highlight long sentences/ });
    const longSentence = [{ paragraphIndex: 1, text: LONG_PARAGRAPH }];

    await user.click(toggle);
    await user.click(toggle);

    expect(gateway.highlightSentences.mock.calls).toEqual([
      [longSentence, "Yellow"],
      [longSentence, null],
    ]);
    expect(toggle).not.toBeChecked();
  });

  it("shows the rewrite of the selected paragraph as a word diff with notes", async () => {
    const { user, container } = renderApp();

    await requestRewrite(user);

    expect(await screen.findByText("Rewrite ready. Review the changes below.")).toBeInTheDocument();
    expect(screen.getAllByRole("insertion").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("deletion").length).toBeGreaterThan(0);
    expect(screen.getByText(REWRITE.changes[0] ?? "")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sends the settings with the rewrite request", async () => {
    const { user, fetchStub } = renderApp();
    await screen.findByRole("region", { name: "Document score" });

    await user.click(screen.getByText("Settings"));
    await choose(user, /Target grade level/, "Grade 6");
    await choose(user, /Tone/, "Friendly");
    await choose(user, /Model/, /Haiku/);
    await user.type(screen.getByLabelText(/^Protected terms/), "Landlord{enter}Schedule 2");
    await requestRewrite(user);

    expect(sentBody(fetchStub)).toEqual({
      text: LONG_PARAGRAPH,
      targetGrade: 6,
      tone: "friendly",
      model: "claude-haiku-5-5",
      protectedTerms: ["Landlord", "Schedule 2"],
    });
  });

  it("inserts the rewrite as a tracked change, rescores and returns focus to the rewrite button", async () => {
    const { user, gateway } = renderApp();
    await requestRewrite(user);

    await user.click(await screen.findByRole("button", { name: "Insert as tracked change" }));

    expect(gateway.replaceParagraphAsTrackedChange).toHaveBeenCalledWith(
      { index: 1, text: LONG_PARAGRAPH },
      REWRITE.rewrite,
    );
    expect(await screen.findByText(/Inserted as a tracked change/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rewrite in plain language" })).toHaveFocus();
    await waitFor(() => expect(gateway.readParagraphs).toHaveBeenCalledTimes(2));
  });

  it("discards the rewrite and returns focus to the rewrite button", async () => {
    const { user } = renderApp();
    await requestRewrite(user);

    await user.click(await screen.findByRole("button", { name: "Discard rewrite" }));

    expect(screen.queryByRole("button", { name: "Insert as tracked change" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rewrite in plain language" })).toHaveFocus();
  });

  it.each([
    [
      "no paragraph is selected",
      { getSelectedParagraph: async () => null },
      undefined,
      /Put the cursor in the paragraph/,
    ],
    [
      "the server rate limits",
      {},
      () => Response.json({ error: "rate" }, { status: 429 }),
      /Too many rewrites in a short time/,
    ],
  ])("shows an error when %s", async (_name, overrides, respond, message) => {
    const { user } = renderApp(createFakeGateway(overrides), respond);

    await requestRewrite(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("keeps the proposal and explains when the paragraph changed before inserting", async () => {
    const replaceParagraphAsTrackedChange = async () => {
      throw new ParagraphChangedError();
    };
    const { user } = renderApp(createFakeGateway({ replaceParagraphAsTrackedChange }));
    await requestRewrite(user);

    await user.click(await screen.findByRole("button", { name: "Insert as tracked change" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/paragraph changed/);
    expect(screen.getByRole("button", { name: "Insert as tracked change" })).toBeEnabled();
  });

  it("blocks the insert when Word cannot track changes", async () => {
    const { user } = renderApp(createFakeGateway({ supportsTrackedChanges: () => false }));

    await requestRewrite(user);

    expect(await screen.findByRole("button", { name: "Insert as tracked change" })).toBeDisabled();
  });

  it("labels rewrites from the demo server", async () => {
    const { user } = renderApp(createFakeGateway(), () => Response.json({ ...REWRITE, demo: true }));

    await requestRewrite(user);

    expect(await screen.findByText("Demo mode")).toBeInTheDocument();
  });
});
