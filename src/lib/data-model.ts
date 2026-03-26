export interface ColumnDef {
  name: string;
  label: string;
  type: "number" | "text" | "date" | "boolean";
  format?: "currency" | "percent" | "integer" | "date";
}

export interface TableDef {
  name: string;
  label: string;
  icon: string; // lucide icon name
  columns: ColumnDef[];
}

export const dataModel: TableDef[] = [
  {
    name: "periodos",
    label: "Períodos",
    icon: "Calendar",
    columns: [
      { name: "id", label: "ID", type: "text" },
      { name: "label", label: "Período", type: "text" },
      { name: "baseline", label: "Baseline", type: "number", format: "currency" },
      { name: "previsto", label: "Previsto", type: "number", format: "currency" },
      { name: "projetado", label: "Projetado", type: "number", format: "currency" },
      { name: "realizado", label: "Realizado", type: "number", format: "currency" },
      { name: "adiantamento", label: "Adiantamento", type: "number", format: "currency" },
      { name: "fechado", label: "Status (Fechado)", type: "boolean" },
    ],
  },
  {
    name: "curva_s",
    label: "Curva S",
    icon: "TrendingUp",
    columns: [
      { name: "period", label: "Período", type: "text" },
      { name: "baseline", label: "Baseline", type: "number", format: "currency" },
      { name: "previsto", label: "Previsto", type: "number", format: "currency" },
      { name: "projetado", label: "Projetado", type: "number", format: "currency" },
      { name: "realizado", label: "Realizado", type: "number", format: "currency" },
      { name: "baselineAcum", label: "Baseline Acum.", type: "number", format: "currency" },
      { name: "previstoAcum", label: "Previsto Acum.", type: "number", format: "currency" },
      { name: "projetadoAcum", label: "Projetado Acum.", type: "number", format: "currency" },
      { name: "realizadoAcum", label: "Realizado Acum.", type: "number", format: "currency" },
    ],
  },
  {
    name: "contrato",
    label: "Contrato",
    icon: "FileText",
    columns: [
      { name: "valorContratual", label: "Valor Contratual", type: "number", format: "currency" },
      { name: "projectName", label: "Nome do Projeto", type: "text" },
      { name: "lastUpdate", label: "Última Atualização", type: "date", format: "date" },
    ],
  },
  {
    name: "metricas",
    label: "Métricas Calculadas",
    icon: "Calculator",
    columns: [
      { name: "avancoFinanceiro", label: "Avanço Financeiro", type: "number", format: "percent" },
      { name: "avancoFisico", label: "Avanço Físico", type: "number", format: "percent" },
      { name: "saldo", label: "Saldo", type: "number", format: "currency" },
      { name: "totalBaseline", label: "Total Baseline", type: "number", format: "currency" },
      { name: "totalPrevisto", label: "Total Previsto", type: "number", format: "currency" },
      { name: "totalProjetado", label: "Total Projetado", type: "number", format: "currency" },
      { name: "totalRealizado", label: "Total Realizado", type: "number", format: "currency" },
      { name: "totalAdiantamento", label: "Total Adiantamento", type: "number", format: "currency" },
    ],
  },
  {
    name: "profiles",
    label: "Perfis de Usuário",
    icon: "Users",
    columns: [
      { name: "id", label: "ID", type: "text" },
      { name: "full_name", label: "Nome Completo", type: "text" },
      { name: "avatar_url", label: "Avatar URL", type: "text" },
      { name: "created_at", label: "Criado em", type: "date", format: "date" },
      { name: "updated_at", label: "Atualizado em", type: "date", format: "date" },
    ],
  },
  {
    name: "user_roles",
    label: "Roles de Usuário",
    icon: "Shield",
    columns: [
      { name: "id", label: "ID", type: "text" },
      { name: "user_id", label: "ID do Usuário", type: "text" },
      { name: "role", label: "Role", type: "text" },
    ],
  },
];
