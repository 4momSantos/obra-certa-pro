import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompact } from "@/lib/format";
import { Users } from "lucide-react";

interface ResumoRow {
  disciplina: string;
  responsavel_nome: string;
  total_itens: number;
  ativos: number;
  postergados: number;
  valor_ativo: number;
  valor_postergado: number;
}

interface Props {
  data: ResumoRow[];
}

export function PrevisaoResumo({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhuma previsão cadastrada. Comece adicionando itens.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Resumo por Disciplina
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Disciplina</TableHead>
              <TableHead className="text-xs">Responsável</TableHead>
              <TableHead className="text-xs text-right">Itens</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
              <TableHead className="text-xs text-right">Postergados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-medium">{r.disciplina || "—"}</TableCell>
                <TableCell className="text-xs">{r.responsavel_nome || "—"}</TableCell>
                <TableCell className="text-xs text-right">{r.ativos}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(r.valor_ativo)}</TableCell>
                <TableCell className="text-xs text-right text-amber-600">{r.postergados}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
