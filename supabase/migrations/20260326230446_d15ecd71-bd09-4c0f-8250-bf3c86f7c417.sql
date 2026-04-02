
-- 1. dashboards table
CREATE TABLE public.dashboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Novo Dashboard',
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT NULL,
  layout JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{"theme": "default", "refresh_interval": 0}',
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. dashboard_widgets table
CREATE TABLE public.dashboard_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Widget',
  config JSONB NOT NULL DEFAULT '{}',
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 3}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. dashboard_shares table
CREATE TABLE public.dashboard_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
  shared_with UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dashboard_id, shared_with)
);

-- 4. RLS on dashboards
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access" ON public.dashboards
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Shared users can view" ON public.dashboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_shares
      WHERE dashboard_shares.dashboard_id = dashboards.id
      AND dashboard_shares.shared_with = auth.uid()
    )
  );

-- 5. RLS on dashboard_widgets
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via dashboard ownership" ON public.dashboard_widgets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dashboards
      WHERE dashboards.id = dashboard_widgets.dashboard_id
      AND dashboards.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shared users can view widgets" ON public.dashboard_widgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_shares
      JOIN public.dashboards ON dashboards.id = dashboard_widgets.dashboard_id
      WHERE dashboard_shares.dashboard_id = dashboard_widgets.dashboard_id
      AND dashboard_shares.shared_with = auth.uid()
    )
  );

-- 6. RLS on dashboard_shares
ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages shares" ON public.dashboard_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dashboards
      WHERE dashboards.id = dashboard_shares.dashboard_id
      AND dashboards.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shared user sees own share" ON public.dashboard_shares
  FOR SELECT USING (auth.uid() = shared_with);

-- 7. Triggers for updated_at (reusing existing function)
CREATE TRIGGER dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_dashboards_owner ON public.dashboards(owner_id);
CREATE INDEX idx_widgets_dashboard ON public.dashboard_widgets(dashboard_id);
CREATE INDEX idx_shares_dashboard ON public.dashboard_shares(dashboard_id);
CREATE INDEX idx_shares_user ON public.dashboard_shares(shared_with);
