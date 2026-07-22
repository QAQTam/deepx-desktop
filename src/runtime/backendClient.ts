type Listener<T = unknown> = (event: { payload: T }) => void;
type UnlistenFn = () => void;
type ControlMessage =
  | { type: "event"; seed: string; event: unknown }
  | { type: "session_activity"; activity: unknown }
  | { type: "snapshot"; snapshot: { activities?: unknown[]; attached_sessions?: string[]; session_events?: Record<string, unknown[]> } }
  | { type: string; [key: string]: unknown };

const listeners = new Map<string, Set<Listener>>();
const attached = new Set<string>();
let bridgeReady = false;

function ensureBridgeListener(): void {
  if (bridgeReady) return;
  bridgeReady = true;
  window.deepx.backend.onMessage(payload => {
    if (payload.type === "event") dispatch(`agent-${String(payload.seed)}-event`, payload.event);
    else if (payload.type === "session_activity") dispatch("session-activity", payload.activity);
    else if (payload.type === "snapshot") {
      const snapshot = payload.snapshot as { activities?: unknown[]; attached_sessions?: string[]; session_events?: Record<string, unknown[]> };
      for (const seed of snapshot.attached_sessions ?? []) attached.add(seed);
      for (const activity of snapshot.activities ?? []) dispatch("session-activity", activity);
      for (const [seed, events] of Object.entries(snapshot.session_events ?? {})) {
        for (const event of events) dispatch(`agent-${seed}-event`, event);
      }
      dispatch("backend-snapshot", snapshot);
    } else if (payload.type === "error" && payload.code === "disconnected") attached.clear();
    dispatch("backend-message", payload);
  });
  window.deepx.backend.onStatus(payload => dispatch("backend-status", payload));
}

function dispatch(name: string, payload: unknown): void {
  for (const listener of listeners.get(name) ?? []) listener({ payload });
}

async function attach(seed: string): Promise<void> {
  if (!seed || attached.has(seed)) return;
  ensureBridgeListener();
  await window.deepx.backend.attach(seed);
  attached.add(seed);
}

export async function request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  ensureBridgeListener();
  const seed = typeof params.seed === "string" ? params.seed : "";
  const domain = method.split(".", 1)[0];
  const needsLease = ["session", "interaction", "workspace", "git", "plan", "skills"].includes(domain)
    && !["session.list", "session.activity", "session.new", "skills.list_tools"].includes(method);
  if (needsLease && seed) await attach(seed);
  return window.deepx.backend.request(method, params) as Promise<T>;
}

export async function connect(): Promise<void> {
  ensureBridgeListener();
  await window.deepx.backend.connect();
}

export async function backendStatus(): Promise<{ connected: boolean; error?: string }> {
  return window.deepx.backend.status();
}

export async function listen<T>(name: string, listener: Listener<T>): Promise<UnlistenFn> {
  ensureBridgeListener();
  const bucket = listeners.get(name) ?? new Set<Listener>();
  const erased = listener as Listener;
  bucket.add(erased);
  listeners.set(name, bucket);
  return () => {
    bucket.delete(erased);
    if (bucket.size === 0) listeners.delete(name);
  };
}

export async function detachSession(seed: string): Promise<void> {
  if (!attached.delete(seed)) return;
  await window.deepx.backend.detach(seed);
}
