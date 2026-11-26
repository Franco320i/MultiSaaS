import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses } from "@/ui/button-classes";
import { ListSkeleton } from "@/ui/skeleton";
import { requireUser } from "@/core/auth/session";
import { listMyTenants } from "@/core/tenancy/access";
import { demoRequestUrl } from "@/lib/demo-request";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tus comercios" };

// app.tuapp.com.ar/ · Elegir comercio. Si el usuario tiene uno solo, entra directo.
export default function PanelHome() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Tus comercios</h1>
      <Suspense fallback={<ListSkeleton />}>
        <TenantPicker />
      </Suspense>
    </main>
  );
}

async function TenantPicker() {
  const user = await requireUser("/");
  const supabase = await createSupabaseServerClient();
  const tenants = await listMyTenants(supabase, user.id);

  if (tenants.length === 1) redirect(`/${tenants[0].slug}`);

  // Sin comercios (rediseño 11e: no hay registro automático; los arma la plataforma).
  if (tenants.length === 0) {
    const demo = demoRequestUrl(env.SALES_WHATSAPP);
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
        <p className="text-[18px] font-semibold">Todavía no tenés un local</p>
        <p className="text-muted">Los catálogos los armamos nosotros con tu marca y tus productos. Escribinos y te mostramos una demo.</p>
        {demo ? (
          <a href={demo} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "w-fit")}>
            Pedí tu demo
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tenants.map((tenant) => (
        <li key={tenant.slug}>
          <Link
            href={`/${tenant.slug}`}
            className="flex items-center justify-between rounded-md border border-foreground/15 px-4 py-3 hover:bg-foreground/5"
          >
            <span className="font-medium">{tenant.name}</span>
            <span className="text-sm opacity-70">{tenant.role === "owner" ? "Dueño" : "Staff"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
