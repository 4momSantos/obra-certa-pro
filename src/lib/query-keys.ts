/**
 * QUERY KEYS REGISTRY
 * ===================
 * Fonte única de verdade para todos os cache keys do React Query.
 *
 * REGRAS OBRIGATÓRIAS:
 *  1. Todo useQuery/useMutation DEVE usar uma chave deste arquivo.
 *  2. Antes de adicionar uma nova chave, verifique se o dado já existe
 *     sob outra chave — consulte a coluna "owner" abaixo.
 *  3. Cada tabela/view tem um hook canônico em useSharedData.ts.
 *     Hooks derivados NÃO devem buscar a mesma tabela diretamente.
 *  4. Execute `npm run audit:queries` para detectar violações.
 *
 * FORMATO:
 *  Chaves que terminam em _ALL indicam fetch completo da tabela/view.
 *  Chaves sem sufixo são derivadas (filtradas, mapeadas, etc.).
 *
 * ⚠️  CHAVES MARCADAS COM [DEPRECATED] devem ser substituídas pelo
 *     hook canônico indicado. Não adicione novas referências a elas.
 */

// ─── Dados base canônicos (owner: useSharedData.ts) ───────────────────────────
// Cada item representa UMA tabela/view com UM único hook canônico.
// Todos os demais hooks DEVEM derivar desses, nunca buscar a tabela diretamente.

export const SHARED_QUERY_KEYS = {
  /** owner: useGitecEventsAll — tabela gitec_events completa */
  GITEC_EVENTS_ALL: "gitec-events-all",

  /** owner: useGitecPorPpu — view vw_gitec_por_ppu completa */
  GITEC_POR_PPU: "gitec-por-ppu",

  /** owner: useSconPorPpu — view vw_scon_por_ppu completa */
  SCON_POR_PPU: "scon-por-ppu",

  /** owner: usePpuItemsAll — tabela ppu_items completa */
  PPU_ITEMS_ALL: "ppu-items-all",

  /** owner: useClassificacaoPpuAll — tabela classificacao_ppu completa */
  CLASSIFICACAO_PPU_ALL: "classificacao-ppu-all",

  /** owner: useSigemDocumentsAll — tabela sigem_documents completa */
  SIGEM_DOCUMENTS_ALL: "sigem-docs-all",
} as const;

// ─── Medicao ─────────────────────────────────────────────────────────────────
export const MEDICAO_QUERY_KEYS = {
  /** owner: useMedicao.ts / useMedicaoData */
  MEDICAO_DATA: "medicao-data",
} as const;

// ─── GITEC (derivados de GITEC_EVENTS_ALL / GITEC_POR_PPU) ───────────────────
export const GITEC_QUERY_KEYS = {
  /** Prefixo compartilhado por todos os sub-keys de gitec */
  BASE: "gitec",

  // Estatísticas agregadas derivadas de SHARED_QUERY_KEYS.GITEC_EVENTS_ALL
  STATS: "stats",

  // Lista de fiscais (vw_fiscais)
  FISCAIS_LIST: "fiscais-list",

  // Eventos filtrados com paginação parcial
  EVENTS_FILTERED: "events",

  // Agrupamento por fiscal (vw_fiscais)
  BY_FISCAL: "by-fiscal",

  /**
   * Agrupamento por iPPU — derivado de SHARED_QUERY_KEYS.GITEC_POR_PPU
   * @deprecated Remova o fetch direto de vw_gitec_por_ppu; use useGitecPorPpu()
   */
  BY_IPPU: "by-ippu",

  // Detalhe de evento único
  DETAIL: "detail",

  // Eventos filtrados por iPPU específico
  EVENTOS_IPPU: "gitec-eventos-ippu",
} as const;

// ─── BM Data ─────────────────────────────────────────────────────────────────
export const BM_QUERY_KEYS = {
  /** Valores do cronograma por BM */
  ALL_BM_VALUES: "all-bm-values",

  /**
   * Todos os rel. eventos (gitec_events) paginados.
   * @deprecated Usa SHARED_QUERY_KEYS.GITEC_EVENTS_ALL internamente.
   *             Importe useGitecEventsAll() ao invés de chamar supabase diretamente.
   */
  ALL_REL_EVENTOS: "all-rel-eventos",

  /**
   * Todos os documentos SIGEM.
   * @deprecated Usa SHARED_QUERY_KEYS.SIGEM_DOCUMENTS_ALL internamente.
   *             Importe useSigemDocumentsAll() ao invés de chamar supabase diretamente.
   */
  ALL_SIGEM_DOCS: "all-sigem-docs",
} as const;

// ─── Cronograma ──────────────────────────────────────────────────────────────
export const CRONOGRAMA_QUERY_KEYS = {
  TREE: "cronograma-tree",
  BM_IPPU: "cronograma-bm-ippu",
  BM: "cronograma-bm",
  CURVA_S: "curva-s",
  ULTIMO_BM: "ultimo-bm",
  COMPONENTS: "cronograma-components",
} as const;

// ─── Previsao ────────────────────────────────────────────────────────────────
export const PREVISAO_QUERY_KEYS = {
  BM_PERIODOS: "bm-periodos",
  PREVISAO: "previsao",
  PREVISAO_RESUMO: "previsao-resumo",

  /**
   * PPUs elegíveis para previsão.
   * @deprecated Subset de PPU_ITEMS_ALL — use usePpuItemsAll() e filtre localmente.
   */
  PPU_ELEGIVEIS: "ppu-elegiveis",

  /**
   * Mapa scon avg_avanco por item_wbs para previsão.
   * @deprecated Derivado de SCON_POR_PPU — use useSconPorPpu() e mapeie localmente.
   */
  SCON_MAP_PREV: "scon-map-prev",

  /**
   * Mapa disciplina por item_ppu para previsão.
   * @deprecated Derivado de CLASSIFICACAO_PPU_ALL — use useClassificacaoPpuAll().
   */
  CLASSIF_MAP_PREV: "classif-map-prev",

  PROJETADO_BM: "projetado-bm",
} as const;

// ─── PPU Detail ──────────────────────────────────────────────────────────────
export const PPU_DETAIL_QUERY_KEYS = {
  SCON: "ppu-detail-scon",
  REL: "ppu-detail-rel",
  SIGEM: "ppu-detail-sigem",
  CRITERIO: "ppu-detail-criterio",
  EAC: "ppu-detail-eac",
} as const;

// ─── Acompanhamento ──────────────────────────────────────────────────────────
export const ACOMPANHAMENTO_QUERY_KEYS = {
  /**
   * Saldo global por PPU.
   * @deprecated Derivado de GITEC_POR_PPU + PPU_ITEMS_ALL.
   *             useSharedData hooks são usados internamente.
   */
  SALDO_PPU_GLOBAL: "saldo-ppu-global",

  BM: "acompanhamento-bm",
} as const;

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const ALERTS_QUERY_KEYS = {
  ALERTS: "alerts",
} as const;

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const DASHBOARD_QUERY_KEYS = {
  DASHBOARDS: "dashboards",
  DASHBOARD: "dashboard",
  WIDGETS: "widgets",
  SHARES: "dashboard-shares",
} as const;

// ─── Documents ───────────────────────────────────────────────────────────────
export const DOCUMENTS_QUERY_KEYS = {
  DOCUMENTS: "documents",
} as const;

// ─── Scon Views ──────────────────────────────────────────────────────────────
export const SCON_VIEWS_QUERY_KEYS = {
  VW_EQUIPES: "vw_equipes",
  VW_DISCIPLINAS: "vw_disciplinas",
  VW_SCON_COMPONENTES: "vw_scon_componentes",
  COBERTURA_SCON: "cobertura_scon",
  SCON_EXECUCAO_BM: "scon-execucao-bm",
  ITENS_NAO_MEDIDOS: "itens-nao-medidos",
} as const;

// ─── Config ──────────────────────────────────────────────────────────────────
export const CONFIG_QUERY_KEYS = {
  CONFIG_COUNTS: "config-counts",
  COLUMN_MAPPING: "column-mapping",
  DISCIPLINAS: "config-disciplinas",
  STATUS: "config-status",
  FILTROS: "config-filtros",
  REGRAS: "config-regras",
  ALERTAS: "config-alertas",
} as const;

// ─── Import ──────────────────────────────────────────────────────────────────
export const IMPORT_QUERY_KEYS = {
  BATCHES: "import-batches",
  EXISTING_COUNTS: "import-existing-counts",
  STATS: "import-stats",
} as const;

// ─── Boletim ─────────────────────────────────────────────────────────────────
export const BOLETIM_QUERY_KEYS = {
  BOLETIM: "boletim",
  ITENS: "boletim-itens",
} as const;

// ─── Audit ───────────────────────────────────────────────────────────────────
export const AUDIT_QUERY_KEYS = {
  LOG: "audit-log",
  ENTITY: "audit-entity",
} as const;

// ─── Misc ────────────────────────────────────────────────────────────────────
export const MISC_QUERY_KEYS = {
  TAREFAS: "tarefas",
  ANOTACOES: "anotacoes",
  SIMULADOR_DATA: "simulador-data",
} as const;

// ─── Export unificado ────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  ...SHARED_QUERY_KEYS,
  ...MEDICAO_QUERY_KEYS,
  GITEC: GITEC_QUERY_KEYS,
  BM: BM_QUERY_KEYS,
  CRONOGRAMA: CRONOGRAMA_QUERY_KEYS,
  PREVISAO: PREVISAO_QUERY_KEYS,
  PPU_DETAIL: PPU_DETAIL_QUERY_KEYS,
  ACOMPANHAMENTO: ACOMPANHAMENTO_QUERY_KEYS,
  ALERTS: ALERTS_QUERY_KEYS,
  DASHBOARD: DASHBOARD_QUERY_KEYS,
  DOCUMENTS: DOCUMENTS_QUERY_KEYS,
  SCON: SCON_VIEWS_QUERY_KEYS,
  CONFIG: CONFIG_QUERY_KEYS,
  IMPORT: IMPORT_QUERY_KEYS,
  BOLETIM: BOLETIM_QUERY_KEYS,
  AUDIT: AUDIT_QUERY_KEYS,
  MISC: MISC_QUERY_KEYS,
} as const;
