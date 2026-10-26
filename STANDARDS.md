# Engineering Standards

## General rules

- Prefer a small explicit surface over convenience wrappers with hidden
  behavior.
- Keep BUSINESS.md, ARCHITECTURE.md, and this file in step with material
  behavior changes.
- Runtime text contains no emoji.
- Comments explain constraints and intent, not syntax. No commented-out code.
- No `console.log` of tokens, request headers, response bodies, or session
  content. Treat all of them as secret.
- Do not modify dependencies without explicit user authorization.

## Source organization

- Vue 3 single-file components with `<script setup lang="ts">`.
- TypeScript strict as configured by `@vue/tsconfig`. No `any` at a trust
  boundary. Parse wire data from `unknown` into explicit types in `protocol`.
- Path alias `@/` maps to `src/`. shadcn-vue aliases are in `components.json`
  (`@/components`, `@/components/ui`, `@/lib`, `@/composables`).
- ES modules only. `erasableSyntaxOnly` is on: no enums, no parameter
  properties, no namespaces.
- One component per `.vue` file. File name equals the component name in
  PascalCase. Other modules use kebab-case file names.
- Wire shapes are written down explicitly, field by field, matching
  `../CrystalCode/docs/server.md`. Do not infer a shape from one sample.
- Dependency direction is in [ARCHITECTURE.md](ARCHITECTURE.md). Do not add an
  import that reverses it.
- No top-level `await`, no module-level side effects that open a connection.

## Network and storage

- Only `connection` reads `window.location`, `localStorage`, or
  `sessionStorage` for addresses and tokens.
- Send only these custom request headers: `Authorization`, `Content-Type`,
  `X-Crystal-Client`, `Last-Event-ID`. Any other header fails the server's
  CORS preflight.
- `X-Crystal-Client` is a random id chosen once per page: letters, digits,
  `-`, `_`, `.`, at most 128 characters.
- Every request is cancellable with `AbortController`. Cancel on disconnect
  and on page unload.
- Reject addresses with embedded credentials. Normalize IPv6 literals.
- Never concatenate user or server text into a URL without encoding.
- Tokens: memory by default. `sessionStorage` only after an explicit choice.
  Never `localStorage`, cookies, URLs, or logs.
- Images and exports are fetched with the `Authorization` header into a blob
  and shown through an object URL. Revoke the object URL when done.

## Hosted page security

- The site is served by a public host, so a compromise of the deployed files
  is remote access to operators' servers. Treat every change as a supply-chain
  change: pin dependency versions and review what the build bundles.
- No script, style, font, image, or frame from another origin. No analytics.
  `index.html` and CSS reference only bundled files.
- The address and token fields are filled only from operator input. Reading
  the page URL to prefill, connect, or select a server is not allowed.
- The CSP in ARCHITECTURE.md ("Hosted-page trust") is a deployment
  requirement. Do not add inline scripts or `eval`, which that policy forbids.
- A request to a hostname the client cannot classify may carry
  `targetAddressSpace` only when the operator chose "local network" or "this
  computer" for that server.

## Rendering untrusted text

- Never use `v-html` or `innerHTML` on model output, tool output, server
  messages, filenames, or workspace paths. Markdown goes through `render`.
- markdown-it runs with `html: false`. Links open with `rel="noopener noreferrer"`
  and only `http:`, `https:`, and `mailto:` are linked. Remote images in
  Markdown are shown as links, not loaded.
- shiki output is inserted only from its own token output, with escaped text.
  Grammars and themes are bundled, loaded lazily, and never fetched from a CDN.

## Interface

- Responsive on desktop, tablet, and phone. Test at narrow widths.
- Visual language follows `../CrystalCode.Website`: Archivo and IBM Plex Mono
  from bundled files, the same palette, borders, focus rings, and motion
  timing, with light, dark, and auto themes. Copy design assets by hand; do
  not redesign them here.
- Respect `prefers-reduced-motion`.
- All controls are keyboard reachable with visible focus. Dialogs trap focus
  and return it on close. Streaming text does not steal focus or scroll the
  reader away from earlier content.
- i18n is hand-written. English is the source. `zh-cn` and `zh-tw` mirror it
  page by page. Do not machine-translate and publish as final. Do not add an
  i18n library. Missing keys fall back to English.
- Interface text says "Crystal Code", not "Crystal Code Web".

## Dependencies

Package manager: pnpm only. npm is not allowed, and there is no
`package-lock.json`.

Authorized today (from `package.json` and owner decisions):

- Runtime: `vue`, `tailwindcss`, `@tailwindcss/vite`, `@lucide/vue` (the one
  icon library), `class-variance-authority`.
- Development: `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`,
  `@vue/tsconfig`, `@types/node`, `tw-animate-css`.
- Approved by the owner on 2026-10-26, not yet installed: `markdown-it` and
  `shiki`, for rendering model output. Pin versions when installing and check
  their transitive dependencies first.

Needs review before use: the `cn` package, which `src/lib/utils.ts`
re-exports. The shadcn-vue `cn` helper normally comes from `clsx` and
`tailwind-merge`, neither of which is installed. Do not add them without
approval.

Do not add any other dependency without asking. A dependency needs the user's
confirmation that it is safe and trustworthy. No CDN script, font, or style
link in `index.html` or CSS.

Fonts are local files in `src/assets/fonts`, wired in `src/style.css`.
Archivo and IBM Plex Mono (copied from `../CrystalCode.Website`, licenses
alongside) come first. The Noto Sans files are the fallback, and the owner
wants them kept: `Noto Sans` for Latin gaps, `Noto Sans Mono`, and
`Noto Sans SC`, `TC`, `HK`, `JP` for Han and kana. `html:lang(zh-CN)` and
`html:lang(zh-TW)` reorder the stack so each locale gets its own glyph forms.
Do not delete these files or reintroduce a remote font.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm build
```

`pnpm build` runs `vue-tsc -b && vite build`. `pnpm dev` starts Vite and does
not exit; start it in the background and stop it when done.

There is no unit test, component test, lint, or format command. Test framework
is an Open question: Vitest is a candidate. Do not add one without approval,
and do not claim coverage that does not exist.

Manual check against a real server before handing off a connection or session
change. Start the server with the options in `../CrystalCode/docs/server.md`
and cover the cases that apply:

- loopback, with the generated token and with `--auth none`;
- a LAN address with `--listen 0.0.0.0:<port>` and `--allow-host <lan-address>`;
- the page served from a different origin than the server, with that origin
  in `--allow-origin`, and a missing `--allow-origin` and `--allow-host` to
  confirm the checklist names both flags and the page origin;
- an HTTPS page against a public or local server with TLS;
- an HTTPS page against a plain HTTP LAN or loopback server in Chrome or Edge,
  with the permission granted and denied, and against a plain HTTP public
  server to confirm the advisory;
- a copy of the build served over HTTP on a LAN against a LAN server;
- a dropped and restored connection, and a `resync`.

Never write a real token, certificate, or key into the repository, a
screenshot, or a commit.

## Open questions

- Test framework and lint tooling.
- Size of the Noto fallback fonts. They are unsubsetted TTF files (about
  47 MB in total, 18 MB for SC alone) and `pnpm build` copies all of them into
  `dist`. A browser downloads one only when an earlier face lacks a glyph, but
  a hosted copy still carries them. Keep them as they are until the owner
  decides whether to convert them to subsetted woff2.
