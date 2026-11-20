# Plain Language for Word

A Word add-in that scores how readable a document is, points to the sentences that make it hard to read, and rewrites a paragraph in plain language with Claude. The rewrite goes in as a tracked change, so the author accepts or rejects it like any other suggestion.

Live: https://eylulg.github.io/plain-language-word-addin/ opens the task pane in a browser with a sample document, because Word is not there. Its rewrite server is https://plain-language.eylulg.workers.dev, running in demo mode. Demo mode returns fixture rewrites and never calls Claude, since the server has no API key. A rewrite from Claude needs your own key, set up below.

## What it does

- Scores the document (Flesch-Kincaid grade, Flesch Reading Ease, words per sentence) against a target grade you choose.
- Lists issues by paragraph: sentences over 25 words, passive voice, nominalisations, jargon and filler. Clicking one selects the sentence in Word. One switch highlights every long sentence in yellow.
- Rewrites the paragraph under the cursor, shows a word level diff and a list of changes, and warns if a number or a protected term went missing. Settings cover target grade, tone, model and protected terms.

## Run it

You need Node 22 or newer, and Word on Mac, Windows or the web. The design system `@eylulg/ui` is a local dependency (`file:../ui`), so build it next to this repo first.

```bash
git clone https://github.com/eylulg/ui ../ui && (cd ../ui && npm install && npm run build)
npm install
npm run certs -w addin               # once: trusts the Office dev certificate for https://localhost
cp server/.env.example server/.env   # add ANTHROPIC_API_KEY, or leave it empty for demo mode
npm run dev:server                   # https://localhost:8787
npm start                            # serves https://localhost:3100 and sideloads into Word
```

`npm start` uses `office-addin-debugging`. If it cannot open Word, sideload by hand with [docs/sideloading.md](docs/sideloading.md). To try the UI without Word, run `npm run dev:addin` and open https://localhost:3100/taskpane.html. After rebuilding the library, run `npm run relink`.

### Environment variables

Server (`server/.env.example` lists all of them):

- `ANTHROPIC_API_KEY`: empty means demo mode.
- `REWRITE_MODEL` (default `claude-sonnet-5-5`), `REWRITE_ALLOWED_MODELS`, `REWRITE_EFFORT` (default `low`).
- `ALLOWED_ORIGINS`: the origin the add-in is served from.
- `RATE_LIMIT_PER_MINUTE` (10), `MAX_BODY_KB` (16), `MAX_TEXT_CHARS` (4000), `PORT`, `HTTPS`, `TRUST_PROXY`.

Add-in: `VITE_REWRITE_API_URL`, read at build time, defaults to `https://localhost:8787`.

## Decisions

**The UI talks to Word through one interface.** The task pane calls a `WordGateway`, never `Word.run` directly. Tests use a fake, and a plain browser gets an in-memory version with a sample document. The cost is a second implementation to keep in step with the real one.

**The tracked change checks before it writes.** When you ask for a rewrite the add-in remembers the paragraph's index and text. On insert it reads the document again and stops if the text changed, instead of overwriting your edits. It then turns tracking on, replaces the paragraph's content (not the paragraph mark, so the style survives), and puts your tracking setting back in a `finally` block. This needs WordApi 1.4. On older Word the button is disabled and says why.

**Heuristic checks.** Sentence splitting, a vowel group syllable count and word lists find the issues. They point an author at sentences worth a second look and miss some. The cost is false positives and misses over a real parser.

**Only one paragraph leaves the computer.** The score and issues are computed in the task pane. The server gets the paragraph, target grade, tone, model and protected terms, checks that every number and protected term is still in the reply, and does not store or log the text. Anthropic processes it under its API terms.

**The XML manifest.** It works for Word on Mac, Windows and the web today. Moving to the JSON manifest later is a conversion with Microsoft's tools.

## Tests

Vitest covers sentence splitting, the readability formulas, each check, the Word wrapper against a fake object model (including restoring track changes when an insert fails), the task pane flows with an axe check, and the server (validation, CORS, rate limit, error mapping, demo mode) with the Anthropic client faked.

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run knip
```

## Deploy

- **Server on Cloudflare Workers:** `cd server && npx wrangler deploy` with `CLOUDFLARE_API_TOKEN` set. The Worker is named `plain-language`, and `ALLOWED_ORIGINS` in `server/wrangler.toml` is `https://eylulg.github.io`. Without a key it runs in demo mode. To use Claude, run `npx wrangler secret put ANTHROPIC_API_KEY`. The rate limit is in memory per instance, which is fine for a demo.
- **Add-in on GitHub Pages:** `.github/workflows/pages.yml` builds on every push to main and publishes the add-in and `manifest.xml`. Set Pages to "GitHub Actions" and add the repository variable `REWRITE_API_URL` with the Worker URL.
- **Any Node host:** `npm run build -w server && npm start -w server` with `NODE_ENV=production`, and `TRUST_PROXY=true` behind a proxy.

CI runs the checks above, validates the manifest and scans for secrets. Because the library is a local dependency, it checks out `eylulg/ui` into `ui-src` and builds it first.

## License

[MIT](LICENSE), Eylül Güneş
