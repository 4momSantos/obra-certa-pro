import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calculator, Upload, CheckSquare, Square, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMedicaoData } from "@/hooks/useMedicao";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface EligiblePPU {
  item_ppu: string;
  descricao: string;
  valor_total: number;
  valor_medido: number;
  scon_avg_avanco: number;
  valor_medivel: number;
  eac_previsto: number;
}

const Simulador: React.FC = () => {
  const { items, kpis, isLoading } = useMedicaoData();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"valor_medivel" | "scon_avg_avanco" | "valor_total">("valor_medivel");
  const [sortAsc, setSortAsc] = useState(false);

  const eligible = useMemo((): EligiblePPU[] => {
    return items
      .filter(p => p.scon_avg_avanco > 0 && (p.valor_total - p.valor_medido) > 0)
      .map(p => ({
        item_ppu: p.item_ppu,
        descricao: p.descricao,
        valor_total: p.valor_total,
        valor_medido: p.valor_medido,
        scon_avg_avanco: p.scon_avg_avanco,
        valor_medivel: (p.valor_total * p.scon_avg_avanco / 100) - p.valor_medido,
        eac_previsto: p.eac_previsto,
      }))
      .filter(p => p.valor_medivel > 0);
  }, [items]);

  const filtered = useMemo(() => {
    let arr = eligible;
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(p => p.item_ppu.toLowerCase().includes(s) || p.descricao.toLowerCase().includes(s));
    }
    arr.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [eligible, search, sortKey, sortAsc]);

  const totalSimulado = useMemo(() => {
    return filtered
      .filter(p => selected.has(p.item_ppu))
      .reduce((s, p) => s + p.valor_medivel, 0);
  }, [filtered, selected]);

  const totalEligible = useMemo(() => eligible.reduce((s, p) => s + p.valor_medivel, 0), [eligible]);

  const eacProjetado = useMemo(() => {
    if (!kpis) return 0;
    return kpis.previsto > 0 ? kpis.previsto * 0.05 : 0; // Estimate 5% of previsto as next BM
  }, [kpis]);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.item_ppu)));
    }
  };

  const toggleOne = (ppu: string) => {
    const next = new Set(selected);
    if (next.has(ppu)) next.delete(ppu);
    else next.add(ppu);
    setSelected(next);
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Importe os dados operacionais primeiro.</p>
        <Button asChild><Link to="/import"><Upload className="h-4 w-4 mr-2" /> Importar Dados</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Simulador de Medição — Próximo BM</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Itens Selecionados</p>
          <p className="text-2xl font-bold">{selected.size} <span className="text-sm font-normal text-muted-foreground">/ {eligible.length}</span></p>
        </CardContent></Card>
        <Card className="border-primary/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Valor Simulado</p>
          <p className="text-2xl font-bold text-primary">{fmtBRL(totalSimulado)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Elegível</p>
          <p className="text-2xl font-bold">{fmtBRL(totalEligible)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">vs Projetado</p>
          {eacProjetado > 0 ? (
            <>
              <p className="text-lg font-bold">{fmtBRL(eacProjetado)}</p>
              {totalSimulado > 0 && (
                <Badge variant={totalSimulado >= eacProjetado ? "default" : "secondary"} className="text-[10px] mt-1">
                  {totalSimulado >= eacProjetado ? "Acima do projetado" : "Abaixo do projetado"}
                </Badge>
              )}
            </>
          ) : <p className="text-sm text-muted-foreground">Sem EAC</p>}
        </CardContent></Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar PPU ou descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-[260px]"
        />
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {selected.size === filtered.length ? <Square className="h-3.5 w-3.5 mr-1" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />}
          {selected.size === filtered.length ? "Limpar" : "Selecionar Todos"}
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} PPUs elegíveis</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-xs">PPU</TableHead>
              <TableHead className="text-xs">Descrição</TableHead>
              <SortHead label="Valor Total" sortKey="valor_total" current={sortKey} asc={sortAsc} onSort={handleSort} />
              <TableHead className="text-xs text-right">Já Medido</TableHead>
              <SortHead label="SCON %" sortKey="scon_avg_avanco" current={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHead label="Valor Medível" sortKey="valor_medivel" current={sortKey} asc={sortAsc} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.item_ppu} className={`cursor-pointer ${selected.has(p.item_ppu) ? "bg-primary/5" : ""}`} onClick={() => toggleOne(p.item_ppu)}>
                <TableCell>
                  <Checkbox checked={selected.has(p.item_ppu)} onCheckedChange={() => toggleOne(p.item_ppu)} />
                </TableCell>
                <TableCell className="font-mono text-xs font-medium">{p.item_ppu}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{p.descricao || "-"}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmtBRL(p.valor_total)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmtBRL(p.valor_medido)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{p.scon_avg_avanco.toFixed(1)}%</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">{fmtBRL(p.valor_medivel)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sticky total */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Card className="border-primary shadow-lg">
            <CardContent className="flex items-center gap-6 p-4">
              <span className="text-sm font-medium">{selected.size} itens selecionados</span>
              <span className="text-lg font-bold font-mono text-primary">{fmtBRL(totalSimulado)}</span>
              {eacProjetado > 0 && (
                <Badge variant={totalSimulado >= eacProjetado ? "default" : "secondary"}>
                  {totalSimulado >= eacProjetado ? "✓ Acima" : "↓ Abaixo"} do projetado
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

function SortHead({ label, sortKey, current, asc, onSort }: {
  label: string; sortKey: string; current: string; asc: boolean;
  onSort: (k: any) => void;
}) {
  return (
    <TableHead
      className="text-xs text-right cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {current === sortKey && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </TableHead>
  );
}

export default Simulador;
