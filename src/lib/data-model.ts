/** Data Model Registry — defines available tables, columns and their types */

export type ColumnType = "text" | "number" | "boolean" | "date";

export interface ColumnDef {
  name: string;
  displayName: string;
  type: ColumnType;
  table: string;
}

export interface TableDef {
  name: string;
  displayName: string;
  columns: ColumnDef[];
}

export interface DataModel {
  tables: TableDef[];
}

export const dataModel: DataModel = {
  tables: [
    {
      name: "periods",
      displayName: "Períodos",
      columns: [
        { name: "id", displayName: "ID", type: "text", table: "periods" },
        { name: "label", displayName: "Período", type: "text", table: "periods" },
        { name: "baseline", displayName: "Baseline (R$)", type: "number", table: "periods" },
        { name: "previsto", displayName: "Previsto (R$)", type: "number", table: "periods" },
        { name: "projetado", displayName: "Projetado (R$)", type: "number", table: "periods" },
        { name: "realizado", displayName: "Realizado (R$)", type: "number", table: "periods" },
        { name: "adiantamento", displayName: "Adiantamento (R$)", type: "number", table: "periods" },
        { name: "fechado", displayName: "Fechado", type: "boolean", table: "periods" },
      ],
    },
    {
      name: "curvaS",
      displayName: "Curva S",
      columns: [
        { name: "period", displayName: "Período", type: "text", table: "curvaS" },
        { name: "baseline", displayName: "Baseline", type: "number", table: "curvaS" },
        { name: "previsto", displayName: "Previsto", type: "number", table: "curvaS" },
        { name: "projetado", displayName: "Projetado", type: "number", table: "curvaS" },
        { name: "realizado", displayName: "Realizado", type: "number", table: "curvaS" },
        { name: "baselineAcum", displayName: "Baseline Acum.", type: "number", table: "curvaS" },
        { name: "previstoAcum", displayName: "Previsto Acum.", type: "number", table: "curvaS" },
        { name: "projetadoAcum", displayName: "Projetado Acum.", type: "number", table: "curvaS" },
        { name: "realizadoAcum", displayName: "Realizado Acum.", type: "number", table: "curvaS" },
      ],
    },
    {
      name: "contrato",
      displayName: "Contrato",
      columns: [
        { name: "valorContratual", displayName: "Valor Contratual", type: "number", table: "contrato" },
        { name: "projectName", displayName: "Nome do Projeto", type: "text", table: "contrato" },
        { name: "lastUpdate", displayName: "Última Atualização", type: "date", table: "contrato" },
      ],
    },
  ],
};

export function getTable(name: string): TableDef | undefined {
  return dataModel.tables.find((t) => t.name === name);
}

export function getColumn(tableName: string, columnName: string): ColumnDef | undefined {
  const table = getTable(tableName);
  return table?.columns.find((c) => c.name === columnName);
}

export function getAllColumns(): ColumnDef[] {
  return dataModel.tables.flatMap((t) => t.columns);
}
