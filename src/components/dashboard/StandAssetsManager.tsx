"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import axios, { isAxiosError } from "axios";
import { exhibitorAssetUrl, standTemplateUrl } from "@/lib/assets";
import { STAND_TEMPLATE_SLOTS } from "@/lib/standTemplateSlots";
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
  Sparkles,
  Link2,
  FolderOpen,
  ArrowRight,
  Eye,
  Pencil,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Share2,
  UserPlus,
  Venus,
} from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
/** Generic booth frame shown whenever an exhibitor hasn't uploaded their own stand background —
 * mirrors the fallback used on the public /virtual-directory/[slug] viewer so the editor canvas
 * never renders blank while an organiser is setting a stand up for the first time. */
const DEFAULT_STAND_TEMPLATE = "/images/stand_img.png";

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
}

export function StandAssetsManager({ initialEventId, userRole, initialSelectedExId }: Props) {
  const router = useRouter();
  const [eventId] = useState(initialEventId);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [selectedExId, setSelectedExId] = useState<number | null>(
    initialSelectedExId ? Number(initialSelectedExId) : null
  );
  
  // Loaded stand asset details
  const [exhibitor, setExhibitor] = useState<any | null>(null);
  const [lobbyChild, setLobbyChild] = useState<LobbyChild | null>(null);
  const [standImage, setStandImage] = useState<string>("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [brochures, setBrochures] = useState<Asset[]>([]);
  // Fixed template-slot uploads (top banner, hanging banners, pull-up banners, tabletop image) —
  // only rendered when the exhibitor is on the generic fallback background. Keyed by slot key.
  const [templateAssets, setTemplateAssets] = useState<Record<string, { id: number; imageUrl: string | null }>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const templateSlotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Fetch stand assets data based on selectedExId
  async function loadData() {
    setLoading(true);
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
  const boothPath = exhibitor?.friendly_url
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
      loadData();
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
      loadData();
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
      setIsBrochureModalOpen(false);
      loadData();
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
      loadData();
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
      loadData();
    } catch (err) {
      setErrorMessage("Could not update stand publishing status.");
    }
  }

  // Browse + upload a single fixed template-slot image (top banner, hanging banner, pull-up
  // banner, tabletop image) — each slot always shows exactly one image, so this replaces rather
  // than accumulates a gallery.
  async function handleUploadTemplateSlot(slotKey: string, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file for this banner slot.");
      return;
    }

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
      await axios.post("/api/members/stand-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMessage("Banner image updated.");
      loadData();
    } catch (err: any) {
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

  // Determine background stand image url path
  const resolvedStandImage = useMemo(() => {
    if (!standImage) return "";
    if (standImage.startsWith("/")) return standImage;
    return standTemplateUrl(standImage) ?? "";
  }, [standImage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-widget-surface p-12 text-zinc-500">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3" />
        <p className="text-sm font-medium">Loading layout template spots...</p>
      </div>
    );
  }

  if (!loading && exhibitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-widget-surface p-16 text-center">
        <Store className="h-12 w-12 text-zinc-400" />
        <p className="text-base font-bold text-zinc-700">No exhibitors found for this event.</p>
        <p className="max-w-md text-sm text-zinc-500">
          This event (#{eventId}) has no <code className="rounded bg-black/5 px-1 py-0.5">find_event_exhibitor</code> rows
          in the connected database yet, so there's no stand to configure. Register an exhibitor for this event first,
          or double-check the database connection.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-screen h-[70vh] min-h-[560px] max-h-[860px] bg-widget-surface flex flex-col font-sans shadow-2xl"
      style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
    >

      {/* Top Left Exhibitor Selector */}
      <div className="absolute top-4 left-4 z-50">
        {userRole === "organiser" || exhibitors.length > 1 ? (
          <div className="relative" ref={switcherRef}>
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex items-center gap-2 bg-white text-sky-900 border border-sky-600 rounded px-4 py-2 text-sm font-bold uppercase tracking-wide shadow focus:outline-none min-w-[240px] max-w-[360px]"
            >
              <span className="truncate">
                {selectedExhibitorOption
                  ? `${selectedExhibitorOption.business || "Unnamed Business"} (${selectedExhibitorOption.name || "Exhibitor"})`
                  : "Select exhibitor"}
              </span>
              <ChevronDown className={`h-4 w-4 ml-auto shrink-0 text-sky-700 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
            </button>

            {switcherOpen && (
              <div className="absolute left-0 top-full mt-1 w-[340px] max-w-[80vw] bg-white border border-gray-200 rounded shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    value={switcherQuery}
                    onChange={(e) => setSwitcherQuery(e.target.value)}
                    placeholder="Search exhibitors..."
                    className="w-full text-sm text-gray-800 outline-none"
                  />
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {filteredExhibitors.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-gray-400 font-medium">No exhibitors match.</p>
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
                          className={`w-full text-left px-4 py-2 text-sm border-l-4 transition ${
                            isSelected
                              ? "border-sky-500 bg-sky-50 text-sky-800 font-bold"
                              : "border-transparent hover:bg-gray-50"
                          } ${isInactive ? "text-gray-400" : "text-gray-800"}`}
                        >
                          {ex.business || "Unnamed Business"} ({ex.name || "Exhibitor"})
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white text-sky-900 border border-sky-600 rounded px-4 py-2 text-sm font-bold uppercase tracking-wide shadow">
            {selectedExhibitorOption
              ? `${selectedExhibitorOption.business || "Unnamed Business"} (${selectedExhibitorOption.name || "Exhibitor"})`
              : "My Stand"}
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        <div className="relative w-full h-full max-w-full" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedStandImage && !standImageFailed ? resolvedStandImage : DEFAULT_STAND_TEMPLATE}
            alt="Stand Background Template"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setStandImageFailed(true)}
          />

          {/* Fixed template-slot browse/upload points — only meaningful while the generic fallback
              background is what's actually showing (no real seeded stand template for this
              exhibitor yet). Positions are hand-measured against stand_img.png; see
              STAND_TEMPLATE_SLOTS. */}
          {(!resolvedStandImage || standImageFailed) &&
            STAND_TEMPLATE_SLOTS.map((slot) => {
              const uploaded = templateAssets[slot.key];
              const slotImageUrl = uploaded?.imageUrl ? exhibitorAssetUrl(uploaded.imageUrl) : undefined;
              const isUploading = uploadingSlot === slot.key;

              return (
                <div
                  key={slot.key}
                  className="absolute flex items-center justify-center border-2 border-dashed border-sky-400/60 bg-black/5 transition hover:border-sky-500 hover:bg-black/10 group"
                  style={{
                    left: `${slot.left}%`,
                    top: `${slot.top}%`,
                    width: `${slot.width}%`,
                    height: `${slot.height}%`,
                  }}
                  title={`${slot.label} — ${slot.helpText}`}
                >
                  {slotImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slotImageUrl}
                      alt={slot.label}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}

                  <input
                    ref={(el) => {
                      templateSlotInputRefs.current[slot.key] = el;
                    }}
                    type="file"
                    accept="image/*"
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
                    className="absolute -top-3 -right-3 z-20 rounded border border-gray-300 bg-white p-1.5 text-gray-500 opacity-0 shadow-md transition hover:bg-sky-50 hover:text-sky-600 group-hover:opacity-100 disabled:opacity-50"
                    title={`Browse & upload — ${slot.label} (${slot.helpText})`}
                  >
                    {isUploading ? (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}

          {/* Overlaid Spots */}
          {parsedSpots.map((spot) => {
            const { x, y, width, height } = spot.coordinates;
            const hasUpload = spot.gallery && spot.gallery.length > 0;
            const isBrochure = spot.spot_type === 'layout' || spot.title?.toLowerCase().includes("brochure");

            return (
              <div
                key={spot.id}
                className="absolute flex items-center justify-center border-2 border-dashed border-sky-400/50 hover:border-sky-500 bg-black/5 hover:bg-black/10 transition group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${width ? width + '%' : 'auto'}`,
                  height: `${height ? height + '%' : 'auto'}`,
                  minWidth: width ? 'auto' : '100px',
                  minHeight: height ? 'auto' : '40px',
                }}
              >
                {/* Spot Asset Display */}
                {hasUpload && !isBrochure && (
                  <img
                    src={exhibitorAssetUrl(spot.gallery[0].asset_url)}
                    className="absolute inset-0 w-full h-full object-contain"
                    alt={spot.title || "Asset"}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
                {spot.asset?.asset_type === "VIDEO" && spot.asset?.external_link && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white">
                    <span className="text-xs">Video Spot</span>
                  </div>
                )}

                {/* Edit Pencil Icon (Top Right) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isBrochure) {
                       setIsBrochureModalOpen(true);
                    } else {
                       setActiveSpot(spot);
                       setEditLink(spot.asset?.asset_url || "");
                    }
                  }}
                  className="absolute -top-3 -right-3 bg-white border border-gray-300 rounded shadow-md p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition z-20 opacity-0 group-hover:opacity-100"
                  title={`Edit ${spot.title}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar Menu — bounded to this stand canvas section only (an absolute, non-scrolling
          spacer spanning the canvas's full height) with a sticky inner panel, so the menu tracks
          the page as you scroll through the canvas but scrolls away normally above/below it —
          it never floats above the site header or lingers once you've scrolled past the stand. */}
      {menuVisible && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-64">
          <div className="pointer-events-auto sticky top-24 flex max-h-[calc(100vh-7rem)] w-64 flex-col justify-start gap-4 overflow-y-auto pr-4 pt-4">
          {/* Top Info Box */}
          <div className="bg-widget-primary text-white p-3 rounded shadow-md border-b-4 border-sky-700">
            <h4 className="text-[13px] font-bold tracking-wide">
              {zoneName || "Marketing Zone 1"}
              <br />
              Stand no. - {exhibitor?.stand_number || "0"}
            </h4>
            <button
              onClick={() => setMenuVisible(false)}
              className="mt-2 text-xs font-semibold text-white/90 hover:text-white flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" /> Hide Menu
            </button>
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={() => setShowBoothPreview(true)}
            className="flex items-center gap-3 bg-widget-primary hover:bg-widget-primary-hover text-white p-3 rounded shadow-md text-[13px] font-bold border-b-4 border-sky-700 transition"
          >
            <Eye className="w-5 h-5 opacity-90" /> View My Booth
          </button>

          <a
            href={`/members/view_exhibitor_information${selectedExId ? `?ex_id=${selectedExId}` : ""}`}
            className="flex items-center gap-3 bg-widget-primary hover:bg-widget-primary-hover text-white p-3 rounded shadow-md text-[13px] font-bold border-b-4 border-sky-700 transition"
          >
            <Venus className="w-5 h-5 opacity-90" /> Exhibitor Full Details
          </a>

          <a
            href={`/dashboard/my-event/team-members${eventId ? `?event_id=${eventId}` : ""}`}
            className="flex items-center gap-3 bg-widget-primary hover:bg-widget-primary-hover text-white p-3 rounded shadow-md text-[13px] font-bold border-b-4 border-sky-700 transition"
          >
            <UserPlus className="w-5 h-5 opacity-90" /> Manage My Team
          </a>

          <div className="relative" ref={shareMenuRef}>
            <button
              type="button"
              onClick={() => setShareMenuOpen((v) => !v)}
              className="w-full flex text-left items-center gap-3 bg-widget-primary hover:bg-widget-primary-hover text-white p-3 rounded shadow-md text-[13px] font-bold border-b-4 border-sky-700 transition"
            >
              <Share2 className="w-5 h-5 opacity-90" /> Share My Booth via Social Media
            </button>
            {shareMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-full bg-white rounded shadow-2xl overflow-hidden z-50">
                {socialShareLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShareMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition"
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
            className={`flex items-center gap-3 text-white p-3 rounded shadow-md text-[13px] font-bold border-b-4 transition ${
              shareCopied ? "bg-emerald-600 border-emerald-800" : "bg-widget-primary hover:bg-widget-primary-hover border-sky-700"
            }`}
          >
            {shareCopied ? <Check className="w-5 h-5 opacity-90" /> : <Link2 className="w-5 h-5 opacity-90" />}
            {shareCopied ? "Link Copied!" : "Share My Booth Link"}
          </button>

          <button
            onClick={() => handleToggleStatus(exhibitor?.status !== "active")}
            className={`flex items-center gap-3 text-white p-3 rounded shadow-md text-[13px] font-bold border-b-4 transition ${
              exhibitor?.status === "active" 
                ? "bg-widget-warning hover:bg-widget-warning-hover border-widget-warning-border" 
                : "bg-emerald-600 hover:bg-emerald-700 border-emerald-800"
            }`}
          >
            <UploadCloud className="w-5 h-5 opacity-90" />
            {exhibitor?.status === "active" ? "Unpublish Stand" : "Publish Stand"}
          </button>
          </div>
        </div>
      )}

      {/* Show Menu Button — same bounded-sticky treatment as the menu itself */}
      {!menuVisible && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-10">
          <button
            onClick={() => setMenuVisible(true)}
            className="pointer-events-auto sticky top-24 bg-widget-primary hover:bg-widget-primary-hover text-white p-2 rounded-l shadow-md transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error / Success Toasts Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {errorMessage && (
          <div className="flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded shadow-lg text-sm font-bold">
            <AlertTriangle className="w-5 h-5" /> {errorMessage}
            <button onClick={() => setErrorMessage(null)} className="ml-2"><X className="w-4 h-4"/></button>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded shadow-lg text-sm font-bold">
            <Check className="w-5 h-5" /> {successMessage}
            <button onClick={() => setSuccessMessage(null)} className="ml-2"><X className="w-4 h-4"/></button>
          </div>
        )}
      </div>

      {/* Asset Editor Modal */}
      {activeSpot && (
        <ModalPortal>
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-gray-800">Edit Asset</h3>
                <p className="text-xs text-gray-500 font-medium">Spot: {activeSpot.title}</p>
              </div>
              <button onClick={() => setActiveSpot(null)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <form onSubmit={handleSaveAsset} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Link / URL
                    </label>
                    <input
                      type="url"
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                    />
                    {activeSpot.help_text && (
                      <p className="text-xs text-gray-500 mt-1">{activeSpot.help_text}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Upload File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFiles(e.target.files)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                    />
                  </div>

                  {activeSpot.gallery && activeSpot.gallery.length > 0 && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Current Files</label>
                      <div className="grid grid-cols-3 gap-3">
                        {activeSpot.gallery.map((g) => (
                          <div key={g.id} className="relative group rounded border border-gray-200 overflow-hidden bg-gray-50 aspect-square flex items-center justify-center">
                            <img
                              src={exhibitorAssetUrl(g.asset_url)}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryItem(activeSpot.asset!.id, g.id)}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white hover:bg-red-500 rounded shadow-md opacity-0 group-hover:opacity-100 transition"
                              title="Delete File"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setActiveSpot(null)}
                      className="flex-1 rounded py-2.5 text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded bg-widget-primary py-2.5 text-sm font-bold text-white hover:bg-widget-primary-hover transition disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Asset"}
                    </button>
                  </div>
               </form>
            </div>
          </div>
        </div>
    </ModalPortal>
      )}

      {/* Brochure Manager Modal */}
      {isBrochureModalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 text-sky-600">
                <FolderOpen className="w-5 h-5" />
                <h3 className="text-lg font-black text-gray-800">Manage Brochures</h3>
              </div>
              <button onClick={() => setIsBrochureModalOpen(false)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50">
              {/* Add New Brochure */}
              <div className="bg-white p-5 rounded border border-gray-200 shadow-sm h-fit">
                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Upload Document</h4>
                <form onSubmit={handleAddBrochure} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={brochureTitle}
                      onChange={(e) => setBrochureTitle(e.target.value)}
                      placeholder="Catalogue 2026"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">File</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setBrochureFiles(e.target.files)}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <UploadCloud className="h-4 w-4" /> {saving ? "Uploading..." : "Add Brochure"}
                  </button>
                </form>
              </div>

              {/* List Brochures */}
              <div className="bg-white p-5 rounded border border-gray-200 shadow-sm h-fit max-h-[400px] flex flex-col">
                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Current Brochures</h4>
                <div className="overflow-y-auto pr-2 space-y-2 flex-1">
                  {brochures.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs font-medium">No brochures uploaded.</p>
                    </div>
                  ) : (
                    brochures.map((bro) => (
                      <div key={bro.id} className="flex items-center justify-between p-3 border border-gray-100 rounded hover:bg-gray-50 transition group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-sky-100 text-sky-600 p-2 rounded shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-gray-800 truncate">{bro.title}</p>
                            <p className="text-[10px] text-gray-400 truncate">{bro.asset_attachment}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          {bro.asset_attachment && (
                            <a href={exhibitorAssetUrl(bro.asset_attachment)} target="_blank" rel="noreferrer" className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded" title="Download">
                              <FileDown className="w-4 h-4" />
                            </a>
                          )}
                          <button onClick={() => handleDeleteBrochure(bro.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </ModalPortal>
      )}

      {/* Booth Preview Modal (read-only, no edit pencils) */}
      {showBoothPreview && (
        <ModalPortal>
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-gray-800">{exhibitor?.business || "My Booth"}</h3>
                <p className="text-xs text-gray-500 font-medium">This is what visitors see on your stand.</p>
              </div>
              <button onClick={() => setShowBoothPreview(false)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full bg-zinc-200" style={{ aspectRatio: "16/9" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedStandImage && !standImageFailed ? resolvedStandImage : DEFAULT_STAND_TEMPLATE}
                alt="Stand preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {parsedSpots.map((spot) => {
                const { x, y, width, height } = spot.coordinates;
                const hasUpload = spot.gallery && spot.gallery.length > 0;
                if (!hasUpload) return null;
                return (
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
            </div>
            <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 truncate">{boothUrl}</p>
              <button
                type="button"
                onClick={() => setShowBoothPreview(false)}
                className="shrink-0 rounded bg-widget-primary px-4 py-2 text-sm font-bold text-white hover:bg-widget-primary-hover transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
    </ModalPortal>
      )}

    </div>
  );
}
