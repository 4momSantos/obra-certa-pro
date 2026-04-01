import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code2, Eye, EyeOff, Plus, X, AlertTriangle } from "lucide-react";

interface HtmlVisualImporterProps {
  onImport: (config: { id: string; title: string; html: string; css: string }) => void;
  onClose: () => void;
}

const htmlTemplates = [
  {
    name: "Progress Ring",
    html: `<div class="ring-container">
  <svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="8"/>
    <circle cx="60" cy="60" r="52" fill="none" stroke="#3b82f6" stroke-width="8"
      stroke-dasharray="326.7" stroke-dashoffset="98" stroke-linecap="round"
      transform="rotate(-90 60 60)"/>
  </svg>
  <div class="ring-label">70%</div>
</div>`,
    css: `.ring-container { position: relative; width: 120px; height: 120px; margin: auto; }
.ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; font-family: monospace; }`,
  },
  {
    name: "Status Indicator",
    html: `<div class="status-grid">
  <div class="status-item on-track"><span class="dot"></span> No prazo</div>
  <div class="status-item warning"><span class="dot"></span> Atenção</div>
  <div class="status-item critical"><span class="dot"></span> Crítico</div>
</div>`,
    css: `.status-grid { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.status-item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,0.04); }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.on-track .dot { background: #22c55e; } .warning .dot { background: #f59e0b; } .critical .dot { background: #ef4444; }`,
  },
  {
    name: "Mini Sparkline",
    html: `<div class="spark-container">
  <svg viewBox="0 0 200 60" class="sparkline">
    <polyline fill="none" stroke="#3b82f6" stroke-width="2"
      points="0,50 20,45 40,35 60,40 80,25 100,30 120,15 140,20 160,10 180,18 200,5"/>
    <polyline fill="url(#sparkGrad)" stroke="none"
      points="0,60 0,50 20,45 40,35 60,40 80,25 100,30 120,15 140,20 160,10 180,18 200,5 200,60"/>
    <defs>
      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
      </linearGradient>
    </defs>
  </svg>
  <div class="spark-label">Tendência positiva</div>
</div>`,
    css: `.spark-container { padding: 12px; }
.sparkline { width: 100%; height: 60px; }
.spark-label { font-size: 11px; color: #6b7280; margin-top: 6px; text-align: center; }`,
  },
];

export function HtmlVisualImporter({ onImport, onClose }: HtmlVisualImporterProps) {
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "templates">("templates");

  const handleImport = () => {
    onImport({
      id: `html-${Date.now()}`,
      title: title || "Visual HTML",
      html,
      css,
    });
  };

  const loadTemplate = (template: typeof htmlTemplates[number]) => {
    setHtml(template.html);
    setCss(template.css);
    setTitle(template.name);
    setActiveTab("editor");
  };

  const previewHtml = `
    <html>
      <head><style>* { margin: 0; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; } body { padding: 16px; } ${css}</style></head>
      <body>${html}</body>
    </html>
  `;

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">Visual HTML5 Personalizado</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-1">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-3 py-1 text-[10px] font-medium rounded-t transition-colors ${
            activeTab === "templates" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab("editor")}
          className={`px-3 py-1 text-[10px] font-medium rounded-t transition-colors ${
            activeTab === "editor" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          Editor
        </button>
      </div>

      {activeTab === "templates" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {htmlTemplates.map((t) => (
            <button
              key={t.name}
              onClick={() => loadTemplate(t)}
              className="border border-border/50 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors"
            >
              <div
                className="w-full h-20 mb-2 rounded overflow-hidden bg-white"
                dangerouslySetInnerHTML={{
                  __html: `<style>${t.css}</style><div style="transform:scale(0.5);transform-origin:top left;width:200%">${t.html}</div>`,
                }}
              />
              <p className="text-[10px] font-medium">{t.name}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do visual..."
            className="w-full h-7 px-2 text-xs bg-muted/30 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* HTML Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">HTML</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] gap-1"
                onClick={() => setPreview(!preview)}
              >
                {preview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {preview ? "Código" : "Preview"}
              </Button>
            </div>
            {preview ? (
              <div className="border border-border/50 rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-40 border-0"
                  sandbox="allow-scripts"
                  title="Preview"
                />
              </div>
            ) : (
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<div>Seu HTML aqui...</div>"
                className="w-full h-24 sm:h-28 px-3 py-2 text-[11px] font-mono bg-[#1e1e2e] text-[#cdd6f4] border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            )}
          </div>

          {/* CSS Editor */}
          {!preview && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">CSS</p>
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                placeholder=".my-class { color: blue; }"
                className="w-full h-16 sm:h-20 px-3 py-2 text-[11px] font-mono bg-[#1e1e2e] text-[#cdd6f4] border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          )}

          {/* Security Warning */}
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-chart-2" />
            <span>Visuais HTML são renderizados em sandbox isolado. Scripts são limitados por segurança.</span>
          </div>

          <Button onClick={handleImport} className="w-full text-xs gap-1" disabled={!html.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Importar Visual
          </Button>
        </>
      )}
    </div>
  );
}
