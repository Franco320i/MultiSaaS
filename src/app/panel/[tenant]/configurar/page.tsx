import type { Metadata } from "next";
import { buttonClasses } from "@/ui/button-classes";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { env } from "@/lib/env";
import { publicImageUrl } from "@/lib/images/url";
import { qrDataUri } from "@/lib/qr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { platformUrl } from "@/lib/urls";
import {
  BRAND_PALETTE,
  BrandForm,
  BrandingImage,
  ContactForm,
  getHours,
  getSettings,
  getSetupStatus,
  HoursForm,
  PublishPanel,
  SetupChecklist,
  STEP_LABEL,
  WIZARD_STEPS,
  type WizardStep,
} from "@/modules/settings";
import {
  removeBrandingAction,
  saveBrandAction,
  saveContactAction,
  saveHoursAction,
  setPublishedAction,
  uploadBrandingAction,
} from "@/modules/settings/actions";

export const metadata: Metadata = { title: "Configurá tu catálogo" };

/**
 * app.tuapp.com.ar/[tenant]/configurar?paso=… · Asistente de alta, pasos 2 a 6
 * (diseño, sección 10). Solo el dueño (settings.write). Cada paso guarda y lleva al siguiente.
 */
export default function SetupPage({ params, searchParams }: PageProps<"/panel/[tenant]/configurar">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-2xl bg-surface-muted" />}>
        <Setup params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Setup({ params, searchParams }: PageProps<"/panel/[tenant]/configurar">) {
  const { tenant: slug } = await params;
  const { paso } = await searchParams;
  const access = await requireTenantAccess(slug, "settings.write");
  const step: WizardStep = (WIZARD_STEPS as readonly string[]).includes(paso as string) ? (paso as WizardStep) : "marca";
  const index = WIZARD_STEPS.indexOf(step);
  const next = WIZARD_STEPS[index + 1];
  const supabase = await createSupabaseServerClient();
  const base = `/${access.slug}/configurar`;

  return (
    <>
      <nav aria-label="Pasos" className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Paso {index + 2} de 6</p>
        <ol className="flex gap-1.5">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <Link
                href={`${base}?paso=${s}`}
                aria-current={s === step ? "step" : undefined}
                aria-label={`${i + 2}. ${STEP_LABEL[s]}`}
                className={`block h-1.5 rounded-full ${i <= index ? "bg-accent" : "bg-surface-muted"}`}
              />
            </li>
          ))}
        </ol>
        <h1 className="font-display text-[32px] leading-tight">{STEP_LABEL[step]}</h1>
      </nav>

      <StepContent step={step} slug={access.slug} tenantId={access.tenantId} next={next} supabase={supabase} />

      {next && step !== "productos" ? (
        <Link href={`${base}?paso=${next}`} className="w-fit py-2 text-[15px] font-semibold text-muted underline underline-offset-4">
          Lo hago después
        </Link>
      ) : null}
    </>
  );
}

async function StepContent({
  step,
  slug,
  tenantId,
  next,
  supabase,
}: {
  step: WizardStep;
  slug: string;
  tenantId: string;
  next: WizardStep | undefined;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const submitLabel = next ? "Guardar y seguir" : "Guardar";

  if (step === "marca") {
    const settings = await getSettings(supabase, tenantId);
    const theme = (settings.theme ?? {}) as Record<string, unknown>;
    const brand = (BRAND_PALETTE as readonly string[]).includes(theme.brand as string) ? (theme.brand as string) : BRAND_PALETTE[0];
    return (
      <div className="flex flex-col gap-8">
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
        <BrandForm action={saveBrandAction.bind(null, slug)} next={next} submitLabel={submitLabel} values={{ ...settings, brand }} />
      </div>
    );
  }

  if (step === "contacto") {
    const settings = await getSettings(supabase, tenantId);
    return <ContactForm action={saveContactAction.bind(null, slug)} next={next} submitLabel={submitLabel} values={settings} />;
  }

  if (step === "horarios") {
    const hours = await getHours(supabase, tenantId);
    return <HoursForm action={saveHoursAction.bind(null, slug)} next={next} submitLabel={submitLabel} hours={hours} />;
  }

  if (step === "productos") {
    const status = await getSetupStatus(supabase, tenantId);
    return (
      <div className="flex flex-col gap-5">
        <p className="text-muted">
          {status.publishedProducts === 0
            ? "Cargá al menos un producto publicado para poder publicar el catálogo."
            : `Tenés ${status.publishedProducts} ${status.publishedProducts === 1 ? "producto publicado" : "productos publicados"}.`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/${slug}/productos/importar`}
            className={buttonClasses("primary")}
          >
            Pegar desde una planilla
          </Link>
          <Link
            href={`/${slug}/productos/nuevo`}
            className={buttonClasses("secondary")}
          >
            Cargar uno por uno
          </Link>
        </div>
        <Link href={`/${slug}/configurar?paso=publicar`} className="w-fit py-2 text-[15px] font-semibold underline underline-offset-4">
          {status.publishedProducts > 0 ? "Seguir: publicar" : "Lo hago después"}
        </Link>
      </div>
    );
  }

  // Publicar
  const [settings, status, hosts] = await Promise.all([
    getSettings(supabase, tenantId),
    getSetupStatus(supabase, tenantId),
    supabase.from("domains").select("hostname").eq("tenant_id", tenantId).eq("is_primary", true).maybeSingle(),
  ]);
  const catalogUrl = hosts.data
    ? platformUrl(env.ROOT_DOMAIN, hosts.data.hostname.replace(`.${env.ROOT_DOMAIN}`, ""))
    : platformUrl(env.ROOT_DOMAIN, slug);
  return (
    <div className="flex flex-col gap-6">
      <PublishPanel
        published={status.publishedAt !== null}
        canPublish={status.hasWhatsapp && status.publishedProducts > 0}
        catalogUrl={catalogUrl}
        qrDataUri={await qrDataUri(catalogUrl)}
        displayName={settings.display_name}
        action={setPublishedAction.bind(null, slug)}
      />
      <SetupChecklist slug={slug} status={status} title="Antes o después de publicar, revisá esto" />
      <Link href={`/${slug}`} className="w-fit py-2 text-[15px] font-semibold underline underline-offset-4">
        Ir al panel
      </Link>
    </div>
  );
}
