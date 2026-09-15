export type DeliveryPayload = {
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientName?: string | null;
  subject: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  type:
    | "booking_created"
    | "booking_confirmed"
    | "booking_cancelled"
    | "booking_completed"
    | "payment_success"
    | "payment_failed"
    | "review_received"
    | "message_received"
    | "system";
};

export type DeliveryResult = {
  emailSent: boolean;
  smsSent: boolean;
  mode: "live" | "simulated";
  message: string;
};

/**
 * Dispatches transactional notifications via Email and SMS.
 * If credentials (RESEND_API_KEY, TWILIO_*) are not configured in the environment,
 * it runs in simulated mode with formatted logs, ensuring zero runtime crashes.
 */
export async function dispatchExternalNotification(
  payload: DeliveryPayload,
): Promise<DeliveryResult> {
  const env = process.env as Record<string, string | undefined>;
  const resendApiKey = env["RESEND_API_KEY"];
  const twilioSid = env["TWILIO_ACCOUNT_SID"];
  const twilioAuthToken = env["TWILIO_AUTH_TOKEN"];
  const twilioFromNumber = env["TWILIO_PHONE_NUMBER"];

  let emailSent = false;
  let smsSent = false;
  const mode = resendApiKey || (twilioSid && twilioAuthToken) ? "live" : "simulated";

  // 1. Transactional Email Dispatch
  if (payload.recipientEmail) {
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Travezy Travel <notifications@travezy.app>",
            to: payload.recipientEmail,
            subject: payload.subject,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; rounded: 12px;">
                <h2 style="color: #0f172a; margin-top: 0;">${payload.title}</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">${payload.body}</p>
                ${
                  payload.actionUrl
                    ? `<div style="margin-top: 24px;">
                        <a href="${payload.actionUrl}" style="background-color: #0ea5e9; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View in Travezy</a>
                       </div>`
                    : ""
                }
                <hr style="margin-top: 32px; border: none; border-top: 1px solid #eaeaea;" />
                <p style="color: #94a3b8; font-size: 12px;">Travezy — Discover, Book & Explore Seamlessly</p>
              </div>
            `,
          }),
        });
        emailSent = emailResponse.ok;
      } catch (err) {
        console.warn("[Email dispatch error]", err);
      }
    } else {
      // Simulated Email logging
      console.log(
        `[Transactional Email (Simulated)] To: ${payload.recipientEmail} | Subject: "${payload.subject}" | Body: "${payload.body}"`,
      );
      emailSent = true;
    }
  }

  // 2. Transactional SMS Dispatch
  if (payload.recipientPhone) {
    if (twilioSid && twilioAuthToken && twilioFromNumber) {
      try {
        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: payload.recipientPhone,
              Body: `[Travezy] ${payload.title}: ${payload.body}`,
            }),
          },
        );
        smsSent = smsResponse.ok;
      } catch (err) {
        console.warn("[SMS dispatch error]", err);
      }
    } else {
      // Simulated SMS logging
      console.log(
        `[Transactional SMS (Simulated)] To: ${payload.recipientPhone} | Message: "[Travezy] ${payload.title}: ${payload.body}"`,
      );
      smsSent = true;
    }
  }

  return {
    emailSent,
    smsSent,
    mode,
    message: `Dispatched notification via ${mode} channels.`,
  };
}
