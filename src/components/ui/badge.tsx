import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        default: "border-border text-muted",
        live: "border-ok/40 text-ok",
        lock: "border-border text-faint",
        anomaly: "border-anomaly/50 text-anomaly",
        warn: "border-warn/40 text-warn",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
