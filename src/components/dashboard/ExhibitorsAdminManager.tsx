"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, Filter, ExternalLink, Store,
  Video, Star, CheckCircle, Clock,
  Download,
  Upload,
  FileSpreadsheet,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  eventExhibitorAdminSchema,
  exhibitorOrderSubtotal,
  EXHIBITOR_STATUSES,
  EXHIBITOR_BULK_STATUS_ACTIONS,
  type EventExhibitorAdminInput,
} from "@/lib/validations/eventExhibitorAdmin";
import type { ExhibitorAdminRow, ExhibitorStats } from "@/lib/services/eventExhibitorAdmin";
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
  Interested: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  Reserved: "bg-brand-purple/10 text-brand-purple border border-brand-purple/20",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "Not Interested": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  "Unable to attend": "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  "Call Back": "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  "No Answer": "bg-red-500/10 text-red-300 border border-red-500/20",
  "Invalid Number": "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  "Voice Mail": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  "Meeting Scheduled": "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  excluded: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const BULK_ACTION_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  Interested: "Interested",
  Reserved: "Reserved",
  "Not Interested": "No Interest",
  "Unable to attend": "Unable",
  "Call Back": "Call Back",
  "No Answer": "No Answer",
  "Invalid Number": "Invalid #",
  "Voice Mail": "Voice Mail",
  "Meeting Scheduled": "Scheduled",
  excluded: "Exclude",
};

interface BadgeDef {
  label: string;
  key: keyof ExhibitorStats;
  typeFilter?: string;
  color: string;
}

const BADGES: BadgeDef[] = [
  { label: "Registered Exh.", key: "registered", typeFilter: "active", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20" },
  { label: "Interested", key: "interested", typeFilter: "Interested", color: "from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20" },
  { label: "Reserved", key: "reserved", typeFilter: "Reserved", color: "from-brand-purple/20 to-brand-purple/5 text-brand-purple border-brand-purple/20" },
  { label: "Pending", key: "pending", typeFilter: "pending", color: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20" },
  { label: "Not Interested", key: "notInterested", typeFilter: "Not Interested", color: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20" },
  { label: "Total Exhibitors", key: "total", typeFilter: undefined, color: "from-white/10 to-white/5 text-white border-white/20" },
  { label: "Joined Accounts", key: "joinedAccounts", typeFilter: "joined_account", color: "from-teal-500/20 to-teal-500/5 text-teal-400 border-teal-500/20" },
  { label: "Pending Accounts", key: "pendingAccounts", typeFilter: "pending_account", color: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20" },
  { label: "No Order", key: "noOrder", typeFilter: "no_order", color: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20" },
  { label: "Unallocated", key: "noStandSize", typeFilter: "unallocated", color: "from-orange-500/20 to-orange-500/5 text-orange-400 border-orange-500/20" },
  { label: "No Stand #", key: "noStandNumber", typeFilter: "no_stand_num", color: "from-pink-500/20 to-pink-500/5 text-pink-400 border-pink-500/20" },
  { label: "No Price", key: "noStandPrice", typeFilter: "no_stand_price", color: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20" },
  { label: "Uncontacted", key: "uncontacted", typeFilter: "uncontacted", color: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20" },
];

interface FormDefaults extends Partial<EventExhibitorAdminInput> {
  id?: number;
  /** The order already attached to this exhibitor — kept selectable while editing. */
  order_id?: number | null;
  profile_pic_url?: string | null;
  logo_url?: string | null;
  stand_logo_url?: string | null;
}

interface ExhibitorOption {
  id: number;
  label: string;
  /** Present on booth options: the booth is already allocated, so it is not offered. */
  disabled?: boolean;
}

interface ExhibitorFormOptions {
  businesses: ExhibitorOption[];
  standSizes: ExhibitorOption[];
  exhibitionZones: ExhibitorOption[];
  standLayouts: ExhibitorOption[];
  availableStandSizes: ExhibitorOption[];
}

const EMPTY_OPTIONS: ExhibitorFormOptions = {
  businesses: [],
  standSizes: [],
  exhibitionZones: [],
  standLayouts: [],
  availableStandSizes: [],
};

type ExhibitorFormTab = "general" | "stand" | "digital" | "media" | "preferences";

const FORM_TABS: { key: ExhibitorFormTab; label: string }[] = [
  { key: "general", label: "Contact & Role" },
  { key: "stand", label: "Trade Stand" },
  { key: "digital", label: "Booth & Socials" },
  { key: "media", label: "Images" },
  { key: "preferences", label: "Preferences & Promo" },
];

const IMAGE_FIELDS = [
  { field: "profile_pic", label: "Profile Image", hint: "Head-and-shoulders shot of the stand contact." },
  { field: "logo", label: "Website Logo", hint: "Shown in the exhibitor directory and listings." },
  { field: "stand_logo", label: "Stand Logo", hint: "Rendered on the virtual stand in the lobby." },
] as const;

type ImageField = (typeof IMAGE_FIELDS)[number]["field"];

const SELECT_PLACEHOLDER = "— Select an option —";

/**
 * A <select> that never silently drops a value it does not recognise.
 *
 * The reference lists (stand sizes, zones, layouts, colours) are event-scoped and can change after
 * an exhibitor was allocated — a ticket gets renamed, a zone is disabled, a row was imported with a
 * raw value. Rendering a plain <select> in that situation shows the FIRST option as if it were the
 * saved one, and the next save writes that wrong value to the database without anybody touching the
 * field. Appending the current value as an explicit "(current)" option keeps the real state visible
 * and round-trips it unchanged.
 */
function OptionSelect({
  value,
  options,
  disabled,
  placeholder = SELECT_PLACEHOLDER,
  onChange,
}: {
  value: string;
  options: ExhibitorOption[];
  disabled?: boolean;
  placeholder?: string;
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
        // `disabled` keeps an already-allocated booth visible in its numbered position instead of
        // being dropped from the list, which is what made 1..22 look like it had gaps.
        <option key={o.id} value={o.id} disabled={o.disabled} className="bg-zinc-900">
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

function money(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Add / Edit Trade Stand — the port of members/view_exhibitor.php's `action=add|edit` form.
 *
 * Beyond the plain fields, three behaviours carry over from the legacy page because the data is
 * wrong without them:
 *
 *  1. Exhibition Zone -> Virtual Booth Number -> Stand Number. Picking a zone reloads the list of
 *     FREE booths in it; picking a booth fills the read-only Stand Number from that booth's
 *     stand_no. The server re-derives the same value on save (resolveStandNumber) so the two can
 *     never disagree.
 *  2. Exhibitor Stand Layout -> Stand Color. Colours belong to the layout's parent template, so the
 *     colour list has to be refetched whenever the layout changes — and the stale colour cleared,
 *     since a colour from the previous template renders nothing.
 *  3. Total Amount = stand price - exchange - discount - charitable. Read-only and recomputed live;
 *     it is a display field, never stored (find_event_exhibitor has no such column).
 *
 * The three images upload AFTER the row is saved, because the file is named after the exhibitor's
 * id — which does not exist yet when adding.
 */
function ExhibitorFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ExhibitorFormTab>("general");
  const isEdit = typeof defaultValues?.id === "number";

  // This modal is triggered from inside ancestors that have a CSS `animation`
  // (.section-transition on the members layout) and a `backdrop-filter` (.glass-panel) — both
  // create a new containing block for `position: fixed`, which pins the overlay inside that
  // ancestor's box instead of the viewport (it renders far down the page, requiring a scroll to
  // find it, instead of centering on screen). Portaling straight to document.body sidesteps that
  // entirely — same fix already used by CopyEventModal.tsx for the identical symptom. `document`
  // isn't available during SSR, so only portal once mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [options, setOptions] = useState<ExhibitorFormOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [spots, setSpots] = useState<ExhibitorOption[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [colors, setColors] = useState<ExhibitorOption[]>([]);
  const [colorsLoading, setColorsLoading] = useState(false);

  const [files, setFiles] = useState<Partial<Record<ImageField, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<ImageField, string>>>({});
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventExhibitorAdminInput>({
    resolver: zodResolver(eventExhibitorAdminSchema) as any,
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      work_phone: defaultValues?.work_phone ?? "",
      business: defaultValues?.business ?? "",
      position: defaultValues?.position ?? "",
      website: defaultValues?.website ?? "",
      linkedin_user_profile: defaultValues?.linkedin_user_profile ?? "",
      facebook: defaultValues?.facebook ?? "",
      twitter: defaultValues?.twitter ?? "",
      instagram: defaultValues?.instagram ?? "",
      whatsapp_no: defaultValues?.whatsapp_no ?? "",
      zoom: defaultValues?.zoom ?? "",
      calendly: defaultValues?.calendly ?? "",
      youtube: defaultValues?.youtube ?? "",
      about_us: defaultValues?.about_us ?? "",
      stand_number: defaultValues?.stand_number ?? "",
      stand_size: defaultValues?.stand_size ?? "",
      stand_price: defaultValues?.stand_price ?? "",
      discount: defaultValues?.discount ?? "",
      charitable_amount: defaultValues?.charitable_amount ?? "",
      exchange_amount: defaultValues?.exchange_amount ?? "",
      exchange_services: defaultValues?.exchange_services ?? false,
      featured: defaultValues?.featured ?? false,
      member_company_profile: defaultValues?.member_company_profile ?? false,
      excluded_from_advertise: defaultValues?.excluded_from_advertise ?? false,
      enable_video_calling: defaultValues?.enable_video_calling ?? false,
      video_calling_software_provider: defaultValues?.video_calling_software_provider ?? "",
      video_call_url: defaultValues?.video_call_url ?? "",
      special_instructions: defaultValues?.special_instructions ?? "",
      referral_code: defaultValues?.referral_code ?? "",
      referral_mstr_id: defaultValues?.referral_mstr_id ?? "",
      referrer_from: defaultValues?.referrer_from ?? "",
      keynote_speech_topic: defaultValues?.keynote_speech_topic ?? "",
      is_webinars: defaultValues?.is_webinars ?? false,
      is_workshops: defaultValues?.is_workshops ?? false,
      is_business_presentation: defaultValues?.is_business_presentation ?? false,
      is_e_magazine: defaultValues?.is_e_magazine ?? false,
      is_newsletter: defaultValues?.is_newsletter ?? false,
      visitor_notification_mail: defaultValues?.visitor_notification_mail ?? true,
      listing_id: defaultValues?.listing_id ?? "",
      available_stand_size: defaultValues?.available_stand_size ?? "",
      exhibition_zone_id: defaultValues?.exhibition_zone_id ?? "",
      spot_id: defaultValues?.spot_id ?? "",
      ex_stand_layout_id: defaultValues?.ex_stand_layout_id ?? "",
      stand_color_id: defaultValues?.stand_color_id ?? "",
      include_column_listing: defaultValues?.include_column_listing ?? false,
      include_logo_listing: defaultValues?.include_logo_listing ?? false,
      status: defaultValues?.status ?? "pending",
    },
  });

  const isVideoCalling = watch("enable_video_calling");
  const isExchange = watch("exchange_services");

  const listingId = String(watch("listing_id") ?? "");
  const availableStandSize = String(watch("available_stand_size") ?? "");
  const standSize = String(watch("stand_size") ?? "");
  const zoneId = String(watch("exhibition_zone_id") ?? "");
  const spotId = String(watch("spot_id") ?? "");
  const standLayoutId = String(watch("ex_stand_layout_id") ?? "");
  const standColorId = String(watch("stand_color_id") ?? "");
  const standNumber = String(watch("stand_number") ?? "");

  const orderSubtotal = exhibitorOrderSubtotal({
    stand_price: watch("stand_price"),
    discount: watch("discount"),
    exchange_amount: watch("exchange_amount"),
    charitable_amount: watch("charitable_amount"),
  });

  /* ---------------------------- reference data ---------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const query = defaultValues?.order_id ? `?order_id=${defaultValues.order_id}` : "";
        const res = await axios.get(`/api/members/exhibitors-admin/form-options${query}`);
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
    // Reference data depends only on which exhibitor is open, which never changes for a mounted modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zone -> free booths. Cleared, not left stale, when the zone is unset: a booth id from another
  // zone would be saved against the new zone and point at nothing.
  useEffect(() => {
    let cancelled = false;
    if (!zoneId) {
      setSpots([]);
      return;
    }
    (async () => {
      setSpotsLoading(true);
      try {
        const exclude = defaultValues?.id ? `&exclude=${defaultValues.id}` : "";
        const res = await axios.get(`/api/members/exhibitors-admin/spots?zone_id=${zoneId}${exclude}`);
        if (!cancelled) setSpots(res.data?.spots ?? []);
      } catch {
        if (!cancelled) setSpots([]);
      } finally {
        if (!cancelled) setSpotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  /**
   * Auto-allocate the booth. The organiser picks a zone; the next free booth in that zone is
   * assigned for them, so there is no 22-item list to scroll and no way to land on a number that
   * is already gone.
   *
   * Only fires when the currently-held booth is not one of THIS zone's booths — editing an
   * exhibitor must never shuffle them off the booth they already stand on (their own booth comes
   * back from the API as free, via `exclude`).
   */
  useEffect(() => {
    if (!zoneId || spotsLoading || spots.length === 0) return;
    if (spots.some((s) => String(s.id) === spotId)) return;

    const nextFree = spots.find((s) => !s.disabled);
    setValue("spot_id", nextFree ? String(nextFree.id) : "");
    setValue("stand_number", nextFree ? nextFree.label : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, spots, spotsLoading]);

  /** Booths in this zone nobody holds — drives the "x of 22 free" readout. */
  const freeBoothCount = spots.filter((s) => !s.disabled).length;
  /** The booth number to display. Falls back to the saved stand_number while the zone loads. */
  const assignedBoothLabel =
    spots.find((s) => String(s.id) === spotId)?.label ?? String(watch("stand_number") ?? "");

  // Stand layout -> colours from that layout's parent template.
  useEffect(() => {
    let cancelled = false;
    if (!standLayoutId) {
      setColors([]);
      return;
    }
    (async () => {
      setColorsLoading(true);
      try {
        const res = await axios.get(`/api/members/exhibitors-admin/stand-colors?layout_id=${standLayoutId}`);
        if (!cancelled) setColors(res.data?.colors ?? []);
      } catch {
        if (!cancelled) setColors([]);
      } finally {
        if (!cancelled) setColorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standLayoutId]);

  /* ------------------------------- handlers ------------------------------- */

  function handleZoneChange(next: string) {
    setValue("exhibition_zone_id", next);
    // The booth and the stand number both belong to the old zone — keeping either would allocate
    // this exhibitor to a booth that is not in the zone the record now claims.
    setValue("spot_id", "");
    setValue("stand_number", "");
  }

  function handleLayoutChange(next: string) {
    setValue("ex_stand_layout_id", next);
    // Colours are per parent template; one from the previous layout renders nothing.
    setValue("stand_color_id", "");
  }

  function handleBusinessChange(next: string) {
    setValue("listing_id", next);
    // Legacy prefills the Business text field from the chosen listing; only do so while it is
    // still empty, so a hand-typed trading name is never overwritten.
    const chosen = options.businesses.find((b) => String(b.id) === next);
    if (chosen && !String(watch("business") ?? "").trim()) setValue("business", chosen.label);
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

  async function uploadImages(exhibitorId: number): Promise<string | null> {
    const pending = IMAGE_FIELDS.map((f) => f.field).filter((f) => files[f]);
    if (pending.length === 0) return null;

    setUploading(true);
    const failed: string[] = [];
    try {
      for (const field of pending) {
        const body = new FormData();
        body.append("file", files[field]!);
        body.append("id", String(exhibitorId));
        body.append("field", field);
        try {
          await axios.post("/api/members/exhibitors-admin/upload", body);
        } catch {
          failed.push(IMAGE_FIELDS.find((f) => f.field === field)!.label);
        }
      }
    } finally {
      setUploading(false);
    }

    // The exhibitor itself saved fine — say which images did not, rather than failing the whole save.
    return failed.length > 0
      ? `Saved, but these images could not be uploaded: ${failed.join(", ")}.`
      : null;
  }

  async function onSubmit(data: EventExhibitorAdminInput) {
    setErrorMessage(null);
    try {
      let exhibitorId = defaultValues?.id;
      if (isEdit) {
        await axios.patch(`/api/members/exhibitors-admin/${exhibitorId}`, data);
      } else {
        const res = await axios.post("/api/members/exhibitors-admin", data);
        exhibitorId = res.data?.id;
      }

      if (exhibitorId) {
        const uploadError = await uploadImages(exhibitorId);
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
          : "Could not save this exhibitor. Please check the form and try again."
      );
    }
  }

  if (!mounted) return null;

  const busy = isSubmitting || uploading;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">{isEdit ? "Edit Trade Stand" : "Add Trade Stand"}</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Exhibitor, Stand Allocation & Company Setup</p>
          </div>
          <button onClick={onClose} className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
          {FORM_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 shrink-0 ${
                activeTab === tab.key ? "border-brand-pink text-brand-pink" : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {activeTab === "general" && (
            <div className="space-y-4">
              {!isEdit && (
                <div className="space-y-2">
                  <FieldLabel>Exhibitor (Your Business Listing)</FieldLabel>
                  <OptionSelect
                    value={listingId}
                    options={options.businesses}
                    disabled={optionsLoading}
                    placeholder={optionsLoading ? "Loading businesses…" : "— Select Business —"}
                    onChange={handleBusinessChange}
                  />
                  <p className="text-[10px] font-semibold text-zinc-600">
                    Links this trade stand to one of your listings. Leave blank for a stand booked by an outside company.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>First Name*</FieldLabel>
                  <input {...register("first_name")} className={FIELD_CLASS} placeholder="e.g. Sarah" />
                  {errors.first_name && <p className="mt-1 text-xs font-bold text-red-500">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <FieldLabel>Last Name*</FieldLabel>
                  <input {...register("last_name")} className={FIELD_CLASS} placeholder="e.g. Miller" />
                  {errors.last_name && <p className="mt-1 text-xs font-bold text-red-500">{errors.last_name.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Official Email*</FieldLabel>
                <input {...register("email")} type="email" className={FIELD_CLASS} placeholder="email@company.com" />
                {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Mobile Phone</FieldLabel>
                  <input {...register("phone")} className={FIELD_CLASS} placeholder="+44..." />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Work Direct Line</FieldLabel>
                  <input {...register("work_phone")} className={FIELD_CLASS} placeholder="Direct extension..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Business / Organisation*</FieldLabel>
                  <input {...register("business")} className={FIELD_CLASS} placeholder="Company Name" />
                  {errors.business && <p className="mt-1 text-xs font-bold text-red-500">{errors.business.message}</p>}
                </div>
                <div className="space-y-2">
                  <FieldLabel>Position / Job Title</FieldLabel>
                  <input {...register("position")} className={FIELD_CLASS} placeholder="e.g. Managing Director" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Company Website</FieldLabel>
                  <input {...register("website")} className={FIELD_CLASS} placeholder="https://..." />
                  <p className="text-[10px] font-semibold text-zinc-600">Example: http://www.domain.com</p>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Exhibitor Lifecycle Status</FieldLabel>
                  <select {...register("status")} className={FIELD_CLASS}>
                    {EXHIBITOR_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stand" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Available Stand Size (Paid Order)</FieldLabel>
                  <OptionSelect
                    value={availableStandSize}
                    options={options.availableStandSizes}
                    disabled={optionsLoading}
                    placeholder={
                      optionsLoading
                        ? "Loading orders…"
                        : options.availableStandSizes.length === 0
                          ? "No unused stand orders"
                          : "— Select a purchased stand —"
                    }
                    onChange={(v) => setValue("available_stand_size", v)}
                  />
                  <p className="text-[10px] font-semibold text-zinc-600">Consumes a paid trade-stand order (PO) for this stand.</p>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Allocated Stand Size</FieldLabel>
                  <OptionSelect
                    value={standSize}
                    options={options.standSizes}
                    disabled={optionsLoading}
                    placeholder={
                      optionsLoading
                        ? "Loading stand sizes…"
                        : options.standSizes.length === 0
                          ? "No exhibitor tickets configured"
                          : "— Select Stand Size —"
                    }
                    onChange={(v) => setValue("stand_size", v)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Stand Allocation</p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Exhibition Zone</FieldLabel>
                    <OptionSelect
                      value={zoneId}
                      options={options.exhibitionZones}
                      disabled={optionsLoading}
                      placeholder={
                        optionsLoading
                          ? "Loading zones…"
                          : options.exhibitionZones.length === 0
                            ? "No zones set up"
                            : "— Select Exhibition Zone —"
                      }
                      onChange={handleZoneChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Virtual Booth Number</FieldLabel>
                    {/* Assigned, not chosen — the value is whatever the next free booth in the
                        selected zone is. `spot_id` rides along in a hidden input so the form still
                        submits exactly the field the server expects. */}
                    <input type="hidden" {...register("spot_id")} />
                    <input
                      readOnly
                      value={
                        spotsLoading
                          ? "Assigning…"
                          : assignedBoothLabel || ""
                      }
                      className={`${FIELD_CLASS} cursor-not-allowed opacity-70`}
                      placeholder={
                        !zoneId
                          ? "Choose a zone first"
                          : spots.length === 0
                            ? "No booths in this zone"
                            : "Zone is fully booked"
                      }
                    />
                    <p className="text-[10px] font-semibold text-zinc-600">
                      {zoneId && !spotsLoading && spots.length > 0
                        ? `Assigned automatically — ${freeBoothCount} of ${spots.length} booths free in this zone.`
                        : "Assigned automatically from the selected zone."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Stand Number</FieldLabel>
                    <input
                      {...register("stand_number")}
                      readOnly
                      className={`${FIELD_CLASS} cursor-not-allowed opacity-70`}
                      placeholder="Set by the booth"
                    />
                    <p className="text-[10px] font-semibold text-zinc-600">
                      {standNumber ? "Taken from the selected booth." : "Filled in automatically."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Exhibitor Stand Layout</FieldLabel>
                    <OptionSelect
                      value={standLayoutId}
                      options={options.standLayouts}
                      disabled={optionsLoading}
                      placeholder={
                        optionsLoading
                          ? "Loading layouts…"
                          : options.standLayouts.length === 0
                            ? "No stand layouts set up"
                            : "— Select Exhibition Stand Layout —"
                      }
                      onChange={handleLayoutChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Stand Color</FieldLabel>
                    <OptionSelect
                      value={standColorId}
                      options={colors}
                      disabled={!standLayoutId || colorsLoading}
                      placeholder={
                        !standLayoutId
                          ? "Choose a stand layout first"
                          : colorsLoading
                            ? "Loading colours…"
                            : colors.length === 0
                              ? "This layout has no colour options"
                              : "— Select an option —"
                      }
                      onChange={(v) => setValue("stand_color_id", v)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Pricing</p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <FieldLabel>Stand Price (£)</FieldLabel>
                    <input {...register("stand_price")} inputMode="decimal" className={FIELD_CLASS} placeholder="2500" />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Discount (£)</FieldLabel>
                    <input {...register("discount")} inputMode="decimal" className={FIELD_CLASS} placeholder="250" />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Charitable Amount (£)</FieldLabel>
                    <input {...register("charitable_amount")} inputMode="decimal" className={FIELD_CLASS} placeholder="0" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("exchange_services")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Exchange Services Agreed
                  </label>

                  {isExchange && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <FieldLabel>Exchange Amount (£)</FieldLabel>
                      <input {...register("exchange_amount")} inputMode="decimal" className={FIELD_CLASS} placeholder="500" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-brand-pink/20 bg-brand-pink/5 px-4 py-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Total Amount</span>
                  <span className="text-lg font-black text-white">{money(orderSubtotal)}</span>
                </div>
                <p className="text-[10px] font-semibold text-zinc-600">
                  Stand price less exchange, discount and charitable amount. Calculated for display — not stored.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("include_column_listing")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                  Include Column Listing
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("include_logo_listing")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                  Include Logo Listing
                </label>
              </div>

              <div className="space-y-2">
                <FieldLabel>Special Instructions / Admin Notes</FieldLabel>
                <textarea {...register("special_instructions")} rows={2} className={FIELD_CLASS} placeholder="Internal organiser remarks regarding this stand..." />
              </div>
            </div>
          )}

          {activeTab === "digital" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <FieldLabel>About Us / Exhibition Summary</FieldLabel>
                <textarea {...register("about_us")} rows={3} className={FIELD_CLASS} placeholder="Overview of services offered at booth..." />
              </div>

              <div className="space-y-3 pt-2">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("enable_video_calling")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                  Activate Video Calling
                </label>

                {isVideoCalling && (
                  <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <FieldLabel>Video Calling Software Provider</FieldLabel>
                      <input {...register("video_calling_software_provider")} className={FIELD_CLASS} placeholder="e.g. Daily, Zoom, Teams" />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Video Call URL</FieldLabel>
                      <input {...register("video_call_url")} className={FIELD_CLASS} placeholder="https://daily.co/..." />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Zoom URL</FieldLabel>
                  <input {...register("zoom")} className={FIELD_CLASS} placeholder="https://zoom.us/j/..." />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Calendly URL</FieldLabel>
                  <input {...register("calendly")} className={FIELD_CLASS} placeholder="https://calendly.com/..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Youtube URL</FieldLabel>
                  <input {...register("youtube")} className={FIELD_CLASS} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Linkedin User Profile Link</FieldLabel>
                  <input {...register("linkedin_user_profile")} className={FIELD_CLASS} placeholder="https://linkedin.com/in/..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>WhatsApp No.</FieldLabel>
                  <input {...register("whatsapp_no")} className={FIELD_CLASS} placeholder="+44..." />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Facebook Profile Link</FieldLabel>
                  <input {...register("facebook")} className={FIELD_CLASS} placeholder="http://facebook.com/..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Twitter Profile Link</FieldLabel>
                  <input {...register("twitter")} className={FIELD_CLASS} placeholder="http://twitter.com/..." />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Instagram Profile Link</FieldLabel>
                  <input {...register("instagram")} className={FIELD_CLASS} placeholder="http://instagram.com/..." />
                </div>
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="space-y-5">
              {!isEdit && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-[11px] font-bold text-amber-300">
                  Images are attached once the exhibitor is created — pick them now and they upload as soon as you save.
                </div>
              )}

              {IMAGE_FIELDS.map(({ field, label, hint }) => {
                const existing =
                  field === "profile_pic"
                    ? defaultValues?.profile_pic_url
                    : field === "logo"
                      ? defaultValues?.logo_url
                      : defaultValues?.stand_logo_url;
                const preview = previews[field] ?? existing ?? null;

                return (
                  <div key={field} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
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
                          className="h-24 w-24 rounded-xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          None
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

          {activeTab === "preferences" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Referrer</FieldLabel>
                  <input {...register("referral_mstr_id")} className={FIELD_CLASS} placeholder="Where did you hear about the show?" />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Referrer Origin</FieldLabel>
                  <input {...register("referrer_from")} className={FIELD_CLASS} placeholder="Where did you hear about the show?" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Referral Code</FieldLabel>
                  <input {...register("referral_code")} className={FIELD_CLASS} placeholder="PARTNER-2026" />
                  <p className="text-[10px] font-semibold text-zinc-600">Referral code handed over by a partner, if any.</p>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Keynote Speech?</FieldLabel>
                  <input {...register("keynote_speech_topic")} className={FIELD_CLASS} placeholder="Title of presentation..." />
                  <p className="text-[10px] font-semibold text-zinc-600">Interest in a keynote or sponsorship at the show.</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Exhibitor Promotion & Options</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("featured")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Featured Exhibitor
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("member_company_profile")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Member Company Profile
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("excluded_from_advertise")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Exclude from Advertise Magazine
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("visitor_notification_mail")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Enable Visitor Mail Notifications
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("is_webinars")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Webinars & Seminars
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("is_workshops")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Workshops
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("is_business_presentation")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Business Presentation
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("is_e_magazine")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    E-Magazine
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("is_newsletter")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Newsletter
                  </label>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
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
              {uploading ? "Uploading images..." : isSubmitting ? "Processing..." : isEdit ? "Save" : "Add Trade Stand"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

/* ----------------------------- CSV import modal ---------------------------- */

interface ParsedExhibitorCsv {
  rows: Record<string, string>[];
  delimiterLabel: string;
  ignoredColumns: string[];
  error?: string;
}

/**
 * Maps a CSV onto exhibitor rows by HEADER NAME, so column order does not matter and the page's
 * own export re-imports unchanged. Either "First Name"+"Last Name" or a single "Name" works.
 *
 * Computed columns are accepted in the header and ignored — Stand/Spot assignment and the
 * account flags are derived when the exhibitor is created, not settable from a spreadsheet.
 */
function mapExhibitorCsv(text: string): ParsedExhibitorCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) {
    return { rows: [], delimiterLabel, ignoredColumns: [], error: "That file is empty." };
  }

  const iFirst = columnIndex(header, "first name", "first_name", "firstname");
  const iLast = columnIndex(header, "last name", "last_name", "lastname", "surname");
  const iName = columnIndex(header, "name", "full name");
  const iEmail = columnIndex(header, "email", "email address", "e-mail");
  const iBusiness = columnIndex(header, "business", "company", "company name");
  const iPhone = columnIndex(header, "phone", "telephone");
  const iWork = columnIndex(header, "work phone", "work_phone", "mobile");
  const iPosition = columnIndex(header, "position", "job title", "role");
  const iWebsite = columnIndex(header, "website", "url");
  const iLinked = columnIndex(header, "linkedin", "linkedin_user_profile", "linkedin profile");
  const iStandNo = columnIndex(header, "stand number", "stand_number", "stand no");
  const iStandSize = columnIndex(header, "stand size", "stand_size");
  const iStandPrice = columnIndex(header, "stand price", "stand_price");
  const iAbout = columnIndex(header, "about us", "about_us", "about");
  const iFeatured = columnIndex(header, "featured");
  const iStatus = columnIndex(header, "status");

  if (iEmail === -1 || iBusiness === -1 || (iFirst === -1 && iName === -1)) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns: [],
      error:
        `Needs "Email" and "Business", plus either "First Name" or "Name". Read the file as ` +
        `${delimiterLabel}; columns came out as: ` +
        `${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const ignoredColumns = header.filter((h) =>
    ["id", "account", "spot", "stand layout", "batch number"].includes(h),
  );
  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const rows = table
    .map((r) => ({
      first_name: cell(r, iFirst),
      last_name: cell(r, iLast),
      name: cell(r, iName),
      email: cell(r, iEmail),
      business: cell(r, iBusiness),
      phone: cell(r, iPhone),
      work_phone: cell(r, iWork),
      position: cell(r, iPosition),
      website: cell(r, iWebsite),
      linkedin_user_profile: cell(r, iLinked),
      stand_number: cell(r, iStandNo),
      stand_size: cell(r, iStandSize),
      stand_price: cell(r, iStandPrice),
      about_us: cell(r, iAbout),
      featured: cell(r, iFeatured),
      status: cell(r, iStatus),
    }))
    .filter((r) => r.email !== "" || r.business !== "" || r.name !== "");

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

interface ExhibitorImportSummary {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

function ImportExhibitorsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedExhibitorCsv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ExhibitorImportSummary | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setFileName(file.name);
    const result = mapExhibitorCsv(await file.text());
    setParsed(result);
    if (result.error) setError(result.error);
  }

  async function runImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/exhibitors-admin/import", { rows: parsed.rows });
      setSummary(data as ExhibitorImportSummary);
      onImported();
    } catch (err) {
      const message =
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not import this file.";
      setError(message);
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
                <h3 className="text-base font-bold text-white">Import Exhibitors from CSV</h3>
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
                    {summary.created === 1 ? "exhibitor" : "exhibitors"}.
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
                  <span className="text-sm font-semibold text-zinc-200">
                    {fileName || "Choose a CSV file"}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Needs Email and Business, plus First/Last Name (or Name). Comma or tab separated.
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
                      Each row is created through the same code path as Add Exhibitor, so batch
                      numbers, linked listings and default stand layout are derived exactly as they
                      would be by hand. A large file will therefore take a few moments.
                    </p>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row, i) => (
                            <tr key={`${row.email}-${i}`} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">
                                {`${row.first_name} ${row.last_name}`.trim() || row.name || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-zinc-400">{row.business || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.email || "—"}</td>
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
                {busy ? "Importing..." : `Import ${parsed?.rows.length ?? 0}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function ExhibitorsAdminManager({
  initialExhibitors,
  initialStats,
  initialExhibitorId,
  returnTo,
  eventId,
}: {
  initialExhibitors: ExhibitorAdminRow[];
  initialStats: ExhibitorStats;
  /**
   * This event's id. Needed only to build the "Manage Stand" link — every write on this page
   * resolves the event from the session on the server, so nothing else depends on it.
   */
  eventId?: number;
  /**
   * Where to go when the deep-linked modal is saved or dismissed.
   *
   * Set when this page was opened from somewhere that owns the journey — the stand designer's
   * "Exhibitor Full Details" — so Save and Cancel return there instead of dumping the organiser
   * on a 232-row list they never asked to see.
   */
  returnTo?: string;
  /**
   * Deep-link target: when /members/view_exhibitor is opened with `?ex_id=<id>` (the way the
   * stand designer's "Exhibitor Full Details" link arrives, mirroring the legacy
   * `view_exhibitor?action=edit&id=<ex_id>` URL), the Edit Trade Stand modal opens straight onto
   * that exhibitor instead of leaving the organiser to find the row in the table.
   */
  initialExhibitorId?: number;
}) {
  const [rows, setRows] = useState<ExhibitorAdminRow[]>(initialExhibitors);
  const [stats, setStats] = useState<ExhibitorStats>(initialStats);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalExhibitor, setModalExhibitor] = useState<ExhibitorAdminRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; label: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [mailPending, setMailPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const router = useRouter();

  // Warm the return destination while the organiser is still editing, so Save/Cancel lands on an
  // already-fetched page instead of waiting on a cold render.
  useEffect(() => {
    if (returnTo) router.prefetch(returnTo);
  }, [returnTo, router]);

  // Open the deep-linked exhibitor once, on first render. Guarded by a ref rather than by
  // `modalExhibitor` so closing the modal does not immediately reopen it, and so a later refresh
  // of `rows` cannot pop it back up while the organiser is working elsewhere on the page.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !initialExhibitorId) return;
    const target = rows.find((r) => r.id === initialExhibitorId);
    if (!target) return;
    deepLinkHandled.current = true;
    setModalExhibitor(target);
  }, [initialExhibitorId, rows]);

  async function refreshData() {
    try {
      const [exRes, statsRes] = await Promise.all([
        axios.get<{ exhibitors: ExhibitorAdminRow[] }>("/api/members/exhibitors-admin"),
        axios.get<{ stats: ExhibitorStats }>("/api/members/exhibitors-admin/stats"),
      ]);
      setRows(exRes.data.exhibitors);
      setStats(statsRes.data.stats);
      setSelected(new Set());
    } catch {
      setErrorMessage("Could not refresh exhibitor list.");
    }
  }

  const filtered = useMemo(() => {
    let result = rows;

    if (activeFilter) {
      if (activeFilter === "joined_account") {
        result = result.filter((r) => r.joiningStatus === "Joined");
      } else if (activeFilter === "pending_account") {
        result = result.filter((r) => r.joiningStatus === "Pending");
      } else if (activeFilter === "no_order") {
        result = result.filter((r) => r.status === "active" && !r.orderId);
      } else if (activeFilter === "unallocated") {
        result = result.filter((r) => r.status === "active" && !r.standSize);
      } else if (activeFilter === "no_stand_num") {
        result = result.filter((r) => r.status === "active" && !r.standNumber);
      } else if (activeFilter === "no_stand_price") {
        result = result.filter((r) => r.status === "active" && (r.standPrice === null || r.standPrice === undefined));
      } else if (activeFilter === "uncontacted") {
        result = result.filter((r) => !r.telecallingGradeId && r.status !== "active");
      } else {
        result = result.filter((r) => r.status === activeFilter);
      }
    }

    const q = keyword.trim().toLowerCase();
    if (q) {
      result = result.filter((e) =>
        [e.firstName, e.lastName, e.fullName, e.email, e.business, e.position, e.standNumber, e.status]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q))
      );
    }

    return result;
  }, [rows, activeFilter, keyword]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const allSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const pageIds = paged.map((r) => r.id);
      const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => next.has(id));
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBadgeClick(typeFilter?: string) {
    if (activeFilter === typeFilter) {
      setActiveFilter(undefined);
    } else {
      setActiveFilter(typeFilter);
    }
  }

  // Loaded once: the template list is small, shared platform data, and does not change while
  // the organiser is working on this page.
  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/members/exhibitors-admin/email-templates")
      .then(({ data }) => {
        if (!cancelled) setTemplates(data.templates ?? []);
      })
      .catch(() => {
        /* the dropdown simply stays empty and is left disabled */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Exports what the importer reads back, so a file can round-trip. */
  function exportCsv(onlySelected: boolean) {
    const source = onlySelected ? filtered.filter((r) => selected.has(r.id)) : filtered;
    downloadCsv(
      "event-exhibitors.csv",
      [
        "First Name", "Last Name", "Email", "Business", "Position", "Phone", "Work Phone",
        "Website", "LinkedIn", "Stand Number", "Stand Size", "Stand Price", "About Us",
        "Featured", "Status",
      ],
      source.map((r) => [
        r.firstName,
        r.lastName,
        r.email,
        r.business ?? "",
        r.position ?? "",
        r.phone ?? "",
        r.workPhone ?? "",
        r.website ?? "",
        r.linkedinUserProfile ?? "",
        r.standNumber ?? "",
        r.standSize ?? "",
        r.standPrice ?? "",
        r.aboutUs ?? "",
        r.featured ? "Yes" : "No",
        r.status ?? "pending",
      ]),
    );
  }

  async function sendMail() {
    if (!templateId || selected.size === 0) return;
    setMailPending(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      const { data } = await axios.post("/api/members/exhibitors-admin/send-mail", {
        ids: [...selected],
        templateId,
      });
      // Reported honestly: "smtp_not_configured" is indistinguishable from success unless the
      // failure count and reason are surfaced.
      if (data.sent > 0 && data.failed === 0) {
        setNotice(`Sent to ${data.sent} exhibitor${data.sent === 1 ? "" : "s"}.`);
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
   * Deliberately limited to actions this app can actually carry out today — the twelve status
   * changes, an export, and bulk delete. The legacy list also carries "Add To Speaker",
   * "Add To Sponsor" and friends; those need service code that does not exist here yet, and a
   * menu entry that silently does nothing is worse than one that is absent.
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
      await axios.post("/api/members/exhibitors-admin/bulk-status", {
        ids: [...selected],
        status: actionValue,
      });
      setNotice(`Updated ${selected.size} exhibitor${selected.size === 1 ? "" : "s"}.`);
      await refreshData();
    } catch {
      setErrorMessage("Could not apply that action.");
    } finally {
      setBulkPending(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected exhibitor${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBulkPending(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/members/exhibitors-admin/bulk-delete", { ids: [...selected] });
      await refreshData();
    } catch {
      setErrorMessage("Could not delete selected exhibitors.");
    } finally {
      setBulkPending(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this exhibitor? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/exhibitors-admin/${id}`);
      await refreshData();
    } catch {
      setErrorMessage("Could not remove this exhibitor. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  /**
   * Leaving the deep-linked modal.
   *
   * Only the exhibitor this page was deep-linked to sends the organiser back: opening some OTHER
   * row's modal from the list afterwards should behave normally and stay on the list.
   */
  function leaveModal(row: ExhibitorAdminRow | "new" | null) {
    const wasDeepLinked =
      Boolean(returnTo) && row !== "new" && row !== null && row.id === initialExhibitorId;
    setModalExhibitor(null);
    if (wasDeepLinked && returnTo) {
      // router.push, not window.location.href: a client-side navigation reuses the already-loaded
      // app shell and the prefetched route, where a full document load re-downloads and re-runs
      // everything. That difference is what made Save/Cancel feel like it hung.
      router.push(returnTo);
      return;
    }
    return true;
  }

  function handleSaved() {
    const row = modalExhibitor;
    if (leaveModal(row) !== true) return;
    refreshData();
  }

  return (
    <div className="space-y-8">
      {/* Interactive Stat Filter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {BADGES.map((b) => {
          const isActive = activeFilter === b.typeFilter;
          return (
            <button
              key={b.label}
              onClick={() => handleBadgeClick(b.typeFilter)}
              className={`rounded-2xl bg-gradient-to-br p-4 border text-left transition-all cursor-pointer hover:scale-105 active:scale-95 ${b.color} ${
                isActive ? "ring-2 ring-brand-pink scale-105 shadow-lg" : "opacity-90"
              }`}
            >
              <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{b.label}</div>
              <div className="text-2xl font-black">{stats[b.key]}</div>
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-3xl p-8 border-white/10 shadow-2xl backdrop-blur-md space-y-6">
        {/* Quick Status Filter Chips — click any chip to filter the table below to that status
            (no row selection needed, same activeFilter mechanism as the stat badges above).
            Bulk Delete stays a true bulk action: it only activates once you tick row checkboxes. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {EXHIBITOR_BULK_STATUS_ACTIONS.map((status) => {
              const isActive = activeFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => handleBadgeClick(status)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    isActive
                      ? "bg-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/30"
                      : "bg-violet-500/15 border-violet-400/40 text-violet-200 hover:bg-violet-500 hover:text-white hover:border-violet-400"
                  }`}
                >
                  {BULK_ACTION_LABEL[status] ?? status}
                </button>
              );
            })}
            <button
              disabled={selected.size === 0 || bulkPending}
              onClick={bulkDelete}
              className="rounded-full bg-rose-500/15 border border-rose-400/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-500/15 disabled:hover:text-rose-300 cursor-pointer"
              title={selected.size === 0 ? "Tick one or more exhibitors below to enable bulk delete" : undefined}
            >
              Bulk Delete
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCsv(false)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => setModalExhibitor("new")}
              className="inline-flex items-center gap-2 rounded-full bg-brand-pink px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Exhibitor
            </button>
          </div>
        </div>

        {/* ============================================================
            Email template + Action bar — the two dropdowns from
            members/view_visitor_list.tpl, which pairs each select with its
            own submit button rather than one shared "go".
            Both operate on TICKED ROWS, so the selection count is shown
            inline instead of leaving the buttons mysteriously disabled.
        ============================================================ */}
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="exhibitor-mail-template">
              Select an email template
            </label>
            <select
              id="exhibitor-mail-template"
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
              title={selected.size === 0 ? "Tick one or more exhibitors below first" : undefined}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {mailPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send Mail
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="exhibitor-action">
              Select an action
            </label>
            <select
              id="exhibitor-action"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            >
              <option value="">Select an Action</option>
              <optgroup label="Export">
                <option value="export_selected">Export Selected to CSV</option>
              </optgroup>
              <optgroup label="Set status">
                {EXHIBITOR_BULK_STATUS_ACTIONS.map((status) => (
                  <option key={status} value={status}>
                    {BULK_ACTION_LABEL[status] ?? status}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Danger">
                <option value="bulk_delete">Delete Selected</option>
              </optgroup>
            </select>
            <button
              type="button"
              onClick={runAction}
              disabled={
                !actionValue ||
                bulkPending ||
                (actionValue !== "export_selected" && selected.size === 0)
              }
              title={selected.size === 0 ? "Tick one or more exhibitors below first" : undefined}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {bulkPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit
            </button>
          </div>

          <p className="text-[11px] font-medium text-zinc-500 lg:col-span-2">
            {selected.size === 0
              ? "Tick rows in the table below to choose who these apply to."
              : `${selected.size} exhibitor${selected.size === 1 ? "" : "s"} selected.`}
          </p>
        </div>

        {notice && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
            {notice}
          </p>
        )}

        {/* Filter Indicator & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
            <Search className="h-5 w-5 shrink-0 text-brand-pink" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search exhibitors by name, company, email or stand #..."
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
            />
          </div>

          {activeFilter && (
            <div className="flex items-center gap-2 rounded-2xl border border-brand-pink/30 bg-brand-pink/10 px-4 py-2 text-xs font-bold text-brand-pink">
              <Filter className="h-4 w-4" />
              <span>Filtered by: {activeFilter}</span>
              <button onClick={() => setActiveFilter(undefined)} className="hover:text-white ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Main Exhibitor Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Exhibitor Contact</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Company & Position</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Stand & Price</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Digital Booth</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 italic">
                    {rows.length === 0 ? "No exhibitors registered yet." : "No exhibitors match your filter or search."}
                  </td>
                </tr>
              ) : (
                paged.map((exhibitor) => (
                  <tr key={exhibitor.id} className={`group hover:bg-white/[0.02] transition-colors ${selected.has(exhibitor.id) ? "bg-white/[0.03]" : ""}`}>
                    <td className="px-4 py-5">
                      <input type="checkbox" checked={selected.has(exhibitor.id)} onChange={() => toggleOne(exhibitor.id)} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    </td>
                    <td className="px-4 py-5 font-bold text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span>{exhibitor.fullName}</span>
                        {exhibitor.featured && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Featured
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-zinc-300 mt-0.5">{exhibitor.email}</div>
                      {exhibitor.phone && <div className="text-[10px] text-zinc-500 mt-0.5">Mob: {exhibitor.phone}</div>}
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-bold text-zinc-300">{exhibitor.business || "—"}</div>
                      {exhibitor.position && <div className="text-[10px] text-zinc-500">{exhibitor.position}</div>}
                      {exhibitor.website && (
                        <a href={exhibitor.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-brand-pink hover:underline mt-0.5">
                          <ExternalLink className="h-3 w-3" /> Website
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {exhibitor.standNumber ? (
                        <span className="inline-flex rounded-full bg-brand-purple/10 border border-brand-purple/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-purple">
                          {exhibitor.standNumber}
                        </span>
                      ) : (
                        <span className="text-zinc-600 italic text-xs">Unassigned</span>
                      )}
                      {exhibitor.standSize && <div className="text-[10px] text-zinc-400 mt-1 font-medium">{exhibitor.standSize}</div>}
                      {exhibitor.standPrice !== null && (
                        <div className="text-[10px] font-black tracking-widest text-emerald-400 mt-0.5">
                          £{exhibitor.standPrice} {exhibitor.discount ? `(-£${exhibitor.discount})` : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {exhibitor.enableVideoCalling ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                          <Video className="h-3 w-3" /> Live Call
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600">Standard</span>
                      )}
                      {exhibitor.zoom && <div className="text-[9px] text-zinc-400 mt-0.5">Zoom linked</div>}
                    </td>
                    <td className="px-4 py-5">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-lg ${STATUS_BADGE[exhibitor.status] || "bg-white/5 text-zinc-500 border border-white/10"}`}>
                        {exhibitor.status}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {exhibitor.joiningStatus ?? "—"}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {eventId ? (
                          // Straight to this exhibitor's stand designer. next/link so it prefetches
                          // and navigates client-side, like the other cross-page links here.
                          <Link
                            href={`/members/manage_stand_assets?event_id=${eventId}&ex_id=${exhibitor.id}`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-pink hover:text-white transition-all shadow-xl cursor-pointer"
                            title="Manage Stand Assets"
                          >
                            <Store className="h-4 w-4" />
                          </Link>
                        ) : null}
                        <button
                          onClick={() => setModalExhibitor(exhibitor)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-purple hover:text-white transition-all shadow-xl cursor-pointer"
                          title="Edit Exhibitor Profile"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          disabled={pendingId === exhibitor.id}
                          onClick={() => remove(exhibitor.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500 hover:text-white transition-all shadow-xl disabled:opacity-20 cursor-pointer"
                          title="Delete Exhibitor"
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

        <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Showing {filtered.length} of {rows.length} total exhibitors
          </p>
        </div>
      </div>

      {modalExhibitor && (
        <ExhibitorFormModal
          defaultValues={
            modalExhibitor === "new"
              ? undefined
              : {
                  id: modalExhibitor.id,
                  first_name: modalExhibitor.firstName,
                  last_name: modalExhibitor.lastName,
                  email: modalExhibitor.email,
                  phone: modalExhibitor.phone ?? "",
                  work_phone: modalExhibitor.workPhone ?? "",
                  business: modalExhibitor.business ?? "",
                  position: modalExhibitor.position ?? "",
                  website: modalExhibitor.website ?? "",
                  linkedin_user_profile: modalExhibitor.linkedinUserProfile ?? "",
                  facebook: modalExhibitor.facebook ?? "",
                  twitter: modalExhibitor.twitter ?? "",
                  instagram: modalExhibitor.instagram ?? "",
                  whatsapp_no: modalExhibitor.whatsappNo ?? "",
                  zoom: modalExhibitor.zoom ?? "",
                  calendly: modalExhibitor.calendly ?? "",
                  youtube: modalExhibitor.youtube ?? "",
                  about_us: modalExhibitor.aboutUs ?? "",
                  stand_number: modalExhibitor.standNumber ?? "",
                  stand_size: modalExhibitor.standSize ?? "",
                  stand_price: modalExhibitor.standPrice?.toString() ?? "",
                  discount: modalExhibitor.discount?.toString() ?? "",
                  charitable_amount: modalExhibitor.charitableAmount?.toString() ?? "",
                  exchange_amount: modalExhibitor.exchangeAmount?.toString() ?? "",
                  exchange_services: modalExhibitor.exchangeServices,
                  featured: modalExhibitor.featured,
                  member_company_profile: modalExhibitor.memberCompanyProfile,
                  excluded_from_advertise: modalExhibitor.excludedFromAdvertise,
                  enable_video_calling: modalExhibitor.enableVideoCalling,
                  video_calling_software_provider: modalExhibitor.videoCallingSoftwareProvider ?? "",
                  video_call_url: modalExhibitor.videoCallUrl ?? "",
                  special_instructions: modalExhibitor.specialInstructions ?? "",
                  referral_code: modalExhibitor.referralCode ?? "",
                  referral_mstr_id: modalExhibitor.referralMstrId ?? "",
                  referrer_from: modalExhibitor.referrerFrom ?? "",
                  keynote_speech_topic: modalExhibitor.keynoteSpeechTopic ?? "",
                  is_webinars: modalExhibitor.isWebinars,
                  is_workshops: modalExhibitor.isWorkshops,
                  is_business_presentation: modalExhibitor.isBusinessPresentation,
                  is_e_magazine: modalExhibitor.isEMagazine,
                  is_newsletter: modalExhibitor.isNewsletter,
                  visitor_notification_mail: modalExhibitor.visitorNotificationMail,
                  listing_id: modalExhibitor.listingId ?? "",
                  available_stand_size: modalExhibitor.orderId ?? "",
                  exhibition_zone_id: modalExhibitor.exhibitionZoneId ?? "",
                  spot_id: modalExhibitor.spotId ?? "",
                  ex_stand_layout_id: modalExhibitor.exStandLayoutId ?? "",
                  stand_color_id: modalExhibitor.standColorId ?? "",
                  include_column_listing: modalExhibitor.includeColumnListing,
                  include_logo_listing: modalExhibitor.includeLogoListing,
                  order_id: modalExhibitor.orderId,
                  profile_pic_url: modalExhibitor.profilePic,
                  logo_url: modalExhibitor.logo,
                  stand_logo_url: modalExhibitor.standLogo,
                  status: (modalExhibitor.status as (typeof EXHIBITOR_STATUSES)[number]) ?? "pending",
                }
          }
          onClose={() => leaveModal(modalExhibitor)}
          onSaved={handleSaved}
        />
      )}
      {importOpen && (
        <ImportExhibitorsModal
          onClose={() => setImportOpen(false)}
          onImported={() => refreshData()}
        />
      )}

    </div>
  );
}
