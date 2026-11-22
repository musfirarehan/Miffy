let counter = 0;

/**
 * Client-side unique id. Avoids `crypto.randomUUID`, which is unavailable on
 * non-secure origins. Persistent ids will come from the database later.
 */
export function createId(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
