import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ContactPayload {
  nom: string;
  email: string;
  sujet: string;
  message: string;
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
      .single();

    const config = contentData?.value || {};
    const destEmail = config.emailContact || "contact@greatlife.gn";
    const autoReply = (config.autoReply || "Bonjour {nom}, merci pour votre message à Greatlife ! Nous revenons vers vous sous 24h. — L'équipe Greatlife").replace(/{nom}/g, nom);

    // 3. Envoyer l'email au gérant via Resend
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Greatlife <noreply@greatlife.gn>",
          to: [destEmail],
          subject: `Nouveau message — ${sujet || "contact"}`,
          html: `<p><strong>${nom}</strong> (${email})</p><p><em>Sujet: ${sujet || "contact"}</em></p><p>${message}</p>`,
        }),
      });

      if (!emailRes.ok) {
        console.error("Resend error:", await emailRes.text());
      }

      // 4. Auto-réponse au client
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Greatlife <noreply@greatlife.gn>",
          to: [email],
          subject: "Greatlife — Nous avons bien reçu votre message",
          text: autoReply,
        }),
      });
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
