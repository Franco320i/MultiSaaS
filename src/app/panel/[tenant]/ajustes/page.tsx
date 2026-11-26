import type { Metadata } from "next";
import { PageHeader } from "@/ui/page-header";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { publicImageUrl } from "@/lib/images/url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAND_PALETTE,
  BrandForm,
  BrandingImage,
  ContactForm,
  getHours,
  getSettings,
  getSetupStatus,
  HoursForm,
  listSupportAccesses,
  SetupChecklist,
} from "@/modules/settings";
import {
  removeBrandingAction,
  saveBrandAction,
  saveContactAction,
  saveHoursAction,
  uploadBrandingAction,
} from "@/modules/settings/actions";

export const metadata: Metadata = { title: "Mi local" };

const PLATFORM_ACTION: Record<string, string> = {
  "support.viewed": "Soporte entró a ver tu comercio",
  "subscription.paid": "Registramos un pago",
  "subscription.plan_changed": "Cambio de plan",
  "subscription.extended": "Extendimos tu vencimiento",
  "tenant.suspended": "Suspensión de la cuenta",
  "tenant.reactivated": "Reactivación de la cuenta",
  "tenant.created": "Alta de tu comercio",
};

const dateTime = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

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
  const [settings, hours, platformActions, setup] = await Promise.all([
    getSettings(supabase, access.tenantId),
    getHours(supabase, access.tenantId),
    listSupportAccesses(supabase, access.tenantId),
    getSetupStatus(supabase, access.tenantId),
  ]);
  const theme = (settings.theme ?? {}) as Record<string, unknown>;
  const brand = (BRAND_PALETTE as readonly string[]).includes(theme.brand as string) ? (theme.brand as string) : BRAND_PALETTE[0];

  const section = "flex flex-col gap-5 border-t border-line pt-8 first:border-0 first:pt-0";
  return (
    <>
      <div className="flex flex-col gap-2">
        <PageHeader eyebrow="Tu local" title="Mi local" description="Cómo se ve tu catálogo y cómo te encuentran tus clientes." />
        <Link href={`/${access.slug}/configurar?paso=publicar`} className="w-fit py-2 text-[15px] font-semibold underline underline-offset-4">
          Publicación y link del catálogo
        </Link>
      </div>
      <SetupChecklist slug={access.slug} status={setup} title="Para completar" />

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

      <section aria-labelledby="soporte" className={section}>
        <h2 id="soporte" className="font-display text-[22px]">Accesos de la plataforma</h2>
        <p className="text-[15px] text-muted">
          Cada vez que nuestro equipo entra a ver tu comercio para ayudarte, o cambia algo de tu cuenta, queda registrado acá.
        </p>
        {platformActions.length === 0 ? (
          <p className="text-[15px]">Nadie de la plataforma entró a tu comercio.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line text-[15px]">
            {platformActions.map((a) => (
              <li key={a.at + a.action} className="flex justify-between gap-3 py-2">
                <span>{PLATFORM_ACTION[a.action] ?? "Cambio en tu cuenta"}</span>
                <span className="text-muted tabular-nums">{dateTime.format(new Date(a.at))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
