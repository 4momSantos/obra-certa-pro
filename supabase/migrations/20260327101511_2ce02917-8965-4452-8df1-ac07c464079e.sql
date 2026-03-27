-- 1. import_batches
CREATE TABLE public.import_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  filename TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.import_batches IS 'Controle de uploads de Excel';

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own imports" ON public.import_batches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. gitec_events
CREATE TABLE public.gitec_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE NOT NULL,
  agrupamento TEXT NOT NULL DEFAULT '',
  ippu TEXT,
  tag TEXT DEFAULT '',
  etapa TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  valor NUMERIC(15,2) DEFAULT 0,
  data_execucao DATE,
  data_inf_execucao DATE,
  data_aprovacao DATE,
  executado_por TEXT DEFAULT '',
  fiscal TEXT DEFAULT '',
  evidencias TEXT DEFAULT '',
  comentario TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_gitec_ippu ON public.gitec_events(ippu);
CREATE INDEX idx_gitec_status ON public.gitec_events(status);
CREATE INDEX idx_gitec_fiscal ON public.gitec_events(fiscal);
CREATE INDEX idx_gitec_batch ON public.gitec_events(batch_id);
CREATE INDEX idx_gitec_tag ON public.gitec_events(tag);

ALTER TABLE public.gitec_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_import_batch(b_id uuid, u_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.import_batches WHERE id = b_id AND user_id = u_id);
$$;
REVOKE EXECUTE ON FUNCTION public.owns_import_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_import_batch TO authenticated;

CREATE POLICY "Owner manages via batch" ON public.gitec_events FOR ALL TO authenticated
  USING (public.owns_import_batch(batch_id, auth.uid())) WITH CHECK (public.owns_import_batch(batch_id, auth.uid()));
CREATE POLICY "Authenticated read" ON public.gitec_events FOR SELECT TO authenticated USING (true);

-- 3. documents
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE NOT NULL,
  documento TEXT NOT NULL,
  revisao TEXT DEFAULT '',
  incluido_em TEXT DEFAULT '',
  titulo TEXT DEFAULT '',
  status TEXT DEFAULT '',
  nivel2 TEXT DEFAULT '',
  nivel3 TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  status_workflow TEXT DEFAULT '',
  dias_corridos_wf INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_documents_documento ON public.documents(documento);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_batch ON public.documents(batch_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages via batch" ON public.documents FOR ALL TO authenticated
  USING (public.owns_import_batch(batch_id, auth.uid())) WITH CHECK (public.owns_import_batch(batch_id, auth.uid()));
CREATE POLICY "Authenticated read" ON public.documents FOR SELECT TO authenticated USING (true);

-- 4. document_revisions
CREATE TABLE public.document_revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE NOT NULL,
  documento TEXT NOT NULL,
  revisao TEXT DEFAULT '',
  modificado_em TEXT DEFAULT '',
  titulo TEXT DEFAULT '',
  status TEXT DEFAULT '',
  nivel2 TEXT DEFAULT '',
  texto_consolidacao TEXT DEFAULT '',
  proposito_emissao TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_docrev_documento ON public.document_revisions(documento);
CREATE INDEX idx_docrev_status ON public.document_revisions(status);
CREATE INDEX idx_docrev_batch ON public.document_revisions(batch_id);

ALTER TABLE public.document_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages via batch" ON public.document_revisions FOR ALL TO authenticated
  USING (public.owns_import_batch(batch_id, auth.uid())) WITH CHECK (public.owns_import_batch(batch_id, auth.uid()));
CREATE POLICY "Authenticated read" ON public.document_revisions FOR SELECT TO authenticated USING (true);

-- 5. Views
CREATE OR REPLACE VIEW public.gitec_by_ippu AS
SELECT ippu, COUNT(*) AS total_eventos,
  COUNT(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
  COUNT(*) FILTER (WHERE status = 'Pendente de Verificação') AS pend_verificacao,
  COUNT(*) FILTER (WHERE status = 'Pendente de Aprovação') AS pend_aprovacao,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Aprovado'), 0) AS val_aprovado,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Verificação'), 0) AS val_pend_verif,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Aprovação'), 0) AS val_pend_aprov,
  COALESCE(SUM(valor), 0) AS val_total
FROM public.gitec_events WHERE ippu IS NOT NULL AND ippu != '' GROUP BY ippu;

CREATE OR REPLACE VIEW public.gitec_by_fiscal AS
SELECT fiscal, COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
  COUNT(*) FILTER (WHERE status = 'Pendente de Verificação') AS pend_verif,
  COUNT(*) FILTER (WHERE status = 'Pendente de Aprovação') AS pend_aprov,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Verificação'), 0) AS val_pend_verif,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Pendente de Aprovação'), 0) AS val_pend_aprov
FROM public.gitec_events WHERE fiscal IS NOT NULL AND fiscal != '' GROUP BY fiscal;

CREATE OR REPLACE VIEW public.documents_with_status AS
SELECT d.*,
  EXISTS (SELECT 1 FROM public.document_revisions dr WHERE dr.documento = d.documento AND dr.status = 'Recusado') AS has_recusa,
  EXISTS (SELECT 1 FROM public.gitec_events ge WHERE ge.evidencias LIKE '%' || d.documento || '%') AS has_gitec
FROM public.documents d;