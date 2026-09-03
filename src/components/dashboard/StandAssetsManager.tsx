"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios, { isAxiosError } from "axios";
import { exhibitorAssetUrl, standTemplateUrl } from "@/lib/assets";
import { slotsForStandLayout, type StandTemplateSlot } from "@/lib/standTemplateSlots";
import {
  Store,
  ExternalLink,
  UploadCloud,
  X,
  FileText,
  Trash2,
  Check,
  AlertTriangle,
  FileDown,
  Link2,
  FolderOpen,
  Eye,
  Pencil,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Share2,
  UserPlus,
  Venus,
  Image as ImageIcon,
  Video,
  CircleDot,
  Info,
} from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  PANEL,
  PANEL_FLUSH,
  PANEL_TOOLBAR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ICON,
  BTN_ICON_DANGER,
  INPUT_FIELD,
  INPUT_SEARCH,
  INPUT_SEARCH_ICON,
  FORM_LABEL,
  FORM_HINT,
  BADGE_SUCCESS,
  BADGE_WARN,
  BADGE_NEUTRAL,
  MODAL_OVERLAY,
  MODAL_PANEL_WIDE,
  MODAL_HEADER,
  MODAL_HEADER_ICON,
  MODAL_TITLE,
  MODAL_SUBTITLE,
  MODAL_CLOSE,
  MODAL_FOOTER,
  ALERT_ERROR,
  ALERT_SUCCESS,
  TABLE,
  TABLE_HEAD_ROW,
  TABLE_TH,
  TABLE_BODY,
  TABLE_ROW,
  TABLE_CELL,
  TABLE_EMPTY,
} from "@/components/ui/membersTheme";

/** Generic booth frame shown whenever an exhibitor hasn't uploaded their own stand background —
 * mirrors the fallback used on the public /virtual-directory/[slug] viewer so the editor canvas
 * never renders blank while an organiser is setting a stand up for the first time. */
const DEFAULT_STAND_TEMPLATE = "/images/stand_img.png";

/**
 * Legacy manage_stand_assets.tpl painted a YouTube/Vimeo poster frame into a video hotspot rather
 * than a placeholder box (`https://img.youtube.com/vi/<id>/0.jpg`). Reproduced here for YouTube,
 * which needs no network call. Vimeo's legacy path hit the oEmbed API server-side, so a video
 * badge stands in for it instead of introducing a client-side fetch.
 */
function youtubePosterUrl(link?: string | null): string | undefined {
  if (!link) return undefined;
  const raw = String(link).trim();
  if (!/youtu\.?be/i.test(raw)) return undefined;
  const id = raw
    .replace(/[?#].*$/, "")
    .split("/")
    .filter(Boolean)
    .pop();
  return id ? `https://img.youtube.com/vi/${id}/0.jpg` : undefined;
}

interface Exhibitor {
  id: number;
  business: string | null;
  name: string | null;
  status: string;
}

interface LobbyChild {
  id: number;
  title: string | null;
  image: string | null;
}

interface Asset {
  id: number;
  title: string | null;
  asset_type: string | null;
  asset_url: string | null;
  asset_attachment: string | null;
  external_link: string | null;
  thumbnail_url: string | null;
  version: number;
}

interface GalleryItem {
  id: number;
  parent_asset_id: number;
  asset_url: string | null;
}

interface Spot {
  id: number;
  title: string | null;
  x_coordinates: string | null;
  y_coordinates: string | null;
  width: string | null;
  height: string | null;
  dimension: string | null;
  spot_type: string | null;
  exhibitor_asset_id: number | null;
  help_text: string | null;
  asset: Asset | null;
  gallery: GalleryItem[];
}

interface Props {
  initialEventId: number;
  userRole: string;
  initialSelectedExId?: string;
  /** This event's friendly_url, used to build the booth URL. */
  eventSlug?: string;
}

export function StandAssetsManager({
  initialEventId,
  userRole,
  initialSelectedExId,
  eventSlug,
}: Props) {
  const [eventId] = useState(initialEventId);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [selectedExId, setSelectedExId] = useState<number | null>(
    initialSelectedExId ? Number(initialSelectedExId) : null
  );

  // Loaded stand asset details
  const [exhibitor, setExhibitor] = useState<any | null>(null);
  const [lobbyChild, setLobbyChild] = useState<LobbyChild | null>(null);
  const [standImage, setStandImage] = useState<string>("");
  /** The Exhibitor Stand Layout's title — decides which fixed slot set this stand offers. */
  const [standLayoutTitle, setStandLayoutTitle] = useState<string>("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [brochures, setBrochures] = useState<Asset[]>([]);
  // Fixed template-slot uploads (top banner, hanging banners, pull-up banners, tabletop image) —
  // only rendered when the exhibitor is on the generic fallback background. Keyed by slot key.
  const [templateAssets, setTemplateAssets] = useState<Record<string, { id: number; imageUrl: string | null }>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const templateSlotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  /**
   * Object URLs for slot images the organiser has just chosen, shown before the upload finishes so
   * the artwork lands on the stand the instant the file is picked. Replaced by the real URL from
   * the server response, or dropped if the upload fails. Kept in a ref alongside the state so the
   * unmount cleanup can revoke them without re-running on every render.
   */
  const [slotPreviews, setSlotPreviews] = useState<Record<string, string>>({});
  const slotPreviewsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    slotPreviewsRef.current = slotPreviews;
  }, [slotPreviews]);

  useEffect(
    () => () => {
      Object.values(slotPreviewsRef.current).forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(true);
  const [zoneName, setZoneName] = useState("");
  const [showBoothPreview, setShowBoothPreview] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Tracks whether the resolved stand background image failed to load, so the canvas can fall
  // back to the generic booth-frame template instead of rendering blank.
  const [standImageFailed, setStandImageFailed] = useState(false);

  // Exhibitor switcher (searchable dropdown)
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState("");
  const switcherRef = useRef<HTMLDivElement>(null);

  // Form states for active asset editing
  const [editLink, setEditLink] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Brochure form states
  const [isBrochureModalOpen, setIsBrochureModalOpen] = useState(false);
  const [brochureTitle, setBrochureTitle] = useState("");
  const [brochureFiles, setBrochureFiles] = useState<FileList | null>(null);

  /**
   * Fetch stand assets data based on selectedExId.
   *
   * `background: true` refreshes the data WITHOUT tearing the canvas down behind the full-panel
   * "Loading stand layout…" spinner. Every mutation used to call this bare, so uploading a banner
   * blanked the whole designer for the length of a round trip and the new artwork appeared to take
   * seconds to arrive. The blocking spinner is now only for the first load and for switching
   * exhibitor, where there genuinely is nothing to show yet.
   */
  async function loadData(options?: { background?: boolean }) {
    if (!options?.background) setLoading(true);
    setErrorMessage(null);
    try {
      const url = `/api/members/stand-assets?event_id=${eventId}${
        selectedExId ? `&ex_id=${selectedExId}` : ""
      }`;
      const res = await axios.get(url);
      setExhibitors(res.data.exhibitors || []);
      setSelectedExId(res.data.selectedExId);
      setExhibitor(res.data.exhibitor || null);
      setZoneName(res.data.zoneName || "");
      setLobbyChild(res.data.lobbyChild || null);
      setStandImage(res.data.standImage || "");
      setStandLayoutTitle(res.data.standLayoutTitle || "");
      setSpots(res.data.spots || []);
      setBrochures(res.data.brochures || []);
      setTemplateAssets(res.data.templateAssets || {});
    } catch (err: any) {
      setErrorMessage("Failed to load stand asset configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedExId]);

  /**
   * Mirror the selected exhibitor into the URL: ?event_id=<id>&ex_id=<id>.
   *
   * Uses history.replaceState rather than router.replace deliberately. This page is a server
   * component, so a Next navigation would re-run it, remount this manager and re-fetch the whole
   * stand — the canvas would blink every time the organiser picked a name from the dropdown.
   * replaceState only rewrites the address bar, which is all that is wanted: the link is
   * copy-pasteable, a refresh reopens the same stand, and Back still works.
   *
   * Runs on any change to selectedExId, so it also captures the exhibitor the API auto-selects on
   * first load, not just an explicit pick from the dropdown.
   */
  useEffect(() => {
    if (typeof window === "undefined" || !selectedExId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("ex_id") === String(selectedExId)) return;
    url.searchParams.set("event_id", String(eventId));
    url.searchParams.set("ex_id", String(selectedExId));
    window.history.replaceState(window.history.state, "", url.toString());
  }, [selectedExId, eventId]);

  // Give a freshly-uploaded background a clean chance to load instead of sticking on the
  // previous image's failure state.
  useEffect(() => {
    setStandImageFailed(false);
  }, [standImage]);

  // Close the exhibitor switcher when clicking outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredExhibitors = useMemo(() => {
    const q = switcherQuery.trim().toLowerCase();
    if (!q) return exhibitors;
    return exhibitors.filter((ex) =>
      `${ex.business || ""} ${ex.name || ""}`.toLowerCase().includes(q)
    );
  }, [exhibitors, switcherQuery]);

  const selectedExhibitorOption = exhibitors.find((ex) => ex.id === selectedExId) || null;

  // Close the share menu when clicking outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Public booth URL for this exhibitor — used by "View My Booth" and both share actions.
  // friendly_url isn't always set on legacy rows, so fall back to a query-param link the
  // exhibitors directory can resolve instead of pointing at a route that will 404.
  // The real booth: /virtual-event/<event slug>?mybooth=1&ex_id=<id>. Keyed on the exhibitor's id
  // rather than their friendly_url, which is empty on most migrated rows — that is why this used
  // to fall back to a directory search link instead of opening the stand.
  const boothPath =
    eventSlug && selectedExId
      ? `/virtual-event/${eventSlug}?mybooth=1&ex_id=${selectedExId}`
      : exhibitor?.friendly_url
        ? `/virtual-directory/${exhibitor.friendly_url}`
        : `/exhibitors?ex_id=${selectedExId ?? ""}`;
  const boothUrl = typeof window !== "undefined" ? `${window.location.origin}${boothPath}` : boothPath;

  async function handleCopyBoothLink() {
    try {
      await navigator.clipboard.writeText(boothUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      window.prompt("Copy your booth link:", boothUrl);
    }
  }

  const socialShareLinks = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(boothUrl)}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(boothUrl)}`,
    },
    {
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(boothUrl)}&text=${encodeURIComponent(
        `Visit our stand at ${exhibitor?.business || "the show"}`
      )}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`Visit our stand: ${boothUrl}`)}`,
    },
  ];

  // Handle saving of edited spot asset
  async function handleSaveAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSpot || !activeSpot.asset) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("action", "update_asset");
    formData.append("ex_id", String(selectedExId));
    formData.append("event_id", String(eventId));
    formData.append("asset_id", String(activeSpot.asset.id));
    formData.append("asset_link", editLink);

    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }
    }

    try {
      await axios.post("/api/members/stand-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMessage(`Asset "${activeSpot.title || "Spot"}" updated successfully.`);
      setSelectedFiles(null);
      setActiveSpot(null);
      loadData({ background: true });
    } catch (err: any) {
      setErrorMessage(
        isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to save asset. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // Handle removing a file from gallery
  async function handleRemoveGalleryItem(assetId: number, galleryId: number) {
    if (!window.confirm("Are you sure you want to delete this upload?")) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(
        `/api/members/stand-assets?action=remove_gallery_item&ex_id=${selectedExId}&asset_id=${assetId}&gallery_id=${galleryId}`
      );
      setSuccessMessage("Upload removed successfully.");
      loadData({ background: true });
      if (activeSpot) {
        setActiveSpot((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            gallery: prev.gallery.filter((g) => g.id !== galleryId),
          };
        });
      }
    } catch (err) {
      setErrorMessage("Could not remove the upload.");
    }
  }

  // Handle adding brochure
  async function handleAddBrochure(e: React.FormEvent) {
    e.preventDefault();
    if (!brochureFiles || brochureFiles.length === 0) {
      alert("Please choose a brochure file first.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("action", "add_brochure");
    formData.append("ex_id", String(selectedExId));
    formData.append("event_id", String(eventId));
    formData.append("brochure_title", brochureTitle || "Document Brochure");
    formData.append("files", brochureFiles[0]);

    try {
      await axios.post("/api/members/stand-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMessage("Brochure uploaded successfully!");
      setBrochureTitle("");
      setBrochureFiles(null);
      loadData({ background: true });
    } catch (err: any) {
      setErrorMessage("Failed to upload brochure document.");
    } finally {
      setSaving(false);
    }
  }

  // Handle deleting brochure
  async function handleDeleteBrochure(brochureId: number) {
    if (!window.confirm("Are you sure you want to delete this brochure?")) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(
        `/api/members/stand-assets?action=delete_brochure&ex_id=${selectedExId}&id=${brochureId}`
      );
      setSuccessMessage("Brochure deleted successfully.");
      loadData({ background: true });
    } catch (err) {
      setErrorMessage("Could not delete the brochure.");
    }
  }

  // Toggle active/pending status of the stand
  async function handleToggleStatus(publish: boolean) {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const formData = new FormData();
      formData.append("action", "save_status");
      formData.append("ex_id", String(selectedExId));
      formData.append("publish", String(publish));

      await axios.post("/api/members/stand-assets", formData);
      setSuccessMessage(
        publish ? "Your exhibition stand is now active/published!" : "Your exhibition stand is unpublished."
      );
      loadData({ background: true });
    } catch (err) {
      setErrorMessage("Could not update stand publishing status.");
    }
  }

  // Browse + upload a single fixed template-slot image (top banner, hanging banner, pull-up
  // banner, tabletop image) — each slot always shows exactly one image, so this replaces rather
  // than accumulates a gallery.
  async function handleUploadTemplateSlot(slotKey: string, file?: File) {
    if (!file) return;

    // A video slot (the Basic Stand's wall screen) takes an mp4/webm; everything else takes an
    // image. The route re-checks this — the browser check just fails faster and more clearly.
    const slot = activeSlots.find((s) => s.key === slotKey);
    const wantsVideo = slot?.kind === "video";
    if (wantsVideo && !file.type.startsWith("video/")) {
      setErrorMessage("That slot is the stand's screen — please choose an MP4 or WebM video.");
      return;
    }
    if (!wantsVideo && !file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file for this banner slot.");
      return;
    }

    // Paint it immediately from the local file. The upload still has to happen, but the organiser
    // sees the banner on the stand straight away instead of watching a spinner.
    const previewUrl = URL.createObjectURL(file);
    setSlotPreviews((prev) => {
      const stale = prev[slotKey];
      if (stale) URL.revokeObjectURL(stale);
      return { ...prev, [slotKey]: previewUrl };
    });

    setUploadingSlot(slotKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("action", "update_template_asset");
    formData.append("ex_id", String(selectedExId));
    formData.append("event_id", String(eventId));
    formData.append("slot_key", slotKey);
    formData.append("files", file);

    try {
      const res = await axios.post("/api/members/stand-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // The route answers with the stored filename and asset id, which is everything this slot
      // needs — so there is no refetch at all on the happy path, and nothing to wait for.
      const { assetId, imageUrl } = res.data ?? {};
      if (imageUrl) {
        setTemplateAssets((prev) => ({
          ...prev,
          [slotKey]: { id: Number(assetId) || prev[slotKey]?.id || 0, imageUrl: String(imageUrl) },
        }));
        setSlotPreviews((prev) => {
          const done = prev[slotKey];
          if (done) URL.revokeObjectURL(done);
          const next = { ...prev };
          delete next[slotKey];
          return next;
        });
      } else {
        // Older/unexpected response shape — fall back to a silent refresh rather than guessing.
        loadData({ background: true });
      }
      setSuccessMessage("Banner image updated.");
    } catch (err: any) {
      // Drop the optimistic preview so the stand never shows artwork that was not saved.
      setSlotPreviews((prev) => {
        const failed = prev[slotKey];
        if (failed) URL.revokeObjectURL(failed);
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
      setErrorMessage(
        isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to upload this banner image."
      );
    } finally {
      setUploadingSlot(null);
    }
  }

  // Helper to parse coordinates from dimension JSON string
  const parsedSpots = useMemo(() => {
    return spots.map((spot) => {
      let x = 0;
      let y = 0;
      let width = 12;
      let height = 12;

      if (spot.dimension) {
        try {
          const d = JSON.parse(spot.dimension);
          x = parseFloat(d.x ?? spot.x_coordinates ?? "0");
          y = parseFloat(d.y ?? spot.y_coordinates ?? "0");
          width = parseFloat(d.width ?? spot.width ?? "12");
          height = parseFloat(d.height ?? spot.height ?? "12");
        } catch {
          x = parseFloat(spot.x_coordinates || "0");
          y = parseFloat(spot.y_coordinates || "0");
          width = parseFloat(spot.width || "12");
          height = parseFloat(spot.height || "12");
        }
      } else {
        x = parseFloat(spot.x_coordinates || "0");
        y = parseFloat(spot.y_coordinates || "0");
        width = parseFloat(spot.width || "12");
        height = parseFloat(spot.height || "12");
      }

      return {
        ...spot,
        coordinates: { x, y, width, height },
      };
    });
  }, [spots]);

  /**
   * Which upload areas this stand offers.
   *
   * The Basic Stand's artwork has a header, two centre rectangles, a table-front banner and a
   * wall SCREEN that takes a video; the standard stand has a header, two hanging banners, two
   * pull-ups and a tabletop. Reusing one set of coordinates across both put upload boxes in
   * mid-air, so the set is chosen from the layout's own title. See slotsForStandLayout().
   */
  const activeSlots: StandTemplateSlot[] = useMemo(
    // standImage is passed as well as the title because migrated layout rows often have no title
    // at all — the artwork itself is what the coordinates were measured against.
    () => slotsForStandLayout(standLayoutTitle, standImage),
    [standLayoutTitle, standImage]
  );

  /** How many of this stand's slots already carry media — the "x of n placed" readout. */
  const filledSlotCount = useMemo(
    () => activeSlots.filter((slot) => templateAssets[slot.key]?.imageUrl).length,
    [activeSlots, templateAssets]
  );

  /** Human list of the areas, for the header line and the legend. */
  const slotSummary = useMemo(() => activeSlots.map((s) => s.label).join(", "), [activeSlots]);

  // Determine background stand image url path
  const resolvedStandImage = useMemo(() => {
    if (!standImage) return "";
    if (standImage.startsWith("/")) return standImage;
    return standTemplateUrl(standImage) ?? "";
  }, [standImage]);

  const isPublished = exhibitor?.status === "active";

  if (loading) {
    return (
      <div className={`${PANEL} flex flex-col items-center justify-center py-16 text-zinc-400`}>
        <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-brand-pink border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading stand layout…</p>
      </div>
    );
  }

  if (!loading && exhibitors.length === 0) {
    return (
      <div className={`${PANEL} flex flex-col items-center justify-center gap-3 py-16 text-center`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
          <Store className="h-7 w-7" />
        </div>
        <p className="text-base font-black uppercase tracking-tight text-white">No exhibitors for this event</p>
        <p className="max-w-md text-xs font-medium text-zinc-400">
          Event #{eventId} has no{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-[11px] text-fuchsia-300">find_event_exhibitor</code>{" "}
          rows yet, so there is no stand to configure. Register an exhibitor for this event first.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------ sidebar */
  /** Right-hand action rail — the same six links the legacy `.right-view-booth` column carried,
   *  restyled onto the Members glass surface and laid out in-flow instead of `position: fixed`. */
  const sidebarLink =
    "flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:border-brand-pink/50 hover:bg-white/10 hover:text-white";

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- alerts */}
      {errorMessage && (
        <div className={`${ALERT_ERROR} flex items-center gap-2`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className={`${ALERT_SUCCESS} flex items-center gap-2`}>
          <Check className="h-4 w-4 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------ toolbar */}
      <div className={PANEL_TOOLBAR}>
        <div className="w-full lg:max-w-md">
          <span className={FORM_LABEL}>Exhibitor stand</span>
          {userRole === "organiser" || exhibitors.length > 1 ? (
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setSwitcherOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs font-bold text-white transition hover:border-brand-pink/50"
              >
                <Store className="h-4 w-4 shrink-0 text-brand-pink" />
                <span className="truncate text-left">
                  {selectedExhibitorOption
                    ? `${selectedExhibitorOption.business || "Unnamed Business"} (${
                        selectedExhibitorOption.name || "Exhibitor"
                      })`
                    : "Select exhibitor"}
                </span>
                <ChevronDown
                  className={`ml-auto h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                    switcherOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {switcherOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#140f22] shadow-2xl">
                  <div className="relative border-b border-white/10 p-3">
                    <Search className={INPUT_SEARCH_ICON} />
                    <input
                      autoFocus
                      value={switcherQuery}
                      onChange={(e) => setSwitcherQuery(e.target.value)}
                      placeholder="Search exhibitors…"
                      className={INPUT_SEARCH}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto overscroll-contain">
                    {filteredExhibitors.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs font-medium text-zinc-500">
                        No exhibitors match.
                      </p>
                    ) : (
                      filteredExhibitors.map((ex) => {
                        const isSelected = ex.id === selectedExId;
                        const isInactive = ex.status && ex.status !== "active";
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => {
                              setSelectedExId(ex.id);
                              setSwitcherOpen(false);
                              setSwitcherQuery("");
                            }}
                            className={`flex w-full items-center gap-2 border-l-4 px-4 py-2.5 text-left text-xs transition ${
                              isSelected
                                ? "border-brand-pink bg-brand-pink/10 font-black text-white"
                                : "border-transparent font-semibold hover:bg-white/5"
                            } ${isInactive ? "text-zinc-500" : "text-zinc-200"}`}
                          >
                            <span className="truncate">
                              {ex.business || "Unnamed Business"} ({ex.name || "Exhibitor"})
                            </span>
                            {isInactive && <span className={`${BADGE_NEUTRAL} ml-auto shrink-0`}>Pending</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs font-bold text-white">
              <Store className="h-4 w-4 shrink-0 text-brand-pink" />
              <span className="truncate">
                {selectedExhibitorOption
                  ? `${selectedExhibitorOption.business || "Unnamed Business"} (${
                      selectedExhibitorOption.name || "Exhibitor"
                    })`
                  : "My Stand"}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={isPublished ? BADGE_SUCCESS : BADGE_WARN}>
            {isPublished ? "Published" : "Unpublished"}
          </span>
          <button type="button" onClick={() => setIsBrochureModalOpen(true)} className={BTN_SECONDARY}>
            <FolderOpen className="h-4 w-4" /> Brochures ({brochures.length})
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(!isPublished)}
            className={BTN_PRIMARY}
            disabled={!selectedExId}
          >
            <UploadCloud className="h-4 w-4" /> {isPublished ? "Unpublish Stand" : "Publish Stand"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------- canvas + action rail */}
      <div className={`grid grid-cols-1 gap-6 ${menuVisible ? "xl:grid-cols-[minmax(0,1fr)_19rem]" : ""}`}>
        {/* ---------------------------------------------------------- canvas */}
        <div className={PANEL_FLUSH}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                Stand Designer
                {/* The layout name is what picks the slot set (slotsForStandLayout). Showing it
                    makes a mismatch obvious — "these boxes are in the wrong place" and "this stand
                    is on a layout I have no slot set for" look identical without it. */}
                <span className={BADGE_NEUTRAL} title="Exhibitor Stand Layout / background artwork">
                  {standLayoutTitle || standImage || "Default layout"}
                </span>
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                {activeSlots.length} upload areas: {slotSummary}. Hover one and click the upload icon
                to add or change its media.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={BADGE_NEUTRAL}>
                {filledSlotCount} / {activeSlots.length} placed
              </span>
              {!menuVisible && (
                <button
                  type="button"
                  onClick={() => setMenuVisible(true)}
                  className={BTN_ICON}
                  title="Show menu"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full overflow-hidden bg-black/60" style={{ aspectRatio: "16/9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedStandImage && !standImageFailed ? resolvedStandImage : DEFAULT_STAND_TEMPLATE}
              alt="Stand Background Template"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setStandImageFailed(true)}
            />

            {/* The SIX browse/upload areas — the only editable points on the stand: header banner,
                the two hanging top banners, the two pull-up banners, and the tabletop panel.
                Positions come from the layout's own slot set, whose percentage boxes line up with the
                seeded stand templates as well as the generic fallback, so they are drawn on every
                background rather than only on stand_img.png. */}
            {activeSlots.map((slot) => {
                const uploaded = templateAssets[slot.key];
                // The local preview wins while an upload is in flight; after it lands the two are
                // the same file anyway, so the swap is invisible.
                const slotImageUrl =
                  slotPreviews[slot.key] ||
                  (uploaded?.imageUrl ? exhibitorAssetUrl(uploaded.imageUrl) : undefined);
                const isUploading = uploadingSlot === slot.key;
                const isVideoSlot = slot.kind === "video";

                return (
                  <div
                    key={slot.key}
                    className="group absolute rounded-sm border-2 border-dashed border-brand-pink/50 bg-brand-pink/5 transition hover:border-brand-pink hover:bg-brand-pink/15"
                    style={{
                      left: `${slot.left}%`,
                      top: `${slot.top}%`,
                      width: `${slot.width}%`,
                      height: `${slot.height}%`,
                    }}
                    title={`${slot.label} — ${slot.helpText}`}
                  >
                    {slotImageUrl &&
                      (isVideoSlot ? (
                        // Muted + loop so a stand full of screens is not a wall of noise; the
                        // public booth plays it the same way.
                        <video
                          key={slotImageUrl}
                          src={slotImageUrl}
                          className="absolute inset-0 h-full w-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slotImageUrl}
                          alt={slot.label}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ))}

                    {!slotImageUrl && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center text-[9px] font-black uppercase leading-tight tracking-wider text-white/70 opacity-0 transition group-hover:opacity-100">
                        {slot.label}
                      </span>
                    )}

                    <input
                      ref={(el) => {
                        templateSlotInputRefs.current[slot.key] = el;
                      }}
                      type="file"
                      accept={isVideoSlot ? "video/*" : "image/*"}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        handleUploadTemplateSlot(slot.key, file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => templateSlotInputRefs.current[slot.key]?.click()}
                      disabled={isUploading || !selectedExId}
                      className="absolute -right-3 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-[#140f22] text-zinc-300 opacity-0 shadow-lg transition hover:border-brand-pink hover:text-brand-pink group-hover:opacity-100 disabled:opacity-40"
                      title={`Browse & upload — ${slot.label} (${slot.helpText})`}
                    >
                      {isUploading ? (
                        <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-pink border-t-transparent" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                    </button>
                </div>
              );
            })}

            {/* Existing hotspot artwork, READ-ONLY.
                These are the DB-driven find_event_lobby_spots overlays. They still paint whatever
                the exhibitor has already saved (a top banner, a video poster) so nothing that is
                live on the public booth disappears from the editor — but they no longer carry a
                dashed box or a pencil. Editing happens only at the six named slots above; drawing
                an upload target on all thirteen hotspots, icon tiles and screens included, is what
                made the canvas unreadable. */}
            {parsedSpots.map((spot) => {
              const { x, y, width, height } = spot.coordinates;
              const hasUpload = spot.gallery && spot.gallery.length > 0;
              const isBrochure =
                spot.spot_type === "layout" || spot.title?.toLowerCase().includes("brochure");
              const assetType = (spot.asset?.asset_type || "").toLowerCase();
              const isVideo = assetType === "video";
              const poster = isVideo
                ? youtubePosterUrl(spot.asset?.external_link || spot.asset?.asset_url)
                : undefined;

              // Nothing to paint — an empty hotspot is now invisible rather than a marker.
              if (!(hasUpload && !isBrochure) && !poster) return null;

              return (
                <div
                  key={spot.id}
                  className="pointer-events-none absolute"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width ? width + "%" : "auto"}`,
                    height: `${height ? height + "%" : "auto"}`,
                    minWidth: width ? "auto" : "100px",
                    minHeight: height ? "auto" : "40px",
                  }}
                  title={spot.title || undefined}
                >
                  {hasUpload && !isBrochure && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={exhibitorAssetUrl(spot.gallery[0].asset_url)}
                      className="absolute inset-0 h-full w-full object-contain"
                      alt={spot.title || "Asset"}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}

                  {/* Legacy parity: a video hotspot renders its YouTube poster frame. */}
                  {poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt={spot.title || "Video"}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend — names the six areas so the dashed boxes need no tooltip hunt. */}
          <div className="flex flex-wrap items-center gap-4 border-t border-white/10 px-6 py-3 text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border-2 border-dashed border-brand-pink/60" /> Upload area
            </span>
            <span className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-brand-pink" /> {slotSummary}
            </span>
            {lobbyChild?.title && (
              <span className="ml-auto flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Template: {lobbyChild.title}
              </span>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------ action rail */}
        {menuVisible && (
          <aside className="space-y-3">
            <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300">Zone</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-tight text-white">
                    {zoneName || "Not assigned"}
                  </p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Stand no. — {exhibitor?.stand_number || "0"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuVisible(false)}
                  className={BTN_ICON}
                  title="Hide menu"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button type="button" onClick={() => setShowBoothPreview(true)} className={`${sidebarLink} w-full`}>
              <Eye className="h-4 w-4 shrink-0 text-brand-pink" /> View My Booth
            </button>

            {/* `?ex_id=<id>` opens the list page with the Edit Trade Stand MODAL already on this
                exhibitor — the behaviour asked for from the stand designer. (The dedicated
                full-details page still exists at `?action=edit&id=<id>`; it is simply not what this
                button uses.) */}
            {/* next/link, not <a>: it prefetches the route so the Edit Trade Stand modal opens on
                an already-fetched page, and navigates client-side instead of reloading the app. */}
            <Link
              href={
                selectedExId
                  ? `/members/view_exhibitor?event_id=${eventId}&ex_id=${selectedExId}&from_view_booth=1`
                  : `/members/view_exhibitor?event_id=${eventId}`
              }
              className={sidebarLink}
            >
              <Venus className="h-4 w-4 shrink-0 text-brand-pink" /> Exhibitor Full Details
            </Link>

            <Link
              href={`/dashboard/my-event/team-members${eventId ? `?event_id=${eventId}` : ""}`}
              className={sidebarLink}
            >
              <UserPlus className="h-4 w-4 shrink-0 text-brand-pink" /> Manage My Team
            </Link>

            <div className="relative" ref={shareMenuRef}>
              <button
                type="button"
                onClick={() => setShareMenuOpen((v) => !v)}
                className={`${sidebarLink} w-full text-left`}
              >
                <Share2 className="h-4 w-4 shrink-0 text-brand-pink" /> Share via Social Media
              </button>
              {shareMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#140f22] shadow-2xl">
                  {socialShareLinks.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setShareMenuOpen(false)}
                      className="block px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-white/5 hover:text-brand-pink"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyBoothLink}
              className={
                shareCopied
                  ? "flex w-full items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-300 transition"
                  : `${sidebarLink} w-full`
              }
            >
              {shareCopied ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Link2 className="h-4 w-4 shrink-0 text-brand-pink" />
              )}
              {shareCopied ? "Link Copied!" : "Share My Booth Link"}
            </button>

            <button
              type="button"
              onClick={() => handleToggleStatus(!isPublished)}
              className={
                isPublished
                  ? "flex w-full items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/20 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500 hover:text-white"
                  : "flex w-full items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
              }
            >
              <UploadCloud className="h-4 w-4 shrink-0" />
              {isPublished ? "Unpublish Stand" : "Publish Stand"}
            </button>

            {/* Brochures at a glance — the legacy sidebar had no counterpart, but the brochure
                modal is otherwise the only place these are visible. */}
            <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300">Brochures</p>
                <button
                  type="button"
                  onClick={() => setIsBrochureModalOpen(true)}
                  className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline"
                >
                  Manage
                </button>
              </div>
              {brochures.length === 0 ? (
                <p className="mt-3 text-[11px] font-medium text-zinc-500">No documents uploaded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {brochures.slice(0, 4).map((bro) => (
                    <li key={bro.id} className="flex items-center gap-2 text-[11px] font-semibold text-zinc-300">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-brand-pink" />
                      <span className="truncate">{bro.title}</span>
                    </li>
                  ))}
                  {brochures.length > 4 && (
                    <li className="text-[11px] font-medium text-zinc-500">
                      +{brochures.length - 4} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* -------------------------------------------------- Asset Editor Modal */}
      {activeSpot && (
        <ModalPortal>
          <div className={MODAL_OVERLAY}>
            <div className={`${MODAL_PANEL_WIDE} max-h-[90vh] overflow-y-auto`}>
              <div className={MODAL_HEADER}>
                <div className="flex items-center gap-3">
                  <div className={MODAL_HEADER_ICON}>
                    <ImageIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={MODAL_TITLE}>Select Asset Block</h3>
                    <p className={MODAL_SUBTITLE}>{activeSpot.title || "Stand panel"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveSpot(null)} className={MODAL_CLOSE} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeSpot.help_text && (
                <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-bold text-zinc-300">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-pink" />
                  <span>{activeSpot.help_text}</span>
                </div>
              )}

              <form onSubmit={handleSaveAsset} className="space-y-5">
                <div>
                  <label className={FORM_LABEL}>Asset Link</label>
                  <input
                    type="url"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    placeholder="https://youtube.com/… , https://vimeo.com/… or any URL"
                    className={INPUT_FIELD}
                  />
                  <p className={FORM_HINT}>
                    YouTube and Vimeo links are converted to an embed automatically.
                  </p>
                </div>

                <div>
                  <label className={FORM_LABEL}>Upload File(s)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-pink/20 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-wider file:text-fuchsia-200 hover:file:bg-brand-pink/30"
                  />
                </div>

                {activeSpot.gallery && activeSpot.gallery.length > 0 && (
                  <div>
                    <label className={FORM_LABEL}>Current files</label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {activeSpot.gallery.map((g) => (
                        <div
                          key={g.id}
                          className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={exhibitorAssetUrl(g.asset_url)}
                            alt="Upload preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryItem(activeSpot.asset!.id, g.id)}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/90 text-white opacity-0 shadow-lg transition hover:bg-rose-500 group-hover:opacity-100"
                            title="Delete file"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={MODAL_FOOTER}>
                  <button type="button" onClick={() => setActiveSpot(null)} className={BTN_SECONDARY}>
                    Close
                  </button>
                  <button type="submit" disabled={saving} className={`${BTN_PRIMARY} disabled:opacity-50`}>
                    <Check className="h-4 w-4" /> {saving ? "Saving…" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ----------------------------------------------- Brochure Manager Modal */}
      {isBrochureModalOpen && (
        <ModalPortal>
          <div className={MODAL_OVERLAY}>
            <div className={`${MODAL_PANEL_WIDE} max-h-[90vh] overflow-y-auto`}>
              <div className={MODAL_HEADER}>
                <div className="flex items-center gap-3">
                  <div className={MODAL_HEADER_ICON}>
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={MODAL_TITLE}>Upload Brochure(s)</h3>
                    <p className={MODAL_SUBTITLE}>Documents visitors can download from your stand.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBrochureModalOpen(false)}
                  className={MODAL_CLOSE}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddBrochure} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <label className={FORM_LABEL}>Title</label>
                  <input
                    type="text"
                    required
                    value={brochureTitle}
                    onChange={(e) => setBrochureTitle(e.target.value)}
                    placeholder="Catalogue 2026"
                    className={INPUT_FIELD}
                  />
                </div>
                <div>
                  <label className={FORM_LABEL}>File</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setBrochureFiles(e.target.files)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/50 px-4 py-[0.6rem] text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-pink/20 file:px-3 file:py-1.5 file:text-[11px] file:font-black file:uppercase file:tracking-wider file:text-fuchsia-200 hover:file:bg-brand-pink/30"
                  />
                </div>
                <button type="submit" disabled={saving} className={`${BTN_PRIMARY} justify-center disabled:opacity-50`}>
                  <UploadCloud className="h-4 w-4" /> {saving ? "Uploading…" : "Add"}
                </button>
              </form>

              {/* Legacy `ex-list-view` brochure table, restyled onto the Members table tokens. */}
              <div className={`${PANEL_FLUSH} overflow-x-auto`}>
                <table className={TABLE}>
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <th className={TABLE_TH}>Title</th>
                      <th className={TABLE_TH}>File</th>
                      <th className={`${TABLE_TH} text-right`}>Manage</th>
                    </tr>
                  </thead>
                  <tbody className={TABLE_BODY}>
                    {brochures.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={TABLE_EMPTY}>
                          No brochures uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      brochures.map((bro) => (
                        <tr key={bro.id} className={TABLE_ROW}>
                          <td className={`${TABLE_CELL} font-bold text-white`}>
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-brand-pink" />
                              {bro.title}
                            </span>
                          </td>
                          <td className={`${TABLE_CELL} max-w-[16rem] truncate text-zinc-400`}>
                            {bro.asset_attachment}
                          </td>
                          <td className={TABLE_CELL}>
                            <div className="flex items-center justify-end gap-2">
                              {bro.asset_attachment && (
                                <a
                                  href={exhibitorAssetUrl(bro.asset_attachment)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={BTN_ICON}
                                  title="Download"
                                >
                                  <FileDown className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteBrochure(bro.id)}
                                className={BTN_ICON_DANGER}
                                title="Delete"
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

              <div className={MODAL_FOOTER}>
                <button type="button" onClick={() => setIsBrochureModalOpen(false)} className={BTN_SECONDARY}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ------------------- Booth Preview Modal (read-only, no edit pencils) */}
      {showBoothPreview && (
        <ModalPortal>
          <div className={MODAL_OVERLAY}>
            <div className={`${MODAL_PANEL_WIDE} max-h-[90vh] overflow-y-auto`}>
              <div className={MODAL_HEADER}>
                <div className="flex items-center gap-3">
                  <div className={MODAL_HEADER_ICON}>
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={MODAL_TITLE}>{exhibitor?.business || "My Booth"}</h3>
                    <p className={MODAL_SUBTITLE}>This is what visitors see on your stand.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBoothPreview(false)}
                  className={MODAL_CLOSE}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* The whole preview is the link to the live booth — clicking the stand is the
                  obvious gesture, and it lands on the same URL "Share My Booth Link" copies. */}
              <a
                href={boothPath}
                title="Open this booth"
                className="group relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60 transition hover:border-brand-pink/50"
                style={{ aspectRatio: "16/9" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedStandImage && !standImageFailed ? resolvedStandImage : DEFAULT_STAND_TEMPLATE}
                  alt="Stand preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {parsedSpots.map((spot) => {
                  const { x, y, width, height } = spot.coordinates;
                  const hasUpload = spot.gallery && spot.gallery.length > 0;
                  if (!hasUpload) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={spot.id}
                      src={exhibitorAssetUrl(spot.gallery[0].asset_url)}
                      alt={spot.title || "Asset"}
                      className="absolute object-contain"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width ? width + "%" : "auto"}`,
                        height: `${height ? height + "%" : "auto"}`,
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  );
                })}

                {/* The six uploaded slot images — header banner, the two hanging banners, the two
                    pull-ups and the tabletop. The preview used to draw only the DB hotspots above,
                    so a stand whose artwork lives in the slots looked empty here even though the
                    designer (and the public booth) showed it. Drawn last, and in the same
                    coordinates the designer uses, so the two views match. */}
                {activeSlots.map((slot) => {
                  const uploaded = templateAssets[slot.key];
                  const src =
                    slotPreviews[slot.key] ||
                    (uploaded?.imageUrl ? exhibitorAssetUrl(uploaded.imageUrl) : undefined);
                  if (!src) return null;
                  const style = {
                    left: `${slot.left}%`,
                    top: `${slot.top}%`,
                    width: `${slot.width}%`,
                    height: `${slot.height}%`,
                  };
                  return slot.kind === "video" ? (
                    <video
                      key={`tpl-${slot.key}`}
                      src={src}
                      className="absolute object-cover"
                      style={style}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`tpl-${slot.key}`}
                      src={src}
                      alt={slot.label}
                      className="absolute object-contain"
                      style={style}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  );
                })}
                {/* Hover affordance — without it a full-bleed image gives no hint it is clickable. */}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-900 shadow-lg">
                    <ExternalLink className="h-4 w-4" />
                    Open booth
                  </span>
                </span>
              </a>

              <div className={`${MODAL_FOOTER} items-center justify-between`}>
                <p className="truncate text-[11px] font-medium text-zinc-500">{boothUrl}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <a href={boothPath} className={BTN_PRIMARY}>
                    <ExternalLink className="h-4 w-4" />
                    Open Booth
                  </a>
                  <button type="button" onClick={() => setShowBoothPreview(false)} className={BTN_SECONDARY}>
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
