import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { GitecFilters } from "@/hooks/useGitec";

interface Props {
  filters: GitecFilters;
  onChange: (f: GitecFilters) => void;
  fiscais: string[];
}

export const GitecFiltersBar: React.FC<Props> = ({ filters, onChange, fiscais }) => {
  const activeCount = [
    filters.status !== "all",
    filters.fiscal !== "all",
    filters.agingRange !== "all",
    filters.search !== "",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="Pendente de Verificação">Pend. Verificação</SelectItem>
          <SelectItem value="Pendente de Aprovação">Pend. Aprovação</SelectItem>
          <SelectItem value="Aprovado">Aprovado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.fiscal} onValueChange={(v) => onChange({ ...filters, fiscal: v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Fiscal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {fiscais.filter(f => f && f.trim() !== "").map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.agingRange} onValueChange={(v) => onChange({ ...filters, agingRange: v })}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Aging" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="30">≤ 30d</SelectItem>
          <SelectItem value="60">31-60d</SelectItem>
          <SelectItem value="60+">{">"} 60d</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Buscar TAG, PPU, fiscal..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-[220px]"
      />

      {activeCount > 0 && (
        <Badge variant="secondary" className="cursor-pointer" onClick={() => onChange({ status: "all", fiscal: "all", agingRange: "all", search: "" })}>
          {activeCount} filtro{activeCount > 1 ? "s" : ""} ✕
        </Badge>
      )}
    </div>
  );
};
