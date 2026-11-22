import type { BunnyExpression } from "@/types/avatar";
import { cn } from "@/lib/utilities/cn";

import { BunnyEffects } from "./BunnyEffects";
import { BunnyEyes } from "./BunnyEyes";
import { BunnyMouth } from "./BunnyMouth";
import {
  BLINKING,
  EAR_POSE,
  EAR_TWITCH,
  EXPRESSION_LABEL,
} from "./expressions";

interface BunnyAvatarProps {
  expression?: BunnyExpression;
  /** Rendered width in px. Height follows the 4:5 aspect ratio. */
  size?: number;
  /** Set false for a still avatar (e.g. tiny sidebar logo). */
  animated?: boolean;
  className?: string;
}

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 250;

interface EarProps {
  side: "l" | "r";
  cx: number;
  rotation: number;
  twitch: boolean;
}

function Ear({ side, cx, rotation, twitch }: EarProps) {
  return (
    <g
      className={cn("bunny-ear", side === "l" ? "bunny-ear-l" : "bunny-ear-r")}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <g className={twitch && side === "r" ? "bunny-twitch" : undefined}>
        <ellipse className="bunny-shape" cx={cx} cy="58" rx="19" ry="46" />
        <ellipse className="bunny-inner-ear" cx={cx} cy="62" rx="9" ry="29" />
      </g>
    </g>
  );
}

/**
 * Original minimalist white bunny mascot.
 *
 * Purely presentational: pick an `expression` and the face, ears, body motion
 * and floating effects all follow. All styling lives in globals.css so the
 * markup stays small and easy to extend with new states.
 */
export function BunnyAvatar({
  expression = "idle",
  size = 160,
  animated = true,
  className,
}: BunnyAvatarProps) {
  const ears = EAR_POSE[expression];
  const twitch = EAR_TWITCH.has(expression);

  return (
    <svg
      className={cn("bunny-root", !animated && "bunny-static", className)}
      width={size}
      height={(size * VIEW_HEIGHT) / VIEW_WIDTH}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={`Bunny, looking ${EXPRESSION_LABEL[expression]}`}
      data-expression={expression}
    >
      <ellipse className="bunny-shadow" cx="100" cy="247" rx="52" ry="4.5" />

      <g className={`bunny-move bunny-move-${expression}`}>
        {/* Feet, body, arms */}
        <ellipse className="bunny-shape" cx="80" cy="238" rx="15" ry="9" />
        <ellipse className="bunny-shape" cx="120" cy="238" rx="15" ry="9" />
        <ellipse className="bunny-shape" cx="100" cy="206" rx="38" ry="34" />
        <ellipse
          className="bunny-shape"
          cx="62"
          cy="202"
          rx="9"
          ry="17"
          transform="rotate(14 62 202)"
        />
        <ellipse
          className="bunny-shape"
          cx="138"
          cy="202"
          rx="9"
          ry="17"
          transform="rotate(-14 138 202)"
        />

        {/* Head: ears behind, then head, bow and face */}
        <g className={`bunny-head bunny-head-${expression}`}>
          <Ear side="l" cx={72} rotation={ears.left} twitch={twitch} />
          <Ear side="r" cx={128} rotation={ears.right} twitch={twitch} />

          <ellipse className="bunny-shape" cx="100" cy="140" rx="58" ry="48" />

          {/* Pastel bow between the ears */}
          <g>
            <ellipse
              className="bunny-bow"
              cx="90"
              cy="98"
              rx="9"
              ry="5.5"
              transform="rotate(-18 90 98)"
            />
            <ellipse
              className="bunny-bow"
              cx="110"
              cy="98"
              rx="9"
              ry="5.5"
              transform="rotate(18 110 98)"
            />
            <circle className="bunny-bow" cx="100" cy="99" r="4" />
          </g>

          {/* Face */}
          <ellipse
            className="bunny-cheek"
            cx="62"
            cy="158"
            rx="9"
            ry="6"
            opacity={expression === "sad" ? 0.3 : 0.6}
          />
          <ellipse
            className="bunny-cheek"
            cx="138"
            cy="158"
            rx="9"
            ry="6"
            opacity={expression === "sad" ? 0.3 : 0.6}
          />
          <ellipse className="bunny-nose" cx="100" cy="151" rx="3.4" ry="2.5" />
          <BunnyEyes expression={expression} blink={BLINKING.has(expression)} />
          <BunnyMouth expression={expression} />
        </g>
      </g>

      <BunnyEffects expression={expression} />
    </svg>
  );
}
