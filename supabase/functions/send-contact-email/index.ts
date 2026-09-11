import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.6.0/mod.ts";

const SMTP_USER = Deno.env.get("SMTP_USER") || "moelohimmara@gmail.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

interface ContactPayload {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

async function sendMail(to: string, subject: string, textContent: string, html: string) {
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

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: ContactPayload = await req.json();
    const { nom, email, sujet, message } = body;

    if (!nom || !email || !message) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Stocker le message en base
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from("messages").insert({
      nom,
      email,
      sujet: sujet || "contact",
      message,
    });
    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    // 2. Récupérer les destinataires et template d'auto-réponse
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
    const autoReply = (config.autoReply || "Bonjour {nom}, merci pour votre message a Greatlife ! Nous revenons vers vous sous 24h. - L'equipe Greatlife").replace(/{nom}/g, nom);

    // 3. Envoyer les emails via Gmail SMTP
    if (SMTP_USER && SMTP_PASS) {
      const sujetFinal = sujet || "contact";

      // Email au gérant
      try {
        await sendMail(
          destEmail,
          `Nouveau message - ${sujetFinal}`,
          `Nom: ${nom}\nEmail: ${email}\nSujet: ${sujetFinal}\n\n${message}`,
          `<p><strong>${nom}</strong> (${email})</p><p><em>Sujet: ${sujetFinal}</em></p><p>${message}</p>`
        );
      } catch (err) {
        console.error("Send to dest error:", err);
      }

      // Auto-réponse au client
      try {
        await sendMail(
          email,
          "Greatlife - Nous avons bien recu votre message",
          autoReply,
          `<p>${autoReply.replace(/\n/g, "<br>")}</p>`
        );
      } catch (err) {
        console.error("Auto-reply error:", err);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
