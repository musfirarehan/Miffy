import type { BunnyExpression } from "@/types/avatar";

const LEFT_X = 78;
const RIGHT_X = 122;
const EYE_Y = 142;

interface DotEyeProps {
  x: number;
  y?: number;
  r?: number;
  shine?: boolean;
}

function DotEye({ x, y = EYE_Y, r = 5.5, shine = true }: DotEyeProps) {
  return (
    <g>
      <circle className="bunny-ink" cx={x} cy={y} r={r} />
      {shine && (
        <circle
          className="bunny-eye-shine"
          cx={x + r * 0.32}
          cy={y - r * 0.34}
          r={Math.max(1.5, r * 0.32)}
        />
      )}
    </g>
  );
}

/** Closed, upward arc: a happy squint. */
function HappyEyes() {
  return (
    <g>
      <path className="bunny-line" d="M71 146 Q78 136 85 146" />
      <path className="bunny-line" d="M115 146 Q122 136 129 146" />
    </g>
  );
}

/** Closed, downward arc: sleepy. */
function SleepyEyes() {
  return (
    <g>
      <path className="bunny-line" d="M71 143 Q78 150 85 143" />
      <path className="bunny-line" d="M115 143 Q122 150 129 143" />
    </g>
  );
}

/** Half-lidded eyes with a flat lid line: smug. */
function SlyEyes() {
  return (
    <g>
      {[LEFT_X, RIGHT_X].map((x) => (
        <g key={x}>
          <path
            className="bunny-ink"
            d={`M${x - 6} ${EYE_Y} A6 6 0 0 0 ${x + 6} ${EYE_Y} Z`}
          />
          <path
            className="bunny-line-thin"
            d={`M${x - 7.5} ${EYE_Y} L${x + 7.5} ${EYE_Y}`}
          />
        </g>
      ))}
    </g>
  );
}

function Brows({ expression }: { expression: BunnyExpression }) {
  switch (expression) {
    case "confused":
      return (
        <g>
          <path className="bunny-line-thin" d="M68 129 L86 132" />
          <path className="bunny-line-thin" d="M114 133 Q123 124 132 128" />
        </g>
      );
    case "sad":
      return (
        <g>
          <path className="bunny-line-thin" d="M68 134 L86 128" />
          <path className="bunny-line-thin" d="M114 128 L132 134" />
        </g>
      );
    case "mischievous":
      return (
        <g>
          <path className="bunny-line-thin" d="M68 128 L87 133" />
          <path className="bunny-line-thin" d="M114 127 Q122 121 132 126" />
        </g>
      );
    case "thinking":
      return (
        <path className="bunny-line-thin" d="M114 128 Q122 123 130 127" />
      );
    default:
      return null;
  }
}

function EyeShapes({ expression }: { expression: BunnyExpression }) {
  switch (expression) {
    case "happy":
      return <HappyEyes />;
    case "sleepy":
      return <SleepyEyes />;
    case "mischievous":
      return <SlyEyes />;
    case "excited":
      return (
        <g>
          <DotEye x={LEFT_X} r={7} />
          <DotEye x={RIGHT_X} r={7} />
          <circle
            className="bunny-eye-shine"
            cx={LEFT_X - 2.2}
            cy={EYE_Y + 2.4}
            r={1.2}
          />
          <circle
            className="bunny-eye-shine"
            cx={RIGHT_X - 2.2}
            cy={EYE_Y + 2.4}
            r={1.2}
          />
        </g>
      );
    case "listening":
      return (
        <g>
          <DotEye x={LEFT_X} r={6.5} />
          <DotEye x={RIGHT_X} r={6.5} />
        </g>
      );
    case "thinking":
      // Eyes drift up and to the side, as if looking at a thought.
      return (
        <g transform="translate(4 -4)">
          <DotEye x={LEFT_X} />
          <DotEye x={RIGHT_X} />
        </g>
      );
    case "confused":
      return (
        <g>
          <DotEye x={LEFT_X} r={4.4} />
          <DotEye x={RIGHT_X} r={6.6} />
        </g>
      );
    case "sad":
      return (
        <g transform="translate(0 2)">
          <DotEye x={LEFT_X} />
          <DotEye x={RIGHT_X} />
        </g>
      );
    default:
      return (
        <g>
          <DotEye x={LEFT_X} />
          <DotEye x={RIGHT_X} />
        </g>
      );
  }
}

interface BunnyEyesProps {
  expression: BunnyExpression;
  blink: boolean;
}

export function BunnyEyes({ expression, blink }: BunnyEyesProps) {
  return (
    <>
      <g className={blink ? "bunny-blink" : undefined}>
        <EyeShapes expression={expression} />
      </g>
      <Brows expression={expression} />
    </>
  );
}
