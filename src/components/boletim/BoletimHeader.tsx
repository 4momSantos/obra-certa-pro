import { Badge } from "@/components/ui/badge";
import { FileCheck, Calendar } from "lucide-react";
import { formatCompact } from "@/lib/format";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  finalizado: { label: "Finalizado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  enviado: { label: "Enviado", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  aprovado: { label: "Aprovado", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

interface Props {
  boletim: any;
  bmName: string;
}

export function BoletimHeader({ boletim, bmName }: Props) {
  const st = STATUS_MAP[boletim.status] || STATUS_MAP.rascunho;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Boletim de Medição — {bmName}</h1>
          <Badge className={`text-[10px] border-0 ${st.className}`}>{st.label}</Badge>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums">{formatCompact(Number(boletim.valor_total) || 0)}</p>
          <p className="text-xs text-muted-foreground">{boletim.qtd_itens || 0} itens · {boletim.numero}</p>
        </div>
      </div>
      {boletim.gerado_em && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Gerado em {new Date(boletim.gerado_em).toLocaleDateString("pt-BR")}
          {boletim.finalizado_em && ` · Finalizado ${new Date(boletim.finalizado_em).toLocaleDateString("pt-BR")}`}
          {boletim.enviado_em && ` · Enviado ${new Date(boletim.enviado_em).toLocaleDateString("pt-BR")}`}
          {boletim.aprovado_em && ` · Aprovado ${new Date(boletim.aprovado_em).toLocaleDateString("pt-BR")}`}
        </p>
      )}
    </div>
  );
}
