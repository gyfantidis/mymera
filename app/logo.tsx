// The MyMera mark: a square rounding off into the sun.
// app/icon.svg is the same drawing as a file; keep the two in step.
export default function Logo({ size = 28, radius = 22 }: { size?: number; radius?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
      <rect width="96" height="96" rx={radius} fill="#1238c9" />
      <rect x="11" y="37" width="22" height="22" rx="2" fill="#5f82f2" />
      <rect x="37" y="37" width="22" height="22" rx="7" fill="#ffffff" />
      <circle cx="74" cy="48" r="12" fill="#ffc21a" />
    </svg>
  );
}
