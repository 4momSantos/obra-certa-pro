import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ColaboradorInput {
  chapa: string;
  nome: string;
  funcao?: string | null;
  limite_m7?: string | null;
  horas_total: number;
  horas_extras: number;
  faltas: number;
  status: "ATIVO" | "AUSENTE" | "SUBSTITUIDO";
  horas_diarias: Array<{ data: string; horas: number; tipo: string }>;
}

interface ETFSessionInput {
  competencia: string; // YYYY-MM-01
  bm_id: string;
  bm_numero: number;
  arquivo_nome?: string | null;
  kpis: {
    headcount_etf: number;
    headcount_total: number;
    horas_trabalhadas: number;
    horas_disponiveis: number;
    horas_extras: number;
    eficiencia_pct: number;
    absenteismo_pct: number;
    feriados_trabalhados: number;
  };
  colaboradores: ColaboradorInput[];
}

const CHUNK_SIZE = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = (await req.json()) as ETFSessionInput;
    if (!body.competencia || !body.bm_id || !body.kpis || !Array.isArray(body.colaboradores)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert session by (competencia, bm_id)
    const { data: session, error: upsertError } = await serviceClient
      .from("etf_sessions")
      .upsert(
        {
          competencia: body.competencia,
          bm_id: body.bm_id,
          bm_numero: body.bm_numero,
          arquivo_nome: body.arquivo_nome ?? null,
          uploaded_by: userId,
          ...body.kpis,
        },
        { onConflict: "competencia,bm_id" }
      )
      .select("id")
      .single();

    if (upsertError || !session) {
      return new Response(
        JSON.stringify({ error: `Upsert session failed: ${upsertError?.message ?? "unknown"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete previous colaboradores for this session (clean re-upload)
    const { error: deleteError } = await serviceClient
      .from("etf_colaboradores")
      .delete()
      .eq("session_id", session.id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: `Delete old colaboradores failed: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert colaboradores in chunks
    const rows = body.colaboradores.map((c) => ({ ...c, session_id: session.id }));
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await serviceClient
        .from("etf_colaboradores")
        .insert(chunk);
      if (insertError) {
        return new Response(
          JSON.stringify({
            error: `Insert colaboradores chunk ${i / CHUNK_SIZE} failed: ${insertError.message}`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, session_id: session.id, count: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
