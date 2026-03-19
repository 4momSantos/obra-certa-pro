import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Ajuste() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajuste Automático</h1>
        <p className="text-sm text-muted-foreground mt-1">Rebalanceamento via Curva S (sin^1.5)</p>
      </div>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <SlidersHorizontal className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Módulo em desenvolvimento</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
