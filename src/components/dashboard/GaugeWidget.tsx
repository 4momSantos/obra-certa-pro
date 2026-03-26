import { useMemo } from "react";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatPercent, formatCompact } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

const GAUGE_START = 180; // left
const GAUGE_END = 0;     // right (semicircle)
const CX = 150;
const CY = 140;
const R_OUTER = 100;
const R_INNER = 75;
const STROKE_W = 22;

const BANDS = [
  { from: 0, to: 0.5, color: "hsl(0 72% 51%)" },       // red
  { from: 0.5, to: 0.8, color: "hsl(45 93% 47%)" },     // yellow/amber
  { from: 0.8, to: 1.0, color: "hsl(142 71% 45%)" },    // green
];

export function GaugeWidget() {
  const { filteredMetrics } = useDashboardFilters();
  const pct = filteredMetrics.avancoFinanceiro;
  const displayPct = Math.min(Math.max(pct, 0), 1);
  const totalBaseline = filteredMetrics.totalBaseline;
  const totalRealizado = filteredMetrics.totalRealizado;

  const needleAngle = GAUGE_START - displayPct * (GAUGE_START - GAUGE_END);

  const getColor = (p: number) => {
    if (p >= 0.8) return BANDS[2].color;
    if (p >= 0.5) return BANDS[1].color;
    return BANDS[0].color;
  };

  const bandPaths = useMemo(
    () =>
      BANDS.map((b) => {
        const startAngle = GAUGE_START - b.from * (GAUGE_START - GAUGE_END);
        const endAngle = GAUGE_START - b.to * (GAUGE_START - GAUGE_END);
        return {
          d: describeArc(CX, CY, (R_OUTER + R_INNER) / 2, endAngle, startAngle),
          color: b.color,
        };
      }),
    []
  );

  const valuePath = useMemo(() => {
    if (displayPct <= 0) return "";
    const endAngle = GAUGE_START - displayPct * (GAUGE_START - GAUGE_END);
    return describeArc(CX, CY, (R_OUTER + R_INNER) / 2, endAngle, GAUGE_START);
  }, [displayPct]);

  const needleRad = (needleAngle * Math.PI) / 180;
  const needleTipX = CX + (R_INNER - 8) * Math.cos(needleRad);
  const needleTipY = CY + (R_INNER - 8) * Math.sin(needleRad);

  if (totalBaseline === 0) {
    return (
      <WidgetWrapper title="Avanço Financeiro">
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          Nenhum dado para os filtros selecionados
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper title="Avanço Financeiro">
      <div className="h-[300px] flex flex-col items-center justify-center">
        <svg viewBox="0 0 300 180" className="w-full max-w-[280px]">
          {/* Background bands */}
          {bandPaths.map((b, i) => (
            <path
              key={i}
              d={b.d}
              fill="none"
              stroke={b.color}
              strokeWidth={STROKE_W}
              strokeLinecap="round"
              opacity={0.15}
            />
          ))}

          {/* Value arc */}
          {valuePath && (
            <path
              d={valuePath}
              fill="none"
              stroke={getColor(displayPct)}
              strokeWidth={STROKE_W}
              strokeLinecap="round"
            />
          )}

          {/* Needle */}
          <line
            x1={CX}
            y1={CY}
            x2={needleTipX}
            y2={needleTipY}
            stroke="hsl(var(--foreground))"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={5} fill="hsl(var(--foreground))" />

          {/* Labels */}
          <text x={CX - R_OUTER - 5} y={CY + 18} fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="start">0%</text>
          <text x={CX + R_OUTER + 5} y={CY + 18} fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="end">100%</text>
        </svg>

        {/* Center text below gauge */}
        <div className="text-center -mt-2">
          <p className="text-3xl font-extrabold font-mono" style={{ color: getColor(displayPct) }}>
            {formatPercent(pct)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCompact(totalRealizado)} de {formatCompact(totalBaseline)}
          </p>
        </div>
      </div>
    </WidgetWrapper>
  );
}
