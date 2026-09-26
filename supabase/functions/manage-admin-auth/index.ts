/**
 * Edge Function : gestion des identifiants admin (création / remplacement / invitation).
 *
 * Actions (owner uniquement, session JWT vérifiée) :
 *  - set-credentials : créer ou mettre à jour un compte Auth (email + mdp) + ligne admin_users
 *  - invite-tester   : créer/inviter un testeur (rôle guest) avec email réel + mdp optionnel
 *
 * La clé service_role ne quitte jamais le navigateur (TDR §31 / backlog B-1).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://greatlife-conakry.pages.dev",
  "https://greatlife-conakry.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:43123",
  "http://127.0.0.1:43123",
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
    Vary: "Origin",
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

const PASSWORD_MIN = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED = new Set([
  "greatlife2026",
  "password",
  "password123",
  "motdepasse",
  "motdepasse1",
  "123456789012",
  "azertyuiop12",
  "qwertyuiop12",
]);

const VALID_ROLES = new Set([
  "owner",
  "manager",
  "chef",
  "editor",
  "marketing",
  "guest",
]);

function isPlausibleEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 320;
}

function validatePassword(password: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`;
  }
  if (!/[a-z]/.test(password)) return "Il manque une lettre minuscule.";
  if (!/[A-Z]/.test(password)) return "Il manque une lettre majuscule.";
  if (!/[0-9]/.test(password)) return "Il manque un chiffre.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Il manque un caractère spécial.";
  const normalized = password.trim().toLowerCase();
  if (BLOCKED.has(normalized)) {
    return "Ce mot de passe est trop courant ou déjà compromis.";
  }
  const local = email.trim().toLowerCase().split("@")[0] || "";
  if (local.length >= 3 && normalized.includes(local)) {
    return "Le mot de passe ne doit pas contenir l'adresse email.";
  }
  return null;
}

interface AuthPayload {
  action?: "set-credentials" | "invite-tester" | "delete-user";
  email?: string;
  name?: string;
  password?: string;
  role?: string;
  /** Email actuel à remplacer (identifiants temporaires → réels). */
  previousEmail?: string;
  sendInviteEmail?: boolean;
  /** Identifiant admin_users à supprimer (action delete-user). */
  userId?: string;
}

async function requireOwner(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.length < 20) {
    return { error: corsResponse(req, JSON.stringify({ ok: false, error: "Authentification requise" }), 401) };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return { error: corsResponse(req, JSON.stringify({ ok: false, error: "Session admin invalide" }), 403) };
  }
  const adminEmail = (userData.user.email || "").trim();
  const { data: adminRows } = await admin
    .from("admin_users")
    .select("role, active, email")
    .ilike("email", adminEmail);
  const adminRow = (adminRows || []).find(
    (r: { email?: string }) => (r.email || "").toLowerCase() === adminEmail.toLowerCase(),
  ) ?? null;
  if (!adminRow || adminRow.role !== "owner" || adminRow.active !== true) {
    return { error: corsResponse(req, JSON.stringify({ ok: false, error: "Acces non autorise" }), 403) };
  }
  return { admin, callerEmail: adminEmail.toLowerCase() };
}

const EMAIL_TAKEN_FR = "Cet email est déjà utilisé par un autre compte admin";

class AdminEmailConflictError extends Error {
  constructor(message = EMAIL_TAKEN_FR) {
    super(message);
    this.name = "AdminEmailConflictError";
  }
}

function isUniqueEmailViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "23505" ||
    /admin_users_email_key/i.test(msg) ||
    /duplicate key value violates unique constraint/i.test(msg)
  );
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string } | null> {
  // listUsers est paginé ; on cherche sur quelques pages (usage console, volume faible).
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = (data.users || []).find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (found) return { id: found.id };
    if (!data.users || data.users.length < 200) break;
  }
  return null;
}

/** Recherche exacte case-insensitive (évite les faux positifs ilike `_` / `%`). */
async function findAdminRowByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email: string; role: string } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data: rows, error } = await admin
    .from("admin_users")
    .select("id, email, role")
    .ilike("email", normalized);
  if (error) throw error;
  const exact = (rows || []).find(
    (r: { email?: string }) => (r.email || "").toLowerCase() === normalized,
  );
  return exact
    ? { id: exact.id, email: exact.email, role: exact.role }
    : null;
}

/**
 * Met à jour la ligne admin existante (previous / caller / email cible).
 * N'INSERT que pour un vrai nouveau compte — jamais une 2ᵉ ligne pour le même owner.
 */
async function upsertAdminRow(
  admin: ReturnType<typeof createClient>,
  opts: {
    email: string;
    name: string;
    role: string;
    previousEmail?: string;
    callerEmail?: string;
    markInvited?: boolean;
  },
) {
  const email = opts.email.trim().toLowerCase();
  const previous = (opts.previousEmail || "").trim().toLowerCase();
  const caller = (opts.callerEmail || "").trim().toLowerCase();
  const patch: Record<string, unknown> = {
    email,
    name: opts.name.trim() || email.split("@")[0],
    role: opts.role,
    active: true,
  };
  if (opts.markInvited) patch.invited_at = new Date().toISOString();

  let targetId: string | null = null;

  // 1) Ligne à remplacer (email temporaire → réel)
  if (previous) {
    const prevRow = await findAdminRowByEmail(admin, previous);
    if (prevRow) targetId = prevRow.id;
  }
  // 2) Repli self-service uniquement (Mon compte) — jamais quand on crée un autre admin
  const selfService =
    Boolean(previous) || (Boolean(caller) && caller === email);
  if (!targetId && selfService && caller) {
    const callerRow = await findAdminRowByEmail(admin, caller);
    if (callerRow) targetId = callerRow.id;
  }

  // 3) Ligne déjà sur l'email cible
  const emailRow = await findAdminRowByEmail(admin, email);
  if (emailRow) {
    if (targetId && emailRow.id !== targetId) {
      throw new AdminEmailConflictError();
    }
    targetId = emailRow.id;
  }

  if (targetId) {
    const { error } = await admin.from("admin_users").update(patch).eq("id", targetId);
    if (error) {
      if (isUniqueEmailViolation(error)) throw new AdminEmailConflictError();
      throw error;
    }
    return { updated: true as const };
  }

  const { error } = await admin.from("admin_users").insert(patch);
  if (error) {
    if (isUniqueEmailViolation(error)) throw new AdminEmailConflictError();
    throw error;
  }
  return { updated: false as const };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }
  if (req.method !== "POST") {
    return corsResponse(req, JSON.stringify({ error: "Method not allowed" }), 405);
  }

  try {
    const body = (await req.json()) as AuthPayload;
    const action = body.action || "set-credentials";
    if (action !== "set-credentials" && action !== "invite-tester" && action !== "delete-user") {
      return corsResponse(req, JSON.stringify({ ok: false, error: "Action inconnue" }), 400);
    }

    const gate = await requireOwner(req);
    if ("error" in gate && gate.error) return gate.error;
    const { admin, callerEmail } = gate as {
      admin: ReturnType<typeof createClient>;
      callerEmail: string;
    };

    /*
      Suppression COMPLÈTE (plus de compte Auth orphelin) : le compte Auth
      est supprimé par son email de ligne, puis la ligne admin_users.
      Garde anti-verrouillage : jamais le dernier propriétaire, jamais soi-même
      (la console bloque déjà ces cas, ceci est la ceinture côté serveur).
    */
    if (action === "delete-user") {
      const userId = (body.userId || "").trim();
      if (!userId) {
        return corsResponse(req, JSON.stringify({ ok: false, error: "Identifiant manquant" }), 400);
      }
      const { data: targetRows } = await admin
        .from("admin_users")
        .select("id, email, role")
        .eq("id", userId);
      const target = (targetRows || [])[0] as { id: string; email: string; role: string } | undefined;
      if (!target) {
        return corsResponse(req, JSON.stringify({ ok: false, error: "Utilisateur introuvable" }), 404);
      }
      if (target.email.toLowerCase() === callerEmail) {
        return corsResponse(req, JSON.stringify({ ok: false, error: "Vous ne pouvez pas supprimer votre propre compte" }), 400);
      }
      if (target.role === "owner") {
        const { data: owners } = await admin.from("admin_users").select("id").eq("role", "owner");
        if (!owners || owners.length <= 1) {
          return corsResponse(req, JSON.stringify({ ok: false, error: "Impossible : il faut au moins un propriétaire" }), 400);
        }
      }
      const authUser = await findAuthUserByEmail(admin, target.email);
      if (authUser) {
        const { error: delAuthErr } = await admin.auth.admin.deleteUser(authUser.id);
        if (delAuthErr) {
          return corsResponse(req, JSON.stringify({ ok: false, error: "Suppression Auth impossible" }), 400);
        }
      }
      const { error: delRowErr } = await admin.from("admin_users").delete().eq("id", userId);
      if (delRowErr) {
        return corsResponse(req, JSON.stringify({ ok: false, error: "Suppression de la ligne impossible" }), 400);
      }
      return corsResponse(req, JSON.stringify({ ok: true, deleted: true, email: target.email, actor: callerEmail }));
    }

    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim();
    const password = body.password || "";
    const previousEmail = (body.previousEmail || "").trim().toLowerCase();
    const role = action === "invite-tester"
      ? "guest"
      : (body.role || "guest").trim().toLowerCase();

    if (!isPlausibleEmail(email)) {
      return corsResponse(req, JSON.stringify({ ok: false, error: "Adresse email invalide" }), 400);
    }
    if (!VALID_ROLES.has(role)) {
      return corsResponse(req, JSON.stringify({ ok: false, error: "Rôle invalide" }), 400);
    }
    if (!password) {
      return corsResponse(req, JSON.stringify({ ok: false, error: "Mot de passe requis" }), 400);
    }
    const pwdErr = validatePassword(password, email);
    if (pwdErr) {
      return corsResponse(req, JSON.stringify({ ok: false, error: pwdErr }), 400);
    }

    // Remplacement d'identifiants : chercher l'ancien compte Auth si fourni.
    // Même email (password-only) : on met à jour le compte existant, sans INSERT admin.
    const lookupEmail = previousEmail || email;
    let authUser = await findAuthUserByEmail(admin, lookupEmail);
    if (!authUser && previousEmail && previousEmail !== email) {
      authUser = await findAuthUserByEmail(admin, email);
    }

    const emailChanging = Boolean(previousEmail && previousEmail !== email);

    // Conflit admin_users avant de toucher Auth (changement d'email self-service)
    if (emailChanging) {
      const occupied = await findAdminRowByEmail(admin, email);
      const previousRow = await findAdminRowByEmail(admin, previousEmail);
      if (occupied && previousRow && occupied.id !== previousRow.id) {
        return corsResponse(
          req,
          JSON.stringify({ ok: false, error: EMAIL_TAKEN_FR }),
          409,
        );
      }
    }

    if (authUser) {
      const update: { email?: string; password: string; email_confirm?: boolean } = {
        password,
        email_confirm: true,
      };
      if (emailChanging) update.email = email;
      const { error } = await admin.auth.admin.updateUserById(authUser.id, update);
      if (error) {
        const msg = error.message || "Mise à jour Auth impossible";
        const conflict = /already.*(registered|been|exists)|duplicate|unique/i.test(msg);
        return corsResponse(
          req,
          JSON.stringify({
            ok: false,
            error: conflict ? EMAIL_TAKEN_FR : msg,
          }),
          conflict ? 409 : 400,
        );
      }
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || email.split("@")[0] },
      });
      if (error) {
        const msg = error.message || "Création Auth impossible";
        const conflict = /already.*(registered|been|exists)|duplicate|unique/i.test(msg);
        return corsResponse(
          req,
          JSON.stringify({
            ok: false,
            error: conflict ? EMAIL_TAKEN_FR : msg,
          }),
          conflict ? 409 : 400,
        );
      }
      if (!data.user) {
        return corsResponse(req, JSON.stringify({ ok: false, error: "Création Auth sans utilisateur" }), 500);
      }
    }

    await upsertAdminRow(admin, {
      email,
      name: name || email.split("@")[0],
      role,
      previousEmail: previousEmail || undefined,
      callerEmail,
      markInvited: action === "invite-tester" || body.sendInviteEmail === true,
    });

    let inviteSent = false;
    let inviteError: string | undefined;
    if (action === "invite-tester" || body.sendInviteEmail === true) {
      const redirectTo = Deno.env.get("ADMIN_REDIRECT_URL") ||
        "https://greatlife-conakry.pages.dev/admin";
      const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      // inviteUserByEmail échoue si l'utilisateur existe déjà — ce n'est pas bloquant
      // puisque le mot de passe vient d'être posé. On tente alors un OTP magique.
      if (invErr) {
        const { error: otpErr } = await admin.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
        });
        if (otpErr) {
          inviteError = otpErr.message || invErr.message;
        } else {
          inviteSent = true;
        }
      } else {
        inviteSent = true;
      }
    }

    return corsResponse(
      req,
      JSON.stringify({
        ok: true,
        email,
        role,
        inviteSent,
        inviteError,
        replaced: Boolean(previousEmail && previousEmail !== email),
        actor: callerEmail,
      }),
    );
  } catch (err) {
    console.error("manage-admin-auth error:", err);
    if (
      err instanceof AdminEmailConflictError ||
      (err && typeof err === "object" && "message" in err &&
        (err as { message: string }).message === EMAIL_TAKEN_FR)
    ) {
      return corsResponse(
        req,
        JSON.stringify({ ok: false, error: EMAIL_TAKEN_FR }),
        409,
      );
    }
    if (isUniqueEmailViolation(err as { code?: string; message?: string })) {
      return corsResponse(
        req,
        JSON.stringify({ ok: false, error: EMAIL_TAKEN_FR }),
        409,
      );
    }
    return corsResponse(
      req,
      JSON.stringify({ ok: false, error: "Erreur serveur" }),
      500,
    );
  }
});
