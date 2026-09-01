"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Play,
  Video,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface OrganiserVideo {
  id: number;
  title: string;
  videoUrl: string;
  duration: string;
  speaker: string;
  status: "Active" | "Hidden";
  viewsCount: number;
  createdAt: string;
}

const INITIAL_VIDEOS: OrganiserVideo[] = [
  {
    id: 1,
    title: "Official 2026 Event Teaser Highlight",
    videoUrl:
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "2 mins 45 secs",
    speaker: "Event Production Team",
    status: "Active",
    viewsCount: 1420,
    createdAt: "2026-07-20",
  },
  {
    id: 2,
    title: "Keynote: Robotics in Healthcare & Logistics",
    videoUrl:
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "45 mins 12 secs",
    speaker: "Dr. Elena Rostova",
    status: "Active",
    viewsCount: 680,
    createdAt: "2026-07-26",
  },
  {
    id: 3,
    title:
      "Panel Discussion: Sustainable Cleantech Supply Chain",
    videoUrl:
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "30 mins 00 secs",
    speaker:
      "Julian Rivers, Sarah Connor & guests",
    status: "Hidden",
    viewsCount: 0,
    createdAt: "2026-07-29",
  },
];

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

export default function ManageOrganiserVideosPage() {
  const [videos, setVideos] =
    useState<OrganiserVideo[]>(INITIAL_VIDEOS);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [activePlayer, setActivePlayer] =
    useState<OrganiserVideo | null>(null);

  const [editingVideo, setEditingVideo] =
    useState<OrganiserVideo | null>(null);

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formTitle, setFormTitle] =
    useState("");

  const [formUrl, setFormUrl] =
    useState("");

  const [formDuration, setFormDuration] =
    useState("");

  const [formSpeaker, setFormSpeaker] =
    useState("");

  const [formStatus, setFormStatus] =
    useState<"Active" | "Hidden">(
      "Active"
    );

  const [toastMessage, setToastMessage] =
    useState("");

  const [page, setPage] =
    useState(1);

  const pageSize = 12;

  const showToast = (msg: string) => {
    setToastMessage(msg);

    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  const openAddModal = () => {
    setEditingVideo(null);
    setFormTitle("");
    setFormUrl(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
    setFormDuration("5 mins");
    setFormSpeaker("Panelists");
    setFormStatus("Active");
    setModalOpen(true);
  };

  const openEditModal = (
    video: OrganiserVideo
  ) => {
    setEditingVideo(video);
    setFormTitle(video.title);
    setFormUrl(video.videoUrl);
    setFormDuration(video.duration);
    setFormSpeaker(video.speaker);
    setFormStatus(video.status);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVideo(null);
  };

  const handleSave = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!formTitle.trim()) return;

    if (editingVideo) {
      setVideos(
        videos.map((v) =>
          v.id === editingVideo.id
            ? {
                ...v,
                title:
                  formTitle.trim(),
                videoUrl:
                  formUrl.trim(),
                duration:
                  formDuration.trim(),
                speaker:
                  formSpeaker.trim(),
                status:
                  formStatus,
              }
            : v
        )
      );

      showToast(
        "Video playlist entry updated!"
      );
    } else {
      const newItem: OrganiserVideo = {
        id: Date.now(),
        title: formTitle.trim(),
        videoUrl: formUrl.trim(),
        duration:
          formDuration.trim(),
        speaker:
          formSpeaker.trim(),
        status: formStatus,
        viewsCount: 0,
        createdAt: new Date()
          .toISOString()
          .split("T")[0],
      };

      setVideos([
        newItem,
        ...videos,
      ]);

      showToast(
        "Video link successfully integrated!"
      );
    }

    closeModal();
  };

  const handleDelete = (
    id: number
  ) => {
    if (
      confirm(
        "Are you sure you want to remove this video link from curation?"
      )
    ) {
      setVideos(
        videos.filter(
          (v) => v.id !== id
        )
      );

      showToast(
        "Video link removed."
      );
    }
  };

  const filtered = videos.filter(
    (v) =>
      v.title
        .toLowerCase()
        .includes(
          searchQuery.toLowerCase()
        ) ||
      v.speaker
        .toLowerCase()
        .includes(
          searchQuery.toLowerCase()
        )
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider brand-gradient-text">
            Manage Crated Videos
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-400">
            Curate, embed, and showcase promotional videos,
            recorded presentations, keynote sessions, and webinars
            for this event.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Video Link
        </button>
      </div>

      {/* TOAST */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/15 p-4 text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />

          <span className="text-sm font-bold">
            {toastMessage}
          </span>
        </div>
      )}

      {/* SEARCH */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />

        <input
          type="text"
          placeholder="Search videos by title or speaker..."
          value={searchQuery}
          onChange={(e) =>
            setSearchQuery(
              e.target.value
            )
          }
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </div>

      {/* VIDEO GRID */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-white/10 bg-zinc-950/30 p-12 text-center font-medium text-zinc-500">
            No video entries found matching your criteria.
          </div>
        )}

        {filtered.map((vid) => (
          <div
            key={vid.id}
            className="group flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40 transition hover:border-white/20"
          >
            <div
              className="relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden border-b border-white/5 bg-zinc-900"
              onClick={() =>
                setActivePlayer(vid)
              }
            >
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <Video className="h-10 w-10 text-zinc-600 transition duration-500 group-hover:scale-105 group-hover:text-brand-pink" />
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="rounded-full bg-brand-pink p-3.5 shadow-xl shadow-brand-pink/20">
                  <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
                </span>
              </div>

              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-white/10 bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
                <Clock className="h-3 w-3" />
                {vid.duration}
              </span>

              <span
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  vid.status ===
                  "Active"
                    ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                }`}
              >
                {vid.status}
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <h4 className="line-clamp-1 text-sm font-black text-white transition group-hover:text-brand-pink">
                  {vid.title}
                </h4>

                <p className="mt-1 line-clamp-1 text-xs font-semibold text-zinc-400">
                  Speaker: {vid.speaker}
                </p>

                <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {vid.createdAt}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {vid.viewsCount} plays
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-white/5 pt-3">
                <button
                  onClick={() =>
                    openEditModal(
                      vid
                    )
                  }
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-bold text-zinc-200 transition hover:border-brand-pink hover:bg-brand-pink hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>

                <button
                  onClick={() =>
                    handleDelete(
                      vid.id
                    )
                  }
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 transition hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        className="mt-4"
      />

      {/* =====================================================
          VIDEO PLAYER MODAL
          ===================================================== */}
      {activePlayer &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div
            className="fixed inset-0 z-[9999] grid h-screen w-screen place-items-center overflow-y-auto overscroll-contain bg-black/90 p-4"
            onClick={() =>
              setActivePlayer(null)
            }
          >
            <button
              type="button"
              onClick={() =>
                setActivePlayer(null)
              }
              className="absolute right-5 top-5 z-[10000] text-white hover:text-zinc-400"
            >
              <X className="h-8 w-8" />
            </button>

            <div
              className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <iframe
                src={
                  activePlayer.videoUrl
                }
                title={
                  activePlayer.title
                }
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
    </ModalPortal>,
          document.body
        )}

      {/* =====================================================
          ADD / EDIT VIDEO MODAL
          ===================================================== */}
      {modalOpen &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div
            className="fixed inset-0 z-[9999] grid h-screen w-screen place-items-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-md"
            onClick={closeModal}
          >
            <div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 text-white shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
                  {editingVideo
                    ? "Edit Video Details"
                    : "Curate Video Link"}
                </h3>

                <button
                  type="button"
                  onClick={closeModal}
                  className="text-zinc-400 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSave}
                className="mt-5 grid gap-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">
                    Video Title*
                  </label>

                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) =>
                      setFormTitle(
                        e.target.value
                      )
                    }
                    className={FIELD_CLASS}
                    placeholder="e.g. Cleantech Sector Pitch Highlights"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">
                    Embed Video URL*
                  </label>

                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) =>
                      setFormUrl(
                        e.target.value
                      )
                    }
                    className={FIELD_CLASS}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">
                      Speaker / Presenter
                    </label>

                    <input
                      type="text"
                      required
                      value={
                        formSpeaker
                      }
                      onChange={(e) =>
                        setFormSpeaker(
                          e.target.value
                        )
                      }
                      className={FIELD_CLASS}
                      placeholder="e.g. Marcus Vance"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">
                      Duration Info
                    </label>

                    <input
                      type="text"
                      required
                      value={
                        formDuration
                      }
                      onChange={(e) =>
                        setFormDuration(
                          e.target.value
                        )
                      }
                      className={FIELD_CLASS}
                      placeholder="e.g. 15 mins 30 secs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">
                    Display Curation Status
                  </label>

                  <select
                    value={
                      formStatus
                    }
                    onChange={(e) =>
                      setFormStatus(
                        e.target
                          .value as
                          | "Active"
                          | "Hidden"
                      )
                    }
                    className={FIELD_CLASS}
                  >
                    <option
                      value="Active"
                      className="bg-zinc-950 text-white"
                    >
                      Active (Render public-facing)
                    </option>

                    <option
                      value="Hidden"
                      className="bg-zinc-950 text-white"
                    >
                      Hidden (Admin Draft Only)
                    </option>
                  </select>
                </div>

                <div className="mt-2 flex justify-end gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-full btn-brand-gradient px-6 py-2.5 text-sm font-bold text-white"
                  >
                    Save Curation
                  </button>
                </div>
              </form>
            </div>
          </div>
    </ModalPortal>,
          document.body
        )}
    </div>
  );
}