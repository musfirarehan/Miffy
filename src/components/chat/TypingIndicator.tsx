/** Three softly bouncing dots shown while Bunny hasn't started replying. */
export function TypingIndicator() {
  return (
    <li className="flex animate-fade-up justify-start">
      <div
        role="status"
        aria-label="Bunny is thinking"
        className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-blush-100 bg-white px-4 py-3.5 shadow-soft"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 140}ms` }}
            className="size-2 animate-bounce rounded-full bg-blush-300 motion-reduce:animate-none"
          />
        ))}
      </div>
    </li>
  );
}
