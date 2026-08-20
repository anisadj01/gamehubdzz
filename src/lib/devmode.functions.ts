import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DevUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  venueName: string;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  lastIp: string | null;
  lastDevice: string | null;
  lastMachineId: string | null;
};

export type DevLicense = {
  id: string;
  license_key: string;
  customer_name: string;
  venue_name: string;
  venue_id: string | null;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  machine_id: string | null;
  notes: string | null;
  created_at: string;
};

export type DevLoginLog = {
  id: string;
  email: string;
  ip_address: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  machine_id: string | null;
  created_at: string;
};

async function assertDeveloper(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "developer" });
  if (error || !data) throw new Error("Forbidden: accès développeur requis");
}

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DevUser[]> => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: authUsers }, profiles, roles, venues, logs] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id, full_name, email, venue_id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("venues").select("id, name"),
      supabaseAdmin
        .from("login_logs")
        .select("user_id, ip_address, device, os, browser, machine_id, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    const profileRows = profiles.data ?? [];
    const roleRows = roles.data ?? [];
    const venueRows = venues.data ?? [];
    const logRows = logs.data ?? [];

    return (authUsers?.users ?? []).map((u) => {
      const p = profileRows.find((r) => r.id === u.id);
      const log = logRows.find((l) => l.user_id === u.id);
      const venue = venueRows.find((v) => v.id === p?.venue_id);
      const banUntil = (u as unknown as { banned_until?: string | null }).banned_until ?? null;
      return {
        id: u.id,
        email: u.email ?? p?.email ?? "",
        fullName: p?.full_name ?? "",
        role: String(roleRows.find((r) => r.user_id === u.id)?.role ?? "employee"),
        venueName: venue?.name ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned: !!banUntil && new Date(banUntil).getTime() > Date.now(),
        lastIp: log?.ip_address ?? null,
        lastDevice: log
          ? [log.device, log.os, log.browser].filter(Boolean).join(" · ") || null
          : null,
        lastMachineId: log?.machine_id ?? null,
      };
    });
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ active: data.active }).eq("id", data.userId);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(4).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertDeveloper(context.supabase as never, context.userId);
    if (data.userId === context.userId) throw new Error("Impossible de supprimer votre propre compte");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLoginLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DevLoginLog[]> => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("login_logs")
      .select("id, email, ip_address, device, os, browser, machine_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as DevLoginLog[];
  });

export const listLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DevLicense[]> => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as DevLicense[];
  });

function makeKey() {
  const block = () =>
    Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(4, "X").slice(0, 4);
  return `GH-${block()}-${block()}-${block()}-${block()}`;
}

export const generateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        customerName: z.string().trim().min(1).max(100),
        venueName: z.string().trim().min(1).max(100),
        expiresAt: z.string().trim().max(30).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = makeKey();
    const { data: created, error } = await supabaseAdmin
      .from("licenses")
      .insert({
        license_key: key,
        customer_name: data.customerName,
        venue_name: data.venueName,
        expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        notes: data.notes ?? null,
        status: "active",
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (created?.id) {
      await supabaseAdmin
        .from("license_events")
        .insert({ license_id: created.id, event: "création", details: key });
    }
    return { key };
  });

export const updateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        licenseId: z.string().uuid(),
        action: z.enum(["suspend", "reactivate", "reset-machine", "delete"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("licenses").delete().eq("id", data.licenseId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const patch =
      data.action === "suspend"
        ? { status: "suspended" }
        : data.action === "reactivate"
          ? { status: "active" }
          : { machine_id: null, activated_at: null };

    const { error } = await supabaseAdmin.from("licenses").update(patch).eq("id", data.licenseId);
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("license_events")
      .insert({ license_id: data.licenseId, event: data.action });
    return { ok: true };
  });

const ALLOWED_TABLES = [
  "venues",
  "profiles",
  "user_roles",
  "stations",
  "game_categories",
  "products",
  "product_categories",
  "sessions",
  "session_items",
  "reservations",
  "expenses",
  "expense_categories",
  "inventory_movements",
  "activity_logs",
  "licenses",
  "license_events",
  "login_logs",
] as const;

export const dbTables = ALLOWED_TABLES;

export const browseTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        table: z.enum(ALLOWED_TABLES),
        search: z.string().trim().max(100).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<Record<string, string>[]> => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from(data.table)
      .select("*")
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Record<string, unknown>[];
    const flat = list.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k,
          v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v),
        ]),
      ),
    );
    const q = data.search?.toLowerCase();
    if (!q) return flat;
    return flat.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  });

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        machineId: z.string().trim().max(64),
        device: z.string().trim().max(120),
        os: z.string().trim().max(60),
        browser: z.string().trim().max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const userAgent = getRequestHeader("user-agent") ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, venue_id")
      .eq("id", context.userId)
      .maybeSingle();
    await supabaseAdmin.from("login_logs").insert({
      user_id: context.userId,
      email: profile?.email ?? "",
      venue_id: profile?.venue_id ?? null,
      ip_address: ip,
      user_agent: userAgent,
      device: data.device,
      os: data.os,
      browser: data.browser,
      machine_id: data.machineId,
    });
    return { ok: true };
  });
export const activateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        licenseKey: z.string().trim().min(6).max(40),
        machineId: z.string().trim().min(4).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("venue_id")
      .eq("id", context.userId)
      .maybeSingle();
    const venueId = (profile as { venue_id?: string | null } | null)?.venue_id ?? null;

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("license_key", data.licenseKey.toUpperCase())
      .maybeSingle();

    if (!license) throw new Error("Licence introuvable");
    if (license.status === "suspended") throw new Error("Licence suspendue : contactez le développeur");
    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", license.id);
      throw new Error("Licence expirée");
    }
    if (license.machine_id && license.machine_id !== data.machineId) {
      throw new Error("Licence déjà liée à un autre ordinateur. Réinitialisation par le développeur requise.");
    }

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({
        machine_id: data.machineId,
        venue_id: venueId,
        activated_at: license.activated_at ?? new Date().toISOString(),
        status: "active",
      })
      .eq("id", license.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      event: "activation",
      machine_id: data.machineId,
    });

    return { ok: true, status: "active" as const };
  });

export const getMyLicense = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("licenses")
      .select("license_key, status, activated_at, expires_at, machine_id, customer_name, venue_name")
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

/** Vérification publique d'une clé avant la création d'une salle (aucune donnée sensible renvoyée). */
export const validateLicenseKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        licenseKey: z.string().trim().min(6).max(40),
        machineId: z.string().trim().min(4).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; customerName: string } | { ok: false; reason: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("id, status, expires_at, machine_id, customer_name")
      .eq("license_key", data.licenseKey.trim().toUpperCase())
      .maybeSingle();

    if (!license) return { ok: false, reason: "Licence introuvable" };
    if (license.status === "suspended") return { ok: false, reason: "Licence suspendue : contactez le support" };
    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      return { ok: false, reason: "Licence expirée" };
    }
    if (license.machine_id && license.machine_id !== data.machineId) {
      return {
        ok: false,
        reason: "Licence déjà liée à un autre ordinateur. Contactez le développeur pour la réinitialiser.",
      };
    }
    return { ok: true, customerName: license.customer_name ?? "" };
  });

export type PublicConfigInput = {
  downloadWindowsUrl: string;
  downloadAndroidUrl: string;
  whatsapp: string;
  facebook: string;
  phone: string;
  requireLicense: boolean;
};

export const savePublicConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        downloadWindowsUrl: z.string().trim().max(500),
        downloadAndroidUrl: z.string().trim().max(500),
        whatsapp: z.string().trim().max(60),
        facebook: z.string().trim().max(200),
        phone: z.string().trim().max(60),
        requireLicense: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertDeveloper(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: "public_config", value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
