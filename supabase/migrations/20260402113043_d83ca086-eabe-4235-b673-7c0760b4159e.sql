
-- Recreate vw_equipes
CREATE OR REPLACE VIEW vw_equipes AS
SELECT
  sp.equipe,
  COUNT(DISTINCT sp.componente) AS total_componentes,
  COUNT(DISTINCT sp.semana) AS total_semanas,
  COUNT(*) AS total_linhas,
  ROUND(COUNT(DISTINCT sp.componente)::NUMERIC / NULLIF(COUNT(DISTINCT sp.semana), 0), 1) AS comps_por_semana,
  ARRAY_AGG(DISTINCT sp.encarregado) FILTER (WHERE sp.encarregado <> '') AS encarregados,
  ARRAY_AGG(DISTINCT sp.supervisor) FILTER (WHERE sp.supervisor <> '') AS supervisores,
  ARRAY_AGG(DISTINCT sp.disciplina) FILTER (WHERE sp.disciplina <> '') AS disciplinas
FROM scon_programacao sp
WHERE sp.equipe <> ''
GROUP BY sp.equipe;

-- Recreate vw_disciplinas
CREATE OR REPLACE VIEW vw_disciplinas AS
SELECT
  sp.disciplina,
  COUNT(DISTINCT sp.componente) AS total_componentes,
  COUNT(DISTINCT sp.componente) FILTER (WHERE sp.total_exec_geral >= sp.programado_componente AND sp.programado_componente > 0) AS concluidos,
  COUNT(*) AS total_linhas,
  COUNT(DISTINCT sp.item_wbs) AS total_ppu
FROM scon_programacao sp
WHERE sp.disciplina <> ''
GROUP BY sp.disciplina;

-- Recreate vw_scon_componentes
CREATE OR REPLACE VIEW vw_scon_componentes AS
SELECT
  sp.componente,
  sp.item_wbs,
  sp.disciplina,
  sp.classe,
  sp.tipo,
  sp.equipe,
  sp.equipe_desc,
  sp.encarregado,
  sp.cwp,
  sp.tag_id_proj,
  MAX(sp.total_exec_geral) AS total_exec,
  MAX(sp.programado_componente) AS programado,
  CASE WHEN MAX(sp.programado_componente) > 0
    THEN LEAST(MAX(sp.total_exec_geral) / MAX(sp.programado_componente), 1)
    ELSE 0 END AS avanco,
  COUNT(DISTINCT sp.etapa) AS total_etapas,
  COUNT(DISTINCT sp.semana) AS total_semanas
FROM scon_programacao sp
WHERE sp.componente <> ''
GROUP BY sp.componente, sp.item_wbs, sp.disciplina, sp.classe, sp.tipo, sp.equipe, sp.equipe_desc, sp.encarregado, sp.cwp, sp.tag_id_proj;
