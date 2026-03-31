import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface Props {
  search: string; onSearch: (v: string) => void;
  fase: string; onFase: (v: string) => void;
  subfase: string; onSubfase: (v: string) => void;
  disciplina: string; onDisciplina: (v: string) => void;
  fases: string[]; subfases: string[]; disciplinas: string[];
}

export function MedicaoFilters(p: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar PPU, descrição, disciplina..." className="pl-9" value={p.search} onChange={e => p.onSearch(e.target.value)} />
      </div>
      <Select value={p.fase} onValueChange={p.onFase}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fase" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          {p.fases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={p.subfase || "__all__"} onValueChange={v => p.onSubfase(v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subfase" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          {p.subfases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={p.disciplina || "__all__"} onValueChange={v => p.onDisciplina(v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          {p.disciplinas.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
