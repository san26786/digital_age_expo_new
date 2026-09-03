import Link from "next/link";
import { Store, Pencil, ArrowLeft, Image as ImageIcon, Check, Minus } from "lucide-react";

import type { ExhibitorAdminRow } from "@/lib/services/eventExhibitorAdmin";
import {
  PANEL,
  PANEL_FLUSH,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BADGE_SUCCESS,
  BADGE_WARN,
  BADGE_DANGER,
  BADGE_INFO,
  BADGE_NEUTRAL,
  FORM_LABEL,
} from "@/components/ui/membersTheme";

/**
 * ---------------------------------------------------------------------------
 * Exhibitor full details — the read view.
 * ---------------------------------------------------------------------------
 *
 * Reached from the stand designer's "Exhibitor Full Details" link, which uses the legacy URL
 * `/members/view_exhibitor?action=edit&from_view_booth=1&id=<ex>&event_id=<event>`.
 *
 * Deliberately a READ view with an "Edit" action rather than a second copy of the Edit Trade
 * Stand form: that form is ~700 lines of react-hook-form + zod + image uploads living in
 * ExhibitorsAdminManager, and duplicating it here would give two implementations of the same
 * validation to keep in step. Edit hands off to the existing modal instead (?ex_id=<id>), so
 * there is still exactly one place an exhibitor can be written.
 *
 * The section order mirrors that modal's tabs — Contact & Role, Trade Stand, Booth & Socials,
 * Images, Preferences & Promo — so someone moving between the two sees the same shape.
 */

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <p className={FORM_LABEL}>{label}</p>
      <p className="text-sm font-semibold text-white break-words">{text}</p>
    </div>
  );
}

function LinkField({ label, value, href }: { label: string; value?: string | null; href?: string | null }) {
  if (!value) return <Field label={label} value={null} />;
  return (
    <div>
      <p className={FORM_LABEL}>{label}</p>
      <a
        href={href || value}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-brand-pink break-all hover:underline"
      >
        {value}
      </a>
    </div>
  );
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
        on
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
          : "border-white/10 bg-white/5 text-zinc-500"
      }`}
    >
      {on ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={PANEL}>
      <h2 className="border-b border-white/10 pb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">
        {title}
      </h2>
      {children}
    </div>
  );
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "active") return BADGE_SUCCESS;
  if (s === "pending") return BADGE_WARN;
  if (s === "reject" || s === "rejected") return BADGE_DANGER;
  return BADGE_NEUTRAL;
}

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

export function ExhibitorDetailsView({
  exhibitor,
  eventId,
  /** Set when arriving from the booth/stand designer, so "Back" returns there rather than to the list. */
  fromViewBooth = false,
}: {
  exhibitor: ExhibitorAdminRow;
  eventId: number;
  fromViewBooth?: boolean;
}) {
  const images = [
    { label: "Profile Image", url: exhibitor.profilePic },
    { label: "Website Logo", url: exhibitor.logo },
    { label: "Stand Logo", url: exhibitor.standLogo },
  ];

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------- header */}
      <div className={`${PANEL} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {exhibitor.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exhibitor.logo} alt={exhibitor.business ?? "Logo"} className="h-full w-full object-contain" />
            ) : (
              <Store className="h-6 w-6 text-zinc-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              {exhibitor.business || "Unnamed business"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-zinc-400">
              {exhibitor.fullName}
              {exhibitor.position ? ` · ${exhibitor.position}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={statusBadge(exhibitor.status)}>{exhibitor.status || "unknown"}</span>
              {exhibitor.standNumber && <span className={BADGE_NEUTRAL}>Stand {exhibitor.standNumber}</span>}
              {exhibitor.featured && <span className={BADGE_INFO}>Featured</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={
              fromViewBooth
                ? `/members/manage_stand_assets?event_id=${eventId}&ex_id=${exhibitor.id}`
                : `/members/view_exhibitor?event_id=${eventId}`
            }
            className={BTN_SECONDARY}
          >
            <ArrowLeft className="h-4 w-4" />
            {fromViewBooth ? "Back to stand" : "Back to list"}
          </Link>
          {/* Editing stays in the one existing implementation — the list page opens its modal on
              this exhibitor when it receives ?ex_id. */}
          <Link href={`/members/view_exhibitor?event_id=${eventId}&ex_id=${exhibitor.id}`} className={BTN_PRIMARY}>
            <Pencil className="h-4 w-4" />
            Edit Details
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ------------------------------------------------------ contact & role */}
        <Section title="Contact & Role">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="First Name" value={exhibitor.firstName} />
            <Field label="Last Name" value={exhibitor.lastName} />
            <LinkField
              label="Official Email"
              value={exhibitor.email}
              href={exhibitor.email ? `mailto:${exhibitor.email}` : null}
            />
            <LinkField
              label="Mobile Phone"
              value={exhibitor.phone}
              href={exhibitor.phone ? `tel:${exhibitor.phone}` : null}
            />
            <LinkField
              label="Work Direct Line"
              value={exhibitor.workPhone}
              href={exhibitor.workPhone ? `tel:${exhibitor.workPhone}` : null}
            />
            <Field label="Position / Job Title" value={exhibitor.position} />
            <Field label="Business / Organisation" value={exhibitor.business} />
            <LinkField
              label="Company Website"
              value={exhibitor.website}
              href={
                exhibitor.website
                  ? exhibitor.website.startsWith("http")
                    ? exhibitor.website
                    : `https://${exhibitor.website}`
                  : null
              }
            />
            <Field label="Lifecycle Status" value={exhibitor.status} />
            <Field label="Joining Status" value={exhibitor.joiningStatus} />
            <Field label="Batch Number" value={exhibitor.batchNumber} />
            <Field label="Telecalling Grade" value={exhibitor.telecallingGradeId} />
          </div>
          {exhibitor.aboutUs && (
            <div className="border-t border-white/10 pt-4">
              <p className={FORM_LABEL}>About Us</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{exhibitor.aboutUs}</p>
            </div>
          )}
        </Section>

        {/* --------------------------------------------------------- trade stand */}
        <Section title="Trade Stand & Allocation">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Exhibition Zone ID" value={exhibitor.exhibitionZoneId} />
            <Field label="Virtual Booth (Spot) ID" value={exhibitor.spotId} />
            <Field label="Stand Number" value={exhibitor.standNumber} />
            <Field label="Allocated Stand Size" value={exhibitor.standSize} />
            <Field label="Stand Layout ID" value={exhibitor.exStandLayoutId} />
            <Field label="Stand Colour ID" value={exhibitor.standColorId} />
            <Field label="Order (PO) ID" value={exhibitor.orderId} />
            <Field label="Listing ID" value={exhibitor.listingId} />
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className={`${FORM_LABEL} mb-3`}>Pricing</p>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Field label="Stand Price" value={money(exhibitor.standPrice)} />
              <Field label="Discount" value={money(exhibitor.discount)} />
              <Field label="Charitable" value={money(exhibitor.charitableAmount)} />
              <Field label="Exchange" value={money(exhibitor.exchangeAmount)} />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Subtotal</span>
              <span className="text-lg font-black text-white">{money(exhibitor.orderSubtotal)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Flag label="Exchange Services" on={exhibitor.exchangeServices} />
            <Flag label="Column Listing" on={exhibitor.includeColumnListing} />
            <Flag label="Logo Listing" on={exhibitor.includeLogoListing} />
          </div>
        </Section>

        {/* ------------------------------------------------------ booth & socials */}
        <Section title="Booth & Socials">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <LinkField label="LinkedIn" value={exhibitor.linkedinUserProfile} />
            <LinkField label="Facebook" value={exhibitor.facebook} />
            <LinkField label="X / Twitter" value={exhibitor.twitter} />
            <LinkField label="Instagram" value={exhibitor.instagram} />
            <LinkField label="YouTube" value={exhibitor.youtube} />
            <Field label="WhatsApp" value={exhibitor.whatsappNo} />
            <LinkField label="Zoom" value={exhibitor.zoom} />
            <LinkField label="Calendly" value={exhibitor.calendly} />
          </div>
          <div className="grid grid-cols-1 gap-5 border-t border-white/10 pt-4 sm:grid-cols-2">
            <Field label="Video Calling Provider" value={exhibitor.videoCallingSoftwareProvider} />
            <LinkField label="Video Call URL" value={exhibitor.videoCallUrl} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Flag label="Video Calling Enabled" on={exhibitor.enableVideoCalling} />
            <Flag label="Member Company Profile" on={exhibitor.memberCompanyProfile} />
            <Flag label="Excluded From Advertise" on={exhibitor.excludedFromAdvertise} />
          </div>
        </Section>

        {/* --------------------------------------------- preferences & promotion */}
        <Section title="Preferences & Promotion">
          <div className="flex flex-wrap gap-2">
            <Flag label="Webinars" on={exhibitor.isWebinars} />
            <Flag label="Workshops" on={exhibitor.isWorkshops} />
            <Flag label="Business Presentation" on={exhibitor.isBusinessPresentation} />
            <Flag label="E-Magazine" on={exhibitor.isEMagazine} />
            <Flag label="Newsletter" on={exhibitor.isNewsletter} />
            <Flag label="Visitor Notification Mail" on={exhibitor.visitorNotificationMail} />
            <Flag label="Featured" on={exhibitor.featured} />
          </div>
          <div className="grid grid-cols-1 gap-5 border-t border-white/10 pt-4 sm:grid-cols-2">
            <Field label="Keynote Speech Topic" value={exhibitor.keynoteSpeechTopic} />
            <Field label="Referral Code" value={exhibitor.referralCode} />
            <Field label="Referral Master ID" value={exhibitor.referralMstrId} />
            <Field label="Referrer From" value={exhibitor.referrerFrom} />
          </div>
          {exhibitor.specialInstructions && (
            <div className="border-t border-white/10 pt-4">
              <p className={FORM_LABEL}>Special Instructions</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {exhibitor.specialInstructions}
              </p>
            </div>
          )}
        </Section>
      </div>

      {/* --------------------------------------------------------------- images */}
      <div className={PANEL_FLUSH}>
        <h2 className="border-b border-white/10 px-8 py-5 text-sm font-black uppercase tracking-wider text-fuchsia-300">
          Images
        </h2>
        <div className="grid grid-cols-1 gap-6 p-8 sm:grid-cols-3">
          {images.map((img) => (
            <div key={img.label} className="space-y-2">
              <p className={FORM_LABEL}>{img.label}</p>
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.label} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-zinc-600">
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Not uploaded</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
