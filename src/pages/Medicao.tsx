import { motion } from "framer-motion";
import { FileCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Medicao() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medição</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhamento físico e financeiro de medições</p>
      </div>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <FileCheck className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Módulo em desenvolvimento</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
