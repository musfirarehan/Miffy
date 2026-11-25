/**
 * Full-page navigation (not a client-side route change). Used after signing
 * in or out and when a session expires: a real page load discards all client
 * state and guarantees the proxy sees the up-to-date session cookie.
 */
export function hardNavigate(path: string): void {
  window.location.href = path;
}
