import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PgEvent = "INSERT" | "UPDATE" | "DELETE";

interface Options {
  table: string;
  events?: PgEvent[];
  queryKeys: string[][];
  /** Show toast on external changes */
  showToast?: boolean;
}

export function useRealtimeInvalidation(configs: Options[]) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (configs.length === 0) return;

    const channelName = `rt-${configs.map((c) => c.table).join("-")}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    for (const cfg of configs) {
      const events = cfg.events ?? ["INSERT", "UPDATE", "DELETE"];
      for (const event of events) {
        channel = channel.on(
          "postgres_changes" as any,
          { event, schema: "public", table: cfg.table },
          (_payload: any) => {
            for (const key of cfg.queryKeys) {
              queryClient.invalidateQueries({ queryKey: key });
            }
            if (cfg.showToast) {
              toast.info("Dados atualizados em tempo real", { duration: 2000 });
            }
          }
        );
      }
    }

    channel.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [configs.map((c) => c.table).join(",")]);

  return { connected };
}
