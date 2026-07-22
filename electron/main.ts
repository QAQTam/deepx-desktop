import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { DaemonControlClient } from "./controlClient";
import type { ConfirmDialogOptions, OpenDialogOptions } from "./types";

let mainWindow: BrowserWindow | undefined;
let quitting = false;
const smokeMode = process.env.DEEPX_DESKTOP_SMOKE === "1" || process.argv.includes("--deepx-smoke");
const backend = new DaemonControlClient(
  message => sendToRenderer("backend:message", message),
  status => sendToRenderer("backend:status", status),
);

if (smokeMode) {
  setTimeout(() => {
    void backend.close();
    console.error("Electron smoke test timed out before the preload/backend bridge was ready");
    app.exit(1);
  }, 30_000);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: "DeepX",
    width: 1200,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`Failed to load preload ${preloadPath}:`, error);
  });
  if (smokeMode) {
    mainWindow.webContents.once("did-finish-load", async () => {
      const bridgeReady = await mainWindow?.webContents.executeJavaScript(
        "Boolean(window.deepx?.backend && window.deepx?.desktop)",
      );
      let backendReady = false;
      if (bridgeReady) {
        try {
          await backend.connect();
          backendReady = backend.currentStatus().connected;
        } catch (error) {
          console.error("Electron backend lifecycle smoke test failed:", error);
        }
      }
      await backend.close();
      if (!bridgeReady) console.error("Electron preload bridge was not exposed to the renderer");
      if (!backendReady) console.error("Electron could not connect to a compatible daemon");
      app.exit(bridgeReady && backendReady ? 0 : 1);
    });
  }
  if (!smokeMode) mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", event => event.preventDefault());

  if (process.env.ELECTRON_RENDERER_URL) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

function registerIpc(): void {
  ipcMain.handle("backend:connect", () => backend.connect());
  ipcMain.handle("backend:request", (_event, method: unknown, params: unknown) => {
    if (typeof method !== "string" || !isRecord(params)) throw new Error("invalid backend request");
    return backend.request(method, params);
  });
  ipcMain.handle("backend:attach", (_event, seed: unknown) => backend.attach(requireSeed(seed)));
  ipcMain.handle("backend:detach", (_event, seed: unknown) => backend.detach(requireSeed(seed)));
  ipcMain.handle("backend:status", () => backend.currentStatus());
  ipcMain.handle("desktop:open-dialog", async (_event, raw: OpenDialogOptions = {}) => {
    const options = isRecord(raw) ? raw : {};
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: typeof options.title === "string" ? options.title : undefined,
      properties: [options.directory ? "openDirectory" : "openFile", ...(options.multiple ? ["multiSelections" as const] : [])],
    });
    if (result.canceled) return null;
    return options.multiple ? result.filePaths : (result.filePaths[0] ?? null);
  });
  ipcMain.handle("desktop:confirm", async (_event, message: unknown, raw: ConfirmDialogOptions = {}) => {
    if (typeof message !== "string") throw new Error("invalid confirmation message");
    const options = isRecord(raw) ? raw : {};
    const result = await dialog.showMessageBox(mainWindow!, {
      type: options.kind === "error" || options.kind === "warning" ? options.kind : "info",
      title: typeof options.title === "string" ? options.title : "DeepX",
      message,
      buttons: ["OK"],
    });
    return result.response === 0;
  });
  ipcMain.handle("desktop:open-path", async (_event, target: unknown) => {
    if (typeof target !== "string" || !target) throw new Error("invalid path");
    if (/^https?:\/\//i.test(target)) {
      await shell.openExternal(target);
      return;
    }
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  });
}

function sendToRenderer(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function requireSeed(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("session seed is required");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  void backend.connect().catch(() => {});
  // Smoke mode validates that Electron can create the secured renderer and start
  // the backend connection path. Reconnection is intentionally unbounded in the
  // product, so the smoke process needs its own deterministic deadline.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", event => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  void backend.close().finally(() => app.quit());
});
