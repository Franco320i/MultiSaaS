import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { resolvePlatformAdmin } from "@/core/admin/access";
import { loginPath } from "@/core/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Segundo factor" };

// admin.tuapp.com.ar/mfa · Activar o pedir el código de la app autenticadora.
export default function MfaPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-[26px] font-semibold tracking-tight">Segundo factor</h1>
      <Suspense fallback={<div aria-busy="true" className="h-48 rounded-xl bg-surface" />}>
        <Mfa />
      </Suspense>
    </main>
  );
}

async function Mfa() {
  const gate = await resolvePlatformAdmin();
  if (gate.status === "anonymous") redirect(loginPath("/"));
  if (gate.status === "forbidden") notFound();
  if (gate.status === "ok") redirect("/");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = (data?.totp ?? []).find((f) => f.status === "verified");
  return <MfaForm factorId={verified?.id ?? null} />;
}
