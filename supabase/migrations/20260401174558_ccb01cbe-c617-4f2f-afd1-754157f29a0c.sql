
CREATE TABLE public.equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  disciplina TEXT DEFAULT '',
  tipo TEXT DEFAULT 'execucao',
  lider_id UUID REFERENCES auth.users(id),
  lider_nome TEXT DEFAULT '',
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contrato_id, nome)
);

COMMENT ON COLUMN public.equipes.tipo IS
  'execucao = equipe de campo | pcp = planejamento | medicao = controle financeiro | engenharia = técnico | gestao = gerencial';

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all" ON public.equipes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_write" ON public.equipes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
