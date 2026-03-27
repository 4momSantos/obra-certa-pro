-- 1. Create SECURITY DEFINER functions to break RLS recursion

CREATE OR REPLACE FUNCTION public.is_dashboard_owner(d_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboards
    WHERE id = d_id AND owner_id = u_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_dashboard_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dashboard_owner TO authenticated;

CREATE OR REPLACE FUNCTION public.has_dashboard_share(d_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboard_shares
    WHERE dashboard_id = d_id AND shared_with = u_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_dashboard_share FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_dashboard_share TO authenticated;

-- 2. Fix dashboards policies
DROP POLICY IF EXISTS "Shared users can view" ON public.dashboards;
CREATE POLICY "Shared users can view" ON public.dashboards
  FOR SELECT TO public
  USING (public.has_dashboard_share(id, auth.uid()));

-- 3. Fix dashboard_shares policies
DROP POLICY IF EXISTS "Owner manages shares" ON public.dashboard_shares;
CREATE POLICY "Owner manages shares" ON public.dashboard_shares
  FOR ALL TO public
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()));

-- 4. Fix dashboard_widgets policies
DROP POLICY IF EXISTS "Access via dashboard ownership" ON public.dashboard_widgets;
CREATE POLICY "Access via dashboard ownership" ON public.dashboard_widgets
  FOR ALL TO public
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()));

DROP POLICY IF EXISTS "Shared users can view widgets" ON public.dashboard_widgets;
CREATE POLICY "Shared users can view widgets" ON public.dashboard_widgets
  FOR SELECT TO public
  USING (public.has_dashboard_share(dashboard_id, auth.uid()));