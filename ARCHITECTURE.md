# Architecture

Describes the intended structure of Crystal Code Web. Today only the
scaffold exists (see [BUSINESS.md](BUSINESS.md)); everything below is Planned
unless marked Current. Product scope is in `BUSINESS.md`.

## Position

Crystal Code Web is a static single-page application. It talks to one
`crystal server` over HTTP and server-sent events. There is no server-side
code in this repository, no proxy, and no shared process with the server.

The wire contract belongs to `../CrystalCode` (`docs/server.md`). The client
adapts to the server and never the reverse.

## Dependency direction

```text
components  ->  session  ->  protocol
connection  ->  protocol
components  ->  connection
render, i18n, theme: leaf modules used by components only
```

Rules:

- `protocol` depends on nothing in this repository, does not import Vue, and
  does not read `window.location` or any browser storage.
- `session` may import `protocol` and Vue reactivity. It must not import
  components.
- `connection` may import `protocol`. It is the only module that reads page
  location and browser storage for addresses and tokens.
- Components do not call `fetch` or open streams directly.
- `render` turns untrusted text into safe output and imports nothing from the
  session.

The folder names are a proposal (Open question below). The ownership is
binding.

## Components

| Component | Owns | Does not own |
| :--- | :--- | :--- |
| `protocol` | Request building, response and problem-details parsing, event envelope and SSE parsing, wire types, the headers sent, request ids | Page state, storage, retries that need UI, any rendering |
| `connection` | Address parsing and validation, the mixed-content advisory, credential handling (memory and optional tab storage), connect and disconnect, reconnect and backoff, failure diagnosis | Session content, wire types |
| `session` | The reducer that applies snapshot and events to view state, `lastSeq`, interaction queue, pending requests, per-scope capability flags from `GET /info` | Any decision the server makes (approval, trust, classification, budgets) |
| `render` | Markdown to safe output, code highlighting, link handling, image policy | Fetching remote content |
| `components` | Layout, composer, transcript, cards, dialogs, shadcn-vue UI primitives under `components/ui` | Network calls, storage |
| `i18n` | Hand-written message tables for `en`, `zh-cn`, `zh-tw`, the lookup, and the fallback to English | Server-authored text |
| `theme` | Design tokens, fonts, light, dark, and auto themes | Behavior |

## Runtime flow

1. The operator enters an address and optionally a token. `connection`
   validates the address, builds the advisory (below), and shows it before
   the request when the browser will likely block it.
2. `GET /health` (no token) confirms a server answers and reads its state.
   The page's `Origin` header applies to this request too.
3. `GET /info` (needs a token unless `--auth none`) returns the scope, build
   identity, and capability lists. The client enables features from these
   lists, not from a build assumption.
4. `GET /snapshot` returns the session state and `lastSeq`. `session` draws
   from it.
5. The event stream starts with `after=lastSeq`. Each event updates view
   state through the reducer. Unknown event types and fields are ignored.
6. Operator input goes out as a request carrying `X-Crystal-Client` and, for
   state changes, a `clientRequestId`. The result arrives as events, not as
   the response body.
7. On a dropped stream, `connection` reconnects with `Last-Event-ID`. A
   `resync` event or an expired cursor means: fetch a new snapshot and
   restart from its `lastSeq`.
8. On `conversation.cleared`, `conversation.replayed`, or a changed
   `sessionId`, `session` redraws from the snapshot.

While the server state is not `ready`, requests that need the session return
503. The client shows the state and an `awaiting_operator` interaction if one
is pending, and waits.

## Event transport

Open question, with a recommended default.

- Native `EventSource` cannot set headers. The server offers
  `POST /auth/ticket`: a single-use ticket valid for 30 seconds, accepted only
  by `GET /events?ticket=`. A reconnect by `EventSource` reuses the old URL
  and its spent ticket, so the page would have to replace the connection on
  every drop.
- A `fetch` stream with `Authorization`, `X-Crystal-Client`, and
  `Last-Event-ID` headers avoids tickets and keeps the token out of every URL.
  The client then parses the SSE frames itself.

Recommended: `fetch` streaming through `protocol`, with the ticket path as the
fallback. Either choice keeps the token out of URLs. Do not implement
until the owner confirms.

## Mixed content and local network access

A page's scheme and address decide what the browser allows. The client cannot
observe a block directly: a blocked request looks like any other network
failure. So `connection` computes an advisory from the page and the target
before connecting.

Classify the target host as loopback (`localhost`, `127.0.0.0/8`, `::1`),
private (RFC 1918 IPv4 literals, `.local`), or other. Classify the page the
same way, plus its scheme.

| Page | Target | Result | Client behavior |
| :--- | :--- | :--- | :--- |
| `http://` (local or LAN host) | `http://` any | Not mixed content. Chrome and Edge may ask the operator for the Local Network Access permission when the page is local and the target is loopback. | Connect. If it fails, say the permission may have been denied. |
| `https://` | `https://` any | Allowed if the certificate is trusted by the browser. A self-signed certificate must be accepted in the browser first. | Connect. Name the certificate as a likely cause of failure. |
| `https://` | `http://` loopback | Browsers treat loopback as trustworthy. Chrome and Edge also gate it behind the Local Network Access permission. Other browsers not verified. | Connect. Explain the permission prompt. |
| `https://` | `http://` private (`192.168.x.x`, `.local`) | Blocked as mixed content. Chrome and Edge relax it only after the operator grants Local Network Access. Firefox and Safari not verified; assume blocked. | Warn before connecting. List the options below. Allow the attempt. |
| `https://` | `http://` other | Blocked as mixed content. | Warn. Same options, without the permission option. |

Options the client lists, and nothing beyond them:

1. Start the server with TLS (`--tls-cert` and `--tls-key`) and connect by
   `https://`. The private key password comes from
   `CRYSTAL_SERVER_TLS_PASSWORD`, never a flag.
2. Open this client from an `http://` host on the same network (any static
   file server; the build needs no rewrite rules).
3. For a server on the same machine, connect by `http://localhost` or
   `http://127.0.0.1`.
4. Chrome or Edge: allow the Local Network Access permission when prompted.

Sources checked on 2026-10-26: MDN "Local network access", Chrome 142 release
notes and "New permission prompt for Local Network Access", and Microsoft Edge
"Adapting your website for new Local Network Access restrictions".

## Server facts the client depends on

Verified in `../CrystalCode/CrystalCode.Server/Security/AccessGuard.cs` and
`docs/server.md`. Each is a requirement on how the operator starts the server.
The client reports the matching failure; it cannot fix any of them.

- CORS is off unless `--allow-origin` lists the page's origin. A request with
  an unlisted `Origin` gets 403, even with `--auth none`. This applies to
  `GET /health` as well. An operator using this client from a hosted page must
  add that origin.
- The `Host` header must name `localhost`, `127.0.0.1`, `::1`, the listen
  address, or an `--allow-host` value. Otherwise 421. Reaching a server by a
  LAN address needs it in `--allow-host` when the server listens on `0.0.0.0`.
- Preflight allows only these request headers: `Authorization`,
  `Content-Type`, `X-Crystal-Client`, `Last-Event-ID`. Allowed methods: GET,
  POST, PUT, DELETE, OPTIONS. The client sends no other custom header.
- The server exposes no response headers to scripts
  (`Access-Control-Expose-Headers` is not set). The client cannot read
  `Retry-After` or `Content-Disposition`; it names downloads itself and uses
  its own backoff after a 429.
- Twenty failed authentications from one address in a minute return 429 for
  the rest of that minute.
- JSON bodies are limited to 1 MiB. Image upload is limited to 20 MiB.
- A non-loopback listener without TLS is allowed by the server with a
  warning; tokens and session content then travel in clear text. The client
  shows a persistent notice when it connects to such a server.
- Chrome replaced Private Network Access preflights with the Local Network
  Access permission prompt. The server sets no `Access-Control-Allow-Private-Network`
  header. Whether it should is a question for the server owner, not a change
  made here.

## Invariants

- The client holds no product logic. It does not decide, rank, or rewrite
  approval, trust, risk classification, compaction, or budgets.
- An approval or question answer is one the interaction payload offered. The
  client never invents a choice.
- A long-lived token appears only in the `Authorization` header. Never in a
  URL, a log, an error message, a stored address, or an export.
- Model output, tool output, server notes and errors, and Markdown are
  untrusted. They are never inserted as HTML. Markdown is rendered with raw
  HTML disabled. Remote images in Markdown are not loaded automatically.
- The build contains no server address, no origin, no token, and makes no
  request to any host but the server the operator entered. Fonts and icons are
  bundled.
- The page needs no server-side routing or rewrite rules. If routing is
  added, it is hash based.
- The client tolerates unknown event types, fields, operations, and
  interaction kinds. It never throws on them.
- The client does not depend on a server build. Capabilities come from
  `GET /info`.
- State-changing requests carry a `clientRequestId`. A retry of the same
  action reuses the id.

## Enforcement

Nothing enforces the dependency direction or the invariants today. There is
no test framework and no lint rule. See Open questions.

## Open questions

- Event transport: `fetch` stream or ticket plus `EventSource` (above).
- Folder names for `protocol`, `connection`, `session`, `render`, `i18n`, and
  `theme`. The scaffold has `src/components` and `src/lib` (shadcn aliases in
  `components.json`).
- How to enforce the dependency direction and the parity requirement (every
  `GET /info` capability handled or excluded). Needs a test framework or a
  lint tool, both of which need dependency approval.
- Whether the build uses a relative `base` so it can live under any path.
  The invariant that it needs no rewrite rules stands.
