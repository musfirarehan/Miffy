import type { CSSProperties } from "react";

import type { BunnyExpression } from "@/types/avatar";

/** Four-point sparkle centred on the origin. */
function sparklePath(r: number): string {
  const k = r * 0.16;
  return `M0 ${-r} Q${k} ${-k} ${r} 0 Q${k} ${k} 0 ${r} Q${-k} ${k} ${-r} 0 Q${-k} ${-k} 0 ${-r}Z`;
}

/** Small heart centred on the origin. */
function heartPath(s: number): string {
  return `M0 ${3 * s} C${-6 * s} ${-1 * s} ${-3 * s} ${-6 * s} 0 ${-2.5 * s} C${3 * s} ${-6 * s} ${6 * s} ${-1 * s} 0 ${3 * s}Z`;
}

const delay = (seconds: number): CSSProperties => ({
  animationDelay: `${seconds}s`,
});

/**
 * Decorative effects around the character (thought dots, sparkles, sound
 * waves...). Each animated shape sits inside a positioning <g> so the CSS
 * animation transform never fights the SVG transform attribute.
 */
export function BunnyEffects({ expression }: { expression: BunnyExpression }) {
  switch (expression) {
    case "thinking":
      return (
        <g aria-hidden="true">
          {[
            { x: 158, y: 74, r: 3.2, d: 0 },
            { x: 171, y: 58, r: 4.8, d: 0.25 },
            { x: 187, y: 36, r: 7, d: 0.5 },
          ].map((dot) => (
            <circle
              key={dot.d}
              className="bunny-fx bunny-fx-pulse"
              style={{
                ...delay(dot.d),
                fill: "var(--color-lilac-200)",
                stroke: "var(--color-lilac-400)",
                strokeWidth: 1.6,
              }}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
            />
          ))}
        </g>
      );

    case "listening":
      return (
        <g
          aria-hidden="true"
          fill="none"
          strokeLinecap="round"
          strokeWidth={3}
          style={{ stroke: "var(--color-blush-300)" }}
        >
          <path className="bunny-fx-pulse" d="M162 128 Q173 143 162 158" />
          <path
            className="bunny-fx-pulse"
            style={delay(0.3)}
            d="M171 117 Q190 143 171 169"
          />
          <path className="bunny-fx-pulse" d="M38 128 Q27 143 38 158" />
          <path
            className="bunny-fx-pulse"
            style={delay(0.3)}
            d="M29 117 Q10 143 29 169"
          />
        </g>
      );

    case "speaking":
      return (
        <g
          aria-hidden="true"
          fill="none"
          strokeLinecap="round"
          strokeWidth={3}
          style={{ stroke: "var(--color-blush-300)" }}
        >
          <path className="bunny-fx-pulse" d="M163 140 Q173 152 163 164" />
          <path
            className="bunny-fx-pulse"
            style={delay(0.25)}
            d="M171 131 Q188 152 171 173"
          />
        </g>
      );

    case "excited":
      return (
        <g aria-hidden="true">
          <g transform="translate(30 98)">
            <path
              className="bunny-fx bunny-fx-twinkle"
              style={{ fill: "var(--color-blush-300)" }}
              d={sparklePath(10)}
            />
          </g>
          <g transform="translate(172 86)">
            <path
              className="bunny-fx bunny-fx-twinkle"
              style={{ ...delay(0.4), fill: "var(--color-lilac-400)" }}
              d={sparklePath(12)}
            />
          </g>
          <g transform="translate(150 34)">
            <path
              className="bunny-fx bunny-fx-twinkle"
              style={{ ...delay(0.8), fill: "var(--color-blush-300)" }}
              d={sparklePath(8)}
            />
          </g>
        </g>
      );

    case "happy":
      return (
        <g aria-hidden="true">
          <g transform="translate(168 96)">
            <path
              className="bunny-fx bunny-fx-rise"
              style={{ fill: "var(--color-blush-300)" }}
              d={heartPath(1.5)}
            />
          </g>
          <g transform="translate(34 110)">
            <path
              className="bunny-fx bunny-fx-rise"
              style={{ ...delay(1.2), fill: "var(--color-blush-200)" }}
              d={heartPath(1.1)}
            />
          </g>
        </g>
      );

    case "sleepy":
      return (
        <g
          aria-hidden="true"
          fontFamily="var(--font-fraunces), Georgia, serif"
          fontWeight={600}
          style={{ fill: "var(--color-lilac-400)" }}
        >
          <g transform="translate(150 84)">
            <text className="bunny-fx bunny-fx-rise" fontSize="16">
              z
            </text>
          </g>
          <g transform="translate(164 64)">
            <text className="bunny-fx bunny-fx-rise" style={delay(0.7)} fontSize="21">
              z
            </text>
          </g>
          <g transform="translate(180 38)">
            <text className="bunny-fx bunny-fx-rise" style={delay(1.4)} fontSize="26">
              Z
            </text>
          </g>
        </g>
      );

    case "confused":
      return (
        <g aria-hidden="true" transform="translate(158 66)">
          <text
            className="bunny-fx bunny-fx-wobble"
            fontFamily="var(--font-fraunces), Georgia, serif"
            fontSize="38"
            fontWeight={700}
            style={{ fill: "var(--color-mauve-500)" }}
          >
            ?
          </text>
        </g>
      );

    case "sad":
      return (
        <g aria-hidden="true" transform="translate(72 150)">
          <path
            className="bunny-fx bunny-fx-drip"
            d="M0 0 Q-4.5 8 0 12 Q4.5 8 0 0Z"
            style={{
              fill: "var(--color-lilac-200)",
              stroke: "var(--color-lilac-400)",
              strokeWidth: 1.6,
              strokeLinejoin: "round",
            }}
          />
        </g>
      );

    case "mischievous":
      return (
        <g aria-hidden="true" transform="translate(163 112)">
          <path
            className="bunny-fx bunny-fx-twinkle"
            style={{ fill: "var(--color-lilac-400)" }}
            d={sparklePath(8)}
          />
        </g>
      );

    default:
      return null;
  }
}
