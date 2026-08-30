import { cn } from "@/lib/utils";

export function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-bg-elevated p-4", className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        {hint && <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
