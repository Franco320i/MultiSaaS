import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Usuarios y comercios de supabase/seed.sql. */
export const SEED = {
  password: "Prueba-Local-2026",
  users: {
    ownerAlfa: { id: "11111111-1111-4111-8111-111111111111", email: "dueno.alfa@example.com" },
    staffAlfa: { id: "11111111-1111-4111-8111-111111111112", email: "staff.alfa@example.com" },
    ownerBeta: { id: "22222222-2222-4222-8222-222222222221", email: "dueno.beta@example.com" },
    ownerGamma: { id: "33333333-3333-4333-8333-333333333331", email: "dueno.gamma@example.com" },
    outsider: { id: "44444444-4444-4444-8444-444444444444", email: "sin.comercio@example.com" },
    superadmin: { id: "55555555-5555-4555-8555-555555555555", email: "admin@example.com" },
  },
  tenants: {
    alfa: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    beta: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    gamma: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  },
} as const;

export type SeedUser = keyof typeof SEED.users;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env.local para las pruebas de integración.`);
  return value;
}

/** Cliente con la clave publicable y la sesión real del usuario: RLS actúa igual que en el panel. */
export async function signInAs(user: SeedUser): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email: SEED.users[user].email,
    password: SEED.password,
  });
  if (error) throw new Error(`No se pudo iniciar sesión como ${user}: ${error.message}. ¿Corriste npm run db:reset?`);
  return client;
}
