import { BLADES } from "@/lib/mahoraga/meta";
import { cn } from "@/lib/utils";

export function AdaptationWheel({
  active,
  onPick,
}: {
  active: string;
  onPick: (id: string) => void;
}) {
  const r = 42;
  const R = 70;
  return (
    <svg viewBox="0 0 180 180" className="mx-auto h-[168px] w-[168px]">
      <circle cx="90" cy="90" r="18" fill="#0a0a0b" stroke="#c8ccd4" strokeWidth="1.2" />
      <circle cx="90" cy="90" r="8" fill="#0a0a0b" />
      {BLADES.map((b, i) => {
        const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2 - 0.06;
        const p = (ang: number, rad: number) => [
          90 + rad * Math.cos(ang),
          90 + rad * Math.sin(ang),
        ];
        const [x0, y0] = p(a0, r);
        const [x1, y1] = p(a1, r);
        const [x2, y2] = p(a1, R);
        const [x3, y3] = p(a0, R);
        const on = active === b.id;
        const live = b.status === "live" || b.status === "live-lite";
        return (
          <path
            key={b.id}
            d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R} ${R} 0 0 0 ${x3} ${y3} Z`}
            className={cn("cursor-pointer transition-opacity duration-150")}
            fill={on ? "#ece8e1" : live ? "rgba(200,204,212,0.22)" : "rgba(200,204,212,0.08)"}
            stroke="rgba(236,232,225,0.18)"
            strokeWidth="0.6"
            onClick={() => onPick(b.id)}
          />
        );
      })}
    </svg>
  );
}
