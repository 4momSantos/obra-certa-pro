/** Data Model Registry — defines available tables, columns and their types */

export type ColumnType = "text" | "number" | "boolean" | "date";
export type ColumnFormat = "currency" | "percent" | "integer";

export interface ColumnDef {
  name: string;
  displayName: string;
  label: string;
  type: ColumnType;
  table: string;
  format?: ColumnFormat;
}

export interface TableDef {
  name: string;
  displayName: string;
  label: string;
  columns: ColumnDef[];
}

export type DataModel = TableDef[] & {
  tables: TableDef[];
};

type RawColumnDef = Omit<ColumnDef, "label">;
type RawTableDef = Omit<TableDef, "label" | "columns"> & {
  columns: RawColumnDef[];
};

const rawTables: RawTableDef[] = [
  {
    name: "periods",
    displayName: "Períodos",
    columns: [
      { name: "id", displayName: "ID", type: "text", table: "periods" },
      { name: "label", displayName: "Período", type: "text", table: "periods" },
      { name: "baseline", displayName: "Baseline (R$)", type: "number", table: "periods", format: "currency" },
      { name: "previsto", displayName: "Previsto (R$)", type: "number", table: "periods", format: "currency" },
      { name: "projetado", displayName: "Projetado (R$)", type: "number", table: "periods", format: "currency" },
      { name: "realizado", displayName: "Realizado (R$)", type: "number", table: "periods", format: "currency" },
      { name: "adiantamento", displayName: "Adiantamento (R$)", type: "number", table: "periods", format: "currency" },
      { name: "fechado", displayName: "Fechado", type: "boolean", table: "periods" },
    ],
  },
  {
    name: "curvaS",
    displayName: "Curva S",
    columns: [
      { name: "period", displayName: "Período", type: "text", table: "curvaS" },
      { name: "baseline", displayName: "Baseline", type: "number", table: "curvaS", format: "currency" },
      { name: "previsto", displayName: "Previsto", type: "number", table: "curvaS", format: "currency" },
      { name: "projetado", displayName: "Projetado", type: "number", table: "curvaS", format: "currency" },
      { name: "realizado", displayName: "Realizado", type: "number", table: "curvaS", format: "currency" },
      { name: "baselineAcum", displayName: "Baseline Acum.", type: "number", table: "curvaS", format: "currency" },
      { name: "previstoAcum", displayName: "Previsto Acum.", type: "number", table: "curvaS", format: "currency" },
      { name: "projetadoAcum", displayName: "Projetado Acum.", type: "number", table: "curvaS", format: "currency" },
      { name: "realizadoAcum", displayName: "Realizado Acum.", type: "number", table: "curvaS", format: "currency" },
    ],
  },
  {
    name: "contrato",
    displayName: "Contrato",
    columns: [
      { name: "valorContratual", displayName: "Valor Contratual", type: "number", table: "contrato", format: "currency" },
      { name: "projectName", displayName: "Nome do Projeto", type: "text", table: "contrato" },
      { name: "lastUpdate", displayName: "Última Atualização", type: "date", table: "contrato" },
    ],
  },
];

const tables: TableDef[] = rawTables.map((table) => ({
  ...table,
  label: table.displayName,
  columns: table.columns.map((column) => ({
    ...column,
    label: column.displayName,
  })),
}));

export const dataModel = Object.assign(tables, { tables }) as DataModel;

export function getTable(name: string): TableDef | undefined {
  return tables.find((t) => t.name === name);
}

export function getColumn(tableName: string, columnName: string): ColumnDef | undefined {
  const table = getTable(tableName);
  return table?.columns.find((c) => c.name === columnName);
}

export function getAllColumns(): ColumnDef[] {
  return tables.flatMap((t) => t.columns);
}
