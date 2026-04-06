import type { ProcessingResults, WizardConfig } from '@/types/etf';
import type { ETFColaborador, ETFSessionInput } from '@/hooks/useETFSession';

export interface BMRef {
  id: string;
  numero: number;
}

/**
 * Converte os resultados crus do Wizard ETF no payload aceito pela Edge Function
 * `save-etf-session`. Função pura — nenhuma chamada externa.
 *
 * Notas sobre derivações:
 * - `competencia`: primeiro dia do mês de `config.inicio` (formato YYYY-MM-01)
 * - `horas_disponiveis`: aproximação por headcount × dias × 8h. Quando houver
 *   campo de jornada planejada nos dados de entrada, refinar.
 * - `horas_extras`: 0 (decisão do usuário — refinar quando houver regra de jornada)
 */
export function buildETFPayload(
  results: ProcessingResults,
  config: WizardConfig,
  feriados: Set<string>,
  bm: BMRef,
  arquivoNome?: string,
): ETFSessionInput {
  const competencia = toCompetencia(config.inicio);
  const totalDias = results.allDates.length || 1;
  const headcount_etf = results.efetivoETF.size;
  const headcount_total = headcount_etf + results.removidos.size;

  const horas_trabalhadas = round2(
    results.consolidated.reduce((acc, c) => acc + (c.hh || 0), 0),
  );
  const horas_disponiveis = round2(headcount_etf * totalDias * 8);
  const horas_extras = 0;
  const eficiencia_pct = horas_disponiveis > 0
    ? round2((horas_trabalhadas / horas_disponiveis) * 100)
    : 0;

  const totalFaltas = results.faltas.reduce((acc, f) => acc + (f.totalFaltas || 0), 0);
  const denomAbsent = headcount_etf * totalDias;
  const absenteismo_pct = denomAbsent > 0
    ? round2((totalFaltas / denomAbsent) * 100)
    : 0;

  const feriados_trabalhados = results.consolidated.filter(
    c => feriados.has(c.dateKey) && (c.hh || 0) > 0,
  ).length;

  // ----- Colaboradores -----
  // Agrupa registros consolidados por matrícula (chapa)
  const consolidadosPorChapa = new Map<string, typeof results.consolidated>();
  for (const c of results.consolidated) {
    const arr = consolidadosPorChapa.get(c.matricula);
    if (arr) arr.push(c);
    else consolidadosPorChapa.set(c.matricula, [c]);
  }

  // Index para lookup rápido de status / faltas
  const substitutoChapas = new Set(
    results.substitutos
      .map(s => extractChapa(s as unknown as Record<string, unknown>))
      .filter((x): x is string => !!x),
  );
  const ausenteChapas = new Set(results.ausentes.map(a => a.chapa));
  const faltasByChapa = new Map(results.faltas.map(f => [f.chapa, f]));

  // efetivoETF é Map<chapa, EfetivoInfo>? ou Map<cpf, EfetivoInfo>? Pelo type,
  // ProcessingResults.efetivoETF: Map<string, EfetivoInfo> sem documentação.
  // Olhando pelo uso (planejamento, distribuição), a chave é a matrícula/chapa.
  const colaboradores: ETFColaborador[] = [];
  for (const [chapa, info] of results.efetivoETF.entries()) {
    const grupo = consolidadosPorChapa.get(chapa) ?? [];
    const horas_total = round2(grupo.reduce((acc, c) => acc + (c.hh || 0), 0));
    const faltaInfo = faltasByChapa.get(chapa);
    const faltas = faltaInfo?.totalFaltas ?? 0;

    let status: ETFColaborador['status'] = 'ATIVO';
    if (substitutoChapas.has(chapa)) status = 'SUBSTITUIDO';
    else if (ausenteChapas.has(chapa)) status = 'AUSENTE';

    // horas_diarias: 1 entrada por dia em allDates
    const hhPorDia = new Map<string, number>();
    for (const c of grupo) hhPorDia.set(c.dateKey, (hhPorDia.get(c.dateKey) ?? 0) + (c.hh || 0));
    const diasFaltaSet = new Set(faltaInfo?.diasFalta ?? []);

    const horas_diarias = results.allDates.map(dk => {
      const horas = round2(hhPorDia.get(dk) ?? 0);
      let tipo: string;
      if (feriados.has(dk)) tipo = horas > 0 ? 'FERIADO_TRAB' : 'FERIADO';
      else if (diasFaltaSet.has(dk)) tipo = 'FALTA';
      else tipo = horas > 0 ? 'NORMAL' : 'SEM_PONTO';
      return { data: dk, horas, tipo };
    });

    colaboradores.push({
      chapa,
      nome: info.nome,
      funcao: info.funcao ?? null,
      limite_m7: info.funcaoETF ?? null,
      horas_total,
      horas_extras: 0,
      faltas,
      status,
      horas_diarias,
    });
  }

  return {
    competencia,
    bm_id: bm.id,
    bm_numero: bm.numero,
    arquivo_nome: arquivoNome ?? null,
    kpis: {
      headcount_etf,
      headcount_total,
      horas_trabalhadas,
      horas_disponiveis,
      horas_extras,
      eficiencia_pct,
      absenteismo_pct,
      feriados_trabalhados,
    },
    colaboradores,
  };
}

function toCompetencia(inicio: string): string {
  // inicio é YYYY-MM-DD; retorna YYYY-MM-01
  if (!inicio || inicio.length < 7) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return `${inicio.slice(0, 7)}-01`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function extractChapa(row: Record<string, unknown>): string | undefined {
  const v = row['chapa'];
  return typeof v === 'string' ? v : undefined;
}
