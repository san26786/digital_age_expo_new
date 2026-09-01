"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Plus, Pencil, Trash2, Search, X, Globe } from "lucide-react";
import { publicationContactSchema, type PublicationContactInput } from "@/lib/validations/publicationContact";
import type { PublicationContactRow } from "@/lib/services/publicationContacts";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

interface FormDefaults extends Partial<PublicationContactInput> {
  id?: number;
}

/** Mirrors the legacy tpl's auto-prefixing of `//` for LinkedIn URLs that don't start with http(s),
 * so a bare "linkedin.com/in/..." value still opens as a working link. */
function toHref(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `//${trimmed}`;
}

function PublicationContactFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
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
    formState: { errors, isSubmitting },
  } = useForm<PublicationContactInput>({
    resolver: zodResolver(publicationContactSchema) as any,
    defaultValues: {
      type: defaultValues?.type ?? "",
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      telephone: defaultValues?.telephone ?? "",
      linkedin_user_profile: defaultValues?.linkedin_user_profile ?? "",
    },
  });

  async function onSubmit(data: PublicationContactInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/publication-contacts/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/publication-contacts", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this contact. Please check the form and try again."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
            {isEdit ? "Edit Contact" : "Add Contact"}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Type*</label>
            <input {...register("type")} className={FIELD_CLASS} placeholder="Press, Media, Blogger…" />
            {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Contact Name*</label>
            <input {...register("name")} className={FIELD_CLASS} />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Email*</label>
            <input {...register("email")} type="email" className={FIELD_CLASS} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Telephone*</label>
            <input {...register("telephone")} className={FIELD_CLASS} />
            {errors.telephone && <p className="mt-1 text-xs text-red-400">{errors.telephone.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">LinkedIn Profile</label>
            <input {...register("linkedin_user_profile")} className={FIELD_CLASS} placeholder="https://www.linkedin.com/in/…" />
          </div>

          {errorMessage && <p className="text-sm text-red-400 font-medium">{errorMessage}</p>}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full btn-brand-gradient px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

export function PublicationContactsManager({ contacts }: { contacts: PublicationContactRow[] }) {
  const router = useRouter();
  const [modalContact, setModalContact] = useState<PublicationContactRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.type, c.name, c.email, c.telephone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [contacts, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  async function remove(id: number) {
    if (!window.confirm("Remove this contact? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/publication-contacts/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this contact. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setModalContact(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-zinc-400 font-medium">Press and media contacts for this event's publications.</p>
        <button
          onClick={() => setModalContact("new")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {errorMessage && <p className="text-sm text-red-400 font-medium">{errorMessage}</p>}

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by type, name, email or telephone…"
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/40 backdrop-blur-md">
        <table className="w-full min-w-[760px] text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
              <th className="px-6 py-4 font-black uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Telephone</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">LinkedIn</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-medium">
                  {contacts.length === 0 ? "No publication contacts have been added yet." : "No contacts match your search."}
                </td>
              </tr>
            )}
            {paged.map((contact) => (
              <tr key={contact.id} className="hover:bg-white/5 transition align-middle">
                <td className="px-5 py-4 font-semibold text-white">
                  <span className="rounded-full bg-brand-pink/10 px-2.5 py-1 text-xs font-bold text-brand-pink border border-brand-pink/20">
                    {contact.type}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-white">{contact.name}</td>
                <td className="px-5 py-4 text-zinc-300">{contact.email}</td>
                <td className="px-5 py-4 text-zinc-300">{contact.telephone}</td>
                <td className="px-5 py-4">
                  {contact.linkedinUserProfile ? (
                    <a
                      href={toHref(contact.linkedinUserProfile)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-pink hover:text-brand-pink/80 transition font-bold"
                    >
                      <Globe className="h-4 w-4" /> Profile
                    </a>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalContact(contact)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-brand-pink hover:text-white hover:border-brand-pink transition"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      disabled={pendingId === contact.id}
                      onClick={() => remove(contact.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} className="mt-4" />

      {modalContact && (
        <PublicationContactFormModal
          defaultValues={
            modalContact === "new"
              ? undefined
              : {
                  id: modalContact.id,
                  type: modalContact.type,
                  name: modalContact.name,
                  email: modalContact.email,
                  telephone: modalContact.telephone,
                  linkedin_user_profile: modalContact.linkedinUserProfile ?? "",
                }
          }
          onClose={() => setModalContact(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}