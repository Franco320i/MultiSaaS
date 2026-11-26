import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/core/admin/access";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listBusinessTemplates } from "@/modules/settings";
import { PageHeader } from "@/app/admin/(panel)/ui";
import { AssistedForm } from "./assisted-form";

export const metadata: Metadata = { title: "Alta asistida" };

// admin.tuapp.com.ar/alta · Alta asistida (diseño, sección 10): solo superadmin.
export default function AssistedPage() {
  return (
    <main className="flex flex-col gap-5 px-4 py-6 md:px-8">
      <PageHeader title="Alta asistida" subtitle="Creás el comercio y la cuenta del dueño. No sale ningún correo: los datos se los mandás vos por WhatsApp." />
      <Suspense fallback={<div aria-busy="true" className="h-80 max-w-xl rounded-xl bg-surface" />}>
        <Assisted />
      </Suspense>
    </main>
  );
}

async function Assisted() {
  await requirePlatformAdmin("/alta", "superadmin");
  const supabase = await createSupabaseServerClient();
  const templates = await listBusinessTemplates(supabase);
  return <AssistedForm templates={templates} domainSuffix={env.ROOT_DOMAIN} />;
}
