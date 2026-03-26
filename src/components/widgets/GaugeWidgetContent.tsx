import { useMemo } from "react";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const GAUGE_CX = 100;
const GAUGE_CY = 100;
const GAUGE_R = 80;
const GAUGE_START = Math.PI;
const GAUGE_END = 0;

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
}

function pctToAngle(pct: number) {
  return GAUGE_START - pct * (GAUGE_START - GAUGE_END);
}

const BANDS = [
  { from: 0, to: 0.5, color: "hsl(0, 70%, 55%)" },
  { from: 0.5, to: 0.8, color: "hsl(45, 80%, 50%)" },
  { from: 0.8, to: 1, color: "hsl(140, 60%, 45%)" },
];

export function GaugeWidgetContent() {
  const { periodRange } = useEditorFilters();

  // Sample: value adjusts with filter range for demo
  const value = useMemo(() => {
    if (periodRange) return 45 + periodRange[1] * 2;
    return 68;
  }, [periodRange]);

  const max = 100;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const needleAngle = pctToAngle(pct);
  const needleX = GAUGE_CX + (GAUGE_R - 10) * Math.cos(needleAngle);
  const needleY = GAUGE_CY - (GAUGE_R - 10) * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <svg viewBox="0 10 200 110" className="w-full max-w-[220px]">
        {/* Background arc */}
        <path
          d={arcPath(GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_START, GAUGE_END)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* Color bands */}
        {BANDS.map((band, i) => (
          <path
            key={i}
            d={arcPath(GAUGE_CX, GAUGE_CY, GAUGE_R, pctToAngle(band.from), pctToAngle(band.to))}
            fill="none"
            stroke={band.color}
            strokeWidth={14}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}
        {/* Needle */}
        <line
          x1={GAUGE_CX}
          y1={GAUGE_CY}
          x2={needleX}
          y2={needleY}
          stroke="hsl(var(--foreground))"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={GAUGE_CX} cy={GAUGE_CY} r={4} fill="hsl(var(--foreground))" />
        {/* Labels */}
        <text x={GAUGE_CX - GAUGE_R - 5} y={GAUGE_CY + 14} textAnchor="middle" className="text-[9px] fill-muted-foreground">0%</text>
        <text x={GAUGE_CX + GAUGE_R + 5} y={GAUGE_CY + 14} textAnchor="middle" className="text-[9px] fill-muted-foreground">100%</text>
      </svg>
      <div className="text-center -mt-2">
        <span className="text-2xl font-bold text-foreground">{pct.toFixed(0)}%</span>
        <p className="text-xs text-muted-foreground">Avanço</p>
      </div>
    </div>
  );
}
