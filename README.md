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

Closing Desktop does not stop the daemon or running Agent workers.
