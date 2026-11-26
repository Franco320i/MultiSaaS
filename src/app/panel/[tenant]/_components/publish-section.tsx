import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { qrDataUri, qrPngDataUri } from "@/lib/qr";
import { platformUrl } from "@/lib/urls";
import { PublishPanel, type SetupStatus } from "@/modules/settings";
import { setPublishedAction } from "@/modules/settings/actions";
import type { Database } from "@/types/database";

/**
 * Publicar, link y QR del catálogo. Lo usan el último paso del asistente y "Link y QR" de
 * Mi local. Recibe el comercio ya verificado con requireTenantAccess(…, "settings.write").
 */
export async function PublishSection({
  supabase,
  tenantId,
  slug,
  status,
  displayName,
}: {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  slug: string;
  status: SetupStatus;
  displayName: string;
}) {
  const host = await supabase.from("domains").select("hostname").eq("tenant_id", tenantId).eq("is_primary", true).maybeSingle();
  const catalogUrl = host.data
    ? platformUrl(env.ROOT_DOMAIN, host.data.hostname.replace(`.${env.ROOT_DOMAIN}`, ""))
    : platformUrl(env.ROOT_DOMAIN, slug);
  const [svg, png] = await Promise.all([qrDataUri(catalogUrl), qrPngDataUri(catalogUrl)]);
  return (
    <PublishPanel
      published={status.publishedAt !== null}
      canPublish={status.hasWhatsapp && status.publishedProducts > 0}
      catalogUrl={catalogUrl}
      qrDataUri={svg}
      qrPngDataUri={png}
      downloadName={`qr-${slug}.png`}
      displayName={displayName}
      action={setPublishedAction.bind(null, slug)}
    />
  );
}
