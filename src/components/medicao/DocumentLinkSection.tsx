import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  "Para Construção": "bg-blue-500/15 text-blue-700 border-blue-300",
  "Sem Comentários": "bg-green-500/15 text-green-700 border-green-300",
  "Com Comentários": "bg-orange-500/15 text-orange-700 border-orange-300",
  "Recusado": "bg-red-500/15 text-red-700 border-red-300",
  "Em Análise": "bg-purple-500/15 text-purple-700 border-purple-300",
  "Certificado": "bg-teal-500/15 text-teal-700 border-teal-300",
};

interface Props {
  documento: string;
}

export function DocumentLinkSection({ documento }: Props) {
  const { data: docs, isLoading } = useQuery({
    queryKey: ["sigem-doc-link", documento],
    enabled: !!documento,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Try exact match first, then partial
      const { data, error } = await supabase
        .from("sigem_documents")
        .select("id, documento, revisao, titulo, status, status_correto, status_gitec")
        .or(`documento.eq.${documento},documento.ilike.%${documento}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-10 w-full" />;
  if (!docs || docs.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground italic">
        Nenhum documento SIGEM vinculado ({documento})
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
        <FileText className="h-3 w-3" /> Documentos SIGEM ({docs.length})
      </p>
      {docs.map((doc) => {
        const status = doc.status_correto || doc.status || "";
        const colorCls = STATUS_COLORS[status] || "bg-muted text-muted-foreground";
        return (
          <div
            key={doc.id}
            className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/40 transition-colors"
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono font-semibold truncate">{doc.documento}</p>
              {doc.titulo && (
                <p className="text-[9px] text-muted-foreground truncate">{doc.titulo}</p>
              )}
            </div>
            {doc.revisao && (
              <Badge variant="outline" className="text-[9px] shrink-0">Rev {doc.revisao}</Badge>
            )}
            {status && (
              <Badge className={`text-[9px] shrink-0 border ${colorCls}`}>{status}</Badge>
            )}
            {doc.status_gitec && (
              <Badge variant="secondary" className="text-[9px] shrink-0">{doc.status_gitec}</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
