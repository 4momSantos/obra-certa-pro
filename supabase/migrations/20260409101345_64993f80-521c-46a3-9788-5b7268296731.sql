DROP VIEW IF EXISTS public.vw_sigem_por_ppu;
CREATE VIEW public.vw_sigem_por_ppu AS
SELECT ge.ippu AS ppu,
    count(DISTINCT sd.id) AS total_docs,
    count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = ANY (ARRAY['Sem Comentários', 'Para Construção'])) AS docs_ok,
    count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = 'Recusado') AS docs_recusados,
    count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = 'Em Workflow') AS docs_workflow,
    count(DISTINCT sd.id) FILTER (WHERE sd.status_correto = 'Com Comentários') AS docs_comentarios
   FROM gitec_events ge
     JOIN sigem_documents sd ON sd.documento = ANY (string_to_array(ge.evidencias, ';'))
  WHERE ge.ippu IS NOT NULL AND ge.ippu <> ''
    AND ge.evidencias IS NOT NULL AND ge.evidencias <> '' AND ge.evidencias <> 'Sim' AND ge.evidencias <> 'Não'
  GROUP BY ge.ippu;