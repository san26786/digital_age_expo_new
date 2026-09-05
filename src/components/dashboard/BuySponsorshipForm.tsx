"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios, { isAxiosError } from "axios";
import { AlertTriangle, ArrowRight, Check, Loader2 } from "lucide-react";

import {
  PANEL,
  BTN_PRIMARY,
  INPUT_FIELD,
  FORM_LABEL,
  FORM_HINT,
  ALERT_ERROR,
  ALERT_SUCCESS,
} from "@/components/ui/membersTheme";
import type { SponsorshipFormOptions } from "@/lib/services/eventSponsorshipPurchase";

interface Props {
  eventId: number;
  initial: SponsorshipFormOptions;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);

/**
 * ---------------------------------------------------------------------------
 * Choose Sponsorship.
 * ---------------------------------------------------------------------------
 *
 * The four selects cascade: Event Category narrows Sponsorship Type, and both narrow Sponsorship
 * Option, whose price fills List Price.
 *
 * The legacy cascaded by NAVIGATION — its selects wrote `category_id` / `sponsor_type` back into
 * the URL and reloaded advertise.php, rebuilding the page to change one dropdown. This refetches
 * the option lists instead, so the other selections survive.
 */
export function BuySponsorshipForm({ eventId, initial }: Props) {
  const router = useRouter();
  const [options, setOptions] = useState(initial);
  const [categoryId, setCategoryId] = useState("");
  const [sponsorType, setSponsorType] = useState("");
  const [sponsorshipId, setSponsorshipId] = useState("");
  const [listingId, setListingId] = useState(
    initial.listings.length === 1 ? String(initial.listings[0].id) : ""
  );
  const [narrowing, setNarrowing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderId: number; total: number; description: string } | null>(
    null
  );

  /** Re-narrow the option list whenever category or type changes. */
  useEffect(() => {
    let cancelled = false;
    async function narrow() {
      setNarrowing(true);
      try {
        const params = new URLSearchParams({ event_id: String(eventId) });
        if (categoryId) params.set("category_id", categoryId);
        if (sponsorType) params.set("sponsor_type", sponsorType);
        const res = await axios.get(`/api/members/buy-sponsorship?${params.toString()}`);
        if (cancelled) return;
        setOptions(res.data);
      } catch {
        if (!cancelled) setError("Could not load sponsorship options.");
      } finally {
        if (!cancelled) setNarrowing(false);
      }
    }
    // Skip the initial render — the server already provided the unnarrowed lists.
    if (categoryId || sponsorType) void narrow();
    return () => {
      cancelled = true;
    };
  }, [eventId, categoryId, sponsorType]);

  /*
   * A chosen option that the new, narrower list no longer contains has to be cleared, or List
   * Price keeps showing the price of something that is no longer selectable.
   */
  useEffect(() => {
    if (sponsorshipId && !options.options.some((o) => String(o.id) === sponsorshipId)) {
      setSponsorshipId("");
    }
  }, [options, sponsorshipId]);

  const selected = useMemo(
    () => options.options.find((o) => String(o.id) === sponsorshipId) ?? null,
    [options, sponsorshipId]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sponsorshipId) return setError("Choose a sponsorship option.");
    if (!listingId) return setError("Choose the listing this sponsorship applies to.");

    setSubmitting(true);
    try {
      const res = await axios.post("/api/members/buy-sponsorship", {
        event_id: eventId,
        sponsorship_id: Number(sponsorshipId),
        listing_id: Number(listingId),
      });
      setReceipt({
        orderId: res.data.orderId,
        total: res.data.total,
        description: res.data.description,
      });
      // The invoice is the payment page in this app, so send them there to settle it.
      router.prefetch(`/members/event_invoices?event_id=${eventId}`);
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not raise this order."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className={`${PANEL} space-y-4`}>
        <div className={`${ALERT_SUCCESS} flex items-center gap-2`}>
          <Check className="h-4 w-4 shrink-0" />
          <span>Order #{receipt.orderId} raised for {receipt.description}.</span>
        </div>
        <p className="text-sm text-zinc-300">
          Total payable including VAT: <strong className="text-white">{currency(receipt.total)}</strong>
        </p>
        <p className={FORM_HINT}>
          The invoice is unpaid until it is settled. Discount codes are applied on the invoice, as
          on the legacy payments page.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/members/event_invoices?event_id=${eventId}`)}
          className={BTN_PRIMARY}
        >
          View Invoices <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`${PANEL} space-y-5`}>
      {error && (
        <div className={`${ALERT_ERROR} flex items-center gap-2`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className={FORM_LABEL}>Event Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={INPUT_FIELD}>
          <option value="">Select Event Category</option>
          {options.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={FORM_LABEL}>Sponsorship Type</label>
        <select value={sponsorType} onChange={(e) => setSponsorType(e.target.value)} className={INPUT_FIELD}>
          <option value="">Nothing selected</option>
          {options.sponsorTypes.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={FORM_LABEL}>
          Sponsorship Option <span className="text-brand-pink">*</span>
        </label>
        <select
          value={sponsorshipId}
          onChange={(e) => setSponsorshipId(e.target.value)}
          className={INPUT_FIELD}
          required
        >
          <option value="">Select Sponsorship</option>
          {options.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {narrowing ? (
          <p className={`${FORM_HINT} flex items-center gap-1.5`}>
            <Loader2 className="h-3 w-3 animate-spin" /> Narrowing options…
          </p>
        ) : options.options.length === 0 ? (
          <p className={FORM_HINT}>No sponsorship options match this category and type.</p>
        ) : null}
      </div>

      <div>
        <label className={FORM_LABEL}>
          Listing <span className="text-brand-pink">*</span>
        </label>
        <select
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className={INPUT_FIELD}
          required
        >
          <option value="">Select a listing</option>
          {options.listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <p className={FORM_HINT}>
          {options.listings.length === 0
            ? "You have no businesses listed yet — a sponsorship has to be attached to one."
            : "The sponsorship will be credited to this business."}
        </p>
      </div>

      <div>
        <label className={FORM_LABEL}>List Price</label>
        {/*
          * Read-only and derived, never an input. The server re-reads the price from
          * find_sponsorship_categories when raising the order, so this is a display of the
          * chosen option rather than a number that can be edited into the purchase.
          */}
        <p className={`${INPUT_FIELD} !bg-white/5`}>
          {selected ? currency(selected.price) : currency(0)}
        </p>
        {selected && (
          <p className={FORM_HINT}>Plus 20% VAT — {currency(selected.price * 1.2)} total payable.</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !sponsorshipId || !listingId}
          className={`${BTN_PRIMARY} w-full justify-center disabled:opacity-50`}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Raising order…" : "Proceed and View Payments Page"}
        </button>
        <p className="mt-3 text-center text-xs font-semibold text-brand-pink">
          Discount Code can be applied on the invoice
        </p>
      </div>
    </form>
  );
}
