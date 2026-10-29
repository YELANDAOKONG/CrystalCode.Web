# Architecture

Describes the intended structure of Crystal Code Web. Today only the
scaffold exists (see [BUSINESS.md](BUSINESS.md)); everything below is Planned
unless marked Current. Product scope is in `BUSINESS.md`.

## Position

Crystal Code Web is a static single-page application. The primary deployment
is one public HTTPS site (for example `https://example.com`) that any operator
opens and points at their own server, public or on a local network. It also
works when the same build is served from another static host.

It talks to one `crystal server` at a time over HTTP and server-sent events.
There is no server-side code in this repository, no proxy, and no shared
process with the server. Every request goes from the operator's browser
straight to the address the operator entered.

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
   lists, not from a build assumption. Steps 2 and 3 are sent together; the
   health result is judged first, so a failure is still reported from it.
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

A child's events arrive with `source` and are never applied to the parent
conversation. `session` folds them into a per-child trace with the same round
assembler the parent uses. A snapshot discards traces, because events may have
been missed, and the next event of a running child starts an incomplete one.
The sheet shows `GET /children/{id}` first, then the trace, and drops the trace
once the child stops and the saved archive has been read again.

While the server state is not `ready`, requests that need the session return
503. The client shows the state and an `awaiting_operator` interaction if one
is pending, and waits.

## Event transport

Open question, with a recommended default.

- Native `EventSource` cannot set headers and cannot take fetch options such
  as `targetAddressSpace` (see below). The server offers `POST /auth/ticket`:
  a single-use ticket valid for 30 seconds, accepted only by
  `GET /events?ticket=`. A reconnect by `EventSource` reuses the old URL and
  its spent ticket, so the page would have to replace the connection on every
  drop.
- A `fetch` stream with `Authorization`, `X-Crystal-Client`, and
  `Last-Event-ID` headers avoids tickets, keeps the token out of every URL,
  and can carry `targetAddressSpace`. The client then parses the SSE frames
  itself.

Recommended: `fetch` streaming through `protocol`. The ticket path with
`EventSource` cannot reach an HTTP server on a private network from the public
HTTPS page, so it is not a fallback for that case. Do not implement until the
owner confirms.

## Mixed content and local network access

The hosted page is HTTPS, so it is a secure context. The operator may type any
target: a public server with TLS, a public server without TLS, a LAN address,
or localhost. The browser decides what is allowed from the page's scheme and
the target's address space. The client cannot observe a block directly: a
blocked request looks like any other network failure. So `connection` computes
an advisory from the page and the target before connecting, and uses it to
explain a later failure.

Address spaces (MDN "Local network access"): loopback (`localhost`,
`127.0.0.0/8`, `::1`), local (private IP literals such as `192.168.0.1`, and
`.local` names), and public. `connection` classifies a typed host from its
text only. A hostname such as `nas.home.lan`, or a public name that resolves to
a private address, looks public to the client and may be local to the browser.

Result for an HTTPS page, as documented for Chrome and Edge:

| Target | Browser behavior | Client behavior |
| :--- | :--- | :--- |
| `https://` public | Allowed if the certificate is trusted. | Connect. |
| `https://` local or loopback | Allowed if the certificate is trusted. Chrome 142+ and Edge 143+ ask the operator for the Local Network Access permission. | Connect. Say a permission prompt is expected. |
| `http://` public | Blocked as mixed content. No permission relaxes it. | Warn before connecting. The only way out is TLS on the server. |
| `http://` private IP literal or `.local` | Blocked as mixed content until the operator grants Local Network Access in Chrome or Edge, which then relaxes the check. | Warn. Allow the attempt. List the options. |
| `http://localhost` or another loopback address | Chrome and Edge gate it behind the loopback permission and relax mixed content once granted. | Allow the attempt. Explain the prompt. |
| `http://` hostname that resolves to a private or loopback address | Treated as public unless the request declares `targetAddressSpace`. | Offer an operator choice "this server is on my local network" or "on this computer" that sets `targetAddressSpace` to `local` or `loopback`. |

Firefox and Safari: behavior for these cases is not verified. Until it is,
treat every `http://` target from the HTTPS page as blocked there and show the
warning. The advisory text must say "may be blocked", not "is blocked".

Permission state: `navigator.permissions.query` with `local-network` or
`loopback-network` (MDN names; Edge's guide uses `local-network-access`) can
tell the client whether the operator already granted it. Unsupported or
unknown states are not an error. Which name each browser accepts is an Open
question.

Options the client lists for an `http://` target, and nothing beyond them:

1. Start the server with TLS (`--tls-cert` and `--tls-key`) behind a
   certificate the browser trusts, and connect by `https://`. The private key
   password comes from `CRYSTAL_SERVER_TLS_PASSWORD`, never a flag.
2. Chrome or Edge, local or loopback target: allow the Local Network Access
   permission for this site when prompted.
3. Open a copy of this client served over `http://` on the same network. The
   build needs no rewrite rules, so any static file server works.
   Whether a LAN-hosted HTTP page reaches a LAN HTTP server without a prompt
   is by the same specification (local to local is not gated); not verified.

A self-signed server certificate fails until the browser trusts it. The client
tells the operator to open the server's address once in the browser and accept
the certificate, then retry. Whether that exception applies to cross-origin
`fetch` in each browser is not verified.

Sources checked on 2026-10-26: MDN "Local network access", Microsoft Edge
"Adapting your website for new Local Network Access restrictions" (updated
2026-03-09), and the Chrome 142 release notes.

## Hosted-page trust

The hosted page runs code that holds the operator's token and can send input
to a session that executes tools on the operator's machine. A compromised
hosted page is therefore remote access to every server whose operator opens it.
The deployment must not weaken this:

- No third-party script, style, font, or frame on the page. All assets are
  built into the deployment.
- The page is served with a Content Security Policy header: `default-src 'self'`,
  `script-src 'self'` with no `unsafe-inline` or `unsafe-eval`, `object-src 'none'`,
  `base-uri 'none'`, `frame-ancestors 'none'`. `connect-src` cannot be
  narrowed because the target is operator-chosen, so it allows `https:` and
  `http:`. Whether the hosting platform allows setting headers is an Open
  question; a `<meta>` CSP cannot set `frame-ancestors`.
- Dependencies are pinned and audited (see STANDARDS.md).
- The client sends the token only to the address the operator entered and
  confirmed. A link, a query parameter, or a fragment never pre-fills and
  connects. Otherwise a crafted link could send a token to an attacker's
  server.
- Because any operator-chosen server can return arbitrary content, every
  server-supplied string is untrusted (see Invariants).

## Server facts the client depends on

Verified in `../CrystalCode/CrystalCode.Server/Security/AccessGuard.cs` and
`docs/server.md`. Each is a requirement on how the operator starts the server.
The client reports the matching failure; it cannot fix any of them.

- CORS is off unless `--allow-origin` lists the page's origin. A request with
  an unlisted `Origin` gets 403, even with `--auth none`. This applies to
  `GET /health` as well. An operator using the hosted page must start the
  server with `--allow-origin https://example.com` (the hosting origin). This
  is a setup step every operator performs.
- A page whose origin is listed gets CORS headers on every response, including
  401, 421, and 429 (`AccessGuard.InvokeAsync`). So for a listed origin, 421
  (Host not allowed), 401, 403 scope, 429, and 503 are all readable statuses.
  A page whose origin is not listed gets no CORS header on its 403, so the
  browser hides that response. The client then sees a network failure that it
  cannot tell apart from a wrong address, a down server, a certificate error,
  or a mixed-content block. For a failed first request the client shows one
  combined checklist, including the exact `--allow-origin` flag with the
  page's `window.location.origin`, and does not claim one cause. A readable
  421 is reported on its own: the server needs that address in `--allow-host`.
- The `Host` header must name `localhost`, `127.0.0.1`, `::1`, a
  specific (non-wildcard) listen address, or an `--allow-host` value
  (`CrystalServer.cs`). Otherwise 421. A server on `0.0.0.0` reached by a LAN
  address or a public name, or through a reverse proxy that keeps the original
  Host, needs that name in `--allow-host`.
- Preflight allows only these request headers: `Authorization`,
  `Content-Type`, `X-Crystal-Client`, `Last-Event-ID`. Allowed methods: GET,
  POST, PUT, DELETE, OPTIONS. The client sends no other custom header.
- Scripts can read `Retry-After`, `Content-Disposition`, and
  `WWW-Authenticate` on responses to a listed origin. The client uses
  `Retry-After` after a 429 and `Content-Disposition` to name a download.
  Other headers are readable only if the operator adds them with
  `--expose-header`; the client does not depend on any.
- Twenty failed authentications from one address in a minute return 429 for
  the rest of that minute.
- JSON bodies are limited to 1 MiB. Image upload is limited to 20 MiB.
- A non-loopback listener without TLS is allowed by the server with a
  warning; tokens and session content then travel in clear text. The client
  shows a persistent notice when it connects to such a server.
- `--allow-private-network` (or `server.allowPrivateNetwork` in `config.json`)
  makes the server answer a Private Network Access preflight with
  `Access-Control-Allow-Private-Network: true`. It is off by default. Current
  Chrome asks the operator instead of sending this preflight, so the client
  does not tell operators to turn it on for Chrome 142+ or Edge 143+. It may
  matter for older browsers; not verified.
- `--allow-origin` and `--allow-host` also live in `config.json` under
  `server` (`allowOrigins`, `allowHosts`). The client may show either form.
- Progress. `activity.changed` reports only `loading_tools`,
  `loading_plugins`, `compacting`, `waiting_for_model`, and `idle`. The
  progress row reads everything else from events the way the terminal does
  (`SessionRenderer`, `ProgressText`): `stream.reasoning` is Thinking,
  `stream.text` is Writing, `stream.tool-call` is Calling, `tools.called` and
  `approval.passed` are Running with the terminal's wording per tool,
  `tools.results` returns to Waiting, `retry.scheduled` counts down, and
  `approval.reviewing` is Reviewing. A pending approval or question wins. The
  elapsed time restarts whenever the wording changes. `SessionModel.step`
  holds the step; `session/progress.ts` turns it into text.
- Compaction summaries are in the snapshot. Every summary is a `system`
  message in `conversation` (heading `## Earlier context`), whatever the
  summary display setting says, so a refresh keeps it. The live
  `compaction.finished` event carries `summary` and `shown`; the client draws
  the summary from the `note` the server still sends when the setting shows it.
- Next-turn settings. A mode, approval, thinking, model, context, tier, or
  speed change made while a turn or compaction runs is recorded and applied on
  the next turn. `POST /input` answers `accepted: false` for a refused input
  and `pending: true` for a recorded one; the chrome's `pending` object lists
  what waits. The settings page keeps showing the active value and adds the
  waiting one as a note. It no longer disables model, context, or thinking
  during a turn. The status bar lists the waiting values.
- `report.document` carries a titled document with `paragraph`, `keyValues`,
  `table`, and `list` blocks (for example `/skills` and plugin commands). Every
  cell is drawn as text; an unknown block type falls back to its lines.
- Structured queries. `components/catalog` holds one tab per route
  (`/sessions`, `/models`, `/agents`, `/skills`, `/mcp`, `/plugins`, `/tasks`
  with `/tasks/{id}/logs`). Each loads on open and on the refresh button; the
  page keeps no copy and gets no event for them. An action is the same slash
  command the terminal uses, sent through `POST /input`, so the server keeps
  the scope rules (`/resume`, `/model`, `/skills` need admin). `GET /options`
  and `PUT /options/{id}` feed the prompt set and the feature switches on the
  settings page; `options.changed` keeps `SessionModel.options` current.
  A task log is plain text read from `logStartOffset`, in chunks.
- The chrome's `reviewer` and `extendedApproval` are `null` while off. The
  settings page shows them read-only.
- The toaster (`vue-sonner`) ships its own stylesheet and does not inject it.
  `ui/sonner/Sonner.vue` imports `vue-sonner/style.css`; without it the toasts
  render unpositioned at the bottom of the page.

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
- The page never connects, and never fills the address or token, from its own
  URL (path, query, or fragment). Only the operator's typed input does.
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
  Recommended: `fetch` stream.
- Whether the hosting platform can set response headers, so the Content
  Security Policy above can include `frame-ancestors`.
- The permission name each browser accepts in `navigator.permissions.query`,
  and Firefox and Safari behavior for HTTPS to HTTP targets.
- Whether a self-signed server certificate accepted in a browser tab applies
  to cross-origin `fetch` from the hosted page.
- Folder names for `protocol`, `connection`, `session`, `render`, `i18n`, and
  `theme`. The scaffold has `src/components` and `src/lib` (shadcn aliases in
  `components.json`).
- How to enforce the dependency direction and the parity requirement (every
  `GET /info` capability handled or excluded). Needs a test framework or a
  lint tool, both of which need dependency approval.
- Whether the build uses a relative `base` so it can live under any path.
  The invariant that it needs no rewrite rules stands.
