import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripHorizontal } from "lucide-react";

interface WidgetWrapperProps {
  title: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function WidgetWrapper({ title, children, className = "", noPadding }: WidgetWrapperProps) {
  return (
    <Card className={`glass-card h-full flex flex-col overflow-hidden ${className}`}>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <GripHorizontal className="h-4 w-4 text-muted-foreground/40 cursor-grab drag-handle" />
      </CardHeader>
      <CardContent className={`flex-1 ${noPadding ? "p-0" : ""}`}>
        {children}
      </CardContent>
    </Card>
  );
}
