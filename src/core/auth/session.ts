import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginPath } from "./redirect";

export type CurrentUser = {
  id: string;
  email: string | null;
};

/**
 * Usuario de la petición actual, verificado con getClaims() (valida la firma del
 * token). `cache` de React evita repetir la verificación dentro de la misma
 * petición; no guarda nada entre peticiones ni entre usuarios.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/** Exige sesión: si no hay, manda al login y vuelve después a `returnTo`. */
export async function requireUser(returnTo = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(returnTo));
  return user;
}
