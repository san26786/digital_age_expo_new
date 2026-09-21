import { getBrand } from "@/lib/brand";
import { getDomain } from "@/lib/services/domain";
import { resolveSiteId } from "@/lib/tenant";
import { getSiteMailSettings } from "@/lib/email/siteMailSettings";
import { getBounceSummary } from "@/lib/email/emailLog";
import { isSmtpConfigured } from "@/lib/email/mailer";
import { SendQueueSettings } from "@/components/email-templates/SendQueueSettings";
import { saveMailSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Reachable from every site, unlike /hub/sites.
 *
 * The mailbox being configured is the one belonging to whichever site is serving this request, so
 * gating it to the parent site would mean a sub-site could never set its own From address — the
 * opposite of the point. The /hub layout's person-level check is the only gate it needs.
 */
export default async function SendQueuePage() {
  const [settings, brand, siteId, domain] = await Promise.all([
    getSiteMailSettings(),
    getBrand(),
    resolveSiteId(),
    getDomain(),
  ]);

  /*
   * No "recent sends" list here. Every send now writes a find_email_log row, and
   * /members/event_mail_logs already lists exactly that — it was empty only because nothing had
   * ever written to the table. A second copy of a screen this app already has is a second thing
   * to keep in step with the first.
   */
  const bounces = await getBounceSummary(siteId, domain.event_id ?? null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">Organiser</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Send Queue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          The mailbox this site sends from, and what is not built yet.
        </p>
      </div>

      <SendQueueSettings
        settings={settings}
        siteName={brand.name}
        envConfigured={isSmtpConfigured()}
        saveAction={saveMailSettingsAction}
        bounces={bounces}
      />
    </div>
  );
}
