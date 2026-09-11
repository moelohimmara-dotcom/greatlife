import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.6.0/mod.ts";

// Polyfill : Deno.writeAll a été retiré du runtime Supabase Edge Functions,
// mais smtp@0.6.0 l'utilise en interne.
// @ts-ignore
if (typeof (Deno as any).writeAll !== "function") {
  // @ts-ignore
  (Deno as any).writeAll = async function writeAll(
    writer: Deno.Writer,
    data: Uint8Array,
  ): Promise<void> {
    let written = 0;
    while (written < data.length) {
      const n = await writer.write(data.subarray(written));
      if (n === 0) {
        throw new Error("writeAll: écriture de 0 octet (connexion fermée)");
      }
      written += n;
    }
  };
}

const SMTP_USER = Deno.env.get("SMTP_USER") || "moelohimmara@gmail.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "maki lqrj wivo cmha";
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

interface ContactPayload {
  action?: "contact" | "reply";
  nom: string;
  email: string;
  sujet: string;
  message: string;
  // Champs utilisés pour le mode "reply" (réponse admin → client)
  to?: string;
  subject?: string;
  replyMessage?: string;
  replyFromName?: string;
  originalMessage?: string;
}

async function sendMail(
  to: string,
  subject: string,
  textContent: string,
  html: string,
) {
  const client = new SmtpClient();
  await client.connectTLS({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
    username: SMTP_USER,
    password: SMTP_PASS,
  });
  try {
    await client.send({
      from: SMTP_USER,
      to,
      subject,
      content: textContent,
      html,
    });
  } finally {
    await client.close();
  }
}

async function handleContact(body: ContactPayload): Promise<Response> {
  const { nom, email, sujet, message } = body;

  if (!nom || !email || !message) {
    return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: contentData } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "site_config")
    .maybeSingle();

  const config = (contentData?.value || {}) as {
    emailContact?: string;
    emailReservation?: string;
    autoReply?: string;
  };
  const destEmail = config.emailContact || "moelohimmara@gmail.com";
  const autoReply = (config.autoReply ||
    "Bonjour {nom}, merci pour votre message a Greatlife ! Nous revenons vers vous sous 24h. - L'equipe Greatlife")
    .replace(/{nom}/g, nom);

  const sujetFinal = sujet || "contact";

  const errors: string[] = [];

  if (SMTP_USER && SMTP_PASS) {
    try {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      await sendMail(
        destEmail,
        `Nouveau message - ${sujetFinal}`,
        `Nom: ${nom}\nEmail: ${email}\nSujet: ${sujetFinal}\n\n${message}`,
        `<p><strong>${esc(nom)}</strong> (${esc(email)})</p><p><em>Sujet: ${esc(sujetFinal)}</em></p><p>${esc(message)}</p>`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("dest:" + msg);
      console.error("Send to dest error:", err);
    }

    try {
      await sendMail(
        email,
        "Greatlife - Nous avons bien recu votre message",
        autoReply,
        `<p>${autoReply.replace(/\n/g, "<br>")}</p>`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("autoreply:" + msg);
      console.error("Auto-reply error:", err);
    }
  } else {
    errors.push("no-credentials");
  }

  return new Response(JSON.stringify({ ok: errors.length === 0, errors }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleReply(body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const replySubject = body.subject || `Re: ${body.sujet || "contact"}`;
  const replyText = body.replyMessage || body.message || "";
  const fromName = body.replyFromName || "Greatlife";
  const original = body.originalMessage || "";

  if (!to || !replyText) {
    return new Response(
      JSON.stringify({ ok: false, error: "Destinataire et message requis" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const errors: string[] = [];

  if (SMTP_USER && SMTP_PASS) {
    try {
      const htmlBody =
        `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">` +
        `<div style="font-size:24px;font-weight:700;color:#2d6a4f;margin-bottom:16px">Great<span style="color:#e8a93c">life</span></div>` +
        `<p>Bonjour,</p>` +
        `<p style="white-space:pre-wrap">${replyText.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>` +
        (original
          ? `<hr style="border:none;border-top:1px solid #eee;margin:20px 0" /><div style="font-size:12px;color:#888">Votre message initial :</div><blockquote style="border-left:3px solid #eee;padding-left:12px;margin:8px 0;color:#666;font-size:13px">${original.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</blockquote>`
          : "") +
        `<p style="margin-top:24px">— ${fromName}, équipe Greatlife</p>` +
        `<div style="font-size:11px;color:#aaa;margin-top:16px">Conakry, Guinée · Fast-food bio sans culpabilité</div>` +
        `</div>`;
      await sendMail(to, replySubject, replyText, htmlBody);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("reply:" + msg);
      console.error("Reply send error:", err);
    }
  } else {
    errors.push("no-credentials");
  }

  return new Response(JSON.stringify({ ok: errors.length === 0, errors }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: ContactPayload = await req.json();
    const action = body.action || "contact";

    if (action === "reply") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token || token.length < 20) {
        return new Response(
          JSON.stringify({ ok: false, error: "Authentification requise pour repondre" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return new Response(
          JSON.stringify({ ok: false, error: "Session admin invalide" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      const adminEmail = userData.user.email || "";
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("role")
        .eq("email", adminEmail)
        .maybeSingle();
      if (!adminRow || !["owner", "manager"].includes(adminRow.role)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Acces non autorise" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      return await handleReply(body);
    }
    return await handleContact(body);
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({
        error: "Erreur serveur",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
