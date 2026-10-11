type Props = {
  // 0..1
  fraction: number;
  tone?: "accent" | "bad" | "white";
  size?: "sm" | "md";
  // Make the marker jump once, for a target reached just now.
  celebrate?: boolean;
};

const TONES = {
  // idle is the marker's colour while nothing has been logged.
  accent: { fill: "var(--accent)", empty: "var(--track)", idle: "color-mix(in srgb, var(--muted) 35%, var(--track))" },
  bad: { fill: "var(--bad)", empty: "var(--track)", idle: "color-mix(in srgb, var(--muted) 35%, var(--track))" },
  white: { fill: "#ffffff", empty: "rgb(255 255 255 / 0.2)", idle: "rgb(255 255 255 / 0.5)" },
};

// A plain progress bar whose end marker starts as a square and rounds off on the way,
// turning into the sun when the target is reached.
export default function Bar({ fraction, tone = "accent", size = "sm", celebrate = false }: Props) {
  const f = Math.max(0, Math.min(1, fraction));
  const { fill, empty, idle } = TONES[tone];
  const cap = size === "md" ? 18 : 14;
  const sun = tone !== "bad" && f >= 1;
  return (
    <div aria-hidden="true" className="relative flex-1" style={{ height: cap }}>
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ background: empty }} />
      <div
        className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full transition-[width] duration-300"
        style={{ background: fill, width: `calc(${f} * (100% - ${cap}px) + ${cap / 2}px)` }}
      />
      <div
        className={`absolute top-0 transition-[left,border-radius,background-color] duration-300 ${celebrate ? "pop" : ""}`}
        style={{
          width: cap,
          height: cap,
          left: `calc(${f} * (100% - ${cap}px))`,
          borderRadius: `${Math.round(15 + f * 35)}%`,
          background: sun ? "var(--sun)" : f === 0 ? idle : fill,
        }}
      />
    </div>
  );
}
