import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdateBoletimItem } from "@/hooks/useBoletim";
import { formatCompact, formatCurrencyFull } from "@/lib/format";

interface Props {
  itens: any[];
  readonly: boolean;
}

export function BoletimTable({ itens, readonly }: Props) {
  const updateItem = useUpdateBoletimItem();

  const totalPrev = itens.reduce((s, i) => s + (Number(i.valor_previsto) || 0), 0);
  const totalScon = itens.reduce((s, i) => s + (Number(i.valor_executado_scon) || 0), 0);
  const totalSigem = itens.reduce((s, i) => s + (Number(i.valor_postado_sigem) || 0), 0);
  const totalGitec = itens.reduce((s, i) => s + (Number(i.valor_medido_gitec) || 0), 0);
  const totalAprovado = itens.reduce((s, i) => s + (Number(i.valor_aprovado) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-28">iPPU</TableHead>
              <TableHead className="text-xs">Descrição</TableHead>
              <TableHead className="text-xs text-right w-24">Prev.</TableHead>
              <TableHead className="text-xs text-right w-24">SCON</TableHead>
              <TableHead className="text-xs text-right w-24">SIGEM</TableHead>
              <TableHead className="text-xs text-right w-24">GITEC</TableHead>
              <TableHead className="text-xs text-right w-28">Valor Aprovado</TableHead>
              <TableHead className="text-xs w-36">Obs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum item no boletim.
                </TableCell>
              </TableRow>
            ) : (
              itens.map(item => (
                <ItemRow key={item.id} item={item} readonly={readonly} onUpdate={updateItem.mutate} />
              ))
            )}
          </TableBody>
          {itens.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/50">
                <td className="px-4 py-2 text-xs font-bold" colSpan={2}>TOTAL</td>
                <td className="px-4 py-2 text-xs text-right font-bold tabular-nums">{formatCompact(totalPrev)}</td>
                <td className="px-4 py-2 text-xs text-right font-bold tabular-nums">{formatCompact(totalScon)}</td>
                <td className="px-4 py-2 text-xs text-right font-bold tabular-nums">{formatCompact(totalSigem)}</td>
                <td className="px-4 py-2 text-xs text-right font-bold tabular-nums">{formatCompact(totalGitec)}</td>
                <td className="px-4 py-2 text-xs text-right font-bold tabular-nums">{formatCompact(totalAprovado)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}

function ItemRow({ item, readonly, onUpdate }: { item: any; readonly: boolean; onUpdate: any }) {
  const [valorAprovado, setValorAprovado] = useState(String(Number(item.valor_aprovado) || 0));
  const [obs, setObs] = useState(item.observacao || "");

  const handleBlurValor = () => {
    const v = Number(valorAprovado) || 0;
    if (v !== (Number(item.valor_aprovado) || 0)) {
      onUpdate({ id: item.id, valor_aprovado: v });
    }
  };

  const handleBlurObs = () => {
    if (obs !== (item.observacao || "")) {
      onUpdate({ id: item.id, observacao: obs });
    }
  };

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className="font-mono text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0">
          {item.ippu}
        </Badge>
      </TableCell>
      <TableCell className="text-xs max-w-[180px] truncate">{item.descricao || "—"}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{formatCompact(Number(item.valor_previsto) || 0)}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{formatCompact(Number(item.valor_executado_scon) || 0)}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{formatCompact(Number(item.valor_postado_sigem) || 0)}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{formatCompact(Number(item.valor_medido_gitec) || 0)}</TableCell>
      <TableCell>
        {readonly ? (
          <span className="text-xs text-right tabular-nums font-medium block">{formatCurrencyFull(Number(item.valor_aprovado) || 0)}</span>
        ) : (
          <Input
            type="number"
            value={valorAprovado}
            onChange={e => setValorAprovado(e.target.value)}
            onBlur={handleBlurValor}
            className="h-7 text-xs text-right w-24"
          />
        )}
      </TableCell>
      <TableCell>
        {readonly ? (
          <span className="text-xs text-muted-foreground">{obs || "—"}</span>
        ) : (
          <Input
            value={obs}
            onChange={e => setObs(e.target.value)}
            onBlur={handleBlurObs}
            className="h-7 text-xs w-32"
            placeholder="Obs..."
          />
        )}
      </TableCell>
    </TableRow>
  );
}
