import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Config() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão de períodos, fechamento e auditoria</p>
      </div>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <Settings className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Módulo em desenvolvimento</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
