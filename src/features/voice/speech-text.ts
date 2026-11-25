/**
 * Prepares reply text for text-to-speech: strips Markdown noise and splits
 * into short chunks. Browsers (notably Chrome) cut off long utterances, so
 * speech is queued sentence by sentence instead.
 */

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // never read code blocks aloud
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/[*_`#>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_CHUNK_CHARS = 200;

/** Splits on sentence ends, then packs sentences into chunks of at most ~200 characters. */
export function chunkForSpeech(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const clean = cleanForSpeech(text);
  if (!clean) return [];

  const sentences = clean.split(/(?<=[.!?…])\s+/);
  const pieces: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      pieces.push(sentence);
      continue;
    }
    // A very long sentence: break at commas/spaces.
    let rest = sentence;
    while (rest.length > maxChars) {
      const window = rest.slice(0, maxChars);
      const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf(" "));
      const at = cut > maxChars / 2 ? cut + 1 : maxChars;
      pieces.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) pieces.push(rest);
  }

  const chunks: string[] = [];
  for (const piece of pieces) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + piece.length + 1 <= maxChars) {
      chunks[chunks.length - 1] = `${last} ${piece}`;
    } else {
      chunks.push(piece);
    }
  }
  return chunks;
}
