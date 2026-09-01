"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { useState } from "react";
import { X } from "lucide-react";
import { eventTeamMemberSchema, type EventTeamMemberInput } from "@/lib/validations/eventTeamMember";

import { ModalPortal } from "@/components/ui/ModalPortal";
const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-all";

export interface TeamMemberFormDefaults extends Partial<EventTeamMemberInput> {
  id?: number;
}

interface Props {
  defaultValues?: TeamMemberFormDefaults;
  onClose: () => void;
  onSaved: () => void;
}

export function TeamMemberFormModal({ defaultValues, onClose, onSaved }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventTeamMemberInput>({
    resolver: zodResolver(eventTeamMemberSchema) as any,
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      work_phone: defaultValues?.work_phone ?? "",
      position: defaultValues?.position ?? "",
      status: defaultValues?.status ?? "Pending",
      linkedin_user_profile: defaultValues?.linkedin_user_profile ?? "",
      description: defaultValues?.description ?? "",
      is_contact: defaultValues?.is_contact ?? false,
      enable_chat: defaultValues?.enable_chat ?? false,
    },
  });

  async function onSubmit(data: EventTeamMemberInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/team-members/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/team-members", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this team member. Please check the form and try again."
      );
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-xl">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tight text-white">
            {isEdit ? "Edit Team Member" : "Add Team Member"}
          </h3>
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-zinc-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">First Name*</label>
              <input {...register("first_name")} className={FIELD_CLASS} placeholder="e.g. John" />
              {errors.first_name && <p className="mt-1 text-xs font-bold text-red-400">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Name*</label>
              <input {...register("last_name")} className={FIELD_CLASS} placeholder="e.g. Doe" />
              {errors.last_name && <p className="mt-1 text-xs font-bold text-red-400">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Email Address*</label>
            <input {...register("email")} type="email" className={FIELD_CLASS} placeholder="email@example.com" />
            {errors.email && <p className="mt-1 text-xs font-bold text-red-400">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Mobile*</label>
              <input {...register("work_phone")} className={FIELD_CLASS} placeholder="+44..." />
              {errors.work_phone && <p className="mt-1 text-xs font-bold text-red-400">{errors.work_phone.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Other Phone</label>
              <input {...register("phone")} className={FIELD_CLASS} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Job Title / Position*</label>
            <input {...register("position")} className={FIELD_CLASS} placeholder="e.g. Sales Director" />
            {errors.position && <p className="mt-1 text-xs font-bold text-red-400">{errors.position.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">LinkedIn Profile URL</label>
            <input {...register("linkedin_user_profile")} className={FIELD_CLASS} placeholder="https://linkedin.com/in/username" />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Description / Bio</label>
            <textarea {...register("description")} rows={3} className={`${FIELD_CLASS} resize-none`} placeholder="Brief introduction..." />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Event Registration Status</label>
            <select {...register("status")} className={FIELD_CLASS}>
              <option value="Pending" className="bg-zinc-900">Pending Approval</option>
              <option value="Registered" className="bg-zinc-900">Registered / Active</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-8 p-4 rounded-2xl bg-white/5 border border-white/5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" {...register("is_contact")} className="h-5 w-5 rounded-lg border-white/10 bg-zinc-800 text-brand-pink focus:ring-brand-pink focus:ring-offset-0" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition">Primary Contact</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" {...register("enable_chat")} className="h-5 w-5 rounded-lg border-white/10 bg-zinc-800 text-brand-purple focus:ring-brand-purple focus:ring-offset-0" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition">Enable Live Chat</span>
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-bold text-red-400">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition shadow-xl"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-brand-gradient rounded-full px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl transition hover:scale-105 disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : isEdit ? "Save Member" : "Create Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
