import { useState, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database, Search, ChevronRight, Hash, Type, CalendarDays, CheckSquare,
  Calendar, TrendingUp, FileText, Calculator, Users, Shield, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { dataModel, type ColumnDef, type TableDef } from "@/lib/data-model";

const iconMap: Record<string, React.ElementType> = {
  Calendar, TrendingUp, FileText, Calculator, Users, Shield,
};

const typeIcons: Record<ColumnDef["type"], { icon: React.ElementType; label: string }> = {
  number: { icon: Hash, label: "Número" },
  text: { icon: Type, label: "Texto" },
  date: { icon: CalendarDays, label: "Data" },
  boolean: { icon: CheckSquare, label: "Booleano" },
};

function FieldRow({ table, column }: { table: TableDef; column: ColumnDef }) {
  const TypeIcon = typeIcons[column.type].icon;
  const path = `${table.name}.${column.name}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`${path} copiado!`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent/10 transition-colors group text-left"
    >
      <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-foreground">{column.label}</span>
      {column.format && (
        <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 shrink-0">
          {column.format}
        </Badge>
      )}
      <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function TableAccordion({ table, search }: { table: TableDef; search: string }) {
  const [open, setOpen] = useState(false);
  const TableIcon = iconMap[table.icon] || Database;

  const filtered = useMemo(() => {
    if (!search) return table.columns;
    const q = search.toLowerCase();
    return table.columns.filter(
      (c) => c.label.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [table.columns, search]);

  if (search && filtered.length === 0) return null;

  return (
    <Collapsible open={open || !!search} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium">
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${(open || search) ? "rotate-90" : ""}`} />
        <TableIcon className="h-4 w-4 shrink-0 text-accent" />
        <span className="flex-1 text-left truncate">{table.label}</span>
        <Badge variant="secondary" className="text-[9px] px-1.5 h-4 shrink-0">
          {filtered.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-5 pb-1">
        {filtered.map((col) => (
          <FieldRow key={col.name} table={table} column={col} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FieldPicker() {
  const [search, setSearch] = useState("");

  const visibleTables = useMemo(() => {
    if (!search) return dataModel;
    const q = search.toLowerCase();
    return dataModel.filter((t) =>
      t.label.toLowerCase().includes(q) ||
      t.columns.some((c) => c.label.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    );
  }, [search]);

  const totalColumns = dataModel.reduce((s, t) => s + t.columns.length, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Database className="h-3 w-3" />
          Campos
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-accent" />
            Campos Disponíveis
            <Badge variant="secondary" className="text-[9px] ml-auto">{totalColumns} campos</Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar campo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
        </div>

        {/* Tables */}
        <div className="flex-1 overflow-auto px-2 pb-4 space-y-0.5">
          {visibleTables.length > 0 ? (
            visibleTables.map((t) => (
              <TableAccordion key={t.name} table={t} search={search} />
            ))
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Nenhum campo encontrado
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
