import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CurvaSPoint {
  id: string;
  label: string;
  previsto_acum: number;
  projetado_acum: number;
  realizado_acum: number;
}

interface Props {
  data: CurvaSPoint[];
  onChange: (index: number, value: number) => void;
}

const fmtBR = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function CurvaSEditTable({ data, onChange }: Props) {
  return (
    <ScrollArea className="h-[600px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-24">Período</TableHead>
            <TableHead className="text-xs text-right w-28">Previsto</TableHead>
            <TableHead className="text-xs text-right w-32">Projetado</TableHead>
            <TableHead className="text-xs text-right w-28">Realizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, i) => (
            <TableRow key={d.id}>
              <TableCell className="text-xs font-medium py-1">{d.label}</TableCell>
              <TableCell className="text-xs text-right text-muted-foreground py-1">
                {fmtBR(d.previsto_acum)}
              </TableCell>
              <TableCell className="py-1">
                <Input
                  type="number"
                  className="h-7 text-xs text-right w-28"
                  value={d.projetado_acum}
                  onChange={(e) => onChange(i, Number(e.target.value) || 0)}
                />
              </TableCell>
              <TableCell className="text-xs text-right text-muted-foreground py-1">
                {d.realizado_acum > 0 ? fmtBR(d.realizado_acum) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
