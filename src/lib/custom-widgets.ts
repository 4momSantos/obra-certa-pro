export type CustomVisualType = "bar" | "line" | "area" | "pie" | "donut" | "kpi";

export interface CustomWidgetConfig {
  id: string;
  type: CustomVisualType;
  title: string;
  table: string;
  xAxis: string;
  valueColumns: string[];
  createdAt: number;
}

const CUSTOM_WIDGETS_KEY = "splan-custom-widgets";

export function loadCustomWidgets(): CustomWidgetConfig[] {
  try {
    const saved = localStorage.getItem(CUSTOM_WIDGETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function saveCustomWidgets(widgets: CustomWidgetConfig[]) {
  localStorage.setItem(CUSTOM_WIDGETS_KEY, JSON.stringify(widgets));
}
