"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Copy,
  Flag,
  Sparkles,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  FileText,
  DollarSign,
  ChevronDown,
  Coins,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import {
  eventAdvertiserSchema,
  ADVERTISER_STATUSES,
  type EventAdvertiserInput,
} from "@/lib/validations/eventAdvertiser";
import type { AdvertiserRow, AdvertiserStats } from "@/lib/services/eventAdvertiser";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { assetUrl } from "@/lib/assets";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-md border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-indigo-500 focus:outline-none transition-all";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  inactive: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  suspended: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  excluded: "bg-red-500/10 text-red-400 border border-red-500/20",
};

interface FormDefaults extends Partial<EventAdvertiserInput> {
  id?: number;
}

interface ExhibitorOption {
  userId: number;
  name: string;
  business: string;
}

interface Props {
  initialAdvertisers: AdvertiserRow[];
  initialStats: AdvertiserStats;
  exhibitors: ExhibitorOption[];
}

function AdvertiserFormModal({
  defaultValues,
  exhibitors,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  exhibitors: ExhibitorOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues?.id === "number";

  // Modal is portaled to document.body, so it must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventAdvertiserInput>({
    resolver: zodResolver(eventAdvertiserSchema) as any,
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      business: defaultValues?.business ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      work_phone: defaultValues?.work_phone ?? "",
      position: defaultValues?.position ?? "",
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      image: defaultValues?.image ?? "",
      publication_category: defaultValues?.publication_category ?? "",
      exchange_services: defaultValues?.exchange_services ?? false,
      exchange_amount: defaultValues?.exchange_amount ?? "",
      show_advertiser_on_speaker: defaultValues?.show_advertiser_on_speaker ?? false,
      show_advertiser_on_visitor: defaultValues?.show_advertiser_on_visitor ?? false,
      show_advertiser_on_sponsor: defaultValues?.show_advertiser_on_sponsor ?? false,
      show_advertiser_on_upcoming_event: defaultValues?.show_advertiser_on_upcoming_event ?? false,
      status: defaultValues?.status ?? "pending",
      advert_size: defaultValues?.advert_size ?? "",
      advert_size_price: defaultValues?.advert_size_price ?? 0,
      discount: defaultValues?.discount ?? 0,
      charitable_amount: defaultValues?.charitable_amount ?? 0,
      listing_id: defaultValues?.listing_id ?? null,
      order_id: defaultValues?.order_id ?? null,
      flag: defaultValues?.flag ?? false,
      fb: defaultValues?.fb ?? "",
      twitter: defaultValues?.twitter ?? "",
      linkedin: defaultValues?.linkedin ?? "",
    },
  });

  const watchUserListings = watch("listing_id");
  const watchExchangeServices = watch("exchange_services");

  // Options states for selected user
  const [userListings, setUserListings] = useState<{ id: number; title: string }[]>([]);

  // Find user by selected exhibitor listing and set fields automatically
  const handleExhibitorChange = async (userIdStr: string) => {
    const userId = Number(userIdStr);
    if (!userId) {
      setUserListings([]);
      return;
    }
    const exhibitor = exhibitors.find((e) => e.userId === userId);
    if (exhibitor) {
      setValue("business", exhibitor.business);
      setValue("first_name", exhibitor.name.split(" ")[0] || "");
      setValue("last_name", exhibitor.name.split(" ").slice(1).join(" ") || "");
    }
    try {
      const res = await axios.get(`/api/members/listings-options?userId=${userId}`);
      const listings = res.data.listings || [];
      setUserListings(listings);
      if (listings.length > 0) {
        setValue("listing_id", listings[0].id);
        setValue("title", listings[0].title);
      }
    } catch {
      setUserListings([]);
    }
  };

  async function onSubmit(data: EventAdvertiserInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/advertisers/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/advertisers", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this advertiser. Please check the form and try again."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-xl font-black uppercase tracking-wider text-white">
            {isEdit ? "Edit Advertiser Details" : "Create New Advertiser"}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* Main profile / account info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Contact & Business Info</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Select Exhibitor User</label>
                <select
                  onChange={(e) => handleExhibitorChange(e.target.value)}
                  className={FIELD_CLASS}
                  defaultValue=""
                >
                  <option value="">-- Choose Existing Exhibitor (Optional) --</option>
                  {exhibitors.map((ex) => (
                    <option key={ex.userId} value={ex.userId}>
                      {ex.name} ({ex.business || "No Business"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Associated Business Listing</label>
                <select
                  {...register("listing_id", { valueAsNumber: true })}
                  className={FIELD_CLASS}
                >
                  <option value="">-- Choose Business Listing --</option>
                  {userListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                  {isEdit && defaultValues?.listing_id && (
                    <option value={defaultValues.listing_id}>
                      Current Selected (#{defaultValues.listing_id})
                    </option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">First Name</label>
                <input {...register("first_name")} className={FIELD_CLASS} placeholder="e.g. John" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Last Name</label>
                <input {...register("last_name")} className={FIELD_CLASS} placeholder="e.g. Doe" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Email Address</label>
                <input {...register("email")} type="email" className={FIELD_CLASS} placeholder="e.g. name@company.com" />
                {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Phone</label>
                <input {...register("phone")} className={FIELD_CLASS} placeholder="e.g. 07123456789" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Business Name</label>
                <input {...register("business")} className={FIELD_CLASS} placeholder="e.g. Acme Corporation" />
              </div>
            </div>
          </div>

          {/* Advert Specific Information */}
          <div className="space-y-4 border-t border-white/5 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Advert Properties</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Advert Title</label>
                <input {...register("title")} className={FIELD_CLASS} placeholder="Headline or branding text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Allocated Advert Size</label>
                <input {...register("advert_size")} className={FIELD_CLASS} placeholder="e.g. Quarter Page, Full Page" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Purpose / description</label>
              <textarea {...register("description")} rows={3} className={FIELD_CLASS} placeholder="Describe the purpose of the advert..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Image URL</label>
                <input {...register("image")} className={FIELD_CLASS} placeholder="https://domain.com/path/to/image.png" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Publication Category</label>
                <input {...register("publication_category")} className={FIELD_CLASS} placeholder="e.g. Category A, Spotlight" />
              </div>
            </div>
          </div>

          {/* Pricing, Discount, Exchange Services */}
          <div className="space-y-4 border-t border-white/5 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Financial Override & Exchange</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Base Advert Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-medium text-sm">£</span>
                  <input
                    type="number"
                    {...register("advert_size_price", { valueAsNumber: true })}
                    className={`${FIELD_CLASS} pl-7`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Discount Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-medium text-sm">£</span>
                  <input
                    type="number"
                    {...register("discount", { valueAsNumber: true })}
                    className={`${FIELD_CLASS} pl-7`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Charitable Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-medium text-sm">£</span>
                  <input
                    type="number"
                    {...register("charitable_amount", { valueAsNumber: true })}
                    className={`${FIELD_CLASS} pl-7`}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="flex items-center gap-3 cursor-pointer select-none text-zinc-200">
                  <input
                    type="checkbox"
                    {...register("exchange_services")}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-sm font-semibold">Enable Exchange Services</span>
                </label>
              </div>

              {watchExchangeServices && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Exchange Amount (£)</label>
                  <input {...register("exchange_amount")} className={FIELD_CLASS} placeholder="e.g. 150" />
                </div>
              )}
            </div>
          </div>

          {/* Placements & Socials */}
          <div className="space-y-4 border-t border-white/5 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Placement & Socials</h4>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">Show Advertiser On</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input type="checkbox" {...register("show_advertiser_on_speaker")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0" />
                  Speaker
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input type="checkbox" {...register("show_advertiser_on_visitor")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0" />
                  Visitor
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input type="checkbox" {...register("show_advertiser_on_sponsor")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0" />
                  Sponsor
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input type="checkbox" {...register("show_advertiser_on_upcoming_event")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0" />
                  Upcoming Event
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Facebook Profile</label>
                <input {...register("fb")} className={FIELD_CLASS} placeholder="https://facebook.com/..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Twitter URL</label>
                <input {...register("twitter")} className={FIELD_CLASS} placeholder="https://twitter.com/..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">LinkedIn URL</label>
                <input {...register("linkedin")} className={FIELD_CLASS} placeholder="https://linkedin.com/..." />
              </div>
            </div>
          </div>

          {/* Status & Flag */}
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Approval Status</label>
                <select {...register("status")} className={FIELD_CLASS}>
                  {ADVERTISER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-3">
                <label className="flex items-center gap-3 cursor-pointer select-none text-zinc-200">
                  <input
                    type="checkbox"
                    {...register("flag")}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-rose-600 focus:ring-0"
                  />
                  <span className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                    <Flag className="h-4 w-4 fill-current" /> Flag this Advertiser
                  </span>
                </label>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Advertiser"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

function AmountOverrideModal({
  advertiser,
  onClose,
  onSaved,
}: {
  advertiser: AdvertiserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [price, setPrice] = useState(advertiser.advertSizePrice);
  const [discount, setDiscount] = useState(advertiser.discount);
  const [charitable, setCharitable] = useState(advertiser.charitableAmount);

  // Modal is portaled to document.body, so it must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const finalAmount = Math.max(0, price - discount - charitable);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const data = {
        ...advertiser,
        first_name: advertiser.firstName ?? "",
        last_name: advertiser.lastName ?? "",
        business: advertiser.business ?? "",
        email: advertiser.email ?? "",
        phone: advertiser.phone ?? "",
        title: advertiser.title ?? "",
        description: advertiser.description ?? "",
        image: advertiser.image ?? "",
        publication_category: advertiser.publicationCategory ?? "",
        exchange_services: advertiser.exchangeServices,
        exchange_amount: advertiser.exchangeAmount ?? "",
        show_advertiser_on_speaker: advertiser.showAdvertiserOnSpeaker,
        show_advertiser_on_visitor: advertiser.showAdvertiserOnVisitor,
        show_advertiser_on_sponsor: advertiser.showAdvertiserOnSponsor,
        show_advertiser_on_upcoming_event: advertiser.showAdvertiserOnUpcomingEvent,
        status: advertiser.status ?? "pending",
        advert_size: advertiser.advertSize ?? "",
        advert_size_price: price,
        discount: discount,
        charitable_amount: charitable,
        listing_id: advertiser.listingId,
        order_id: advertiser.orderId,
        flag: advertiser.flag,
        fb: advertiser.fb ?? "",
        twitter: advertiser.twitter ?? "",
        linkedin: advertiser.linkedin ?? "",
      };

      await axios.patch(`/api/members/advertisers/${advertiser.id}`, data);
      onSaved();
    } catch {
      setErrorMessage("Could not update amounts. Please try again.");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-black uppercase tracking-wider text-white">Change Financial Amounts</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <p className="text-sm text-zinc-400">
            Override the pricing structure for <span className="font-bold text-white">{advertiser.business || "Advertiser"}</span>.
          </p>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Base Advert Price</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 font-medium text-sm">£</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`${FIELD_CLASS} pl-7`}
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Discount Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 font-medium text-sm">£</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className={`${FIELD_CLASS} pl-7`}
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Charitable Contribution</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 font-medium text-sm">£</span>
              <input
                type="number"
                value={charitable}
                onChange={(e) => setCharitable(Number(e.target.value))}
                className={`${FIELD_CLASS} pl-7`}
                min="0"
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400 font-semibold uppercase tracking-wider">Final Calculation (TPA)</span>
              <span className="text-xl font-black text-indigo-400">£{finalAmount}</span>
            </div>
          </div>

          {errorMessage && <p className="text-xs text-rose-400">{errorMessage}</p>}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all"
            >
              Update Amounts
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

export function AdvertisersManager({
  initialAdvertisers,
  initialStats,
  exhibitors,
}: Props) {
  const router = useRouter();
  const [advertisers, setAdvertisers] = useState<AdvertiserRow[]>(initialAdvertisers);
  const [stats, setStats] = useState<AdvertiserStats>(initialStats);

  const [modalAdvertiser, setModalAdvertiser] = useState<AdvertiserRow | "new" | null>(null);
  const [overrideAdvertiser, setOverrideAdvertiser] = useState<AdvertiserRow | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setAdvertisers(initialAdvertisers);
    setStats(initialStats);
  }, [initialAdvertisers, initialStats]);

  const filtered = useMemo(() => {
    return advertisers.filter((a) => {
      const q = keyword.trim().toLowerCase();
      const matchesSearch = !q
        ? true
        : [a.firstName, a.lastName, a.email, a.business, a.title, a.status, a.advertSize, a.publicationCategory]
            .filter(Boolean)
            .some((f) => f!.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [advertisers, keyword, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  async function remove(id: number) {
    if (!window.confirm("Remove this advertiser? This action cannot be reverted.")) return;
    setPendingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(`/api/members/advertisers/${id}`);
      setSuccessMessage("Advertiser removed successfully.");
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this advertiser. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleFlag(advertiser: AdvertiserRow) {
    try {
      await axios.post("/api/members/advertisers?action=bulk_flag", {
        ids: [advertiser.id],
        flag: !advertiser.flag,
      });
      router.refresh();
    } catch {
      setErrorMessage("Could not toggle flag.");
    }
  }

  async function duplicate(id: number) {
    try {
      await axios.post(`/api/members/advertisers?action=copy&id=${id}`);
      setSuccessMessage("Advertiser duplicated successfully.");
      router.refresh();
    } catch {
      setErrorMessage("Could not duplicate advertiser.");
    }
  }

  const handleSelectAll = (checked: boolean) => {
    const pageIds = paged.map((a) => a.id);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkActionSubmit = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (bulkAction === "approve") {
        await axios.post("/api/members/advertisers?action=bulk_status", {
          ids: selectedIds,
          status: "active",
        });
        setSuccessMessage("Selected advertisers approved.");
      } else if (bulkAction === "disapprove") {
        await axios.post("/api/members/advertisers?action=bulk_status", {
          ids: selectedIds,
          status: "inactive",
        });
        setSuccessMessage("Selected advertisers disapproved.");
      } else if (bulkAction === "flag_on") {
        await axios.post("/api/members/advertisers?action=bulk_flag", {
          ids: selectedIds,
          flag: true,
        });
        setSuccessMessage("Selected advertisers flagged.");
      } else if (bulkAction === "flag_off") {
        await axios.post("/api/members/advertisers?action=bulk_flag", {
          ids: selectedIds,
          flag: false,
        });
        setSuccessMessage("Selected advertisers unflagged.");
      } else if (bulkAction === "delete") {
        if (!window.confirm(`Delete ${selectedIds.length} selected advertisers?`)) return;
        await axios.post("/api/members/advertisers?action=bulk_delete", {
          ids: selectedIds,
        });
        setSuccessMessage("Selected advertisers deleted.");
      }
      setSelectedIds([]);
      setBulkAction("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || "Bulk action failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleImport = async (type: "previous" | "all") => {
    const confirmMsg =
      type === "previous"
        ? "Are you sure you want to import advertisers from the previous event?"
        : "Are you sure you want to import advertisers from all other previous events?";
    if (!window.confirm(confirmMsg)) return;

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const endpoint =
        type === "previous"
          ? "/api/members/advertisers?action=import_previous"
          : "/api/members/advertisers?action=import_all";

      const res = await axios.post(endpoint);
      setSuccessMessage(`Successfully imported ${res.data.count || 0} advertisers.`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || "Import failed. Please configure previous event ID."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  function handleSaved() {
    setModalAdvertiser(null);
    setOverrideAdvertiser(null);
    setSuccessMessage("Advertiser saved successfully.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Stat Widgets matching original PHP layout style but visually rich */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-950/25 p-4 text-center shadow-md backdrop-blur-sm">
          <div className="text-2xl font-black text-rose-400">{stats.activeAdverts}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Active Adverts</div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/25 p-4 text-center shadow-md backdrop-blur-sm">
          <div className="text-2xl font-black text-amber-400">{stats.inactiveAdverts}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Inactive Adverts</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/25 p-4 text-center shadow-md backdrop-blur-sm">
          <div className="text-2xl font-black text-emerald-400">{stats.totalAdverts}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Total Adverts</div>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-950/25 p-4 text-center shadow-md backdrop-blur-sm">
          <div className="text-2xl font-black text-sky-400">{stats.activeAdvertisers}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Active Advertisers</div>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/25 p-4 text-center shadow-md backdrop-blur-sm">
          <div className="text-2xl font-black text-indigo-400">{stats.inactiveAdvertisers}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Inactive Advertisers</div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/25 p-4 text-center shadow-md backdrop-blur-sm">
          <div className="text-2xl font-black text-cyan-400">{stats.totalAdvertisers}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Total Advertisers</div>
        </div>

        <div className="rounded-2xl border border-pink-500/20 bg-pink-950/25 p-4 text-center shadow-md backdrop-blur-sm col-span-2 sm:col-span-1">
          <div className="text-2xl font-black text-pink-400">{stats.flaggedAdvertisers}</div>
          <div className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">Flagged</div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-t border-white/5 pt-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleImport("previous")}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 transition disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Import from Previous Event
          </button>
          <button
            onClick={() => handleImport("all")}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 transition disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> Import from All Events
          </button>
        </div>

        <button
          onClick={() => setModalAdvertiser("new")}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Advert
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Table Filters & Bulk Actions */}
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by name, email, business..."
              className="w-full rounded-md border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">ALL STATUSES</option>
              {ADVERTISER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Bulk Action --</option>
              <option value="approve">Mark Approved</option>
              <option value="disapprove">Mark Disapproved</option>
              <option value="flag_on">Flag Selection</option>
              <option value="flag_off">Unflag Selection</option>
              <option value="delete">Delete Selected</option>
            </select>

            <button
              onClick={handleBulkActionSubmit}
              disabled={selectedIds.length === 0 || !bulkAction || isActionLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Selected Counts info */}
        {selectedIds.length > 0 && (
          <div className="text-xs font-semibold text-zinc-400">
            {selectedIds.length} items selected for bulk actions.
          </div>
        )}

        {/* Advertisers Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center w-12">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.every((a) => selectedIds.includes(a.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0"
                  />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Flag</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">User / Contact</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Advert Size</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Image</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Base Price</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">TPA</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-zinc-500">
                    {advertisers.length === 0
                      ? "No advertisers registered for this event yet."
                      : "No advertisers match your active filters."}
                  </td>
                </tr>
              ) : (
                paged.map((advertiser) => {
                  const tpa = Math.max(
                    0,
                    advertiser.advertSizePrice - advertiser.discount - advertiser.charitableAmount
                  );

                  return (
                    <tr key={advertiser.id} className="hover:bg-white/[0.02] transition-colors align-top">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(advertiser.id)}
                          onChange={(e) => handleSelectOne(advertiser.id, e.target.checked)}
                          className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleFlag(advertiser)}
                          className={`transition ${
                            advertiser.flag ? "text-rose-500" : "text-zinc-600 hover:text-zinc-400"
                          }`}
                        >
                          <Flag className="h-4 w-4 fill-current" />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-zinc-400 font-mono text-xs">
                        {advertiser.orderId ? `#${advertiser.orderId}` : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">
                          {advertiser.firstName || advertiser.lastName
                            ? `${advertiser.firstName ?? ""} ${advertiser.lastName ?? ""}`.trim()
                            : "—"}
                        </div>
                        <div className="text-xs text-zinc-400">{advertiser.email || "—"}</div>
                        <div className="text-[11px] text-zinc-500">{advertiser.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-4 text-white">
                        <div>{advertiser.business || "—"}</div>
                        {advertiser.publicationCategory && (
                          <span className="inline-block mt-1 rounded bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 text-[10px] uppercase font-bold text-indigo-400">
                            {advertiser.publicationCategory}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-zinc-300 font-medium">
                        <div>{advertiser.advertSize || "—"}</div>
                        {advertiser.title && (
                          <div className="text-xs text-zinc-500 font-normal italic mt-0.5">
                            "{advertiser.title}"
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {advertiser.image ? (
                          <a
                            href={advertiser.image}
                            target="_blank"
                            rel="noreferrer"
                            className="group block relative h-10 w-16 overflow-hidden rounded border border-white/10 hover:border-white/20 transition"
                          >
                            <img
                              src={assetUrl(advertiser.image)}
                              alt="Advert"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="h-3 w-3 text-white" />
                            </div>
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">No artwork</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-zinc-400 font-semibold">
                        £{advertiser.advertSizePrice}
                      </td>
                      <td className="px-4 py-4 font-black text-emerald-400 text-base">
                        £{tpa}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            STATUS_BADGE[advertiser.status ?? ""] ||
                            "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {advertiser.status ? advertiser.status.toUpperCase() : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setOverrideAdvertiser(advertiser)}
                            className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                            title="Override Financials"
                          >
                            <Coins className="h-3.5 w-3.5" /> Adjust
                          </button>
                          <button
                            onClick={() => setModalAdvertiser(advertiser)}
                            className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-xs font-semibold text-white transition"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => duplicate(advertiser.id)}
                            className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition"
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                          <button
                            disabled={pendingId === advertiser.id}
                            onClick={() => remove(advertiser.id)}
                            className="inline-flex items-center gap-1 rounded bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-400 transition disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {modalAdvertiser && (
        <AdvertiserFormModal
          exhibitors={exhibitors}
          defaultValues={
            modalAdvertiser === "new"
              ? undefined
              : {
                  id: modalAdvertiser.id,
                  first_name: modalAdvertiser.firstName ?? "",
                  last_name: modalAdvertiser.lastName ?? "",
                  business: modalAdvertiser.business ?? "",
                  email: modalAdvertiser.email ?? "",
                  phone: modalAdvertiser.phone ?? "",
                  work_phone: modalAdvertiser.workPhone ?? "",
                  position: modalAdvertiser.position ?? "",
                  title: modalAdvertiser.title ?? "",
                  description: modalAdvertiser.description ?? "",
                  image: modalAdvertiser.image ?? "",
                  publication_category: modalAdvertiser.publicationCategory ?? "",
                  exchange_services: modalAdvertiser.exchangeServices,
                  exchange_amount: modalAdvertiser.exchangeAmount ?? "",
                  show_advertiser_on_speaker: modalAdvertiser.showAdvertiserOnSpeaker,
                  show_advertiser_on_visitor: modalAdvertiser.showAdvertiserOnVisitor,
                  show_advertiser_on_sponsor: modalAdvertiser.showAdvertiserOnSponsor,
                  show_advertiser_on_upcoming_event: modalAdvertiser.showAdvertiserOnUpcomingEvent,
                  status: (modalAdvertiser.status as any) ?? "pending",
                  advert_size: modalAdvertiser.advertSize ?? "",
                  advert_size_price: modalAdvertiser.advertSizePrice,
                  discount: modalAdvertiser.discount,
                  charitable_amount: modalAdvertiser.charitableAmount,
                  listing_id: modalAdvertiser.listingId,
                  order_id: modalAdvertiser.orderId,
                  flag: modalAdvertiser.flag,
                  fb: modalAdvertiser.fb ?? "",
                  twitter: modalAdvertiser.twitter ?? "",
                  linkedin: modalAdvertiser.linkedin ?? "",
                }
          }
          onClose={() => setModalAdvertiser(null)}
          onSaved={handleSaved}
        />
      )}

      {overrideAdvertiser && (
        <AmountOverrideModal
          advertiser={overrideAdvertiser}
          onClose={() => setOverrideAdvertiser(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}