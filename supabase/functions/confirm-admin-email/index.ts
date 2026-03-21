import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find admin user by email
    const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers();
    if (listError) throw listError;

    const adminUser = users.find((u: any) => u.email === "admin@splan.com.br");
    if (!adminUser) {
      return new Response(JSON.stringify({ error: "Admin user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await serviceClient.auth.admin.updateUser(adminUser.id, {
      email_confirm: true,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, user_id: adminUser.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
