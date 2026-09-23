import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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

/** Origines autorisées pour le formulaire public (CORS). Surcharge : ALLOWED_ORIGINS=csv */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://greatlife-conakry.pages.dev",
  "https://greatlife-conakry.netlify.app",
  "https://greatlife-gn.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function allowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const extra = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allow = allowedOrigins();
  const matched = allow.includes(origin) ? origin : allow[0];
  return {
    "Access-Control-Allow-Origin": matched,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function corsResponse(
  req: Request,
  body: string,
  status = 200,
  extra: Record<string, string> = {},
) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...corsHeadersFor(req), ...extra },
  });
}

const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || 465);

/** Auto-réponse publique désactivée par défaut (abus SMTP). Activer : CONTACT_AUTO_REPLY=1 */
const CONTACT_AUTO_REPLY = ["1", "true", "yes"].includes(
  (Deno.env.get("CONTACT_AUTO_REPLY") || "").toLowerCase(),
);

const CONTACT_RATE_LIMIT = Math.max(1, Number(Deno.env.get("CONTACT_RATE_LIMIT") || 5));
const CONTACT_RATE_WINDOW_MIN = Math.max(1, Number(Deno.env.get("CONTACT_RATE_WINDOW_MIN") || 60));

interface ContactPayload {
  action?: "contact" | "reply" | "reservation-status" | "order-status";
  nom: string;
  email: string;
  sujet: string;
  message: string;
  to?: string;
  subject?: string;
  replyMessage?: string;
  replyFromName?: string;
  originalMessage?: string;
  status?: string;
  resaDate?: string;
  resaTime?: string;
  resaGuests?: string;
  ref?: string;
  items?: string;
  total?: string;
  pickupTime?: string;
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
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

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || "unknown";
}

/**
 * Quota SMTP via `contact_rate_buckets` (service_role uniquement, pas de RLS
 * ouverte). Clés : email client + IP. Fenêtre glissante CONTACT_RATE_WINDOW_MIN.
 */
async function bumpRateBucket(
  supabase: SupabaseClient,
  bucketKey: string,
): Promise<boolean> {
  const windowMs = CONTACT_RATE_WINDOW_MIN * 60_000;
  const { data, error } = await supabase
    .from("contact_rate_buckets")
    .select("hits, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();
  if (error) {
    console.error("rate-limit read error:", error);
    return true; // fail closed
  }
  const now = Date.now();
  const start = data?.window_start ? new Date(data.window_start).getTime() : 0;
  const fresh = !data || now - start >= windowMs;
  const hits = fresh ? 1 : (data?.hits ?? 0) + 1;
  if (!fresh && (data?.hits ?? 0) >= CONTACT_RATE_LIMIT) {
    return true;
  }
  const { error: upErr } = await supabase.from("contact_rate_buckets").upsert({
    bucket_key: bucketKey,
    hits,
    window_start: fresh ? new Date(now).toISOString() : data!.window_start,
  });
  if (upErr) {
    console.error("rate-limit write error:", upErr);
    return true;
  }
  return false;
}

async function contactRateLimited(
  supabase: SupabaseClient,
  email: string,
  ip: string,
): Promise<boolean> {
  const byEmail = await bumpRateBucket(supabase, `email:${email.toLowerCase()}`);
  if (byEmail) return true;
  if (ip && ip !== "unknown") {
    return await bumpRateBucket(supabase, `ip:${ip}`);
  }
  return false;
}

async function handleContact(req: Request, body: ContactPayload): Promise<Response> {
  const nom = clip(body.nom, 200);
  const email = clip(body.email, 320).toLowerCase();
  const sujet = clip(body.sujet || "contact", 80);
  const message = clip(body.message, 5000);

  if (!nom || !email || !message) {
    return corsResponse(req, JSON.stringify({ error: "Champs requis manquants" }), 400);
  }
  if (!isPlausibleEmail(email)) {
    return corsResponse(req, JSON.stringify({ error: "Adresse email invalide" }), 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (await contactRateLimited(supabase, email, clientIp(req))) {
    return corsResponse(
      req,
      JSON.stringify({
        ok: false,
        error: "Trop de messages envoyés. Réessayez un peu plus tard.",
      }),
      429,
    );
  }

  const { data: contentData } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "site_config")
    .maybeSingle();

  const config = (contentData?.value || {}) as {
    emailContact?: string;
    emailReservation?: string;
  };
  const destEmail = config.emailContact || Deno.env.get("CONTACT_EMAIL") || "";

  if (!destEmail || !isPlausibleEmail(destEmail)) {
    return corsResponse(
      req,
      JSON.stringify({
        ok: false,
        error: "L'envoi n'est pas disponible pour le moment. Réessayez plus tard.",
      }),
      500,
    );
  }

  const sujetFinal = sujet || "contact";
  const errors: string[] = [];

  if (SMTP_USER && SMTP_PASS) {
    try {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      // Un seul envoi SMTP : vers le restaurant. Jamais vers une adresse client
      // arbitraire sur le chemin public (anti abus / usurpation).
      await sendMail(
        destEmail,
        `Nouveau message - ${sujetFinal}`,
        `Nom: ${nom}\nEmail: ${email}\nSujet: ${sujetFinal}\nIP: ${clientIp(req)}\n\n${message}`,
        `<p><strong>${esc(nom)}</strong> (${esc(email)})</p><p><em>Sujet: ${esc(sujetFinal)}</em></p><p>${esc(message)}</p>`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("dest:" + msg);
      console.error("Send to dest error:", err);
    }

    // Auto-réponse opt-in uniquement (CONTACT_AUTO_REPLY=1). Désactivée par défaut.
    if (CONTACT_AUTO_REPLY && errors.length === 0) {
      const autoReplies: Record<string, string> = {
        reservation:
          "Bonjour {nom}, merci pour votre demande de reservation a Greatlife ! Nous confirmons votre table sous 24h. - L'equipe Greatlife",
        commande:
          "Bonjour {nom}, merci pour votre commande chez Greatlife ! Nous vous recontactons rapidement pour confirmer les details. - L'equipe Greatlife",
        recrutement:
          "Bonjour {nom}, merci pour votre interet a rejoindre Greatlife ! Nous etudions votre candidature et reviendrons vers vous. - L'equipe Greatlife",
        contact:
          "Bonjour {nom}, merci pour votre message a Greatlife ! Nous revenons vers vous sous 24h. - L'equipe Greatlife",
      };
      const autoReply = (autoReplies[sujetFinal] || autoReplies.contact).replace(/{nom}/g, nom);
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
    }
  } else {
    errors.push("no-credentials");
  }

  return corsResponse(req, JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleReply(req: Request, body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const replySubject = body.subject || `Re: ${body.sujet || "contact"}`;
  const replyText = body.replyMessage || body.message || "";
  const fromName = body.replyFromName || "Greatlife";
  const original = body.originalMessage || "";

  if (!to || !replyText) {
    return corsResponse(
      req,
      JSON.stringify({ ok: false, error: "Destinataire et message requis" }),
      400,
    );
  }
  if (!isPlausibleEmail(to)) {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Destinataire invalide" }), 400);
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

  return corsResponse(req, JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleReservationStatus(req: Request, body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const status = body.status || "confirmed";
  const nom = body.nom || "";
  const date = body.resaDate || "";
  const time = body.resaTime || "";
  const guests = body.resaGuests || "";

  if (!to) {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Destinataire requis" }), 400);
  }
  if (!isPlausibleEmail(to)) {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Destinataire invalide" }), 400);
  }

  const dateLabel = date && time ? ` pour le ${date} a ${time}` : "";
  const guestsLabel = guests ? ` (${guests} personnes)` : "";

  let textContent = "";
  let subject = "";
  if (status === "confirmed") {
    subject = "Greatlife - Reservation confirmee";
    textContent = `Bonjour${nom ? " " + nom : ""}, nous avons le plaisir de confirmer votre reservation${dateLabel}${guestsLabel}. Votre demande a ete prise en compte et traitee : votre reservation est validee ! Nous vous attendons avec plaisir chez Greatlife. Pour toute modification, repondez a cet email. - L'equipe Greatlife`;
  } else if (status === "pending") {
    subject = "Greatlife - Reservation en attente";
    textContent = `Bonjour${nom ? " " + nom : ""}, votre demande de reservation${dateLabel}${guestsLabel} a bien ete prise en compte. Aucune table n'est disponible pour le moment, mais nous vous recontacterons des qu'une place se libere. Merci de votre patience. - L'equipe Greatlife`;
  } else if (status === "cancelled") {
    subject = "Greatlife - Reservation annulee";
    textContent = `Bonjour${nom ? " " + nom : ""}, nous vous informons que votre reservation${dateLabel}${guestsLabel} a ete annulee. Cela peut provenir d'un desistement de votre part ou d'une decision de notre equipe en raison de la situation. Pour replanifier, n'hesitez pas a nous recontacter. - L'equipe Greatlife`;
  } else {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Statut inconnu" }), 400);
  }

  const errors: string[] = [];

  if (SMTP_USER && SMTP_PASS) {
    try {
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">` +
        `<div style="font-size:24px;font-weight:700;color:#2d6a4f;margin-bottom:16px">Great<span style="color:#e8a93c">life</span></div>` +
        `<p style="white-space:pre-wrap">${textContent.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>` +
        `<p style="margin-top:24px">\u2014 L'equipe Greatlife</p>` +
        `<div style="font-size:11px;color:#aaa;margin-top:16px">Conakry, Guin\u00e9e \u00b7 Fast-food bio sans culpabilit\u00e9</div>` +
        `</div>`;
      await sendMail(to, subject, textContent, html);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("status:" + msg);
      console.error("Reservation status email error:", err);
    }
  } else {
    errors.push("no-credentials");
  }

  return corsResponse(req, JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleOrderStatus(req: Request, body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const status = body.status || "confirmed";
  const nom = body.nom || "";
  const ref = body.ref || "";
  const items = body.items || "";
  const total = body.total || "";
  const pickupTime = body.pickupTime || body.resaTime || "";

  if (!to) {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Destinataire requis" }), 400);
  }
  if (!isPlausibleEmail(to)) {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Destinataire invalide" }), 400);
  }

  const refLabel = ref ? ` (ref ${ref})` : "";
  const pickupLabel = pickupTime ? ` pour retrait a ${pickupTime}` : "";
  const itemsLabel = items ? `\nVotre commande : ${items}` : "";
  const totalLabel = total ? `\nTotal : ${total} FG` : "";

  let textContent = "";
  let subject = "";
  if (status === "confirmed") {
    subject = `Greatlife - Commande confirmee${ref ? " " + ref : ""}`;
    textContent = `Bonjour${nom ? " " + nom : ""}, nous avons le plaisir de confirmer votre commande${refLabel}${pickupLabel}. Votre demande a ete prise en compte et traitee : votre commande est validee ! Nous la preparons des maintenant.${itemsLabel}${totalLabel}\nPour toute modification, repondez a cet email. - L'equipe Greatlife`;
  } else if (status === "pending") {
    subject = `Greatlife - Commande en attente${ref ? " " + ref : ""}`;
    textContent = `Bonjour${nom ? " " + nom : ""}, votre commande${refLabel}${pickupLabel} a bien ete prise en compte. Un ou plusieurs articles ne sont pas disponibles pour le moment, mais le seront tres bientot. Nous vous recontacterons des que possible pour finaliser votre commande.${itemsLabel}${totalLabel}\nMerci de votre patience. - L'equipe Greatlife`;
  } else if (status === "cancelled") {
    subject = `Greatlife - Commande annulee${ref ? " " + ref : ""}`;
    textContent = `Bonjour${nom ? " " + nom : ""}, nous vous informons que votre commande${refLabel}${pickupLabel} a ete annulee. Cela peut provenir d'un desistement de votre part ou d'une decision de notre equipe en raison de la situation.${itemsLabel}${totalLabel}\nPour replanifier une commande, n'hesitez pas a nous recontacter. - L'equipe Greatlife`;
  } else {
    return corsResponse(req, JSON.stringify({ ok: false, error: "Statut inconnu" }), 400);
  }

  const errors: string[] = [];

  if (SMTP_USER && SMTP_PASS) {
    try {
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">` +
        `<div style="font-size:24px;font-weight:700;color:#2d6a4f;margin-bottom:16px">Great<span style="color:#e8a93c">life</span></div>` +
        `<p style="white-space:pre-wrap">${textContent.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>` +
        `<p style="margin-top:24px">\u2014 L'equipe Greatlife</p>` +
        `<div style="font-size:11px;color:#aaa;margin-top:16px">Conakry, Guin\u00e9e \u00b7 Fast-food bio sans culpabilit\u00e9</div>` +
        `</div>`;
      await sendMail(to, subject, textContent, html);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("order:" + msg);
      console.error("Order status email error:", err);
    }
  } else {
    errors.push("no-credentials");
  }

  return corsResponse(req, JSON.stringify({ ok: errors.length === 0, errors }));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }
  if (req.method !== "POST") {
    return corsResponse(req, JSON.stringify({ error: "Method not allowed" }), 405);
  }

  try {
    const body: ContactPayload = await req.json();
    const action = body.action || "contact";

    if (action === "reply" || action === "reservation-status" || action === "order-status") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token || token.length < 20) {
        return corsResponse(
          req,
          JSON.stringify({ ok: false, error: "Authentification requise" }),
          401,
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return corsResponse(
          req,
          JSON.stringify({ ok: false, error: "Session admin invalide" }),
          403,
        );
      }
      const adminEmail = (userData.user.email || "").trim();
      // Aligné sur migration 020 : comparaison insensible à la casse.
      const { data: adminRows } = await supabase
        .from("admin_users")
        .select("role, active, email")
        .ilike("email", adminEmail);
      const adminRow = (adminRows || []).find(
        (r: { email?: string }) => (r.email || "").toLowerCase() === adminEmail.toLowerCase(),
      ) || adminRows?.[0];
      if (!adminRow || !["owner", "manager"].includes(adminRow.role) || adminRow.active !== true) {
        return corsResponse(
          req,
          JSON.stringify({ ok: false, error: "Acces non autorise" }),
          403,
        );
      }
      if (action === "reply") return await handleReply(req, body);
      if (action === "order-status") return await handleOrderStatus(req, body);
      return await handleReservationStatus(req, body);
    }
    return await handleContact(req, body);
  } catch (err) {
    console.error("Edge function error:", err);
    return corsResponse(
      req,
      JSON.stringify({
        error: "Erreur serveur",
      }),
      500,
    );
  }
});
