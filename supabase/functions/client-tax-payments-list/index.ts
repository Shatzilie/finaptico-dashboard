import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_code } = await req.json();

    if (!client_code) {
      return new Response(
        JSON.stringify({ error: "client_code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate current year boundaries in UTC
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const yearStart = `${currentYear}-01-01T00:00:00Z`;
    const yearEnd = `${currentYear + 1}-01-01T00:00:00Z`;

    // Query tax_filings filtered by:
    // - client_code matches
    // - status = SETTLED
    // - result = PAYABLE
    // - settled_at is not null
    // - settled_at is within current year (UTC)
    const { data, error } = await supabase
      .from("tax_filings")
      .select(
        "id, tax_model_code, period_start, period_end, status, result, amount, currency, settled_at, notes"
      )
      .eq("client_code", client_code)
      .eq("status", "SETTLED")
      .eq("result", "PAYABLE")
      .not("settled_at", "is", null)
      .gte("settled_at", yearStart)
      .lt("settled_at", yearEnd)
      .order("settled_at", { ascending: false });

    if (error) {
      console.error("Error querying tax_filings:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
