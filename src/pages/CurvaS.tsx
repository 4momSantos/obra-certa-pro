import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CurvaS() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Curva S</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualização acumulada e mensal do cronograma</p>
      </div>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <TrendingUp className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Módulo em desenvolvimento — C3</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
