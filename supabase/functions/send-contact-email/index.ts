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

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function corsResponse(body: string, status = 200, extra: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  });
}

const SMTP_USER = Deno.env.get("SMTP_USER") || "moelohimmara@gmail.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "maki lqrj wivo cmha";
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

interface ContactPayload {
  action?: "contact" | "reply" | "reservation-status" | "order-status" | "create-order";
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
  // Champs utilisés pour le mode "reservation-status" (notification client)
  status?: string;
  resaDate?: string;
  resaTime?: string;
  resaGuests?: string;
  // Champs utilisés pour le mode "order-status" (notification commande client)
  ref?: string;
  items?: string;
  total?: string;
  pickupTime?: string;
  // Champs utilisés pour le mode "create-order" (insertion commande cote serveur)
  phone?: string;
  orderItems?: Array<{ name: string; price: string; qty: number }>;
  orderTotal?: string;
  pickupTimeSlot?: string;
  notes?: string;
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
    return corsResponse(JSON.stringify({ error: "Champs requis manquants" }), 400);
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

  const sujetFinal = sujet || "contact";
  const autoReplies: Record<string, string> = {
    reservation: "Bonjour {nom}, merci pour votre demande de reservation a Greatlife ! Nous confirmons votre table sous 24h. - L'equipe Greatlife",
    commande: "Bonjour {nom}, merci pour votre commande chez Greatlife ! Nous vous recontactons rapidement pour confirmer les details. - L'equipe Greatlife",
    recrutement: "Bonjour {nom}, merci pour votre interet a rejoindre Greatlife ! Nous etudions votre candidature et reviendrons vers vous. - L'equipe Greatlife",
    contact: "Bonjour {nom}, merci pour votre message a Greatlife ! Nous revenons vers vous sous 24h. - L'equipe Greatlife",
  };
  const autoReply = (autoReplies[sujetFinal] || autoReplies.contact)
    .replace(/{nom}/g, nom);

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

  return corsResponse(JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleReply(body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const replySubject = body.subject || `Re: ${body.sujet || "contact"}`;
  const replyText = body.replyMessage || body.message || "";
  const fromName = body.replyFromName || "Greatlife";
  const original = body.originalMessage || "";

  if (!to || !replyText) {
    return corsResponse(
      JSON.stringify({ ok: false, error: "Destinataire et message requis" }),
      400,
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

  return corsResponse(JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleReservationStatus(body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const status = body.status || "confirmed";
  const nom = body.nom || "";
  const date = body.resaDate || "";
  const time = body.resaTime || "";
  const guests = body.resaGuests || "";

  if (!to) {
    return corsResponse(JSON.stringify({ ok: false, error: "Destinataire requis" }), 400);
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
    return corsResponse(JSON.stringify({ ok: false, error: "Statut inconnu" }), 400);
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

  return corsResponse(JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleOrderStatus(body: ContactPayload): Promise<Response> {
  const to = body.to || body.email;
  const status = body.status || "confirmed";
  const nom = body.nom || "";
  const ref = body.ref || "";
  const items = body.items || "";
  const total = body.total || "";
  const pickupTime = body.pickupTime || body.resaTime || "";

  if (!to) {
    return corsResponse(JSON.stringify({ ok: false, error: "Destinataire requis" }), 400);
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
    return corsResponse(JSON.stringify({ ok: false, error: "Statut inconnu" }), 400);
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

  return corsResponse(JSON.stringify({ ok: errors.length === 0, errors }));
}

async function handleCreateOrder(body: ContactPayload): Promise<Response> {
  const { nom, email, ref, orderItems, orderTotal, pickupTimeSlot, notes, phone } = body;

  if (!nom || !email || !ref || !orderItems || orderItems.length === 0) {
    return corsResponse(
      JSON.stringify({ ok: false, error: "Champs requis manquants pour la commande" }),
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error: insertErr } = await supabase.from("orders").insert({
    ref,
    nom,
    email,
    phone: phone || "",
    items: orderItems,
    total: orderTotal || "0",
    pickup_time: pickupTimeSlot || "",
    notes: notes || "",
    status: "pending",
  });

  if (insertErr) {
    console.error("Order insert error:", insertErr);
    return corsResponse(
      JSON.stringify({ ok: false, error: "Impossible d'enregistrer la commande" }),
      500,
    );
  }

  const errors: string[] = [];
  if (SMTP_USER && SMTP_PASS) {
    const itemsLabel = orderItems.map((i) => `${i.qty}x ${i.name}`).join(", ");
    const destEmail = "moelohimmara@gmail.com";
    try {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, ">");
      await sendMail(
        destEmail,
        `Nouvelle commande - ${ref}`,
        `Nom: ${nom}\nEmail: ${email}${phone ? `\nTel: ${phone}` : ""}\nRef: ${ref}\nRetrait: ${pickupTimeSlot || ""}\nArticles: ${itemsLabel}\nTotal: ${orderTotal || ""} FG${notes ? `\nNotes: ${notes}` : ""}`,
        `<p><strong>${esc(nom)}</strong> (${esc(email)}${phone ? " / " + esc(phone) : ""})</p><p><em>Ref: ${esc(ref)}</em></p><p>Retrait: ${esc(pickupTimeSlot || "")}</p><p>Articles: ${esc(itemsLabel)}</p><p>Total: ${esc(orderTotal || "")} FG</p>${notes ? `<p>Notes: ${esc(notes)}</p>` : ""}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("notif:" + msg);
      console.error("Order notif email error:", err);
    }

    try {
      const autoReply =
        `Bonjour ${nom}, merci pour votre commande chez Greatlife ! Votre commande ${ref} a bien ete recue. Nous vous recontactons rapidement pour confirmer les details. - L'equipe Greatlife`;
      await sendMail(
        email,
        "Greatlife - Nous avons bien recu votre commande",
        autoReply,
        `<p>${autoReply.replace(/\n/g, "<br>")}</p>`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("autoreply:" + msg);
      console.error("Order auto-reply error:", err);
    }
  } else {
    errors.push("no-credentials");
  }

  return corsResponse(JSON.stringify({ ok: errors.length === 0, ref, errors }));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return corsResponse(JSON.stringify({ error: "Method not allowed" }), 405);
  }

  try {
    const body: ContactPayload = await req.json();
    const action = body.action || "contact";

    if (action === "create-order") {
      return await handleCreateOrder(body);
    }

    if (action === "reply" || action === "reservation-status" || action === "order-status") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token || token.length < 20) {
        return corsResponse(
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
          JSON.stringify({ ok: false, error: "Session admin invalide" }),
          403,
        );
      }
      const adminEmail = userData.user.email || "";
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("role")
        .eq("email", adminEmail)
        .maybeSingle();
      if (!adminRow || !["owner", "manager"].includes(adminRow.role)) {
        return corsResponse(
          JSON.stringify({ ok: false, error: "Acces non autorise" }),
          403,
        );
      }
      if (action === "reply") return await handleReply(body);
      if (action === "order-status") return await handleOrderStatus(body);
      return await handleReservationStatus(body);
    }
    return await handleContact(body);
  } catch (err) {
    console.error("Edge function error:", err);
    return corsResponse(
      JSON.stringify({
        error: "Erreur serveur",
        detail: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});
