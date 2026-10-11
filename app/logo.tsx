// The MyMera mark: a year of days getting brighter toward today, which is the sun.
// app/icon.svg is the same drawing as a file; keep the two in step.
export default function Logo({ size = 28, radius = 22 }: { size?: number; radius?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
      <rect width="96" height="96" rx={radius} fill="#1238c9" />
      <rect x="10" y="10" width="16" height="16" rx="4" fill="#2f55e0" />
      <rect x="30" y="10" width="16" height="16" rx="4" fill="#2f55e0" />
      <rect x="10" y="30" width="16" height="16" rx="4" fill="#2f55e0" />
      <rect x="50" y="10" width="16" height="16" rx="4" fill="#5f82f2" />
      <rect x="30" y="30" width="16" height="16" rx="4" fill="#5f82f2" />
      <rect x="10" y="50" width="16" height="16" rx="4" fill="#5f82f2" />
      <rect x="70" y="10" width="16" height="16" rx="4" fill="#5f82f2" />
      <rect x="10" y="70" width="16" height="16" rx="4" fill="#5f82f2" />
      <rect x="50" y="30" width="16" height="16" rx="4" fill="#a9bdfa" />
      <rect x="30" y="50" width="16" height="16" rx="4" fill="#a9bdfa" />
      <rect x="70" y="30" width="16" height="16" rx="4" fill="#a9bdfa" />
      <rect x="30" y="70" width="16" height="16" rx="4" fill="#a9bdfa" />
      <rect x="50" y="50" width="16" height="16" rx="4" fill="#ffffff" />
      <rect x="70" y="50" width="16" height="16" rx="4" fill="#ffffff" />
      <rect x="50" y="70" width="16" height="16" rx="4" fill="#ffffff" />
      <circle cx="78" cy="78" r="9" fill="#ffc21a" />
    </svg>
  );
}
