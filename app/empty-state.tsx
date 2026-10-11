// A blank stretch of days with only today lit: shown wherever there is nothing to list yet.
export default function EmptyState({ children, bare = false }: { children: React.ReactNode; bare?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center text-sm text-muted ${bare ? "py-2" : "rounded-2xl border border-border bg-surface p-6"}`}>
      <div aria-hidden="true" className="grid grid-cols-7 gap-[3px]">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className={`h-2.5 w-2.5 ${i === 13 ? "rounded-full bg-sun" : "rounded-[2px] bg-track"}`} />
        ))}
      </div>
      <p>{children}</p>
    </div>
  );
}
