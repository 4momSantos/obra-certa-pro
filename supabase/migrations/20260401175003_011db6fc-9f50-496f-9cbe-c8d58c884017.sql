
CREATE OR REPLACE FUNCTION public.user_contrato_ids()
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT contrato_id FROM public.contrato_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    ),
    '{}'::UUID[]
  );
$$;

-- sigem_documents: substituir read_all por read_contrato
DROP POLICY IF EXISTS "Read all" ON public.sigem_documents;
DROP POLICY IF EXISTS "read_all" ON public.sigem_documents;
CREATE POLICY "read_contrato" ON public.sigem_documents
  FOR SELECT TO authenticated
  USING (contrato_id = ANY(public.user_contrato_ids()) OR contrato_id IS NULL);
