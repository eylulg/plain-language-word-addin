# Plain Language for Word

A Microsoft Word add-in that scores how readable a document is, points to the sentences that make it hard, and rewrites a paragraph in plain language with Claude. The rewrite goes into the document as a tracked change, so the author stays in control: accept it, reject it, or edit it like any other suggestion.

![Task pane screenshot](docs/screenshots/taskpane.png)

_Screenshot placeholder: add `docs/screenshots/taskpane.png` after recording the demo (see [docs/demo.md](docs/demo.md))._

## What it does

- **Document score.** Flesch-Kincaid grade, Flesch Reading Ease, words per sentence and a readability label, compared with the target grade you choose.
- **Issues by paragraph.** Long sentences (over 25 words), passive voice, nominalisations ("make payment" instead of "pay"), jargon and filler words, grouped by paragraph with counts by type.
- **Jump to the problem.** Click an issue and the sentence is selected in the document.
- **Highlight all.** One switch highlights every long sentence in yellow, and the same switch clears it.
- **Rewrite in plain language.** Put the cursor in a paragraph and ask for a rewrite. The task pane shows a word-level diff and a short list of what changed, plus warnings if a number or protected term went missing.
- **Insert as tracked change.** The rewrite replaces the paragraph with track changes on, then the author's own tracking setting comes back.
- **Settings.** Target grade, tone (neutral, friendly, formal), model, and protected terms that must stay word for word.

## Architecture

```
addin/                      Word task pane (Vite 7, React 19, TypeScript strict, Tailwind CSS 4, @eylulg/ui)
  manifest.xml              XML add-in manifest: task pane, Home tab button, icons
  src/analysis/             Readability engine. Pure TypeScript, no Office dependency
  src/office/               Typed wrapper around Word.run, plus a browser preview stand-in
  src/api/                  Client for the rewrite server, response validated with zod
  src/taskpane/             The UI: score card, issue list, rewrite panel, settings
server/                     Rewrite API (Hono on Node, Vercel or Cloudflare Workers)
  src/app.ts                CORS, body cap, rate limit, validation, error mapping
  src/rewriter.ts           Claude call with structured output and refusal fallback
  src/demo-rewriter.ts      Fixture rewrites when no API key is set
docs/                       Demo video script and sideloading guide
```

**Analysis engine.** `addin/src/analysis` splits paragraphs into sentences (it knows abbreviations such as "Dr." and "e.g.", initials, decimals and money, closing quotes, list markers and manual line breaks), counts syllables with a vowel-group heuristic, and computes Flesch Reading Ease and Flesch-Kincaid grade over the whole document. The checks are heuristics with word lists, tuned to be useful rather than perfect: they point an author at sentences worth a second look.

**Office wrapper.** The UI never calls `Word.run` itself. It talks to a `WordGateway` interface (`addin/src/office/types.ts`). The real implementation searches inside the paragraph that owns a sentence, so the right occurrence is found even when the same words appear elsewhere. Word rejects searches longer than 255 characters, so long sentences are found by their first and last words and the two ranges are joined with `expandTo`. Tests use a fake gateway, and a plain browser tab gets an in-memory preview with a sample document.

**Server.** `POST /rewrite` takes `{ text, targetGrade, tone, model?, protectedTerms }`, validates it with zod, and calls Claude with a system prompt that asks for a plain-language rewrite that keeps the meaning, names, numbers, dates, defined terms and protected terms. The reply comes back as structured output (`{ rewrite, changes }`), then the server checks that every number and protected term from the original is still there and adds warnings if not. The default model is `claude-sonnet-5-5` at low effort, which is fast and cheap for one paragraph; set `REWRITE_MODEL` to change it, and `REWRITE_ALLOWED_MODELS` to choose what the settings menu may ask for. When a model declines, server-side refusal fallback retries on Anthropic's recommended fallback model in the same call where the model supports it.

## How the tracked-change insert works

1. When you ask for a rewrite, the add-in reads the paragraph that holds the cursor and remembers its index and exact text.
2. When you choose **Insert as tracked change**, it reads the document again. If that paragraph no longer has the same text, it stops and asks for a new rewrite rather than overwrite your edits.
3. It saves the current `changeTrackingMode`, sets it to `TrackAll`, and replaces the paragraph's content range (not the whole paragraph, so its style and paragraph mark survive).
4. In a `finally` block it puts tracking back to what it was, even if the insert failed.

The result is one deletion and one insertion in the Review pane, attributed to the author. Tracked changes from add-ins need WordApi 1.4; on older Word the button is disabled and says why.

## Privacy

Only the paragraph you ask to rewrite leaves your computer, together with the target grade, tone, chosen model and your protected terms. The score and issue list are computed inside the task pane and are never sent anywhere. The server does not store or log paragraph text; it logs only the error type when a rewrite fails. Anthropic processes the paragraph under its API terms. In demo mode (no API key) nothing is sent to Anthropic at all.

## Run it

Requirements: Node 24 and npm 11, and Word on Mac, Windows or the web.

```bash
npm install
npm run certs -w addin          # once: trust the Office dev certificate for https://localhost
cp server/.env.example server/.env   # add ANTHROPIC_API_KEY, or leave it empty for demo mode
npm run dev:server              # https://localhost:8787
npm start                       # starts https://localhost:3100 and sideloads into Word on Mac or Windows
```

`npm start` uses `office-addin-debugging` to open Word with the add-in. If it cannot, sideload by hand: see [docs/sideloading.md](docs/sideloading.md). To try the UI without Word, run `npm run dev:addin` and open https://localhost:3100/taskpane.html; a sample document stands in for Word.

The add-in reads the server URL from `VITE_REWRITE_API_URL` (see `addin/.env.example`).

### Deploy the server

- **Vercel:** import the repo with `server` as the root directory. `src/index.ts` exports the Hono app. Set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` in the project settings.
- **Cloudflare Workers:** `cd server && npx wrangler deploy`, then `npx wrangler secret put ANTHROPIC_API_KEY`. Edit `ALLOWED_ORIGINS` in `wrangler.toml`.
- **Any Node host:** `npm run build -w server && npm start -w server` with `NODE_ENV=production` and `TRUST_PROXY=true` behind a proxy.

The rate limit is kept in memory per instance (10 requests a minute per client by default), which is enough for a demo. Use a shared store for real traffic.

### Why the XML manifest

The XML manifest works for Word on Mac, Windows and the web today, and `office-addin-debugging` and `office-addin-manifest validate` support it fully. Moving to the unified JSON manifest later is a conversion with Microsoft's manifest tools; nothing in the code depends on the format.

## Tests

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run knip
```

- `addin/src/analysis/__tests__`: sentence splitting edge cases (abbreviations, initials, numbers, quotes, lists, line breaks), syllables, the Flesch formulas, each check, the document score and the word diff.
- `addin/src/office/__tests__`: the Word wrapper against a small fake of the Word object model, including long sentences, duplicate paragraphs and restoring track changes when an insert fails.
- `addin/src/taskpane/__tests__`: user flows in the task pane with Testing Library and an axe check, with Word faked at the gateway and the network stubbed under the real rewrite client.
- `server/src/__tests__`: request validation, CORS, body cap, rate limit, error mapping and demo mode, with the Anthropic SDK faked at its client.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests, build and knip, checks commit messages on pull requests, and scans for secrets.

## License

MIT, see [LICENSE](LICENSE).

## Design system

The add-in uses [`@eylulg/ui`](https://github.com/eylulg/ui) with the `plain-language` theme variant. It is installed as `file:../ui`, so clone `ui` next to this repo and build it (`npm install && npm run build`) before `npm install` here. CI checks `eylulg/ui` out to `ui-src`, builds it and points the dependency there for that run only. Once the library is published the dependency becomes `^1.0.0` and the checkout steps go away. Vercel deploys need that publish.
