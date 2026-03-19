import { motion } from "framer-motion";
import { Users, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ETF() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ETF Semanal</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle de Efetivo Técnico e Funcional</p>
      </div>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <Users className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Módulo em desenvolvimento</p>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Importar Planilha
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
