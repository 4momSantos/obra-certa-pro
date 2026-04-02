
CREATE TABLE public.contrato_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'tecnico',
  disciplinas TEXT[] DEFAULT '{}',
  modulos_acesso TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contrato_id, user_id)
);

COMMENT ON COLUMN public.contrato_usuarios.role IS
  'admin_contrato = tudo no contrato | gestor = medição+PCP | coordenador = sua disciplina + equipe | tecnico = leitura + previsão | visualizador = somente leitura';

ALTER TABLE public.contrato_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all" ON public.contrato_usuarios
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_write" ON public.contrato_usuarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
