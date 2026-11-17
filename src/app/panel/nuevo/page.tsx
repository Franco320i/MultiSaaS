import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/core/auth/session";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findOwnedTenantSlug, listBusinessTemplates, ProvisionForm } from "@/modules/settings";

export const metadata: Metadata = { title: "Creá tu comercio" };

/**
 * app.tuapp.com.ar/nuevo · Paso 1 del asistente de alta (diseño, sección 10).
 * Llega acá el usuario recién confirmado. Si ya es dueño de un comercio, retoma ese.
 */
export default function NewTenantPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Paso 1 de 6</p>
        <h1 className="font-display text-[32px] leading-tight">Contanos de tu comercio</h1>
        <p className="text-muted">Con esto armamos tu catálogo. Todo se puede cambiar después.</p>
      </header>
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-2xl bg-surface-muted" />}>
        <NewTenant />
      </Suspense>
    </main>
  );
}

async function NewTenant() {
  const user = await requireUser("/nuevo");
  const supabase = await createSupabaseServerClient();
  const owned = await findOwnedTenantSlug(supabase, user.id);
  if (owned) redirect(`/${owned}/configurar`);

  const templates = await listBusinessTemplates(supabase);
  return <ProvisionForm templates={templates} domainSuffix={env.ROOT_DOMAIN === "localhost" ? "localhost" : env.ROOT_DOMAIN} />;
}
