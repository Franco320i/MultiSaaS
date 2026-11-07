import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/core/auth/session";
import { listMyTenants } from "@/core/tenancy/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tus comercios" };

// app.tuapp.com.ar/ · Elegir comercio. Si el usuario tiene uno solo, entra directo.
export default function PanelHome() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Tus comercios</h1>
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
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

  if (tenants.length === 0) {
    return (
      <p className="opacity-80">
        Tu usuario todavía no pertenece a ningún comercio. Si te invitaron, abrí el enlace del correo de invitación.
      </p>
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
