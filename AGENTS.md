# Agent Instructions

These instructions apply to the entire repository.

## Required reading

Read these before changing code:

1. [BUSINESS.md](BUSINESS.md) defines the product boundary, terminology,
   exclusions, and acceptance.
2. [ARCHITECTURE.md](ARCHITECTURE.md) defines component ownership, dependency
   direction, the connection flow, and the mixed-content rules.
3. [STANDARDS.md](STANDARDS.md) defines code, dependency, and verification
   rules.

For protocol facts, read `../CrystalCode/docs/server.md` and the code under
`../CrystalCode/CrystalCode.Server`. Do not guess a wire shape.

When a design decision changes, update the relevant document in the same
change. The implementation must not become the only source of truth.

## Product

Crystal Code Web is the browser front end for `crystal server`. It is a static
site, deployed once as a public HTTPS site (for example `https://example.com`),
that connects to any server address and optional token the operator types:
public or local network. It is not embedded in Crystal Code, has no backend of
its own, and is tied to no address. The same build may also be self-hosted
over plain HTTP on a local network.

The interface says "Crystal Code". Documents and conversation say "Crystal
Code Web".

`../CrystalCode`, `../CrystalCode.Website`, and
`../CrystalCode.Website.Documents` are references. Read them. Do not modify
them. The two sites lag the product; the product repository wins.

## Non-negotiable invariants

- Do not change files under `../CrystalCode` or the sibling sites. Record a
  needed server change as a requirement for the owner.
- Do not add, remove, or update dependencies without explicit user approval.
  Use pnpm only. npm is not allowed.
- A token appears only in the `Authorization` header. Never in a URL, a log,
  an error, a stored address, or an export. Memory by default;
  `sessionStorage` only after the operator opts in; never `localStorage`.
- Model output, tool output, and server text are untrusted. Never insert them
  as HTML. No `v-html` or `innerHTML` on them.
- The client holds no product logic. It does not decide approval, trust, risk,
  or budgets, and it offers only the choices the server sent.
- No request goes anywhere but the server the operator entered and the site
  that served the page. No CDN,
  web font, analytics, or icon service. Do not embed an address, origin, or
  token in the build.
- Do not work around the browser's mixed-content block with a proxy or a
  relay. Detect it, explain it, and list the legal options.
- The page is a trusted-code boundary: it holds a token that drives a session
  with tool access. No third-party script, style, font, or frame. The page
  never connects or fills a token from its own URL.
- Ask about anything uncertain. Do not decide product scope, a dependency, or
  a new top-level folder on your own.
- Interface text is hand-written i18n: `en` source, `zh-cn`, `zh-tw`. No i18n
  library. No emoji in the interface. Server text is shown as received.
- Do not publish secrets, tokens, certificates, or machine-specific paths.

## Change rules

- Respect the dependency direction in ARCHITECTURE.md.
- Cover or exclude every capability `GET /info` can report. Record an
  exclusion in BUSINESS.md.
- The site must be responsive and keyboard accessible.
- The page must work from any static file server with no rewrite rules.
- Start the dev server (`pnpm dev`) in the background and stop it when done.
- Do not perform repository history operations unless explicitly requested.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm build
```

There is no test or lint command yet. For connection or session changes, also
run the manual check in [STANDARDS.md](STANDARDS.md) against a real
`crystal server`.
