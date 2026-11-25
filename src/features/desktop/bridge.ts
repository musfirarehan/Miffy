/**
 * Bridge to the Windows desktop shell (Tauri). Everything here is a no-op in
 * a normal browser, so the same web app runs in both places.
 *
 * Only these three app-defined commands are exposed to the page (see
 * desktop/src-tauri/permissions and capabilities). There is no shell, file
 * system or arbitrary-URL access from the web content.
 */

interface TauriGlobal {
  core: { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
}

type DesktopCommand = "set_companion_expanded" | "open_main_window" | "hide_companion";

function tauri(): TauriGlobal | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
  return candidate?.core?.invoke ? candidate : null;
}

export function isDesktop(): boolean {
  return tauri() !== null;
}

/** Runs a desktop command. Resolves false (never throws) when unavailable or failed. */
export async function desktopCommand(
  command: DesktopCommand,
  args?: Record<string, unknown>,
): Promise<boolean> {
  const bridge = tauri();
  if (!bridge) return false;
  try {
    await bridge.core.invoke(command, args);
    return true;
  } catch {
    return false;
  }
}
