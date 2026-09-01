"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { CheckCircle2, ImagePlus, Upload, User, Building2, Megaphone, Package, ChevronLeft, ChevronRight } from "lucide-react";
import {
  todoContactSchema,
  todoListingSchema,
  todoAdvertSchema,
  type TodoContactInput,
  type TodoListingInput,
  type UploadKind,
} from "@/lib/validations/eventTodoList";
import type {
  TodoContact,
  TodoListing,
  TodoAdvertRow,
  TodoProductRow,
  TodoListingOption,
} from "@/lib/services/eventTodoList";
import { COUNTRIES } from "@/lib/constants/countries";
import { assetUrl } from "@/lib/assets";

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";
const LABEL_CLASS = "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500";

type ContactFieldKey = keyof TodoContactInput;
type ListingFieldKey = keyof TodoListingInput;

interface Props {
  contact: TodoContact;
  listing: TodoListing | null;
  hasStandNumberField: boolean;
  adverts: TodoAdvertRow[];
  products: TodoProductRow[];
  eventId: number;
  /** When set, the page mirrors event_todo_list.php's task_type deep-link mode: only the
   * relevant field(s) are shown, and saving redirects back to the event summary hub. */
  taskType: string | null;
  /** Every listing_id the signed-in user can manage for this event (mirrors the live page's
   * `$user_listings` — exhibitors with more than one business/listing at the show get a
   * switcher). Length <= 1 means there's nothing to switch between. */
  listingOptions: TodoListingOption[];
  /** The listing_id currently in effect (drives listing/adverts/products below). */
  selectedListingId: number | null;
  /** 1-based current page of the Product Details table (mirrors the legacy Paging class). */
  productsPage: number;
  /** Total classifieds count for this listing, used to compute pagination. */
  productsTotal: number;
}

const PRODUCTS_PAGE_SIZE = 50;

const TASK_TYPE_CONTACT_FIELDS: Record<string, ContactFieldKey[]> = {
  user_first_name: ["user_first_name", "user_last_name"],
  user_last_name: ["user_first_name", "user_last_name"],
  user_address1: ["user_address1", "user_address2"],
  user_city: ["user_city"],
  user_state: ["user_state"],
  user_country: ["user_country"],
  user_zip: ["user_zip"],
  user_phone: ["user_phone"],
};

const TASK_TYPE_LISTING_FIELDS: Record<string, ListingFieldKey[]> = {
  title: ["title"],
  position: ["position"],
  description_short: ["description_short"],
  stand_num: ["stand_number"],
};

const TASK_TYPE_TITLES: Record<string, string> = {
  user_first_name: "Add Name",
  user_last_name: "Add Last Name",
  user_address1: "Add Address",
  user_city: "Add City",
  user_state: "Add State",
  user_country: "Add Country",
  user_zip: "Add Post Code",
  user_phone: "Add Phone",
  title: "Add Title",
  position: "Add Position",
  description_short: "Add Short Description",
  stand_num: "Stand Number",
};

/** Real image upload, replacing the legacy PHP form's <input type=file> + preview + delete
 * checkbox. Uploads immediately on file selection to /api/members/todo-list/upload, then hands
 * the resulting URL back to the caller (a react-hook-form field via setValue, or plain state). */
function ImageUploadField({
  label,
  value,
  onChange,
  kind,
  listingId,
  previewClassName,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: UploadKind;
  listingId: number | null;
  previewClassName?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the exact same file again later
    if (!file) return;
    if (!listingId) {
      setError("No listing selected yet.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      body.append("listing_id", String(listingId));
      const res = await axios.post<{ url: string }>("/api/members/todo-list/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(res.data.url);
    } catch (err) {
      setError(
        isAxiosError(err) && typeof err.response?.data?.error === "string" ? err.response.data.error : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(value)}
            alt={`${label} preview`}
            className={previewClassName ?? "h-16 w-24 rounded-xl border border-white/10 bg-white/5 object-contain p-1"}
          />
        ) : (
          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/10 text-zinc-700">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-brand-pink/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-pink hover:bg-brand-pink/20 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : value ? "Change Image" : "Upload Image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFile}
              disabled={uploading || !listingId}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 pl-2 transition-colors"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ContactForm({
  contact,
  fields,
  eventId,
  taskType,
}: {
  contact: TodoContact;
  fields?: ContactFieldKey[];
  eventId: number;
  taskType: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TodoContactInput>({
    resolver: zodResolver(todoContactSchema) as any,
    defaultValues: {
      user_first_name: contact.firstName,
      user_last_name: contact.lastName,
      user_address1: contact.address1,
      user_address2: contact.address2,
      user_city: contact.city,
      user_state: contact.state,
      user_country: contact.country,
      user_zip: contact.zip,
      user_phone: contact.phone,
      work_phone: contact.workPhone,
    },
  });

  const show = (key: ContactFieldKey) => !fields || fields.includes(key);

  async function onSubmit(data: TodoContactInput) {
    setStatus("idle");
    try {
      await axios.patch("/api/members/todo-list/contact", data);
      setStatus("success");
      if (taskType) {
        router.push(`/members/user_event_summary?event_id=${eventId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save your contact details."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {(show("user_first_name") || show("user_last_name")) && (
        <div className="grid grid-cols-2 gap-4">
          {show("user_first_name") && (
            <div>
              <label className={LABEL_CLASS}>First Name*</label>
              <input {...register("user_first_name")} required className={FIELD_CLASS} />
              {errors.user_first_name && <p className="mt-1 text-xs text-red-600">{errors.user_first_name.message}</p>}
            </div>
          )}
          {show("user_last_name") && (
            <div>
              <label className={LABEL_CLASS}>Last Name*</label>
              <input {...register("user_last_name")} required className={FIELD_CLASS} />
              {errors.user_last_name && <p className="mt-1 text-xs text-red-600">{errors.user_last_name.message}</p>}
            </div>
          )}
        </div>
      )}

      {show("user_address1") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Address Line 1*</label>
            <input {...register("user_address1")} required className={FIELD_CLASS} />
            {errors.user_address1 && <p className="mt-1 text-xs text-red-600">{errors.user_address1.message}</p>}
          </div>
          <div>
            <label className={LABEL_CLASS}>Address Line 2</label>
            <input {...register("user_address2")} className={FIELD_CLASS} />
          </div>
        </div>
      )}

      {show("user_city") && (
        <div>
          <label className={LABEL_CLASS}>City*</label>
          <input {...register("user_city")} required className={FIELD_CLASS} />
          {errors.user_city && <p className="mt-1 text-xs text-red-600">{errors.user_city.message}</p>}
        </div>
      )}

      {show("user_state") && (
        <div>
          <label className={LABEL_CLASS}>State / County</label>
          <input {...register("user_state")} className={FIELD_CLASS} />
        </div>
      )}

      {show("user_country") && (
        <div>
          <label className={LABEL_CLASS}>Country*</label>
          <select {...register("user_country")} required className={FIELD_CLASS}>
            <option value="">Select a country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.user_country && <p className="mt-1 text-xs text-red-600">{errors.user_country.message}</p>}
        </div>
      )}

      {show("user_zip") && (
        <div>
          <label className={LABEL_CLASS}>Post Code*</label>
          <input {...register("user_zip")} required className={FIELD_CLASS} />
          {errors.user_zip && <p className="mt-1 text-xs text-red-600">{errors.user_zip.message}</p>}
        </div>
      )}

      {(show("user_phone") || show("work_phone")) && (
        <div className="grid grid-cols-2 gap-4">
          {show("user_phone") && (
            <div>
              <label className={LABEL_CLASS}>Phone*</label>
              <input {...register("user_phone")} required className={FIELD_CLASS} />
              {errors.user_phone && <p className="mt-1 text-xs text-red-600">{errors.user_phone.message}</p>}
            </div>
          )}
          {show("work_phone") && !fields && (
            <div>
              <label className={LABEL_CLASS}>Work Phone</label>
              <input {...register("work_phone")} className={FIELD_CLASS} />
            </div>
          )}
        </div>
      )}

      {status === "error" && errorMessage && <p className="text-sm font-bold text-red-500">{errorMessage}</p>}
      {status === "success" && !taskType && (
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-500">
          <CheckCircle2 className="h-4 w-4" /> Contact details updated.
        </p>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-brand-pink px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Submit Changes"}
        </button>
      </div>
    </form>
  );
}

function ListingForm({
  listing,
  hasStandNumberField,
  fields,
  eventId,
  taskType,
  listingId,
}: {
  listing: TodoListing;
  hasStandNumberField: boolean;
  fields?: ListingFieldKey[];
  eventId: number;
  taskType: string | null;
  /** The listing_id this save should target — dynamic per the page's current listing switcher
   * selection, so a user with multiple listings always edits the one they're looking at. */
  listingId: number | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TodoListingInput>({
    resolver: zodResolver(todoListingSchema) as any,
    defaultValues: {
      title: listing.title,
      position: listing.position,
      stand_number: listing.standNumber ?? "",
      phone: listing.phone,
      website: listing.website,
      description_short: listing.descriptionShort,
      description: listing.description,
      logo: listing.logo,
      advertise_image: listing.advertiseImage,
      facebook_page_id: listing.facebookPageId,
      twitter_id: listing.twitterId,
      google_page_id: listing.googlePageId,
      linkedin_id: listing.linkedinId,
      linkedin_company_id: listing.linkedinCompanyId,
      pinterest_id: listing.pinterestId,
      youtube_id: listing.youtubeId,
      foursquare_id: listing.foursquareId,
      instagram_id: listing.instagramId,
    },
  });

  const show = (key: ListingFieldKey) => !fields || fields.includes(key);
  const logoValue = watch("logo") ?? "";
  const advertiseImageValue = watch("advertise_image") ?? "";

  async function onSubmit(data: TodoListingInput) {
    setStatus("idle");
    try {
      await axios.patch("/api/members/todo-list/listing", { ...data, listing_id: listingId ?? undefined });
      setStatus("success");
      if (taskType) {
        router.push(`/members/user_event_summary?event_id=${eventId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save your listing details."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {show("title") && (
        <div>
          <label className={LABEL_CLASS}>Listing Title*</label>
          <input {...register("title")} required className={FIELD_CLASS} />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>
      )}

      {show("position") && (
        <div>
          <label className={LABEL_CLASS}>Position (Job Title)*</label>
          <input {...register("position")} required className={FIELD_CLASS} />
          {errors.position && <p className="mt-1 text-xs text-red-600">{errors.position.message}</p>}
        </div>
      )}

      {hasStandNumberField && show("stand_number") && (
        <div>
          <label className={LABEL_CLASS}>Stand Number</label>
          <input {...register("stand_number")} className={FIELD_CLASS} />
        </div>
      )}

      {!fields && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Phone*</label>
              <input {...register("phone")} required className={FIELD_CLASS} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Website</label>
              <input {...register("website")} className={FIELD_CLASS} placeholder="https://" />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <ImageUploadField
              label="Logo"
              value={logoValue}
              onChange={(url) => setValue("logo", url, { shouldDirty: true })}
              kind="logo"
              listingId={listingId}
            />
            <ImageUploadField
              label="Default Stand Image"
              value={advertiseImageValue}
              onChange={(url) => setValue("advertise_image", url, { shouldDirty: true })}
              kind="advertise_image"
              listingId={listingId}
              previewClassName="h-16 w-24 rounded-xl border border-white/10 object-cover"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Full Description</label>
            <textarea {...register("description")} rows={5} className={FIELD_CLASS} />
          </div>

          <fieldset className="rounded-3xl border border-white/10 p-6 bg-white/[0.02]">
            <legend className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
              Social Presence
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>Facebook Page</label>
                <input {...register("facebook_page_id")} className={FIELD_CLASS} placeholder="facebook.com/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>Twitter / X</label>
                <input {...register("twitter_id")} className={FIELD_CLASS} placeholder="twitter.com/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>Google Page</label>
                <input {...register("google_page_id")} className={FIELD_CLASS} placeholder="plus.google.com/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>LinkedIn Profile</label>
                <input {...register("linkedin_id")} className={FIELD_CLASS} placeholder="linkedin.com/pub/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>LinkedIn Company</label>
                <input {...register("linkedin_company_id")} className={FIELD_CLASS} placeholder="linkedin.com/company/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>Pinterest</label>
                <input {...register("pinterest_id")} className={FIELD_CLASS} placeholder="pinterest.com/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>YouTube</label>
                <input {...register("youtube_id")} className={FIELD_CLASS} placeholder="youtube.com/user/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>Foursquare</label>
                <input {...register("foursquare_id")} className={FIELD_CLASS} placeholder="foursquare.com/…" />
              </div>
              <div>
                <label className={LABEL_CLASS}>Instagram</label>
                <input {...register("instagram_id")} className={FIELD_CLASS} placeholder="instagram.com/…" />
              </div>
            </div>
          </fieldset>
        </>
      )}

      {show("description_short") && (
        <div>
          <label className={LABEL_CLASS}>Short Description*</label>
          <textarea {...register("description_short")} required rows={3} className={FIELD_CLASS} />
          {errors.description_short && <p className="mt-1 text-xs text-red-600">{errors.description_short.message}</p>}
        </div>
      )}

      {status === "error" && errorMessage && <p className="text-sm font-bold text-red-500">{errorMessage}</p>}
      {status === "success" && !taskType && (
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-500">
          <CheckCircle2 className="h-4 w-4" /> Listing details updated.
        </p>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-brand-pink px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Submit Changes"}
        </button>
      </div>
    </form>
  );
}

/** Mirrors event_todo_list.php's classifieds table + its Paging class (50 rows/page). */
function ProductsTable({
  products,
  page,
  total,
  listingId,
}: {
  products: TodoProductRow[];
  page: number;
  total: number;
  /** Only needed so paging doesn't drop the current listing selection for a multi-listing user
   * — avoids reading useSearchParams() here (and the Suspense-boundary requirement that comes
   * with it) for what's otherwise a single extra query param. */
  listingId: number | null;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

  if (total === 0) return null;

  function goToPage(nextPage: number) {
    const params = new URLSearchParams();
    if (listingId) params.set("listing_id", String(listingId));
    params.set("products_page", String(nextPage));
    router.push(`/members/event_todo_list?${params.toString()}`);
  }

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-brand-pink" />
          <h4 className="text-sm font-black uppercase tracking-widest text-white">Product Catalog</h4>
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{total} items</span>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((product) => (
                <tr key={product.id} className="align-top hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5 font-bold text-zinc-200">{product.title || "—"}</td>
                  <td className="px-6 py-5 text-zinc-400">
                    {product.description ? product.description.replace(/<[^>]+>/g, "").slice(0, 140) : "—"}
                  </td>
                  <td className="px-6 py-5 text-brand-pink font-black">{product.price ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-brand-pink hover:border-brand-pink transition-all disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:border-white/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-brand-pink hover:border-brand-pink transition-all disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:border-white/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AdvertRow({ advert, listingId }: { advert: TodoAdvertRow; listingId: number | null }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(advert.enabled);
  const [image, setImage] = useState(advert.image ?? "");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSave() {
    setIsSubmitting(true);
    setStatus("idle");
    const parsed = todoAdvertSchema.safeParse({
      advert_size: advert.type,
      enabled,
      image,
      listing_id: listingId ?? undefined,
    });
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage("Please check this advert's details.");
      setIsSubmitting(false);
      return;
    }
    try {
      await axios.patch("/api/members/todo-list/advert", parsed.data);
      setStatus("success");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string" ? err.response.data.error : "Could not save this advert."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-6 transition-all hover:border-brand-pink/30">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="peer h-6 w-6 rounded-lg border-2 border-white/20 bg-transparent checked:bg-brand-pink checked:border-brand-pink transition-all appearance-none cursor-pointer"
            />
            <CheckCircle2 className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
          </div>
          <span className="font-black uppercase tracking-widest text-sm text-white group-hover:text-brand-pink transition-colors">
            {advert.label}
          </span>
        </label>
        {advert.image && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
            <ImagePlus className="h-3 w-3" /> Live
          </span>
        )}
      </div>

      {enabled && (
        <div className="mt-6 space-y-6">
          <ImageUploadField label="Advert Visual" value={image} onChange={setImage} kind={advert.type} listingId={listingId} />
          <button
            type="button"
            onClick={onSave}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-white/10 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-brand-pink disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Update Advert"}
          </button>
        </div>
      )}
      {!enabled && advert.enabled && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onSave}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-red-500/10 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
          >
            {isSubmitting ? "Removing..." : "Deactivate Advert"}
          </button>
        </div>
      )}
      {status === "error" && errorMessage && <p className="mt-3 text-xs font-bold text-red-500">{errorMessage}</p>}
    </div>
  );
}

/** Mirrors the live page's `<select id="listing_id">` switcher: an exhibitor (or organiser)
 * with more than one listing at this event can pick which one the rest of the page — Listing
 * Details, Book My Advert, Product Details — reflects. Changing it navigates with a fresh
 * `?listing_id=` so the server re-fetches everything scoped to that listing, exactly like the
 * legacy `window.location.href = removeParam('listing_id', location.href) + "&listing_id=" + ...`. */
function ListingSwitcher({
  options,
  selectedListingId,
}: {
  options: TodoListingOption[];
  selectedListingId: number | null;
}) {
  const router = useRouter();

  if (options.length <= 1) return null;

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    // This switcher only renders in the full (non-task_type) view, so listing_id is the only
    // query param in play here — mirrors the legacy page's own listing_id-only redirect.
    router.push(`/members/event_todo_list?listing_id=${e.target.value}`);
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4 glass-panel p-6 rounded-3xl border-brand-pink/10">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-brand-pink" />
        <label htmlFor="listing_id" className="text-xs font-black uppercase tracking-widest text-zinc-500">
          Active Listing
        </label>
      </div>
      <select
        id="listing_id"
        value={selectedListingId ?? ""}
        onChange={onChange}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white focus:border-brand-pink focus:outline-none transition-colors"
      >
        {options.map((o) => (
          <option key={o.listingId} value={o.listingId} className="bg-zinc-950">
            {o.label}
          </option>
        ))}
      </select>
      <div className="sm:ml-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Managing {options.length} {options.length === 1 ? "listing" : "listings"}
        </span>
      </div>
    </div>
  );
}

const TABS = [
  { key: "contacts", label: "Contacts for the show", icon: User },
  { key: "listing", label: "Listing Details", icon: Building2 },
  { key: "adverts", label: "Book My Advert", icon: Megaphone },
] as const;

export function TodoListManager({
  contact,
  listing,
  hasStandNumberField,
  adverts,
  products,
  eventId,
  taskType,
  listingOptions,
  selectedListingId,
  productsPage,
  productsTotal,
}: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("contacts");

  if (taskType) {
    const contactFields = TASK_TYPE_CONTACT_FIELDS[taskType];
    const listingFields = TASK_TYPE_LISTING_FIELDS[taskType];
    const title = TASK_TYPE_TITLES[taskType] ?? "Complete This Detail";

    return (
      <div className="glass-panel rounded-3xl border border-brand-pink/20 bg-brand-pink/5 p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <div className="mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-brand-pink" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">Action Required</p>
          </div>
          <h3 className="text-xl font-black uppercase tracking-widest text-white">{title}</h3>
        </div>

        <div className="max-w-lg">
          {contactFields && <ContactForm contact={contact} fields={contactFields} eventId={eventId} taskType={taskType} />}
          {listingFields && listing && (
            <ListingForm
              listing={listing}
              hasStandNumberField={hasStandNumberField}
              fields={listingFields}
              eventId={eventId}
              taskType={taskType}
              listingId={selectedListingId}
            />
          )}
          {listingFields && !listing && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-medium text-zinc-500 italic">No listing is linked to your account for this event.</p>
            </div>
          )}
          {!contactFields && !listingFields && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-medium text-zinc-500 italic">This task type isn&apos;t recognised.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ListingSwitcher options={listingOptions} selectedListingId={selectedListingId} />

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-3 rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                active ? "bg-brand-pink text-white shadow-lg shadow-brand-pink/20" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {tab === "contacts" && (
          <div className="glass-panel rounded-3xl p-8">
            <h3 className="text-lg font-black uppercase tracking-widest text-white mb-8 border-b border-white/5 pb-4">Contact Information</h3>
            <div className="max-w-2xl">
              <ContactForm contact={contact} eventId={eventId} taskType={null} />
            </div>
          </div>
        )}

        {tab === "listing" && (
          <div className="glass-panel rounded-3xl p-8">
            {listing ? (
              <>
                <h3 className="text-lg font-black uppercase tracking-widest text-white mb-8 border-b border-white/5 pb-4">Listing details</h3>
                <div className="max-w-4xl">
                  <ListingForm
                    listing={listing}
                    hasStandNumberField={hasStandNumberField}
                    eventId={eventId}
                    taskType={null}
                    listingId={selectedListingId}
                  />
                  <ProductsTable
                    products={products}
                    page={productsPage}
                    total={productsTotal}
                    listingId={selectedListingId}
                  />
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-zinc-500 font-medium italic">No listing is linked to your account for this event.</p>
              </div>
            )}
          </div>
        )}

        {tab === "adverts" && (
          <div>
            {!listing ? (
              <div className="glass-panel rounded-3xl p-20 text-center border-dashed">
                <p className="text-zinc-500 font-medium italic">
                  No listing is linked to your account for this event, so adverts can&apos;t be booked yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {adverts.map((advert) => (
                  <AdvertRow key={advert.type} advert={advert} listingId={selectedListingId} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
