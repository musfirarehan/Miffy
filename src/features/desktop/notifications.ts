/**
 * Desktop notifications through the standard Web Notification API, which the
 * Windows WebView2 shell and normal browsers both support. Permission is only
 * ever requested from a user click.
 */

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

export function notificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a notification only if allowed and the user isn't already looking at the window. */
export function notifyReply(title: string, body: string, onClick: () => void): void {
  if (notificationPermission() !== "granted" || document.hasFocus()) return;
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return;
  try {
    const n = new Notification(title, {
      body: text.length > 140 ? `${text.slice(0, 137)}…` : text,
      silent: true,
    });
    n.onclick = () => {
      onClick();
      n.close();
    };
  } catch {
    // Some shells throw if notifications aren't wired up; nothing to do.
  }
}
