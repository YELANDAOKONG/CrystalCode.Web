# Product Definition

Recorded 2026-10-26 from `../CrystalCode` (`docs/server.md`, `BUSINESS.md`,
`ARCHITECTURE.md`, `STANDARDS.md`, `CrystalCode.Server/Security`), the sibling
sites `../CrystalCode.Website` and `../CrystalCode.Website.Documents`, and the
owner's answers. The two sibling sites lag the product; where they disagree
with `../CrystalCode`, the product repository wins.

Status words used in this file: Current, Planned, Deferred, Forbidden, Open
question.

## Mission

Crystal Code Web is a browser front end for `crystal server`, the HTTP surface
of Crystal Code (`../CrystalCode`). It is deployed once as a public HTTPS site,
for example `https://example.com`. An operator starts `crystal server` in a
workspace, opens that site in any browser, types the server's address (public
or local network) and a token if one is needed, and drives the one active
coding session from the browser. The site holds no list of servers and is tied
to no address.

It is a front end. It holds no product logic. Approval, trust, the workspace
fence, compaction, and tool execution stay in the server process. The client
shows what the server reports and sends what the operator chooses.

## Intended users

- Developers who already run Crystal Code in a terminal and want a graphical
  view of the same session, on the same machine, on another machine in the
  local network, or on a server reachable over the internet.
- Operators who start `crystal server` from a wrapper or a remote shell and
  need a client that is not tied to one address.

The client is not written for people without a running `crystal server`. It
does not start, install, or manage one.

## Terminology

| Term | Meaning |
| :--- | :--- |
| Crystal Code | The product (`../CrystalCode`). This is also the name shown in this client's interface, page title, and window chrome. |
| Crystal Code Web | This repository and project, in documents and conversation. Package name stays `crystalcode-web`. Do not show "Crystal Code Web" in the interface. |
| Server | A running `crystal server` process. One server hosts one active session. |
| Client | One browser page of this project, identified to the server by `X-Crystal-Client`. |
| Scope | `observe`, `operate`, or `admin`. Granted to a token by the server. |
| Interaction | A question the server needs an operator to answer: `approval`, `question`, `trust`, `choose_session`, `choose_child`. |
| Snapshot | The state returned by `GET /snapshot`. Authoritative for redraw. |

## Current product

Current: a Vue 3 + TypeScript + Vite + Tailwind 4 scaffold. `src/App.vue`
renders the starter `HelloWorld` component. There is no connection code, no
protocol code, and no test framework. `pnpm build` passes. Nothing in the
Planned list below exists.

## Planned product (first release)

The first release targets the full capability set of the server, not a subset.
The server lists its own capabilities in `GET /info` (`operations`,
`eventTypes`, `interactionKinds`, `slashCommands`). The client covers all of
them or records an exclusion under "Exclusions" below.

Connection:

- Connect to any address the operator types: host and port, with a scheme.
  Public and local network addresses are equal cases. Nothing about a specific
  address is built in.
- Send a bearer token when the operator provides one. A server started with
  `--auth none` needs none.
- Remember addresses between visits. Keep the token in memory only unless the
  operator ticks a box to keep it for the current tab (see Data).
- Show the server state (`starting`, `awaiting_operator`, `ready`, `closing`,
  `failed`) and the granted scope.
- Detect connections the browser may block before connecting. The main case
  is the public HTTPS page reaching an `http://` server. Say why, and list the
  legal ways out. Do not work around them. Where a browser asks the operator
  for the Local Network Access permission, explain the prompt. See
  [ARCHITECTURE.md](ARCHITECTURE.md).
- Tell the operator the server must be started with `--allow-origin` naming
  this site's origin, and show the exact flag, since every first connection
  needs it.
- Turn server failures into specific messages: 401 token, 403 scope, 429 rate
  limit, 503 session not ready, 421 host not allowed. Only a rejected Origin
  (403) reaches the page as a network failure; for a failed first request show
  a combined checklist instead of one guessed cause (see
  [ARCHITECTURE.md](ARCHITECTURE.md)).

Session:

- Draw the session from a snapshot, then follow the event stream by sequence
  number. Streamed text, readable reasoning, tool calls and results, retries,
  usage, context estimate, todos, follow-up queue, status fields, and
  activity.
- Reconnect by event sequence number. Redraw on `resync`, `conversation.cleared`,
  and `conversation.replayed`.
- Send prompts, slash commands, and follow-ups through `POST /input`. Release
  the queue with empty text. Interrupt, recall, and switch Plan, Work, and
  custom modes.
- Toggle verbose targets and report draft changes, as the terminal does.
- Run every slash command the server lists. Reports (`report.help`,
  `report.status`, `report.stats`, `report.tools`, `report.todos`) are shown
  to the client that asked.
- Settings chosen during a turn apply on the next turn. Show the active value
  and what waits.
- Show the approval and extended approval reviewers.
- A catalog dialog for the structured queries: saved sessions (resume), models
  (switch), Agents, skills (switch, rescan), MCP servers, plugins, and
  background tasks with their logs. A tab shows only when `GET /info` lists its
  route. Prompt set and the feature switches come from `GET /options` and
  change through `PUT /options/{id}`.
- MCP in the catalog: the master switch, reconnect, and a switch for every
  configured server. A disabled server stays in `GET /mcp`, so it can be turned
  back on. A session server (supplied by a front end), an invalid definition,
  and a replaced one show no switch.
- Resource description models (image, audio, video), the topic model and its
  switch, and the session topic, as session options in settings. The topic is
  the title of a saved session in the catalog.
- Show `report.document` results, such as `/skills` and plugin commands.
- Side questions (`/btw`) with cancel and clear.
- Upload images and view session and tool images.
- Quick prompts: list, fill into the composer, and send.
- Child Agents: list and inspect. A running child shows its work as it
  happens: reply text, reasoning, tool calls and results, errors, and what it
  is doing now. The server saves a child's archive only when an invocation
  starts and ends, so the live view is built from the child's events. A page
  that opens mid-run misses the earlier steps and says so; they appear when
  the child finishes.
- Export the conversation as Markdown or JSON through `GET /export`.
- Answer all five interaction kinds. An approval shows the call, its
  classification, the primary and extended review verdicts, and only the
  choices the server offers.
- Admin features when the token has the scope: issue and revoke tokens, and
  stop the server.

Interface:

- English is the source language. `zh-cn` and `zh-tw` are written by hand,
  page by page. Missing translations fall back to English.
- Visual language follows `../CrystalCode.Website`: Archivo and IBM Plex Mono,
  the cool ivory, blue-gray, and ice palette, light, dark, and auto themes,
  the crystal mark. Planned; the current stylesheet is still the starter.
- Responsive on desktop, tablet, and phone.

Model output is untrusted. It is rendered as Markdown with code highlighting
(markdown-it and shiki, approved by the owner) and never as raw HTML.

## Acceptance for the first release

1. The public HTTPS site connects to an `https://` server with a trusted
   certificate, public or local, with and without a token.
2. The public HTTPS site connects to an `http://` loopback server, and to an
   `http://` local network server in Chrome and Edge after the operator grants
   the permission.
3. Against an `http://` public server, or where the browser refuses, the client
   reports the restriction and the options instead of a generic network
   error.
4. A copy of the same build served over `http://` on a local network connects
   to a local network server.
5. Every entry in `operations`, `eventTypes`, `interactionKinds`, and
   `slashCommands` returned by `GET /info` is handled or listed under
   Exclusions. An unknown entry is ignored without breaking the page.
6. After a dropped connection the client resumes with no duplicated and no
   missing events, and redraws after `resync`.
7. A token never appears in a URL, in `localStorage`, in logs, in an error
   message, or in an export.
8. A model reply containing HTML or script text renders as inert text.
9. The build output contains no server address, origin, or token. A link to
   the site never connects or fills a token by itself.

## Exclusions

These are not part of the product:

- Embedding in Crystal Code. The client ships and runs separately and is not
  hosted by `crystal server`.
- A backend, proxy, or relay of our own, including a hosted relay for servers
  behind a firewall or a proxy to get around mixed-content blocking. The
  browser talks to the server directly. Reaching a server from the internet is
  the operator's setup (TLS, port, firewall).
- Several active sessions in one server. The server is one process, one
  session (deferred in `../CrystalCode/TODO.md`). A user who wants more
  connects to more servers.
- Reading the server discovery file (`~/.crystal/server/<pid>.json`). A
  browser cannot read it. The operator types the address and token.
- Starting, installing, or configuring `crystal server`, providers, or
  `config.json`.
- Network discovery of servers on the LAN.
- Product logic in the client: approval decisions, risk classification,
  compaction, budgets, trust, and the workspace fence.
- Account sign-in, user management, and cloud sync.
- Clipboard image paste through the server. `PasteClipboardImageAsync` reads
  the server's clipboard and the server excludes it; image upload replaces it.
- Status-line gauges and ordering (`statusLineRules`, `statusLineDrop`, theme
  gauges). The client draws the server's `statusFields` text as received and
  does not color or reorder it.
- Writing an export to the server's disk. `/export` is passed through to the
  server as typed, and the download button uses `GET /export`.

Forbidden:

- Putting a long-lived token in a URL.
- Rendering model output, server text, or tool output as HTML.
- Fetching remote images named in model Markdown automatically.
- Any request to a host other than the server the operator entered and the
  site that served the page. This includes web fonts, analytics, and icon
  CDNs.
- Connecting, or filling an address or token, from the page URL.
- Changing `../CrystalCode` from this repository.

## Deferred

Not scheduled. Do not implement without a new decision.

- Offline use, service worker, and installable app.
- A browser-side permission to remember tokens beyond the tab.
- A desktop or mobile wrapper.

## Data

The client stores in the browser only:

- the list of server addresses the operator saved, in `localStorage`;
- interface preferences such as theme and language, in `localStorage`;
- optionally, one token per address in `sessionStorage` when the operator ticks
  the box. It is cleared with the tab.

The client does not store conversation content, images, or exports. The server
owns session persistence under `~/.crystal`.

An address with embedded credentials (`user:pass@host`) is rejected.

## Relationship to Crystal Code

`../CrystalCode` is read only for this repository. Its `docs/server.md` and the
code under `CrystalCode.Server` are the protocol contract. The protocol has no
version identifier. The client learns what a server supports from `GET /info`
and does not assume a build.

When the client needs a server change, record it as a requirement for the
server owner. Do not edit `../CrystalCode`. Known requirement notes live in
[ARCHITECTURE.md](ARCHITECTURE.md) under "Server facts the client depends on".

The sibling sites describe the product's audience and position, not this
client. Their wording lags the product. Do not copy their feature claims.

## Runtime language

Interface text is English by default and localized to `zh-cn` and `zh-tw`
through hand-written resources. Text produced by the server (problem details,
notes, errors, tool output, slash command reports) is shown exactly as
received and is not translated. Interface text contains no emoji.

## Open questions

- Which browsers are supported. Chrome and Edge behavior for HTTPS to local
  network is documented (Chrome 142, Edge 143); Firefox and Safari behavior is
  not verified.
- Whether one page may hold several server connections at once. Recommended
  default: one active connection per tab.
- How the terminal shortcuts (Tab and Shift+Tab mode cycle, F6 quick prompts,
  F7 child picker, Ctrl+O and Ctrl+G verbose, Ctrl+C recall) map to the
  browser, where several are reserved by the browser.
- The scheme to assume when the operator types `host:port` with no scheme.
  Recommended default: `https://`, with the scheme shown and editable, because
  the hosted page is HTTPS and an `http://` guess would be blocked.
- The official hosting domain and platform. `example.com` is a placeholder
  and appears nowhere in the build.
- Whether to ship a documented self-host recipe for the HTTP local network
  case (a static folder served by any web server) or only mention it.
