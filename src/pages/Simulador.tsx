import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calculator, Upload, CheckSquare, Square, ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSimuladorData, SimuladorItem } from "@/hooks/useSimuladorData";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type SortKey = "saldo" | "previsto_proximo_bm" | "projetado_proximo_bm" | "valor_contrato";

const Simulador: React.FC = () => {
  const { items, kpis, isLoading } = useSimuladorData();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("previsto_proximo_bm");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let arr = items;
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(p => p.ippu.toLowerCase().includes(s) || p.nome.toLowerCase().includes(s));
    }
    arr = [...arr].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [items, search, sortKey, sortAsc]);

  const totalSimulado = useMemo(() =>
    filtered.filter(p => selected.has(p.ippu)).reduce((s, p) => s + p.previsto_proximo_bm, 0),
    [filtered, selected]
  );

  const totalProjetadoSelecionado = useMemo(() =>
    filtered.filter(p => selected.has(p.ippu)).reduce((s, p) => s + p.projetado_proximo_bm, 0),
    [filtered, selected]
  );

  const totalPrevistoProximoBm = useMemo(() =>
    items.reduce((s, p) => s + p.previsto_proximo_bm, 0), [items]);

  const totalProjetadoProximoBm = useMemo(() =>
    items.reduce((s, p) => s + p.projetado_proximo_bm, 0), [items]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.ippu)));
  };

  const toggleOne = (ippu: string) => {
    const next = new Set(selected);
    if (next.has(ippu)) next.delete(ippu); else next.add(ippu);
    setSelected(next);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Nenhum item com saldo disponível encontrado.</p>
        <Button asChild><Link to="/import"><Upload className="h-4 w-4 mr-2" /> Importar Dados</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Simulador de Medição — {kpis?.proximoBmName || "Próximo BM"}</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Itens com Saldo</p>
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{selected.size} selecionados</p>
        </CardContent></Card>
        <Card className="border-primary/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Previsto {kpis?.proximoBmName}</p>
          <p className="text-2xl font-bold text-primary">{fmtBRL(totalPrevistoProximoBm)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Projetado {kpis?.proximoBmName}</p>
          <p className="text-2xl font-bold">{fmtBRL(totalProjetadoProximoBm)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saldo Total</p>
          <p className="text-2xl font-bold">{fmtBRL(kpis?.totalSaldo || 0)}</p>
        </CardContent></Card>
      </div>

      {/* Selected summary */}
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-6 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Simulação ({selected.size} itens)</p>
              <p className="text-xl font-bold font-mono text-primary">{fmtBRL(totalSimulado)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Projetado Selecionado</p>
              <p className="text-xl font-bold font-mono">{fmtBRL(totalProjetadoSelecionado)}</p>
            </div>
            {totalPrevistoProximoBm > 0 && (
              <Badge variant={totalSimulado >= totalPrevistoProximoBm * 0.9 ? "default" : "secondary"} className="text-xs">
                {totalSimulado >= totalPrevistoProximoBm ? (
                  <><TrendingUp className="h-3 w-3 mr-1" /> Acima do previsto</>
                ) : (
                  <><TrendingDown className="h-3 w-3 mr-1" /> {((totalSimulado / totalPrevistoProximoBm) * 100).toFixed(0)}% do previsto</>
                )}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar iPPU ou descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-[260px]"
        />
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {selected.size === filtered.length ? <Square className="h-3.5 w-3.5 mr-1" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />}
          {selected.size === filtered.length ? "Limpar" : "Selecionar Todos"}
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} itens</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-xs">iPPU</TableHead>
              <TableHead className="text-xs">Descrição</TableHead>
              <SortHead label="Valor Contrato" sortKey="valor_contrato" current={sortKey} asc={sortAsc} onSort={handleSort} />
              <TableHead className="text-xs text-right">Realizado</TableHead>
              <SortHead label="Saldo" sortKey="saldo" current={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHead label={`Prev. ${kpis?.proximoBmName || "BM"}`} sortKey="previsto_proximo_bm" current={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHead label={`Proj. ${kpis?.proximoBmName || "BM"}`} sortKey="projetado_proximo_bm" current={sortKey} asc={sortAsc} onSort={handleSort} />
              <TableHead className="text-xs text-right">GITEC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.ippu} className={`cursor-pointer ${selected.has(p.ippu) ? "bg-primary/5" : ""}`} onClick={() => toggleOne(p.ippu)}>
                <TableCell>
                  <Checkbox checked={selected.has(p.ippu)} onCheckedChange={() => toggleOne(p.ippu)} />
                </TableCell>
                <TableCell className="font-mono text-xs font-medium">{p.ippu}</TableCell>
                <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground">{p.nome || "-"}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmtBRL(p.valor_contrato)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmtBRL(p.valor_realizado)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">{fmtBRL(p.saldo)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{p.previsto_proximo_bm > 0 ? fmtBRL(p.previsto_proximo_bm) : "-"}</TableCell>
                <TableCell className="text-xs text-right font-mono">{p.projetado_proximo_bm > 0 ? fmtBRL(p.projetado_proximo_bm) : "-"}</TableCell>
                <TableCell className="text-xs text-right">
                  {p.gitec_eventos > 0 ? (
                    <span className="text-muted-foreground">{p.gitec_eventos} ev.</span>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

function SortHead({ label, sortKey, current, asc, onSort }: {
  label: string; sortKey: string; current: string; asc: boolean;
  onSort: (k: any) => void;
}) {
  return (
    <TableHead className="text-xs text-right cursor-pointer select-none" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {current === sortKey && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </TableHead>
  );
}

export default Simulador;
