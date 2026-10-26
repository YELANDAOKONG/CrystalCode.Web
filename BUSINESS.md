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
of Crystal Code (`../CrystalCode`). An operator starts `crystal server` in a
workspace, opens this client, enters the server address and a token if one is
needed, and drives the one active coding session from the browser.

It is a front end. It holds no product logic. Approval, trust, the workspace
fence, compaction, and tool execution stay in the server process. The client
shows what the server reports and sends what the operator chooses.

## Intended users

- Developers who already run Crystal Code in a terminal and want a graphical
  view of the same session, on the same machine or on another machine in the
  local network.
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
protocol code, and no test framework. `pnpm build` currently fails and the
lockfile is out of date (see [STANDARDS.md](STANDARDS.md)). Nothing in the
Planned list below exists.

## Planned product (first release)

The first release targets the full capability set of the server, not a subset.
The server lists its own capabilities in `GET /info` (`operations`,
`eventTypes`, `interactionKinds`, `slashCommands`). The client covers all of
them or records an exclusion under "Exclusions" below.

Connection:

- Connect to any address the operator types: host and port, with a scheme.
  Nothing about a specific address is built in.
- Send a bearer token when the operator provides one. A server started with
  `--auth none` needs none.
- Remember addresses between visits. Keep the token in memory only unless the
  operator ticks a box to keep it for the current tab (see Data).
- Show the server state (`starting`, `awaiting_operator`, `ready`, `closing`,
  `failed`) and the granted scope.
- Detect connections the browser will block (an HTTPS page reaching an HTTP
  server) before connecting, say why, and list the legal ways out. Do not
  work around them. See [ARCHITECTURE.md](ARCHITECTURE.md).
- Turn server failures into specific messages: 401 token, 403 scope or
  Origin, 421 Host, 429 rate limit, 503 session not ready, network failure.

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
- Side questions (`/btw`) with cancel and clear.
- Upload images and view session and tool images.
- Quick prompts: list, fill into the composer, and send.
- Child Agents: list and inspect.
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

1. A client served over plain HTTP from a local or LAN static host connects to
   a loopback server and to a LAN server on `http://`, with and without a
   token.
2. A client served over HTTPS connects to a server that has TLS. Against an
   `http://` LAN server the client reports the browser restriction and the
   options instead of a generic network error.
3. Every entry in `operations`, `eventTypes`, `interactionKinds`, and
   `slashCommands` returned by `GET /info` is handled or listed under
   Exclusions. An unknown entry is ignored without breaking the page.
4. After a dropped connection the client resumes with no duplicated and no
   missing events, and redraws after `resync`.
5. A token never appears in a URL, in `localStorage`, in logs, in an error
   message, or in an export.
6. A model reply containing HTML or script text renders as inert text.
7. The build output contains no server address, origin, or token.

## Exclusions

These are not part of the product:

- Embedding in Crystal Code. The client ships and runs separately and is not
  hosted by `crystal server`.
- A backend, proxy, or relay of our own. The browser talks to the server
  directly. This includes a proxy to get around mixed-content blocking.
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
- Writing an export to the server's disk. `/export` is passed through to the
  server as typed, and the download button uses `GET /export`.

Forbidden:

- Putting a long-lived token in a URL.
- Rendering model output, server text, or tool output as HTML.
- Fetching remote images named in model Markdown automatically.
- Any request to a host other than the server the operator entered. This
  includes web fonts, analytics, and icon CDNs.
- Changing `../CrystalCode` from this repository.

## Deferred

Not scheduled. Do not implement without a new decision.

- Offline use, service worker, and installable app.
- A fixed official hosting domain. None exists yet.
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
  network is documented; Firefox and Safari behavior is not verified.
- Whether one page may hold several server connections at once. Recommended
  default: one active connection per tab.
- How the terminal shortcuts (Tab and Shift+Tab mode cycle, F6 quick prompts,
  F7 child picker, Ctrl+O and Ctrl+G verbose, Ctrl+C recall) map to the
  browser, where several are reserved by the browser.
- The scheme to assume when the operator types `host:port` with no scheme.
  Recommended default: match the page scheme, and show the choice.
- Hosting domain for an official build, if any.
