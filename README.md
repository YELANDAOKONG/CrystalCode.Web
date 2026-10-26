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

The output in `dist/` is static. Host it on HTTPS, or self-host it over HTTP
on a local network. It carries no server address.

## Connecting from a browser

- The server must list this page's origin with `--allow-origin`.
- A server reached by a LAN address needs `--allow-host <address>`.
- An HTTPS page cannot reach a plain `http://` LAN server in most browsers.
  Give the server a certificate (`--tls-cert`, `--tls-key`), or open this
  client from an `http://` host. The client explains this when it applies.

## Documents

- [BUSINESS.md](BUSINESS.md): scope, terminology, acceptance
- [ARCHITECTURE.md](ARCHITECTURE.md): ownership, flow, mixed-content rules
- [STANDARDS.md](STANDARDS.md): code, dependencies, verification
- [AGENTS.md](AGENTS.md): instructions for coding agents
