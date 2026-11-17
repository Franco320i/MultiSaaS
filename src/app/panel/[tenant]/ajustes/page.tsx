import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { publicImageUrl } from "@/lib/images/url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BRAND_PALETTE, BrandForm, BrandingImage, ContactForm, getHours, getSettings, HoursForm } from "@/modules/settings";
import {
  removeBrandingAction,
  saveBrandAction,
  saveContactAction,
  saveHoursAction,
  uploadBrandingAction,
} from "@/modules/settings/actions";

export const metadata: Metadata = { title: "Ajustes" };

/**
 * app.tuapp.com.ar/[tenant]/ajustes · Marca, contacto, entrega y horarios del comercio.
 * Solo el dueño (settings.write). Los mismos formularios que el asistente, sin "seguir".
 */
export default function SettingsPage({ params }: PageProps<"/panel/[tenant]/ajustes">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-2xl bg-surface-muted" />}>
        <Settings params={params} />
      </Suspense>
    </main>
  );
}

async function Settings({ params }: Pick<PageProps<"/panel/[tenant]/ajustes">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "settings.write");
  const supabase = await createSupabaseServerClient();
  const [settings, hours] = await Promise.all([getSettings(supabase, access.tenantId), getHours(supabase, access.tenantId)]);
  const theme = (settings.theme ?? {}) as Record<string, unknown>;
  const brand = (BRAND_PALETTE as readonly string[]).includes(theme.brand as string) ? (theme.brand as string) : BRAND_PALETTE[0];

  const section = "flex flex-col gap-5 border-t border-line pt-8 first:border-0 first:pt-0";
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-tight">Ajustes</h1>
        <Link href={`/${access.slug}/configurar?paso=publicar`} className="w-fit text-[15px] font-semibold underline underline-offset-4">
          Publicación y link del catálogo
        </Link>
      </header>

      <section aria-labelledby="marca" className={section}>
        <h2 id="marca" className="font-display text-[22px]">Marca</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <BrandingImage
            kind="logo"
            label="Logo"
            hint="Cuadrado, se ve redondo."
            url={settings.logo_path ? publicImageUrl(settings.logo_path, 480) : null}
            uploadAction={uploadBrandingAction.bind(null, access.slug, "logo")}
            removeAction={removeBrandingAction.bind(null, access.slug, "logo")}
          />
          <BrandingImage
            kind="cover"
            label="Portada"
            hint="Horizontal. Una foto del local o de tus productos."
            url={settings.cover_path ? publicImageUrl(settings.cover_path, 1280) : null}
            uploadAction={uploadBrandingAction.bind(null, access.slug, "cover")}
            removeAction={removeBrandingAction.bind(null, access.slug, "cover")}
          />
        </div>
        <BrandForm action={saveBrandAction.bind(null, access.slug)} submitLabel="Guardar marca" values={{ ...settings, brand }} />
      </section>

      <section aria-labelledby="contacto" className={section}>
        <h2 id="contacto" className="font-display text-[22px]">Contacto y entrega</h2>
        <ContactForm action={saveContactAction.bind(null, access.slug)} submitLabel="Guardar contacto y entrega" values={settings} />
      </section>

      <section aria-labelledby="horarios" className={section}>
        <h2 id="horarios" className="font-display text-[22px]">Horarios</h2>
        <HoursForm action={saveHoursAction.bind(null, access.slug)} submitLabel="Guardar horarios" hours={hours} />
      </section>
    </>
  );
}
