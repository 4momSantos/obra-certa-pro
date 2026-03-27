import React, { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, CheckCircle2, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  label: string;
  description: string;
  required?: boolean;
  file: File | null;
  onFile: (f: File | null) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ label, description, required, file, onFile }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = ".xlsx,.xls";

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) onFile(f);
  }, [onFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all hover:shadow-md",
        file ? "border-emerald-500 bg-emerald-500/5" : required ? "border-primary border-2" : "border-dashed border-2 border-muted-foreground/30",
        dragOver && "border-primary bg-primary/5 scale-[1.02]"
      )}
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 p-6 min-h-[180px]">
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />

        {file ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div className="text-center">
              <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={(e) => { e.stopPropagation(); onFile(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {dragOver ? (
              <FileSpreadsheet className="h-10 w-10 text-primary animate-pulse" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <span className={cn(
              "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full",
              required ? "bg-primary/10 text-primary font-semibold" : "bg-muted text-muted-foreground"
            )}>
              {required ? "Obrigatório" : "Opcional"}
            </span>
          </>
        )}
      </CardContent>
    </Card>
  );
};
