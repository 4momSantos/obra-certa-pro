import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/types/etf';

interface Props {
  progress: number;
  logs: LogEntry[];
  isComplete: boolean;
}

const LOG_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  ok: 'text-green-400',
  warn: 'text-yellow-400',
  err: 'text-red-400',
  '': 'text-muted-foreground',
};

export default function ETFWizardProcess({ progress, logs, isComplete }: Props) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isComplete ? '✅ Processamento concluído' : '⚡ Processando...'}
            </span>
            <span className="text-sm font-mono text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />

          <ScrollArea className="h-[280px] sm:h-[350px] md:h-[400px] rounded-lg border bg-muted/30 p-2 sm:p-3">
            <div className="space-y-0.5 font-mono text-xs">
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={LOG_COLORS[log.type] || 'text-muted-foreground'}
                >
                  {log.msg}
                </motion.div>
              ))}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
