-- Fix security definer views by recreating with security_invoker = true
DROP VIEW IF EXISTS public.gitec_by_ippu;
DROP VIEW IF EXISTS public.gitec_by_fiscal;
DROP VIEW IF EXISTS public.documents_with_status;

CREATE VIEW public.gitec_by_ippu WITH (security_invoker = true) AS
SELECT ippu, COUNT(*) AS total_eventos,
  COUNT(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
  COUNT(*) FILTER (WHERE status = 'Pendente de Verificação') AS pend_verificacao,
  COUNT(*) FILTER (WHERE status = 'Pendente de Aprovação') AS pend_aprovacao,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Aprovado'), 0) AS val_aprovado,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Verificação'), 0) AS val_pend_verif,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Aprovação'), 0) AS val_pend_aprov,
  COALESCE(SUM(valor), 0) AS val_total
FROM public.gitec_events WHERE ippu IS NOT NULL AND ippu != '' GROUP BY ippu;

CREATE VIEW public.gitec_by_fiscal WITH (security_invoker = true) AS
SELECT fiscal, COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
  COUNT(*) FILTER (WHERE status = 'Pendente de Verificação') AS pend_verif,
  COUNT(*) FILTER (WHERE status = 'Pendente de Aprovação') AS pend_aprov,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Verificação'), 0) AS val_pend_verif,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Aprovação'), 0) AS val_pend_aprov
FROM public.gitec_events WHERE fiscal IS NOT NULL AND fiscal != '' GROUP BY fiscal;

CREATE VIEW public.documents_with_status WITH (security_invoker = true) AS
SELECT d.*,
  EXISTS (SELECT 1 FROM public.document_revisions dr WHERE dr.documento = d.documento AND dr.status = 'Recusado') AS has_recusa,
  EXISTS (SELECT 1 FROM public.gitec_events ge WHERE ge.evidencias LIKE '%' || d.documento || '%') AS has_gitec
FROM public.documents d;