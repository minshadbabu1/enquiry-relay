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
    const { enquiry_id } = await req.json();
    if (!enquiry_id) {
      return new Response(JSON.stringify({ error: "enquiry_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get enquiry
    const { data: enquiry, error: eErr } = await supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiry_id)
      .single();

    if (eErr || !enquiry) {
      return new Response(JSON.stringify({ error: "Enquiry not found" }), { status: 404, headers: corsHeaders });
    }

    // Get WATI settings
    const { data: settings } = await supabase
      .from("wati_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings?.api_endpoint || !settings?.api_key) {
      console.log("WATI not configured, skipping");
      return new Response(JSON.stringify({ message: "WATI not configured" }), { headers: corsHeaders });
    }

    // Get active WhatsApp numbers
    const { data: numbers } = await supabase
      .from("whatsapp_numbers")
      .select("phone_number")
      .eq("is_active", true);

    if (!numbers || numbers.length === 0) {
      console.log("No WhatsApp numbers configured");
      return new Response(JSON.stringify({ message: "No numbers configured" }), { headers: corsHeaders });
    }

    // Build parameters: {{1}}=name, {{2}}=phone, {{3}}=pdf link
    const parameters = [
      { name: "1", value: enquiry.name || "N/A" },
      { name: "2", value: enquiry.mobile || "N/A" },
      { name: "3", value: enquiry.pdf_url || "No PDF available" },
    ];

    // Send to all numbers simultaneously
    const endpoint = settings.api_endpoint.replace(/\/$/, "");
    const results = await Promise.allSettled(
      numbers.map(async (n) => {
        const url = `${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(n.phone_number)}`;

        const body: Record<string, unknown> = {
          template_name: settings.template_name,
          broadcast_name: "enquiry_" + enquiry.id.slice(0, 8),
          parameters,
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: settings.api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const resBody = await res.text();
        console.log(`WATI response for ${n.phone_number}: ${res.status} - ${resBody}`);
        return { phone: n.phone_number, status: res.status, ok: res.ok, body: resBody };
      })
    );

    const allSent = results.every((r) => r.status === "fulfilled" && (r.value as any).ok);

    // Update enquiry status
    await supabase
      .from("enquiries")
      .update({ whatsapp_sent: allSent })
      .eq("id", enquiry_id);

    return new Response(JSON.stringify({ success: true, results }), { headers: corsHeaders });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
