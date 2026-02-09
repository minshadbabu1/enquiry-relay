import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response("Missing id parameter", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("enquiries")
      .select("pdf_url")
      .eq("id", id)
      .single();

    if (error || !data?.pdf_url) {
      return new Response("PDF not found", { status: 404, headers: corsHeaders });
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: data.pdf_url },
    });
  } catch {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
