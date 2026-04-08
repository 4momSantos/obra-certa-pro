DROP POLICY IF EXISTS "read_contrato" ON public.rel_eventos;
CREATE POLICY "read_auth" ON public.rel_eventos
  FOR SELECT TO authenticated
  USING (true);