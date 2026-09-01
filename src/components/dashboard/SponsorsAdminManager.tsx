"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus, Pencil, Trash2, Search, X, Star, Home, Download, Upload, FileSpreadsheet,
  Mail, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Image as ImageIcon,
} from "lucide-react";
import {
  eventSponsorAdminSchema,
  sponsorNetAmount,
  SPONSOR_STATUSES,
  SPONSOR_BULK_STATUS_ACTIONS,
  SPONSOR_STATUS_LABEL,
  type EventSponsorAdminInput,
} from "@/lib/validations/eventSponsorAdmin";
import type { SponsorAdminRow, SponsorStats } from "@/lib/services/eventSponsorAdmin";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { readCsv, columnIndex, downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

const CHECKBOX_LABEL_CLASS =
  "flex items-center gap-3 cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white select-none";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  unapproved: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  excluded: "bg-red-500/10 text-red-400 border border-red-500/20",
};

interface BadgeDef {
  label: string;
  key: keyof SponsorStats;
  /** Status this badge filters the table to, or undefined for "show everything". */
  typeFilter?: string;
  color: string;
}

/**
 * The four coloured tiles from the legacy header, plus the three counts that were previously only
 * available by reading the table. "Available" and "Used" are sponsorship SLOTS from the setup
 * table, not sponsors, so neither filters the list — clicking them would imply a row filter that
 * does not exist.
 */
const BADGES: BadgeDef[] = [
  { label: "Register Sponsor", key: "registered", color: "from-yellow-600/25 to-yellow-600/5 text-yellow-300 border-yellow-600/25" },
  { label: "Total Sponsor", key: "total", color: "from-emerald-500/25 to-emerald-500/5 text-emerald-300 border-emerald-500/25" },
  { label: "Available", key: "available", color: "from-red-500/25 to-red-500/5 text-red-300 border-red-500/25" },
  { label: "Used", key: "used", color: "from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-300 border-fuchsia-500/25" },
  { label: "Approved", key: "approved", typeFilter: "approved", color: "from-sky-500/25 to-sky-500/5 text-sky-300 border-sky-500/25" },
  { label: "Pending", key: "pending", typeFilter: "pending", color: "from-amber-500/25 to-amber-500/5 text-amber-300 border-amber-500/25" },
  { label: "Featured", key: "featured", typeFilter: "featured", color: "from-brand-pink/25 to-brand-pink/5 text-brand-pink border-brand-pink/25" },
];

function money(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `£${(Number.isFinite(n) ? n : 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================================
   Add / Edit Sponsor
   ========================================================================== */

interface FormDefaults extends Partial<EventSponsorAdminInput> {
  id?: number;
  /** The order already attached to this sponsor — kept selectable while editing. */
  current_order_id?: number | null;
  sponsor_img_url?: string | null;
  advert_banner_url?: string | null;
  /** find_orders.order_sub_total, so the form can show what the sponsorship is worth. */
  amount?: number | null;
}

interface SponsorOption {
  id: number;
  label: string;
  code?: string | null;
}

interface SponsorFormOptions {
  businesses: SponsorOption[];
  sponsorshipTypes: SponsorOption[];
  sponsorshipCategories: SponsorOption[];
  availableSponsorships: SponsorOption[];
}

const EMPTY_OPTIONS: SponsorFormOptions = {
  businesses: [],
  sponsorshipTypes: [],
  sponsorshipCategories: [],
  availableSponsorships: [],
};

type SponsorFormTab = "contact" | "sponsorship" | "visibility" | "media";

const FORM_TABS: { key: SponsorFormTab; label: string }[] = [
  { key: "contact", label: "Contact" },
  { key: "sponsorship", label: "Sponsorship" },
  { key: "visibility", label: "Visibility" },
  { key: "media", label: "Images" },
];

const IMAGE_FIELDS = [
  { field: "sponsor_img", label: "Sponsor Logo", hint: "Shown in the sponsor grid and rolling banners." },
  { field: "advert_banner", label: "Event Banner", hint: "Used when 'Upcoming Events Page Header Banner' is on." },
] as const;

type ImageField = (typeof IMAGE_FIELDS)[number]["field"];

/**
 * A <select> that never silently drops a value it does not recognise.
 *
 * Sponsorship types and event categories are configured per event and can change after a sponsor
 * was signed — a category gets deactivated, a type is renamed, a row was imported with a raw
 * value. A plain <select> in that situation displays the FIRST option as if it were the saved one,
 * and the next save writes that wrong value to the database without anybody touching the field.
 * Appending the current value as an explicit "(current)" option keeps the real state visible and
 * round-trips it unchanged.
 */
function OptionSelect({
  value,
  options,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  options: SponsorOption[];
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const known = options.some((o) => String(o.id) === value);
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <option value="" className="bg-zinc-900">
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id} className="bg-zinc-900">
          {o.label}
        </option>
      ))}
      {value !== "" && !known && (
        <option value={value} className="bg-zinc-900">
          {value} (current)
        </option>
      )}
    </select>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{children}</label>;
}

/**
 * Add / Edit Sponsor — the port of members/view_sponsor.php's `action=add|edit` form.
 *
 * Two behaviours carry over from the legacy page because the data is wrong without them:
 *
 *  1. Sponsorship Type -> Sponsor Type. Choosing a type fills the read-only Sponsor Type code
 *     (STES and friends) from that category, which is what the list column and the public site
 *     group by.
 *  2. Available Sponsorship consumes a paid order. Picking one marks it used; moving a sponsor
 *     off an order releases it (the legacy page only ever did the first half, which is why an
 *     order swapped away stayed locked out of every future dropdown).
 *
 * The two images upload AFTER the row is saved, because each file is named after the sponsor's id
 * — which does not exist yet when adding.
 */
function SponsorFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SponsorFormTab>("contact");
  const isEdit = typeof defaultValues?.id === "number";

  // The members layout has an ancestor with a CSS `animation` (.section-transition) and one with a
  // `backdrop-filter` (.glass-panel). Both create a containing block for `position: fixed`, which
  // pins the overlay inside that ancestor's box instead of the viewport — the modal renders far
  // down the page instead of centred. Portaling to document.body sidesteps it. `document` is not
  // available during SSR, so only portal once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [options, setOptions] = useState<SponsorFormOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [files, setFiles] = useState<Partial<Record<ImageField, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<ImageField, string>>>({});
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventSponsorAdminInput>({
    resolver: zodResolver(eventSponsorAdminSchema) as any,
    defaultValues: {
      listing_id: defaultValues?.listing_id ?? "",
      name: defaultValues?.name ?? "",
      position: defaultValues?.position ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      business: defaultValues?.business ?? "",
      linkedin_user_profile: defaultValues?.linkedin_user_profile ?? "",
      website: defaultValues?.website ?? "",
      sponsorship_type: defaultValues?.sponsorship_type ?? "",
      sponsor_type: defaultValues?.sponsor_type ?? "",
      sponsorship_category_id: defaultValues?.sponsorship_category_id ?? "",
      order_id: defaultValues?.order_id ?? "",
      exchange_services: defaultValues?.exchange_services ?? false,
      exchange_amount: defaultValues?.exchange_amount ?? "",
      discount: defaultValues?.discount ?? "",
      charitable_amount: defaultValues?.charitable_amount ?? "",
      activate_sponsor: defaultValues?.activate_sponsor ?? false,
      enable_home_page: defaultValues?.enable_home_page ?? false,
      enable_event_banner: defaultValues?.enable_event_banner ?? false,
      enable_display_advert: defaultValues?.enable_display_advert ?? false,
      excluded_from_advertise: defaultValues?.excluded_from_advertise ?? false,
      featured: defaultValues?.featured ?? false,
      sold_out_sponsor: defaultValues?.sold_out_sponsor ?? false,
      show_home: defaultValues?.show_home ?? false,
      show_banner: defaultValues?.show_banner ?? false,
      white_background_image: defaultValues?.white_background_image ?? false,
      status: defaultValues?.status ?? "pending",
      is_approved: defaultValues?.is_approved ?? false,
    },
  });

  const listingId = String(watch("listing_id") ?? "");
  const sponsorshipType = String(watch("sponsorship_type") ?? "");
  const sponsorshipCategoryId = String(watch("sponsorship_category_id") ?? "");
  const orderId = String(watch("order_id") ?? "");
  const sponsorTypeCode = String(watch("sponsor_type") ?? "");
  const isExchange = watch("exchange_services");
  const bannerOn = watch("enable_event_banner");

  const netAmount = sponsorNetAmount({
    amount: defaultValues?.amount ?? 0,
    exchange_amount: watch("exchange_amount"),
    discount: watch("discount"),
    charitable_amount: watch("charitable_amount"),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const query = defaultValues?.current_order_id
          ? `?order_id=${defaultValues.current_order_id}`
          : "";
        const res = await axios.get(`/api/members/sponsors-admin/form-options${query}`);
        if (!cancelled) setOptions({ ...EMPTY_OPTIONS, ...(res.data?.options ?? {}) });
      } catch {
        // A failed reference-data load must not block the form: the plain fields still work and
        // the dropdowns fall back to "(current)" values, so an organiser can still fix a contact.
        if (!cancelled) setOptions(EMPTY_OPTIONS);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reference data depends only on which sponsor is open, which never changes for a mounted modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBusinessChange(next: string) {
    setValue("listing_id", next);
    // Legacy resolves the business NAME from the chosen listing on save. Mirroring it here means
    // the field shows what will actually be stored — but only while it is still blank, so a
    // hand-typed trading name is never overwritten.
    const chosen = options.businesses.find((b) => String(b.id) === next);
    if (chosen && !String(watch("business") ?? "").trim()) setValue("business", chosen.label);
  }

  function handleSponsorshipTypeChange(next: string) {
    setValue("sponsorship_type", next);
    // The read-only Sponsor Type code belongs to the category, so it has to follow the type.
    const chosen = options.sponsorshipTypes.find((t) => String(t.id) === next);
    setValue("sponsor_type", chosen?.code ?? "");
  }

  function handleFileChange(field: ImageField, file: File | undefined) {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[field] = file;
      else delete next[field];
      return next;
    });
    setPreviews((prev) => {
      const next = { ...prev };
      if (prev[field]) URL.revokeObjectURL(prev[field]!);
      if (file) next[field] = URL.createObjectURL(file);
      else delete next[field];
      return next;
    });
  }

  // Object URLs leak until revoked; the modal can be closed with files still selected.
  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => url && URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadImages(sponsorId: number): Promise<string | null> {
    const pending = IMAGE_FIELDS.map((f) => f.field).filter((f) => files[f]);
    if (pending.length === 0) return null;

    setUploading(true);
    const failed: string[] = [];
    try {
      for (const field of pending) {
        const body = new FormData();
        body.append("file", files[field]!);
        body.append("id", String(sponsorId));
        body.append("field", field);
        try {
          await axios.post("/api/members/sponsors-admin/upload", body);
        } catch {
          failed.push(IMAGE_FIELDS.find((f) => f.field === field)!.label);
        }
      }
    } finally {
      setUploading(false);
    }

    // The sponsor itself saved fine — say which images did not, rather than failing the whole save.
    return failed.length > 0
      ? `Saved, but these images could not be uploaded: ${failed.join(", ")}.`
      : null;
  }

  async function onSubmit(data: EventSponsorAdminInput) {
    setErrorMessage(null);
    try {
      let sponsorId = defaultValues?.id;
      if (isEdit) {
        await axios.patch(`/api/members/sponsors-admin/${sponsorId}`, data);
      } else {
        const res = await axios.post("/api/members/sponsors-admin", data);
        sponsorId = res.data?.id;
      }

      if (sponsorId) {
        const uploadError = await uploadImages(sponsorId);
        if (uploadError) {
          setErrorMessage(uploadError);
          setActiveTab("media");
          return;
        }
      }

      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this sponsor. Please check the form and try again.",
      );
    }
  }

  if (!mounted) return null;

  const busy = isSubmitting || uploading;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-widest text-white">
                {isEdit ? "Edit Sponsorer" : "Add Sponsorer"}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Partnership, Package & Promotion
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-1">
            {FORM_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.key
                    ? "border-brand-pink text-brand-pink"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {activeTab === "contact" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel>Business Listing</FieldLabel>
                  <OptionSelect
                    value={listingId}
                    options={options.businesses}
                    disabled={optionsLoading}
                    placeholder={optionsLoading ? "Loading businesses…" : "— Select Business —"}
                    onChange={handleBusinessChange}
                  />
                  <p className="text-[10px] font-semibold text-zinc-600">
                    Links the sponsor to one of your listings. Leave blank for an outside company.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Contact Name*</FieldLabel>
                    <input {...register("name")} className={FIELD_CLASS} placeholder="Full name" />
                    {errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Position</FieldLabel>
                    <input {...register("position")} className={FIELD_CLASS} placeholder="e.g. Marketing Director" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Email</FieldLabel>
                    <input {...register("email")} type="email" className={FIELD_CLASS} placeholder="email@company.com" />
                    {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Phone</FieldLabel>
                    <input {...register("phone")} className={FIELD_CLASS} placeholder="+44..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Business / Trading Name</FieldLabel>
                  <input {...register("business")} className={FIELD_CLASS} placeholder="Company name" />
                  <p className="text-[10px] font-semibold text-zinc-600">
                    Taken from the listing above when one is selected.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Website</FieldLabel>
                    <input {...register("website")} className={FIELD_CLASS} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Linkedin User Profile Link</FieldLabel>
                    <input {...register("linkedin_user_profile")} className={FIELD_CLASS} placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sponsorship" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Sponsorship Type</FieldLabel>
                    <OptionSelect
                      value={sponsorshipType}
                      options={options.sponsorshipTypes}
                      disabled={optionsLoading}
                      placeholder={
                        optionsLoading
                          ? "Loading packages…"
                          : options.sponsorshipTypes.length === 0
                            ? "No sponsorship packages for this event"
                            : "— Select Sponsorship Type —"
                      }
                      onChange={handleSponsorshipTypeChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Sponsor Type</FieldLabel>
                    <input
                      {...register("sponsor_type")}
                      readOnly
                      className={`${FIELD_CLASS} cursor-not-allowed opacity-70`}
                      placeholder="Set by the package"
                    />
                    <p className="text-[10px] font-semibold text-zinc-600">
                      {sponsorTypeCode ? "Taken from the selected package." : "Filled in automatically."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Sponsorship Category</FieldLabel>
                    <OptionSelect
                      value={sponsorshipCategoryId}
                      options={options.sponsorshipCategories}
                      disabled={optionsLoading}
                      placeholder={
                        optionsLoading
                          ? "Loading categories…"
                          : options.sponsorshipCategories.length === 0
                            ? "No categories for this event"
                            : "— Select Category —"
                      }
                      onChange={(v) => setValue("sponsorship_category_id", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Available Sponsorship (Paid Order)</FieldLabel>
                    <OptionSelect
                      value={orderId}
                      options={options.availableSponsorships}
                      disabled={optionsLoading}
                      placeholder={
                        optionsLoading
                          ? "Loading orders…"
                          : options.availableSponsorships.length === 0
                            ? "No unused sponsorship orders"
                            : "— Select a purchased sponsorship —"
                      }
                      onChange={(v) => setValue("order_id", v)}
                    />
                    <p className="text-[10px] font-semibold text-zinc-600">
                      Consumes a paid order (PO). Moving off one releases it again.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Deductions</p>

                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("exchange_services")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Exchange Services Agreed
                  </label>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <FieldLabel>Exchange Amount (£)</FieldLabel>
                      <input
                        {...register("exchange_amount")}
                        inputMode="decimal"
                        disabled={!isExchange}
                        className={`${FIELD_CLASS} disabled:opacity-40`}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Discount (£)</FieldLabel>
                      <input {...register("discount")} inputMode="decimal" className={FIELD_CLASS} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Charitable Amount (£)</FieldLabel>
                      <input {...register("charitable_amount")} inputMode="decimal" className={FIELD_CLASS} placeholder="0" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-brand-pink/20 bg-brand-pink/5 px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      Net After Deductions
                    </span>
                    <span className="text-lg font-black text-white">{money(netAmount)}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-zinc-600">
                    Order amount {money(defaultValues?.amount ?? 0)} less exchange, discount and charitable
                    amount. Calculated for display — not stored.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Status</FieldLabel>
                    <select {...register("status")} className={FIELD_CLASS}>
                      {SPONSOR_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-zinc-900">
                          {SPONSOR_STATUS_LABEL[s] ?? s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-3">
                    <label className={CHECKBOX_LABEL_CLASS}>
                      <input type="checkbox" {...register("is_approved")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                      Approved (visible on the public site)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "visibility" && (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                  Placement & Promotion
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("activate_sponsor")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Enable Sponsorship
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("enable_home_page")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Home Page Square Event Banner
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("enable_event_banner")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Upcoming Events Page Header Banner
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("enable_display_advert")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Upcoming Events Page Square Banner
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("show_home")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Home Page Footer — Sponsorship Section
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("show_banner")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Sponsorship Rolling Banners
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("featured")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Featured
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("sold_out_sponsor")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Sold Out
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("excluded_from_advertise")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Exclude from Advertise Magazine
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("white_background_image")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Background White Image
                  </label>
                </div>

                {bannerOn && !defaultValues?.advert_banner_url && !files.advert_banner && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[11px] font-bold text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      The header banner is switched on but no banner image has been uploaded — add one
                      on the Images tab, or the slot renders empty.
                    </span>
                  </p>
                )}
              </div>
            )}

            {activeTab === "media" && (
              <div className="space-y-5">
                {!isEdit && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-[11px] font-bold text-amber-300">
                    Images are attached once the sponsor is created — pick them now and they upload as
                    soon as you save.
                  </div>
                )}

                {IMAGE_FIELDS.map(({ field, label, hint }) => {
                  const existing =
                    field === "sponsor_img" ? defaultValues?.sponsor_img_url : defaultValues?.advert_banner_url;
                  const preview = previews[field] ?? existing ?? null;

                  return (
                    <div key={field} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <FieldLabel>{label}</FieldLabel>
                          <p className="text-[10px] font-semibold text-zinc-600">{hint}</p>
                        </div>
                        {files[field] && (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            New file selected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt={label}
                            className="h-24 w-24 rounded-xl border border-white/10 object-contain bg-white/5"
                          />
                        ) : (
                          <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-white/10 text-zinc-600">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}

                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            onChange={(e) => handleFileChange(field, e.target.files?.[0])}
                            className="block w-full text-xs text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white hover:file:bg-white/20"
                          />
                          <p className="text-[10px] font-semibold text-zinc-600">JPG, PNG, GIF or WEBP — 5MB max.</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-500">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-4 border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-8 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-brand-pink px-10 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {uploading ? "Uploading images..." : isSubmitting ? "Processing..." : isEdit ? "Save" : "Add Sponsor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>,
    document.body,
  );
}

/* ============================================================================
   CSV import
   ========================================================================== */

interface ParsedSponsorCsv {
  rows: Record<string, string>[];
  delimiterLabel: string;
  ignoredColumns: string[];
  error?: string;
}

/**
 * Maps a CSV onto sponsor rows by HEADER NAME, so column order does not matter and the page's own
 * export re-imports unchanged.
 *
 * Computed columns are accepted in the header and ignored: Amount and TP come from the linked
 * order, and Franchise is resolved from the user record — none of the three is settable from a
 * spreadsheet, and silently writing them would put numbers on screen that no order backs.
 */
function mapSponsorCsv(text: string): ParsedSponsorCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) {
    return { rows: [], delimiterLabel, ignoredColumns: [], error: "That file is empty." };
  }

  const iName = columnIndex(header, "name", "contact name", "full name");
  const iEmail = columnIndex(header, "email", "email address", "e-mail");
  const iPhone = columnIndex(header, "phone", "mobile", "telephone");
  const iBusiness = columnIndex(header, "business", "company", "company name");
  const iPosition = columnIndex(header, "position", "job title", "role");
  const iWebsite = columnIndex(header, "website", "url");
  const iLinked = columnIndex(header, "linkedin", "linkedin_user_profile", "linkedin profile");
  const iType = columnIndex(header, "sponsorship type", "sponsorship_type", "package");
  const iCode = columnIndex(header, "sponsor type", "sponsor_type");
  const iStatus = columnIndex(header, "status");
  const iApproved = columnIndex(header, "approved", "is_approved");
  const iFeatured = columnIndex(header, "featured");
  const iHome = columnIndex(header, "enable banner", "enable_home_page", "home page");
  const iShowHome = columnIndex(header, "show home", "show_home");
  const iShowBanner = columnIndex(header, "show banner", "show_banner");
  const iExchange = columnIndex(header, "exchange amount", "exchange_amount");

  if (iName === -1) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns: [],
      error:
        `Needs a "Name" column. Read the file as ${delimiterLabel}; columns came out as: ` +
        `${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const ignoredColumns = header.filter((h) =>
    ["id", "amount", "tp", "total payable", "franchise", "batch number", "date"].includes(h),
  );
  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const rows = table
    .map((r) => ({
      name: cell(r, iName),
      email: cell(r, iEmail),
      phone: cell(r, iPhone),
      business: cell(r, iBusiness),
      position: cell(r, iPosition),
      website: cell(r, iWebsite),
      linkedin_user_profile: cell(r, iLinked),
      sponsorship_type: cell(r, iType),
      sponsor_type: cell(r, iCode),
      status: cell(r, iStatus),
      is_approved: cell(r, iApproved),
      featured: cell(r, iFeatured),
      enable_home_page: cell(r, iHome),
      show_home: cell(r, iShowHome),
      show_banner: cell(r, iShowBanner),
      exchange_amount: cell(r, iExchange),
    }))
    .filter((r) => r.name !== "" || r.email !== "");

  if (rows.length === 0) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns,
      error: "That file has a header but no usable data rows.",
    };
  }
  return { rows, delimiterLabel, ignoredColumns };
}

interface SponsorImportSummary {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

function ImportSponsorsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedSponsorCsv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SponsorImportSummary | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setFileName(file.name);
    const result = mapSponsorCsv(await file.text());
    setParsed(result);
    if (result.error) setError(result.error);
  }

  async function runImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/sponsors-admin/import", { rows: parsed.rows });
      setSummary(data as SponsorImportSummary);
      onImported();
    } catch (err) {
      setError(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not import this file.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Import Sponsors from CSV</h3>
                <p className="text-xs text-zinc-400">
                  Same columns as Export CSV. Existing emails are skipped, never overwritten.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 pt-5">
            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {summary ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Imported <strong>{summary.created}</strong>{" "}
                    {summary.created === 1 ? "sponsor" : "sponsors"}.
                    {summary.skipped > 0 && <> {summary.skipped} already existed and were left alone.</>}
                  </span>
                </p>

                {summary.invalid.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                    <p className="mb-1 font-bold uppercase tracking-wider">
                      {summary.invalid.length} row(s) rejected
                    </p>
                    <ul className="space-y-0.5">
                      {summary.invalid.slice(0, 6).map((row) => (
                        <li key={row.row}>
                          Row {row.row}: {row.name} — {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.skippedEmails.length > 0 && (
                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold text-zinc-300">
                      {summary.skippedEmails.length} skipped as duplicates
                    </summary>
                    <p className="mt-2 leading-relaxed">{summary.skippedEmails.join(", ")}</p>
                  </details>
                )}
              </div>
            ) : (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 text-center transition hover:border-brand-pink/40 hover:bg-white/[0.04]">
                  <Upload className="h-6 w-6 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-200">{fileName || "Choose a CSV file"}</span>
                  <span className="text-[11px] text-zinc-500">
                    Needs a Name column. Comma, tab, semicolon or pipe separated.
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>

                {parsed && !parsed.error && (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-300">
                      <strong className="text-white">{parsed.rows.length}</strong> row
                      {parsed.rows.length === 1 ? "" : "s"} ready to import{" "}
                      <span className="text-zinc-500">({parsed.delimiterLabel})</span>.
                    </p>
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                      Rows are created through the same code path as Add Sponsor, so a large file
                      takes a few moments. Amount, TP and Franchise come from linked records and are
                      ignored if present.
                    </p>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row, i) => (
                            <tr key={`${row.email}-${i}`} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">{row.name || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.email || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.business || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsed.rows.length > 50 && (
                      <p className="text-[11px] text-zinc-500">
                        Showing the first 50 — all {parsed.rows.length} will be imported.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {summary ? "Done" : "Cancel"}
            </button>
            {!summary && (
              <button
                type="button"
                onClick={runImport}
                disabled={busy || !parsed?.rows.length}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Import
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/* ============================================================================
   List
   ========================================================================== */

interface EmailTemplateOption {
  id: string;
  label: string;
}

export function SponsorsAdminManager({
  sponsors,
  stats: initialStats,
}: {
  sponsors: SponsorAdminRow[];
  stats: SponsorStats;
}) {
  const router = useRouter();
  const [stats, setStats] = useState<SponsorStats>(initialStats);
  const [modalSponsor, setModalSponsor] = useState<SponsorAdminRow | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [mailPending, setMailPending] = useState(false);
  const [actionValue, setActionValue] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

  useEffect(() => setStats(initialStats), [initialStats]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/members/sponsors-admin/email-templates")
      .then(({ data }) => {
        if (!cancelled) setTemplates(data.templates ?? []);
      })
      .catch(() => {
        /* the dropdown simply stays empty and disabled */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return sponsors.filter((s) => {
      if (activeFilter === "featured" && !s.featured) return false;
      if (activeFilter && activeFilter !== "featured" && s.status !== activeFilter) return false;
      if (!q) return true;
      return [s.name, s.email, s.business, s.phone, s.status, s.sponsorType, s.sponsorshipTypeName, s.franchiseName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [sponsors, keyword, activeFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, activeFilter]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // Selection is by id and survives paging and filtering, so a bulk action applies to everything
  // the organiser ticked — not just what happens to be on screen when they press the button.
  const pageIds = paged.map((s) => s.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function refreshStats() {
    try {
      const { data } = await axios.get("/api/members/sponsors-admin/stats");
      if (data?.stats) setStats(data.stats);
    } catch {
      /* the badges keep their last known values */
    }
  }

  function refreshAll() {
    router.refresh();
    refreshStats();
  }

  /** Exports every row that matches the current search and filter — not just the visible page. */
  function exportCsv(onlySelected: boolean) {
    const source = onlySelected ? sponsors.filter((s) => selected.has(s.id)) : filtered;
    downloadCsv(
      "event-sponsors.csv",
      [
        "Name", "Email", "Phone", "Business", "Position", "Website", "LinkedIn",
        "Sponsorship Type", "Sponsor Type", "Franchise", "Status", "Approved",
        "Amount", "TP", "Exchange Amount", "Featured", "Enable Banner", "Show Home",
        "Show Banner", "Batch Number",
      ],
      source.map((s) => [
        s.name,
        s.email ?? "",
        s.phone ?? "",
        s.business ?? "",
        s.position ?? "",
        s.website ?? "",
        s.linkedinUserProfile ?? "",
        s.sponsorshipTypeName ?? s.sponsorshipType ?? "",
        s.sponsorType ?? "",
        s.franchiseName ?? "",
        s.status ?? "",
        s.isApproved ? "Yes" : "No",
        s.amount ?? "",
        s.totalPayable ?? "",
        s.exchangeAmount ?? "",
        s.featured ? "Yes" : "No",
        s.enableHomePage ? "Yes" : "No",
        s.showHome ? "Yes" : "No",
        s.showBanner ? "Yes" : "No",
        s.batchNumber ?? "",
      ]),
    );
  }

  async function sendMail() {
    if (!templateId || selected.size === 0) return;
    setMailPending(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      const { data } = await axios.post("/api/members/sponsors-admin/send-mail", {
        ids: [...selected],
        templateId,
      });
      // Reported honestly: "smtp_not_configured" is indistinguishable from success unless the
      // failure count and reason are surfaced.
      if (data.sent > 0 && data.failed === 0) {
        setNotice(`Sent to ${data.sent} sponsor${data.sent === 1 ? "" : "s"}.`);
      } else if (data.sent > 0) {
        setNotice(`Sent to ${data.sent}; ${data.failed} failed (${data.reason ?? "unknown"}).`);
      } else {
        setErrorMessage(`Nothing was sent — ${data.reason ?? "unknown reason"}.`);
      }
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not send this mail.",
      );
    } finally {
      setMailPending(false);
    }
  }

  /**
   * The "Select an Action" dropdown.
   *
   * Limited to what this app can actually carry out: the five status changes, the six on/off
   * flags, an export and a bulk delete. The legacy list also offers "Add To Exhibitor / Speaker /
   * Judges", pass downloads, consent PDFs and previous-event imports; those need service code that
   * does not exist here yet, and a menu entry that silently does nothing is worse than one that is
   * absent.
   */
  async function runAction() {
    if (!actionValue) return;
    if (actionValue === "export_selected") {
      exportCsv(true);
      return;
    }
    if (selected.size === 0) return;
    if (actionValue === "bulk_delete") {
      await bulkDelete();
      return;
    }

    setBulkPending(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      if (actionValue.startsWith("flag:")) {
        const [, flag, onOff] = actionValue.split(":");
        await axios.post("/api/members/sponsors-admin/bulk-flag", {
          ids: [...selected],
          flag,
          value: onOff === "on",
        });
      } else {
        await axios.post("/api/members/sponsors-admin/bulk-status", {
          ids: [...selected],
          status: actionValue,
        });
      }
      setNotice(`Updated ${selected.size} sponsor${selected.size === 1 ? "" : "s"}.`);
      refreshAll();
    } catch {
      setErrorMessage("Could not apply that action.");
    } finally {
      setBulkPending(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected sponsor${selected.size === 1 ? "" : "s"}? This cannot be undone.`))
      return;
    setBulkPending(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/members/sponsors-admin/bulk-delete", { ids: [...selected] });
      setSelected(new Set());
      refreshAll();
    } catch {
      setErrorMessage("Could not delete the selected sponsors. Please try again.");
    } finally {
      setBulkPending(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this sponsor? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/sponsors-admin/${id}`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      refreshAll();
    } catch {
      setErrorMessage("Could not remove this sponsor. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setModalSponsor(null);
    refreshAll();
  }

  function handleBadgeClick(filter: string | undefined) {
    if (filter === undefined) return;
    setActiveFilter((current) => (current === filter ? undefined : filter));
  }

  return (
    <div className="space-y-8">
      {/* Header badges — the four coloured tiles from the legacy page plus three filterable counts. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {BADGES.map((b) => {
          const isActive = b.typeFilter !== undefined && activeFilter === b.typeFilter;
          const clickable = b.typeFilter !== undefined;
          return (
            <button
              key={b.label}
              onClick={() => handleBadgeClick(b.typeFilter)}
              disabled={!clickable}
              title={clickable ? undefined : "Sponsorship slots from Setup Sponsorship — not a row filter"}
              className={`rounded-2xl border bg-gradient-to-br p-4 text-left transition-all ${b.color} ${
                clickable ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default opacity-90"
              } ${isActive ? "scale-105 shadow-lg ring-2 ring-brand-pink" : ""}`}
            >
              <div className="mb-1 text-[9px] font-black uppercase tracking-widest opacity-80">{b.label}</div>
              <div className="text-2xl font-black">{stats[b.key]}</div>
            </button>
          );
        })}
      </div>

      <div className="glass-panel space-y-6 rounded-3xl border-white/10 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {SPONSOR_BULK_STATUS_ACTIONS.map((status) => {
              const isActive = activeFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => handleBadgeClick(status)}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isActive
                      ? "border-violet-400 bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                      : "border-violet-400/40 bg-violet-500/15 text-violet-200 hover:border-violet-400 hover:bg-violet-500 hover:text-white"
                  }`}
                >
                  {SPONSOR_STATUS_LABEL[status] ?? status}
                </button>
              );
            })}
            {activeFilter && (
              <button
                onClick={() => setActiveFilter(undefined)}
                className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/members/event_sponsorship_setup"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Setup Sponsorship
            </a>
            <button
              onClick={() => exportCsv(false)}
              disabled={filtered.length === 0}
              title="Exports every sponsor matching the current search and filter"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => setModalSponsor("new")}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-pink px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Sponsor
            </button>
          </div>
        </div>

        {/* Email template + Action bar — the two dropdowns from view_sponsor_list.tpl, each with
            its own submit button rather than one shared "go". */}
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="sponsor-mail-template">
              Select an email template
            </label>
            <select
              id="sponsor-mail-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={templates.length === 0}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink disabled:opacity-40"
            >
              <option value="">
                {templates.length === 0 ? "No email templates available" : "Select an Email Template"}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={sendMail}
              disabled={!templateId || selected.size === 0 || mailPending}
              title={selected.size === 0 ? "Tick one or more sponsors below first" : undefined}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {mailPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send Mail
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="sponsor-action">
              Select an action
            </label>
            <select
              id="sponsor-action"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            >
              <option value="">Select an Action</option>
              <optgroup label="Export">
                <option value="export_selected">Export Selected to CSV</option>
              </optgroup>
              <optgroup label="Set status">
                {SPONSOR_BULK_STATUS_ACTIONS.map((status) => (
                  <option key={status} value={status}>
                    {SPONSOR_STATUS_LABEL[status] ?? status}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Promotion">
                <option value="flag:featured:on">Mark as Featured</option>
                <option value="flag:featured:off">Remove Featured</option>
                <option value="flag:enable_home_page:on">Enable Home Page Banner</option>
                <option value="flag:enable_home_page:off">Disable Home Page Banner</option>
                <option value="flag:show_banner:on">Show on Rolling Banners</option>
                <option value="flag:show_banner:off">Hide from Rolling Banners</option>
                <option value="flag:show_home:on">Show in Home Page Footer</option>
                <option value="flag:show_home:off">Hide from Home Page Footer</option>
                <option value="flag:activate_sponsor:on">Enable Sponsorship</option>
                <option value="flag:activate_sponsor:off">Disable Sponsorship</option>
                <option value="flag:sold_out_sponsor:on">Mark Sold Out</option>
                <option value="flag:sold_out_sponsor:off">Clear Sold Out</option>
              </optgroup>
              <optgroup label="Danger">
                <option value="bulk_delete">Delete Selected</option>
              </optgroup>
            </select>
            <button
              type="button"
              onClick={runAction}
              disabled={!actionValue || bulkPending || (actionValue !== "export_selected" && selected.size === 0)}
              title={selected.size === 0 ? "Tick one or more sponsors below first" : undefined}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {bulkPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit
            </button>
          </div>

          <p className="text-[11px] font-medium text-zinc-500 lg:col-span-2">
            {selected.size === 0
              ? "Tick rows in the table below to choose who these apply to."
              : `${selected.size} sponsor${selected.size === 1 ? "" : "s"} selected.`}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-500 animate-in fade-in">
            {errorMessage}
          </div>
        )}
        {notice && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 animate-in fade-in">
            {notice}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
          <Search className="h-5 w-5 shrink-0 text-brand-pink" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search name, email, business, phone, package or franchise…"
            className="w-full bg-transparent text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={togglePage}
                    aria-label="Select all sponsors on this page"
                    className="h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
                  />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Franchise</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Sponsor Type</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">TP</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Enable Banner</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    <p className="font-medium italic text-zinc-500">
                      {sponsors.length === 0
                        ? "No sponsors have been added yet."
                        : "No sponsors match your search."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((sponsor) => (
                  <tr key={sponsor.id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(sponsor.id)}
                        onChange={() => toggleRow(sponsor.id)}
                        aria-label={`Select ${sponsor.name}`}
                        className="h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {sponsor.sponsorImg && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sponsor.sponsorImg}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-bold text-zinc-200">{sponsor.name || "—"}</div>
                          <div className="truncate text-[11px] font-medium text-zinc-500">
                            {sponsor.email || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{sponsor.phone || "—"}</td>
                    <td className="px-4 py-4 font-bold text-zinc-300">{sponsor.business || "—"}</td>
                    <td className="px-4 py-4 text-zinc-400">{sponsor.franchiseName || "—"}</td>
                    <td className="px-4 py-4">
                      {sponsor.sponsorType || sponsor.sponsorshipTypeName ? (
                        <span
                          title={sponsor.sponsorshipTypeName ?? undefined}
                          className="inline-flex rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-purple"
                        >
                          {sponsor.sponsorType || sponsor.sponsorshipTypeName}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-lg ${
                          STATUS_BADGE[sponsor.status ?? ""] || "border border-white/10 bg-white/5 text-zinc-500"
                        }`}
                      >
                        {SPONSOR_STATUS_LABEL[sponsor.status ?? ""] ?? sponsor.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-zinc-300">
                      {sponsor.amount === null ? "—" : money(sponsor.amount)}
                    </td>
                    <td className="px-4 py-4 text-right text-zinc-400">
                      {sponsor.totalPayable === null ? "—" : money(sponsor.totalPayable)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {sponsor.enableHomePage && <Home className="h-4 w-4 text-brand-purple" aria-label="Home page banner" />}
                        {sponsor.featured && <Star className="h-4 w-4 fill-brand-pink/20 text-brand-pink" aria-label="Featured" />}
                        {!sponsor.enableHomePage && !sponsor.featured && <span className="text-zinc-600">0</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setModalSponsor(sponsor)}
                          aria-label={`Edit ${sponsor.name}`}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-zinc-400 shadow-xl transition-all hover:bg-brand-purple hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          disabled={pendingId === sponsor.id}
                          onClick={() => remove(sponsor.id)}
                          aria-label={`Delete ${sponsor.name}`}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-zinc-400 shadow-xl transition-all hover:bg-red-500 hover:text-white disabled:opacity-20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />

        <p className="border-t border-white/5 pt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Showing {filtered.length} of {sponsors.length} total sponsors
        </p>
      </div>

      {modalSponsor && (
        <SponsorFormModal
          defaultValues={
            modalSponsor === "new"
              ? undefined
              : {
                  id: modalSponsor.id,
                  listing_id: modalSponsor.listingId ?? "",
                  name: modalSponsor.name,
                  position: modalSponsor.position ?? "",
                  phone: modalSponsor.phone ?? "",
                  email: modalSponsor.email ?? "",
                  business: modalSponsor.business ?? "",
                  website: modalSponsor.website ?? "",
                  linkedin_user_profile: modalSponsor.linkedinUserProfile ?? "",
                  sponsorship_type: modalSponsor.sponsorshipType ?? "",
                  sponsor_type: modalSponsor.sponsorType ?? "",
                  sponsorship_category_id: modalSponsor.sponsorshipCategoryId ?? "",
                  order_id: modalSponsor.orderId ?? "",
                  exchange_services: modalSponsor.exchangeServices,
                  exchange_amount: modalSponsor.exchangeAmount ?? "",
                  discount: modalSponsor.discount ?? "",
                  charitable_amount: modalSponsor.charitableAmount ?? "",
                  activate_sponsor: modalSponsor.activateSponsor,
                  enable_home_page: modalSponsor.enableHomePage,
                  enable_event_banner: modalSponsor.enableEventBanner,
                  enable_display_advert: modalSponsor.enableDisplayAdvert,
                  excluded_from_advertise: modalSponsor.excludedFromAdvertise,
                  featured: modalSponsor.featured,
                  sold_out_sponsor: modalSponsor.soldOutSponsor,
                  show_home: modalSponsor.showHome,
                  show_banner: modalSponsor.showBanner,
                  white_background_image: modalSponsor.whiteBackgroundImage,
                  status: (modalSponsor.status as (typeof SPONSOR_STATUSES)[number]) ?? "pending",
                  is_approved: modalSponsor.isApproved,
                  current_order_id: modalSponsor.orderId,
                  sponsor_img_url: modalSponsor.sponsorImg,
                  advert_banner_url: modalSponsor.advertBanner,
                  amount: modalSponsor.amount,
                }
          }
          onClose={() => setModalSponsor(null)}
          onSaved={handleSaved}
        />
      )}

      {importOpen && (
        <ImportSponsorsModal onClose={() => setImportOpen(false)} onImported={refreshAll} />
      )}
    </div>
  );
}
