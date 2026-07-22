export interface OpenDialogOptions {
  directory?: boolean;
  multiple?: boolean;
  title?: string;
}

export interface ConfirmDialogOptions {
  title?: string;
  kind?: "info" | "warning" | "error";
}

export function openDialog(options: OpenDialogOptions = {}): Promise<string | string[] | null> {
  return window.deepx.desktop.openDialog(options);
}

export function confirmDialog(message: string, options?: ConfirmDialogOptions): Promise<boolean> {
  return window.deepx.desktop.confirm(message, options);
}

export function openPath(target: string): Promise<void> {
  return window.deepx.desktop.openPath(target);
}
