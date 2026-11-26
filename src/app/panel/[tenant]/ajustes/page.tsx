import type { Metadata } from "next";
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
  parseSettingsSection,
  SetupChecklist,
  type SettingsSection,
  type SetupStatus,
} from "@/modules/settings";
import {
  removeBrandingAction,
  saveBrandAction,
  saveContactAction,
  saveHoursAction,
  uploadBrandingAction,
} from "@/modules/settings/actions";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";
import { PublishSection } from "../_components/publish-section";

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

/** Título y bajada de cada sección (en el índice y arriba de su pantalla). */
const SECTIONS: Record<SettingsSection, { title: string; description: string }> = {
  marca: { title: "Marca", description: "Logo, portada, nombre y color de tu catálogo." },
  contacto: { title: "Contacto y entrega", description: "WhatsApp, dirección, envío, retiro y medios de pago." },
  horarios: { title: "Horarios", description: "Los días y las horas en que atendés." },
  link: { title: "Link y QR", description: "Publicá tu catálogo, copiá el link y descargá el QR." },
  accesos: { title: "Accesos de la plataforma", description: "Cada vez que alguien de Vidri entró a tu comercio." },
};

/** Lo que falta en cada sección (el mismo criterio que "Para completar"). */
function missing(section: SettingsSection, setup: SetupStatus): string | null {
  if (section === "marca" && !setup.hasLogo) return "Falta el logo";
  if (section === "contacto" && !setup.hasWhatsapp) return "Falta el WhatsApp";
  if (section === "horarios" && !setup.hasHours) return "Faltan los horarios";
  if (section === "link" && setup.publishedAt === null) return "Sin publicar";
  return null;
}

/**
 * app.tuapp.com.ar/[tenant]/ajustes · Mi local: índice de secciones y, con `?seccion=`, la
 * pantalla de cada una (docs/superpowers/specs/2026-11-26-rediseno-panel-recorridos-design.md).
 * Solo el dueño (settings.write). Guardar deja en la misma sección, con el aviso "Se guardó".
 */
export default function SettingsPage({ params, searchParams }: PageProps<"/panel/[tenant]/ajustes">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-2xl bg-surface-muted" />}>
        <Settings params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Settings({ params, searchParams }: PageProps<"/panel/[tenant]/ajustes">) {
  const { tenant: slug } = await params;
  const { seccion } = await searchParams;
  const access = await requireTenantAccess(slug, "settings.write");
  const section = parseSettingsSection(seccion);
  const supabase = await createSupabaseServerClient();
  const [settings, setup] = await Promise.all([getSettings(supabase, access.tenantId), getSetupStatus(supabase, access.tenantId)]);
  const base = `/${access.slug}/ajustes`;

  if (!section) {
    return (
      <>
        <PageHeader eyebrow="Tu local" title="Mi local" description="Cómo se ve tu catálogo y cómo te encuentran tus clientes." />
        <SetupChecklist slug={access.slug} status={setup} title="Para completar" inSettings />
        <nav aria-label="Secciones de Mi local">
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {(Object.keys(SECTIONS) as SettingsSection[]).map((key) => {
              const warn = missing(key, setup);
              return (
                <li key={key}>
                  <Link
                    href={`${base}?seccion=${key}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[16px] font-semibold">{SECTIONS[key].title}</span>
                      <span className="text-[14px] text-muted">{SECTIONS[key].description}</span>
                    </span>
                    {warn ? <Pill tone="warning">{warn}</Pill> : null}
                    <span aria-hidden className="text-[22px] text-muted">
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </>
    );
  }

  return (
    <>
      <Link href={base} className="flex min-h-11 w-fit items-center gap-1 text-[15px] text-muted">
        ‹ Mi local
      </Link>
      <PageHeader eyebrow="Mi local" title={SECTIONS[section].title} description={SECTIONS[section].description} />
      {section === "marca" ? <BrandSection slug={access.slug} settings={settings} /> : null}
      {section === "contacto" ? (
        <ContactForm action={saveContactAction.bind(null, access.slug)} submitLabel="Guardar contacto y entrega" values={settings} />
      ) : null}
      {section === "horarios" ? (
        <HoursForm
          action={saveHoursAction.bind(null, access.slug)}
          submitLabel="Guardar horarios"
          hours={await getHours(supabase, access.tenantId)}
        />
      ) : null}
      {section === "link" ? (
        <PublishSection supabase={supabase} tenantId={access.tenantId} slug={access.slug} status={setup} displayName={settings.display_name} />
      ) : null}
      {section === "accesos" ? <PlatformAccesses actions={await listSupportAccesses(supabase, access.tenantId)} /> : null}
    </>
  );
}

function BrandSection({ slug, settings }: { slug: string; settings: Awaited<ReturnType<typeof getSettings>> }) {
  const theme = (settings.theme ?? {}) as Record<string, unknown>;
  const brand = (BRAND_PALETTE as readonly string[]).includes(theme.brand as string) ? (theme.brand as string) : BRAND_PALETTE[0];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <BrandingImage
          kind="logo"
          label="Logo"
          hint="Cuadrado, se ve redondo."
          url={settings.logo_path ? publicImageUrl(settings.logo_path, 480) : null}
          uploadAction={uploadBrandingAction.bind(null, slug, "logo")}
          removeAction={removeBrandingAction.bind(null, slug, "logo")}
        />
        <BrandingImage
          kind="cover"
          label="Portada"
          hint="Horizontal. Una foto del local o de tus productos."
          url={settings.cover_path ? publicImageUrl(settings.cover_path, 1280) : null}
          uploadAction={uploadBrandingAction.bind(null, slug, "cover")}
          removeAction={removeBrandingAction.bind(null, slug, "cover")}
        />
      </div>
      <BrandForm action={saveBrandAction.bind(null, slug)} submitLabel="Guardar marca" values={{ ...settings, brand }} />
    </div>
  );
}

function PlatformAccesses({ actions }: { actions: Awaited<ReturnType<typeof listSupportAccesses>> }) {
  if (actions.length === 0) return <p className="text-[15px]">Nadie de la plataforma entró a tu comercio.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4 text-[15px]">
      {actions.map((a) => (
        <li key={a.at + a.action} className="flex justify-between gap-3 py-3">
          <span>{PLATFORM_ACTION[a.action] ?? "Cambio en tu cuenta"}</span>
          <span className="text-muted tabular-nums">{dateTime.format(new Date(a.at))}</span>
        </li>
      ))}
    </ul>
  );
}
