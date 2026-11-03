/**
 * FORGE FITNESS — Booking Confirmation Email
 * Supabase Edge Function (Deno runtime)
 *
 * Triggered: Called from the frontend after a successful `submit_consultation_booking` RPC.
 * Purpose:   Sends a professional confirmation email to the client using Resend.
 * Security:  RESEND_API_KEY is stored as a Supabase secret — never exposed to the browser.
 *
 * Deploy:    supabase functions deploy send-booking-confirmation --no-verify-jwt
 * Secrets:   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
 *            supabase secrets set RESEND_FROM_EMAIL=bookings@yourdomain.com
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

// ---------------------------------------------------------------------------
// CORS Headers — allow the website origin to call this function
// ---------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Email HTML Template — FORGE FITNESS dark-themed branded email
// ---------------------------------------------------------------------------
function buildEmailHtml(data: {
  clientName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  primaryGoal: string;
  experienceLevel: string;
  status: string;
  trainerName: string;
  notes?: string;
}): string {
  const isPending = data.status !== 'Confirmed';
  const statusLabel = isPending ? 'Request Received' : 'Booking Confirmed';
  const statusColor = isPending ? '#F59E0B' : '#B8FF38';
  const statusBg = isPending ? '#1c1500' : '#0d1a00';
  const statusBorder = isPending ? '#78350f' : '#365314';

  // Format date for display: "Mon, Nov 23, 2026"
  let displayDate = data.bookingDate;
  try {
    const parts = data.bookingDate.split('-');
    if (parts.length === 3) {
      const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
      );
      displayDate = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (_) { /* keep raw date on error */ }

  const instructionsText = isPending
    ? `Your consultation request has been received and is now pending review by ${data.trainerName}. You will receive a follow-up confirmation once your session is approved. Please do not make other commitments for this time slot.`
    : `Your consultation with ${data.trainerName} has been confirmed. Please be ready 5 minutes before your session time. You will receive a meeting link closer to the date.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FORGE FITNESS — ${statusLabel}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#090B0A;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#090B0A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- HEADER / LOGO -->
          <tr>
            <td style="padding-bottom:32px;" align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#B8FF38;padding:6px 18px;border-radius:4px;">
                    <span style="font-family:'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:900;letter-spacing:3px;color:#090B0A;text-transform:uppercase;">FORGE FITNESS</span>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:12px;color:#6B7280;letter-spacing:2px;text-transform:uppercase;">Elite Coaching &amp; Biomechanics</p>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background-color:#111311;border:1px solid #1f2420;border-radius:16px;overflow:hidden;">

              <!-- STATUS BANNER -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:${statusBg};border-bottom:1px solid ${statusBorder};padding:16px 28px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:${statusColor};width:8px;height:8px;border-radius:50%;"></td>
                        <td style="padding-left:10px;">
                          <span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${statusColor};">${statusLabel}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- GREETING -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 28px 0;">
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">Hi ${data.clientName},</h1>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#9CA3AF;">
                      ${instructionsText}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- BOOKING DETAILS TABLE -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F1210;border:1px solid #1f2420;border-radius:12px;overflow:hidden;">

                      <!-- Table Header -->
                      <tr>
                        <td colspan="2" style="padding:14px 20px;border-bottom:1px solid #1f2420;">
                          <span style="font-size:10px;font-weight:700;letter-spacing:2px;color:#6B7280;text-transform:uppercase;">Booking Summary</span>
                        </td>
                      </tr>

                      <!-- Booking Code -->
                      <tr>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;width:42%;">Booking Reference</td>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:700;color:#B8FF38;font-family:'Courier New',monospace;">${data.bookingCode}</td>
                      </tr>

                      <!-- Date -->
                      <tr>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Consultation Date</td>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">${displayDate}</td>
                      </tr>

                      <!-- Time -->
                      <tr>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Session Time</td>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#B8FF38;">${data.bookingTime} (IST)</td>
                      </tr>

                      <!-- Goal -->
                      <tr>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Primary Goal</td>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">${data.primaryGoal}</td>
                      </tr>

                      <!-- Experience -->
                      <tr>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Training Background</td>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">${data.experienceLevel}</td>
                      </tr>

                      <!-- Format -->
                      <tr>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Session Format</td>
                        <td style="padding:12px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">100% Remote Video Call (Google Meet / Zoom)</td>
                      </tr>

                      <!-- Trainer -->
                      <tr>
                        <td style="padding:12px 20px;font-size:12px;color:#6B7280;">Your Coach</td>
                        <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#FFFFFF;">${data.trainerName}</td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>

              ${data.notes ? `
              <!-- NOTES -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 28px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a1500;border:1px solid #1a3a00;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:2px;color:#6B7280;text-transform:uppercase;">Your Notes</p>
                          <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">${data.notes}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- WHAT TO PREPARE -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 28px 28px;">
                    <h3 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:1px;">Prepare for Your Session</h3>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:20px;">
                          <span style="display:inline-block;width:6px;height:6px;background-color:#B8FF38;border-radius:50%;margin-top:5px;"></span>
                        </td>
                        <td style="padding:6px 0 6px 10px;font-size:13px;color:#9CA3AF;line-height:1.5;">Note your current training routine, recent progress, and any pain or injury history</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:20px;">
                          <span style="display:inline-block;width:6px;height:6px;background-color:#B8FF38;border-radius:50%;margin-top:5px;"></span>
                        </td>
                        <td style="padding:6px 0 6px 10px;font-size:13px;color:#9CA3AF;line-height:1.5;">Test your microphone and camera before the session begins</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:20px;">
                          <span style="display:inline-block;width:6px;height:6px;background-color:#B8FF38;border-radius:50%;margin-top:5px;"></span>
                        </td>
                        <td style="padding:6px 0 6px 10px;font-size:13px;color:#9CA3AF;line-height:1.5;">Be ready 5 minutes early — a meeting link will be sent prior to your session</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:20px;">
                          <span style="display:inline-block;width:6px;height:6px;background-color:#B8FF38;border-radius:50%;margin-top:5px;"></span>
                        </td>
                        <td style="padding:6px 0 6px 10px;font-size:13px;color:#9CA3AF;line-height:1.5;">Bring your questions — this is your opportunity to build a personalised strength plan</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- CONTACT / FOOTER -->
          <tr>
            <td style="padding:28px 0 0;" align="center">
              <p style="margin:0 0 8px;font-size:12px;color:#4B5563;">Questions? Contact Coach Haisam directly:</p>
              <p style="margin:0;font-size:12px;color:#6B7280;">
                <a href="mailto:coach.haisam@forgefitness.com" style="color:#B8FF38;text-decoration:none;">coach.haisam@forgefitness.com</a>
              </p>
              <hr style="border:none;border-top:1px solid #1f2420;margin:24px 0;" />
              <p style="margin:0;font-size:11px;color:#374151;line-height:1.6;">
                This email was sent because you submitted a consultation request on the FORGE FITNESS website.<br/>
                Booking reference: <strong style="color:#4B5563;">${data.bookingCode}</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Plain-text fallback
// ---------------------------------------------------------------------------
function buildEmailText(data: {
  clientName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  primaryGoal: string;
  experienceLevel: string;
  status: string;
  trainerName: string;
  notes?: string;
}): string {
  const isPending = data.status !== 'Confirmed';
  const statusLabel = isPending ? 'REQUEST RECEIVED' : 'BOOKING CONFIRMED';
  return `FORGE FITNESS — ${statusLabel}

Hi ${data.clientName},

${isPending
    ? `Your consultation request has been received and is pending review by ${data.trainerName}. You will be contacted once your session is approved.`
    : `Your consultation with ${data.trainerName} has been confirmed. Please be ready 5 minutes before your session time.`
  }

BOOKING DETAILS
---------------
Reference: ${data.bookingCode}
Date:      ${data.bookingDate}
Time:      ${data.bookingTime} (IST)
Goal:      ${data.primaryGoal}
Format:    100% Remote Video Call (Google Meet / Zoom)
Coach:     ${data.trainerName}
${data.notes ? `Notes:     ${data.notes}` : ''}

WHAT TO PREPARE
• Note your training routine and any injury history
• Test your microphone and camera beforehand
• Be ready 5 minutes early
• Bring your questions

Questions? Email: coach.haisam@forgefitness.com

---
FORGE FITNESS Elite Coaching
This email was sent because you submitted a consultation request on the FORGE FITNESS website.
Booking: ${data.bookingCode}
`;
}

// ---------------------------------------------------------------------------
// Main Edge Function Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request body
    const body = await req.json();

    const {
      clientName,
      clientEmail,
      bookingCode,
      bookingDate,
      bookingTime,
      primaryGoal,
      experienceLevel,
      status = 'Pending',
      trainerName = 'Coach Haisam',
      notes,
    } = body;

    // Validate required fields
    if (!clientEmail || !clientName || !bookingCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientEmail, clientName, bookingCode' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Basic email format check
    const emailRegex = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(clientEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid client email address' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[FORGE Email] RESEND_API_KEY environment variable is not set.');
      return new Response(
        JSON.stringify({ error: 'Email service is not configured. Set RESEND_API_KEY.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Sender email (use env var or default to a Resend-allowed domain)
    // IMPORTANT: The from email domain must be verified in your Resend account.
    // During development you can use the Resend sandbox: onboarding@resend.dev
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'FORGE FITNESS <onboarding@resend.dev>';

    const emailData = {
      clientName,
      bookingCode,
      bookingDate: bookingDate || '',
      bookingTime: bookingTime || '',
      primaryGoal: primaryGoal || 'Consultation',
      experienceLevel: experienceLevel || '',
      status,
      trainerName,
      notes: notes || undefined,
    };

    const isPending = status !== 'Confirmed';
    const subjectLine = isPending
      ? `Your consultation request has been received — ${bookingCode} | FORGE FITNESS`
      : `Your consultation is confirmed — ${bookingCode} | FORGE FITNESS`;

    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [clientEmail],
        subject: subjectLine,
        html: buildEmailHtml(emailData),
        text: buildEmailText(emailData),
        tags: [
          { name: 'booking_code', value: bookingCode },
          { name: 'status', value: status },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[FORGE Email] Resend API error:', resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email',
          details: resendData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.info(`[FORGE Email] Confirmation email sent successfully to ${clientEmail} for booking ${bookingCode}. Resend ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        bookingCode,
        sentTo: clientEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[FORGE Email] Unexpected error in Edge Function:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
