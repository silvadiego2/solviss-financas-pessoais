import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, client_secret, save } = await req.json();

    if (!client_id || !client_secret) {
      return new Response(
        JSON.stringify({ error: "client_id e client_secret são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Testar contra a API Pluggy
    const res = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client_id, clientSecret: client_secret }),
    });

    const data = await res.json();
    const isValid = !!data.apiKey;

    // Salvar (com service role para bypassar checks adicionais, mas filtra por user.id)
    if (save) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error: upsertError } = await adminClient
        .from("user_integrations")
        .upsert(
          {
            user_id: user.id,
            provider: "pluggy",
            client_id,
            client_secret,
            status: isValid ? "valid" : "invalid",
            last_tested_at: new Date().toISOString(),
            last_error: isValid ? null : (data.message || "Credenciais inválidas"),
          },
          { onConflict: "user_id,provider" }
        );

      if (upsertError) {
        console.error("Erro ao salvar:", upsertError);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar credenciais", details: upsertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        valid: isValid,
        message: isValid
          ? "Credenciais Pluggy válidas!"
          : (data.message || "Credenciais inválidas"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
