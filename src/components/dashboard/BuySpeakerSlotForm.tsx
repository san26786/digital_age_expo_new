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
import type { SpeakerSlotFormOptions } from "@/lib/services/eventSpeakerSlotPurchase";

interface Props {
  eventId: number;
  initial: SpeakerSlotFormOptions;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);

/**
 * ---------------------------------------------------------------------------
 * Choose Speaker Slot Payment.
 * ---------------------------------------------------------------------------
 *
 * Radios for the slots, a listing select, a derived Total — the same three things the legacy
 * form has. The slot options are find_fields rows in group 21, which is why they arrive as a
 * name and a price rather than from a table of their own.
 */
export function BuySpeakerSlotForm({ eventId, initial }: Props) {
  const router = useRouter();
  const [slotId, setSlotId] = useState(
    initial.slots.length === 1 ? String(initial.slots[0].id) : ""
  );
  const [listingId, setListingId] = useState(
    initial.listings.length === 1 ? String(initial.listings[0].id) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderId: number; total: number; description: string } | null>(
    null
  );

  const selected = useMemo(
    () => initial.slots.find((s) => String(s.id) === slotId) ?? null,
    [initial.slots, slotId]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!slotId) return setError("Choose a speaker slot.");
    if (!listingId) return setError("Choose the listing this slot applies to.");

    setSubmitting(true);
    try {
      const res = await axios.post("/api/members/buy-speaker-slot", {
        event_id: eventId,
        slot_id: Number(slotId),
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
        <p className={FORM_HINT}>The invoice stays unpaid until it is settled.</p>
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
          Speaker Slot <span className="text-brand-pink">*</span>
        </legend>
        {initial.slots.length === 0 ? (
          <p className={FORM_HINT}>
            No speaker slots are set up on this platform yet — they are configured as custom fields
            in group 21.
          </p>
        ) : (
          <div className="space-y-2">
            {initial.slots.map((slot) => (
              <label
                key={slot.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                  String(slot.id) === slotId
                    ? "border-brand-pink bg-brand-pink/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="slot"
                    value={slot.id}
                    checked={String(slot.id) === slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    className="h-4 w-4 text-brand-pink focus:ring-brand-pink"
                  />
                  <span className="text-sm font-semibold text-white">{slot.name}</span>
                </span>
                <span className="text-sm font-bold text-brand-pink">{currency(slot.price)}</span>
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
            ? "You have no businesses listed yet — a speaker slot has to be attached to one."
            : "The speaker slot will be available to this business."}
        </p>
      </div>

      <div>
        <label className={FORM_LABEL}>Total</label>
        {/* Derived and read-only. The server re-reads the price from find_fields when raising the
            order, so this is a display of the chosen slot, not an input into the purchase. */}
        <p className={`${INPUT_FIELD} !bg-white/5`}>{currency(selected?.price ?? 0)}</p>
        {selected && (
          <p className={FORM_HINT}>Plus 20% VAT — {currency(selected.price * 1.2)} total payable.</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !slotId || !listingId}
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
