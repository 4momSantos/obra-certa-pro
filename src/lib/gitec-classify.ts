/**
 * GITEC event classification for Adiantamento (advance payment) tracking.
 * Mirrors classifyEvento() from SPLAN Explorer.
 *
 * C- prefix = Engenheirado supply:  AF → Fabricação → Embarque → Concluída
 * D- prefix = Prateleira (shelf) supply: AF/Fabricação → NF/Embarque → Concluída
 * B- prefix = Regular service
 */

export type EventoClasse =
  | 'adiant_prat_base'    // D-: AF or Fabricação approved (base adiantamento)
  | 'adiant_prat_nf'      // D-: NF (Nota Fiscal) or Embarque approved
  | 'faturado_prat'       // D-: Concluída with NF evidence (billing)
  | 'conclui_prat_sem_nf' // D-: Concluída but no NF evidence
  | 'adiant_eng_af'       // C-: AF etapa approved
  | 'adiant_eng_fab'      // C-: Fabricação etapa approved
  | 'adiant_eng_emb'      // C-: Embarque etapa approved
  | 'faturado_eng'        // C-: Concluída (billing)
  | 'servico'             // B-: regular service event
  | 'outro';              // unclassified

export interface GitecEventoInput {
  ippu: string;
  tag: string;
  etapa: string;
  status: string;
  valor: number;
  peso_fisico?: number;
  peso_financeiro?: number;
  numero_evidencias?: string;
}

/**
 * Classifies a single GITEC event for Adiantamento tracking.
 */
export function classifyEvento(g: GitecEventoInput): EventoClasse {
  const ippu = (g.ippu || '').trim();
  const etapa = (g.etapa || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  const prefix = ippu.substring(0, 2).toUpperCase();

  // B- items are regular services
  if (prefix === 'B-') return 'servico';

  // D- items: prateleira (shelf) supply
  if (prefix === 'D-') {
    if (etapa.includes('conclu')) {
      const hasNf = !!(g.numero_evidencias && g.numero_evidencias.trim());
      return hasNf ? 'faturado_prat' : 'conclui_prat_sem_nf';
    }
    if (
      etapa.includes('nota fiscal') ||
      etapa === 'nf' ||
      etapa.startsWith('nf ') ||
      etapa.includes('embarque') ||
      etapa.includes('emb')
    ) {
      return 'adiant_prat_nf';
    }
    // AF, Fabricação or any other D- stage = base adiantamento
    return 'adiant_prat_base';
  }

  // C- items: engenheirado (engineered) supply
  if (prefix === 'C-') {
    if (etapa.includes('conclu')) return 'faturado_eng';
    if (etapa.includes('embarque') || etapa.includes('emb')) return 'adiant_eng_emb';
    if (etapa.includes('fabricac') || etapa.includes('fabric')) return 'adiant_eng_fab';
    // AF or any other C- approved stage
    return 'adiant_eng_af';
  }

  return 'outro';
}

export function isAdiantamento(classe: EventoClasse): boolean {
  return [
    'adiant_prat_base', 'adiant_prat_nf',
    'adiant_eng_af', 'adiant_eng_fab', 'adiant_eng_emb',
  ].includes(classe);
}

export function isFaturado(classe: EventoClasse): boolean {
  return ['faturado_prat', 'faturado_eng'].includes(classe);
}

export function isSuprimento(ippu: string): boolean {
  return /^[CD]-/i.test((ippu || '').trim());
}

/** Aggregate summary from a list of GITEC events */
export interface AdiantamentoSummary {
  total_adiant: number;
  total_faturado: number;
  saldo: number;
  por_classe: Partial<Record<EventoClasse, { count: number; valor: number }>>;
}

export function summarizeAdiantamento(
  events: GitecEventoInput[]
): AdiantamentoSummary {
  const por_classe: Partial<Record<EventoClasse, { count: number; valor: number }>> = {};
  let total_adiant = 0;
  let total_faturado = 0;

  for (const ev of events) {
    const classe = classifyEvento(ev);
    if (!por_classe[classe]) por_classe[classe] = { count: 0, valor: 0 };
    por_classe[classe]!.count++;
    por_classe[classe]!.valor += ev.valor || 0;
    if (isAdiantamento(classe)) total_adiant += ev.valor || 0;
    if (isFaturado(classe)) total_faturado += ev.valor || 0;
  }

  return { total_adiant, total_faturado, saldo: total_adiant - total_faturado, por_classe };
}
