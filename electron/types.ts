export interface DaemonDiscovery {
  endpoint: string;
  token: string;
  pid: number;
  server_epoch: string;
  protocol_version: number;
}

export type ControlMessage = {
  type: string;
  request_id?: string;
  code?: string;
  message?: string;
  result?: unknown;
  [key: string]: unknown;
};

export interface BackendStatus {
  connected: boolean;
  error?: string;
}

export interface OpenDialogOptions {
  directory?: boolean;
  multiple?: boolean;
  title?: string;
}

export interface ConfirmDialogOptions {
  title?: string;
  kind?: "info" | "warning" | "error";
}
