type Props = {
  // How many squares are filled; fractions fill part of a square.
  value: number;
  total?: number;
  tone?: "accent" | "bad" | "white";
  size?: "sm" | "md";
  // Play the pop animation once, square by square.
  celebrate?: boolean;
};

const TONES = {
  accent: { fill: "var(--accent)", empty: "var(--track)" },
  bad: { fill: "var(--bad)", empty: "var(--track)" },
  white: { fill: "#ffffff", empty: "rgb(255 255 255 / 0.2)" },
};

// One square per time something has to happen (e.g. three workouts a week).
// When all are filled, the last square turns into the sun.
export default function Blocks({ value, total = 10, tone = "accent", size = "sm", celebrate = false }: Props) {
  const { fill, empty } = TONES[tone];
  const complete = tone !== "bad" && value >= total;
  return (
    <div aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: total }, (_, i) => {
        const part = Math.max(0, Math.min(1, value - i)) * 100;
        const sun = complete && i === total - 1;
        return (
          <span
            key={i}
            className={`${size === "md" ? "h-3.5 w-3.5 rounded-[3px]" : "h-2.5 w-2.5 rounded-[2px]"} ${sun ? "rounded-full" : ""} ${celebrate ? "pop" : ""}`}
            style={{
              background: sun ? "var(--sun)" : `linear-gradient(90deg, ${fill} ${part}%, ${empty} ${part}%)`,
              animationDelay: celebrate ? `${i * 45}ms` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
