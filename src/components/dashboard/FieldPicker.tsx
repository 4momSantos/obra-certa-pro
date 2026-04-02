import { useState } from "react";
import { dataModel, TableDef, ColumnDef } from "@/lib/data-model";
import { ChevronDown, ChevronRight, Table2, Hash, Type, ToggleLeft, Calendar, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const typeIcons: Record<string, React.ElementType> = {
  number: Hash,
  text: Type,
  boolean: ToggleLeft,
  date: Calendar,
};

interface FieldPickerProps {
  onFieldSelect?: (column: ColumnDef) => void;
  onFieldDragStart?: (column: ColumnDef, e: React.DragEvent) => void;
}

function TableGroup({ table, onFieldSelect, onFieldDragStart }: { table: TableDef } & FieldPickerProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 rounded transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Table2 className="h-3.5 w-3.5 text-accent" />
        {table.displayName}
        <span className="text-[10px] text-muted-foreground ml-auto">{table.columns.length}</span>
      </button>
      {expanded && (
        <div className="ml-3 border-l border-border/50 pl-2">
          {table.columns.map((col) => {
            const Icon = typeIcons[col.type] || Type;
            return (
              <div
                key={`${col.table}.${col.name}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/field", JSON.stringify(col));
                  e.dataTransfer.effectAllowed = "copy";
                  onFieldDragStart?.(col, e);
                }}
                onClick={() => onFieldSelect?.(col)}
                className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded cursor-grab active:cursor-grabbing transition-colors group"
              >
                <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{col.displayName}</span>
                <span className="text-[9px] text-muted-foreground/50 ml-auto font-mono">{col.type}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FieldPicker({ onFieldSelect, onFieldDragStart }: FieldPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = dataModel.tables
    .map((t) => ({
      ...t,
      columns: t.columns.filter((c) =>
        c.displayName.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((t) => t.columns.length > 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Campos</p>
        <input
          type="text"
          placeholder="Buscar campo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 sm:h-7 px-2 text-xs bg-muted/50 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <ScrollArea className="flex-1 px-1">
        {filtered.map((table) => (
          <TableGroup
            key={table.name}
            table={table}
            onFieldSelect={onFieldSelect}
            onFieldDragStart={onFieldDragStart}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
