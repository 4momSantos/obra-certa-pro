
CREATE TABLE public.equipe_membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  funcao TEXT DEFAULT 'membro',
  disciplinas TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(equipe_id, user_id)
);

ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all" ON public.equipe_membros
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_write" ON public.equipe_membros
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
