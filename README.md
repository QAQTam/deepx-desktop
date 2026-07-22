# DeepX Desktop

Independent Electron + SolidJS frontend for the DeepX Rust daemon.

## Architecture

```text
SolidJS renderer
      │ narrow contextBridge API
Electron preload
      │ validated IPC
Electron main
      │ authenticated loopback WebSocket
deepx-daemon (D:\DeepX)
```

The renderer has no Node.js integration and never reads the daemon discovery token. Electron Main owns daemon discovery, detached startup, request correlation, heartbeats, reconnects, leases, native dialogs, and opening local paths.

## Development

Build the backend daemon first:

```powershell
cd D:\DeepX
cargo build -p deepx-daemon
```

Then run the desktop project:

```powershell
cd D:\deepx-desktop
pnpm install
pnpm dev
```

Validation:

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Windows package

The packaging step builds the sibling Rust daemon in release mode, stages it as
an Electron extra resource, and produces an x64 NSIS installer:

```powershell
pnpm package:win
```

Artifacts are written to `release/`. If the backend repository is not located at
`D:\DeepX`, set `DEEPX_BACKEND_ROOT` before packaging. Use `pnpm package:dir` to
produce only an unpacked application for quick integration checks.

Closing Desktop does not stop the daemon or running Agent workers.
