CREATE TABLE public.config_column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  header_row INTEGER NOT NULL DEFAULT 0,
  mappings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contrato_id, source)
);

ALTER TABLE public.config_column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_auth" ON public.config_column_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_auth" ON public.config_column_mappings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);