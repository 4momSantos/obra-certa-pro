
-- Create contratos table
CREATE TABLE public.contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  numero_contrato TEXT DEFAULT '',
  valor_contratual NUMERIC(18,2) NOT NULL,
  unidade TEXT DEFAULT '',
  bm_total INTEGER DEFAULT 22,
  bm_mes_referencia TEXT DEFAULT '2025-07',
  bm_dia_inicio INTEGER DEFAULT 26,
  bm_dia_fim INTEGER DEFAULT 25,
  alerta_aging_dias INTEGER DEFAULT 60,
  alerta_scon_minimo INTEGER DEFAULT 50,
  alerta_dados_desatualizados INTEGER DEFAULT 7,
  logo_url TEXT DEFAULT '',
  cor_primaria TEXT DEFAULT '#1a3c6e',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "read_all" ON public.contratos
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can write
CREATE POLICY "admin_write" ON public.contratos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.trg_updated_at();
