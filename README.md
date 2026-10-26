# Crystal Code Web

Browser front end for `crystal server`, the HTTP surface of
[Crystal Code](../CrystalCode). Enter a server address and, if the server
requires one, a token. The client drives that server's session from the
browser.

Status: early scaffold. The connection and session features are planned and
not built yet. See [BUSINESS.md](BUSINESS.md).

## Requirements

- Node.js and pnpm. npm is not supported.
- A running `crystal server`. See `../CrystalCode/docs/server.md`.

## Run

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

The output in `dist/` is static and carries no server address. The intended
deployment is one public HTTPS site. Operators open it and type their own
server address, public or on a local network. The same build can be served
over HTTP on a local network.

## Connecting from a browser

- Start the server with `--allow-origin` naming the site you opened, for
  example `--allow-origin https://example.com`.
- A server reached by a LAN address or a public name needs that name in
  `--allow-host` when it listens on `0.0.0.0`.
- An HTTPS page cannot reach a plain `http://` public server. A plain
  `http://` local network or localhost server works only in browsers that
  support the Local Network Access permission (Chrome and Edge) and after you
  allow it. The reliable fix is TLS on the server (`--tls-cert`, `--tls-key`).
  The client explains this when it applies.

## Documents

- [BUSINESS.md](BUSINESS.md): scope, terminology, acceptance
- [ARCHITECTURE.md](ARCHITECTURE.md): ownership, flow, mixed-content rules
- [STANDARDS.md](STANDARDS.md): code, dependencies, verification
- [AGENTS.md](AGENTS.md): instructions for coding agents
