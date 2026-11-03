const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  // RESEND_FROM_EMAIL is optional — falls back to Resend's shared sandbox sender.
  // Set it in the Supabase Dashboard to use your own verified domain.
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "FORGE FITNESS <onboarding@resend.dev>";
  if (!resendApiKey) {
    console.error("Missing RESEND_API_KEY secret");
    return jsonResponse({ error: "Email service is not configured" }, 500);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  const { to, subject, html, text } = payload as Record<string, unknown>;
  const recipients = typeof to === "string" ? [to] : to;
  const validEmail = (value: unknown): value is string =>
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (
    !Array.isArray(recipients) ||
    recipients.length < 1 ||
    recipients.length > 10 ||
    !recipients.every(validEmail)
  ) {
    return jsonResponse({ error: "to must contain 1–10 valid email addresses" }, 400);
  }
  if (typeof subject !== "string" || subject.trim().length === 0 || subject.length > 200) {
    return jsonResponse({ error: "subject is required and must be at most 200 characters" }, 400);
  }
  if ((typeof html !== "string" || html.length === 0) && (typeof text !== "string" || text.length === 0)) {
    return jsonResponse({ error: "Provide a non-empty html or text body" }, 400);
  }
  if ((typeof html === "string" && html.length > 100_000) || (typeof text === "string" && text.length > 100_000)) {
    return jsonResponse({ error: "Email body must be at most 100,000 characters" }, 400);
  }

  const emailPayload: Record<string, unknown> = {
    from: fromEmail,
    to: recipients,
    subject: subject.trim(),
  };
  if (typeof html === "string" && html.length > 0) emailPayload.html = html;
  if (typeof text === "string" && text.length > 0) emailPayload.text = text;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Resend API request failed", { status: response.status });
      return jsonResponse({ error: "Email provider rejected the request" }, 502);
    }

    return jsonResponse({ id: result?.id ?? null }, 200);
  } catch (error) {
    console.error("Resend request failed", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "Could not reach email provider" }, 502);
  }
});