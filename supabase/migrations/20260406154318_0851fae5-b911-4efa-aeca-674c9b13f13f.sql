
DROP VIEW IF EXISTS public.vw_gitec_por_ppu;
CREATE VIEW public.vw_gitec_por_ppu WITH (security_invoker=on) AS
SELECT
  ippu AS item_ppu,
  count(*) AS total_eventos,
  count(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
  count(*) FILTER (WHERE status LIKE 'Pendente%') AS pendentes,
  COALESCE(sum(valor) FILTER (WHERE status = 'Aprovado'), 0) AS valor_aprovado,
  COALESCE(sum(valor) FILTER (WHERE status LIKE 'Pendente%'), 0) AS valor_pendente,
  COALESCE(sum(valor), 0) AS valor_total,
  max(data_aprovacao) AS ultima_aprovacao,
  max(data_inf_execucao) AS ultima_inf_execucao,
  count(*) FILTER (WHERE status = 'Aprovado') AS eventos_concluidos
FROM gitec_events
WHERE ippu IS NOT NULL AND ippu <> ''
GROUP BY ippu;

DROP VIEW IF EXISTS public.vw_sigem_por_ppu;
CREATE VIEW public.vw_sigem_por_ppu WITH (security_invoker=on) AS
SELECT
  ge.ippu AS ppu,
  count(DISTINCT sd.id) AS total_docs,
  count(DISTINCT sd.id) FILTER (WHERE sd.status_correto IN ('Sem Comentários', 'Para Construção')) AS docs_ok,
  count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = 'Recusado') AS docs_recusados,
  count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = 'Em Workflow') AS docs_workflow,
  count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = 'Com Comentários') AS docs_comentarios
FROM gitec_events ge
  JOIN sigem_documents sd ON sd.documento = ANY(string_to_array(ge.tag, ';'))
WHERE ge.ippu IS NOT NULL AND ge.ippu <> ''
  AND ge.tag IS NOT NULL AND ge.tag <> ''
GROUP BY ge.ippu;
