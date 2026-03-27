import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMedicaoData, type Semaforo } from "@/hooks/useMedicao";
import { MedicaoKPIs } from "@/components/medicao/MedicaoKPIs";
import { MedicaoFunnel } from "@/components/medicao/MedicaoFunnel";
import { SemaforoCards } from "@/components/medicao/SemaforoCards";
import { MedicaoFilters } from "@/components/medicao/MedicaoFilters";
import { MedicaoTable } from "@/components/medicao/MedicaoTable";
import { MedicaoDetailSheet } from "@/components/medicao/MedicaoDetailSheet";
import type { MedicaoPPU } from "@/hooks/useMedicao";

export default function Medicao() {
  const { items, kpis, filters, isLoading } = useMedicaoData();

  // Filters
  const [search, setSearch] = useState("");
  const [fase, setFase] = useState("");
  const [subfase, setSubfase] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [semaforo, setSemaforo] = useState<Semaforo | "">("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Detail
  const [selected, setSelected] = useState<MedicaoPPU | null>(null);

  // Subfases filtered by fase
  const subfaseOptions = useMemo(() => {
    if (!fase) return filters.subfases;
    return items.filter(i => i.fase === fase).map(i => i.subfase).filter((v, i, a) => v && a.indexOf(v) === i).sort();
  }, [fase, items, filters.subfases]);

  // Filtered + sorted items
  const filtered = useMemo(() => {
    let f = items;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(i => i.item_ppu.toLowerCase().includes(s) || i.descricao.toLowerCase().includes(s) || i.disciplina.toLowerCase().includes(s));
    }
    if (fase) f = f.filter(i => i.fase === fase);
    if (subfase) f = f.filter(i => i.subfase === subfase);
    if (disciplina) f = f.filter(i => i.disciplina === disciplina);
    if (semaforo) f = f.filter(i => i.semaforo === semaforo);
    return f;
  }, [items, search, fase, subfase, disciplina, semaforo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Semaforo counts
  const semaforoCounts = useMemo(() => {
    const counts = { medido: { count: 0, valor: 0 }, executado: { count: 0, valor: 0 }, previsto: { count: 0, valor: 0 }, futuro: { count: 0, valor: 0 } };
    items.forEach(i => { counts[i.semaforo].count++; counts[i.semaforo].valor += i.valor_total; });
    return counts;
  }, [items]);

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Upload className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Importe os dados SIGEM, REL_EVENTO e SCON primeiro</p>
        <Button asChild><Link to="/import">Ir para Importação</Link></Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medição</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento físico e financeiro — visão por PPU</p>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : kpis ? (
        <MedicaoKPIs kpis={kpis} />
      ) : null}

      {/* Funnel */}
      {!isLoading && kpis && <MedicaoFunnel kpis={kpis} />}

      {/* Semaforo cards */}
      {!isLoading && (
        <SemaforoCards counts={semaforoCounts} active={semaforo} onSelect={(s) => { setSemaforo(s === semaforo ? "" : s); setPage(0); }} />
      )}

      {/* Filters */}
      {!isLoading && (
        <MedicaoFilters
          search={search} onSearch={(v) => { setSearch(v); setPage(0); }}
          fase={fase} onFase={(v) => { setFase(v); setSubfase(""); setPage(0); }}
          subfase={subfase} onSubfase={(v) => { setSubfase(v); setPage(0); }}
          disciplina={disciplina} onDisciplina={(v) => { setDisciplina(v); setPage(0); }}
          fases={filters.fases} subfases={subfaseOptions} disciplinas={filters.disciplinas}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
        </div>
      ) : (
        <MedicaoTable
          items={paged}
          total={filtered.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onSelect={setSelected}
        />
      )}

      {/* Detail Sheet */}
      <MedicaoDetailSheet item={selected} onClose={() => setSelected(null)} />
    </motion.div>
  );
}
