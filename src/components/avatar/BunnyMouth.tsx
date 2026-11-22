import type { BunnyExpression } from "@/types/avatar";

export function BunnyMouth({ expression }: { expression: BunnyExpression }) {
  switch (expression) {
    case "happy":
      return (
        <path className="bunny-mouth-fill" d="M91 155 Q100 173 109 155 Z" />
      );
    case "excited":
      return (
        <g>
          <path className="bunny-mouth-fill" d="M88 154 Q100 181 112 154 Z" />
          <ellipse className="bunny-tongue" cx="100" cy="164" rx="5.5" ry="3.2" />
        </g>
      );
    case "thinking":
      return <path className="bunny-line" d="M94 159 Q100 157 107 158" />;
    case "listening":
      return (
        <circle
          className="bunny-mouth-fill"
          cx="100"
          cy="159"
          r="3.4"
          style={{ fill: "var(--color-blush-200)" }}
        />
      );
    case "speaking":
      return (
        <g className="bunny-talk">
          <ellipse className="bunny-mouth-fill" cx="100" cy="159" rx="6.5" ry="5.5" />
        </g>
      );
    case "confused":
      return <path className="bunny-line" d="M92 159 Q96 154 100 159 T108 159" />;
    case "sleepy":
      return (
        <ellipse className="bunny-mouth-fill" cx="100" cy="159" rx="2.8" ry="2.2" />
      );
    case "sad":
      return <path className="bunny-line" d="M93 163 Q100 154 107 163" />;
    case "mischievous":
      return <path className="bunny-line" d="M92 159 Q102 165 112 153" />;
    default:
      return <path className="bunny-line" d="M93 157 Q100 164 107 157" />;
  }
}
