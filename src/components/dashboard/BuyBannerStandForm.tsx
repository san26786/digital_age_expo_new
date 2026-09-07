"use client";

import { useMemo, useState } from "react";
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
import type { BannerStandFormOptions } from "@/lib/services/eventBannerStandPurchase";

interface Props {
  eventId: number;
  initial: BannerStandFormOptions;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);

/**
 * ---------------------------------------------------------------------------
 * Choose Banner Stand Payment.
 * ---------------------------------------------------------------------------
 *
 * Checkboxes, a listing select and a derived Total — the same three things the legacy form has.
 * CHECKBOXES, not radios: the legacy adds the prices of every ticked option together, so more
 * than one can be bought in a single order. That is the one structural difference from the
 * speaker slot form, which picks exactly one.
 */
export function BuyBannerStandForm({ eventId, initial }: Props) {
  const router = useRouter();
  /*
   * A single option is ticked to begin with, as the legacy renders it — with one option there is
   * nothing to choose, and leaving it unticked only makes the buyer click twice. With several,
   * nothing is preselected, because a pre-ticked extra is a charge nobody asked for.
   */
  const [chosen, setChosen] = useState<number[]>(
    initial.options.length === 1 ? [initial.options[0].id] : []
  );
  const [listingId, setListingId] = useState(
    initial.listings.length === 1 ? String(initial.listings[0].id) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderId: number; total: number; description: string } | null>(
    null
  );

  const subtotal = useMemo(
    () => initial.options.filter((o) => chosen.includes(o.id)).reduce((s, o) => s + o.price, 0),
    [initial.options, chosen]
  );

  const toggle = (id: number) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (chosen.length === 0) return setError("Tick at least one banner stand option.");
    if (!listingId) return setError("Choose the listing this banner stand applies to.");

    setSubmitting(true);
    try {
      const res = await axios.post("/api/members/buy-banner-stand", {
        event_id: eventId,
        option_ids: chosen,
        listing_id: Number(listingId),
      });
      setReceipt({
        orderId: res.data.orderId,
        total: res.data.total,
        description: res.data.description,
      });
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
          The invoice stays unpaid until it is settled, and the stand now appears under Manage
          Banner Stand.
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

      <fieldset>
        <legend className={FORM_LABEL}>
          Banner Stand <span className="text-brand-pink">*</span>
        </legend>
        {initial.options.length === 0 ? (
          <p className={FORM_HINT}>
            No banner stand options are set up on this platform yet — they are configured as
            custom fields in the banner stand field group.
          </p>
        ) : (
          <div className="space-y-2">
            {initial.options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                  chosen.includes(option.id)
                    ? "border-brand-pink bg-brand-pink/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={chosen.includes(option.id)}
                    onChange={() => toggle(option.id)}
                    className="mt-0.5 h-4 w-4 rounded text-brand-pink focus:ring-brand-pink"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">{option.name}</span>
                    {/* The legacy's small print under the checkbox — "£150 per banner". */}
                    {option.description && (
                      <span className="mt-0.5 block text-xs text-zinc-400">{option.description}</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-brand-pink">
                  {currency(option.price)}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

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
          {initial.listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <p className={FORM_HINT}>
          {initial.listings.length === 0
            ? "You have no businesses listed yet — a banner stand has to be attached to one."
            : "The banner stand will be credited to this business."}
        </p>
      </div>

      <div>
        <label className={FORM_LABEL}>Total</label>
        {/* Derived and read-only. The server re-reads every price from find_fields when raising
            the order, so this is a display of what is ticked, not an input into the purchase. */}
        <p className={`${INPUT_FIELD} !bg-white/5`}>{currency(subtotal)}</p>
        {chosen.length > 0 && (
          <p className={FORM_HINT}>Plus 20% VAT — {currency(subtotal * 1.2)} total payable.</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || chosen.length === 0 || !listingId}
          className={`${BTN_PRIMARY} w-full justify-center disabled:opacity-50`}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Raising order…" : "Submit"}
        </button>
        <p className="mt-3 text-center text-xs font-semibold text-brand-pink">
          Discount Code can be applied on the invoice
        </p>
      </div>
    </form>
  );
}
