"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, ArrowLeft, Download, Share2, RefreshCw, AlertTriangle } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import { LobbyActions } from "@/components/virtual-event/LobbyTopBar";

/** The booth scene shipped with the app. */
const BOOTH_SCENE = "/images/photobooth_img.jpg";
/** Drawn into the souvenir frame at capture time. */
const BRAND_LOGO = "/images/digitalageexpo_logo.png";

/** Where the "click here" hotspot sits on the scene, as a % of the image box. */
const HOTSPOT = { xPct: 75.5, yPct: 29.5 };

/** Output size of the souvenir. 4:3 keeps the whole webcam frame without cropping much. */
const OUT_W = 1280;
const OUT_H = 960;
const BORDER = 46;

type Stage = "scene" | "capture";
type CamState = "idle" | "starting" | "live" | "shot" | "error";

/**
 * Photo Booth — the port of lobby.php's photobooth modal.
 *
 * Two steps, mirroring the legacy flow: the booth scene with a hotspot, then the camera modal
 * behind it (Access Camera -> Shoot -> Take Again / Download / Share).
 *
 * ---------------------------------------------------------------------------
 * WHERE THE CAMERA IS ACCESSED
 * ---------------------------------------------------------------------------
 * `startCamera()` below, via navigator.mediaDevices.getUserMedia({ video: … }).
 * Three things about that call decide whether this feature works at all:
 *
 *  1. It requires a SECURE CONTEXT. `navigator.mediaDevices` is undefined on a
 *     plain http:// origin — localhost is exempt, which is why this works in dev
 *     and silently would not in production served over http. That case is
 *     detected up front and reported, rather than throwing an opaque TypeError.
 *  2. The browser prompts the user for permission. A refusal arrives as a
 *     rejected promise (NotAllowedError), not as an exception you can pre-empt,
 *     so every outcome is mapped to a plain-English message below.
 *  3. The stream keeps the camera light on until its tracks are stopped. Closing
 *     the modal, navigating away and unmounting all route through stopCamera();
 *     forgetting any one of them leaves the webcam running after the UI is gone.
 */
export function PhotoBoothModal({
  open,
  onClose,
  eventTitle = "DAE",
}: {
  open: boolean;
  onClose: () => void;
  /** Only used for the "Visit <Site> Website" label, same as the lobby's own top bar. */
  eventTitle?: string;
}) {
  const [stage, setStage] = useState<Stage>("scene");
  const [cam, setCam] = useState<CamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /** THE CAMERA ACCESS POINT — see the note above the component. */
  const startCamera = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCam("error");
      setError(
        window.isSecureContext === false
          ? "The camera needs a secure connection. Open this page over HTTPS (or on localhost) and try again."
          : "This browser doesn't support camera access.",
      );
      return;
    }

    setCam("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay can be refused; the stream is still attached and visible */
        });
      }
      setCam("live");
    } catch (err) {
      stopCamera();
      setCam("error");
      const name = err instanceof Error ? err.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera permission was blocked. Allow camera access for this site in your browser, then try again."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No camera was found on this device."
            : name === "NotReadableError"
              ? "Your camera is already in use by another app. Close it and try again."
              : "The camera could not be started.",
      );
    }
  }, [stopCamera]);

  /** Composites the live frame and the souvenir border into a single PNG. */
  const takeSnapshot = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cover-fit the camera frame so it fills the window without distorting faces.
    const vw = video.videoWidth || OUT_W;
    const vh = video.videoHeight || OUT_H;
    const innerW = OUT_W - BORDER * 2;
    const innerH = OUT_H - BORDER * 2;
    const scale = Math.max(innerW / vw, innerH / vh);
    const dw = vw * scale;
    const dh = vh * scale;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(BORDER, BORDER, innerW, innerH, 18);
    ctx.clip();
    // Mirrored, matching the on-screen preview — an unmirrored capture of a mirrored
    // preview is the classic photo-booth surprise.
    ctx.translate(BORDER + innerW / 2, BORDER + innerH / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    // Brand border
    const grad = ctx.createLinearGradient(0, 0, OUT_W, OUT_H);
    grad.addColorStop(0, "#e6007e");
    grad.addColorStop(1, "#7b2ff7");
    ctx.strokeStyle = grad;
    ctx.lineWidth = BORDER;
    ctx.beginPath();
    ctx.roundRect(BORDER / 2, BORDER / 2, OUT_W - BORDER, OUT_H - BORDER, 32);
    ctx.stroke();

    // Logo tab, bottom-left — same-origin, so the canvas is not tainted and toDataURL works.
    await new Promise<void>((resolve) => {
      const logo = new Image();
      logo.onload = () => {
        const h = 46;
        const w = (logo.width / logo.height) * h;
        const padX = BORDER + 22;
        const padY = OUT_H - BORDER - h - 20;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(padX - 14, padY - 12, w + 28, h + 24, 14);
        ctx.fill();
        ctx.drawImage(logo, padX, padY, w, h);
        resolve();
      };
      logo.onerror = () => resolve(); // no logo shipped? still produce the photo
      logo.src = BRAND_LOGO;
    });

    setShot(canvas.toDataURL("image/png"));
    setCam("shot");
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setShot(null);
    void startCamera();
  }, [startCamera]);

  async function sharePhoto() {
    if (!shot) return;
    try {
      const blob = await (await fetch(shot)).blob();
      const file = new File([blob], "digital-age-expo-photo.png", { type: "image/png" });
      // Web Share with files isn't universal (desktop Chrome/Firefox mostly lack it), so fall
      // back to a download rather than failing silently.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Digital Age Expo" });
        return;
      }
    } catch {
      /* user dismissed the share sheet, or it is unavailable — fall through */
    }
    const a = document.createElement("a");
    a.href = shot;
    a.download = "digital-age-expo-photo.png";
    a.click();
  }

  const close = useCallback(() => {
    stopCamera();
    setStage("scene");
    setCam("idle");
    setShot(null);
    setError(null);
    onClose();
  }, [onClose, stopCamera]);

  // Escape closes; unmount and every close path stop the tracks so the camera light goes out.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!open) stopCamera();
  }, [open, stopCamera]);

  if (!open) return null;

  /* ------------------------------- step 1: the booth ------------------------------- */
  if (stage === "scene") {
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-40 bg-black">
          <div className="relative h-full w-full overflow-hidden">
            {/*
              Stretched to fill, matching the live lobby.

              The artwork is 1952x1167 (1.67) and a desktop window is nearer 2.1, so filling both
              axes means a non-uniform scale — the booth reads slightly wider and flatter than the
              source, which is exactly how it looks on the live site. `contain` was correct
              geometry but left bars; `cover` filled the screen but cropped the PHOTO BOOTH sign.
              Stretching keeps the whole scene AND every edge.

              The hotspot keeps working because a percentage is preserved under a non-uniform
              scale: the box still maps 1:1 onto the artwork, just unevenly.
            */}
            <div className="absolute inset-0">
              <img src={BOOTH_SCENE} alt="Photo booth" className="h-full w-full object-fill" />

              {/* Percentage of the artwork box above, so it stays on the red light. */}
              <button
                type="button"
                onClick={() => setStage("capture")}
                aria-label="Open the photo booth camera"
                title="Click Photo"
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${HOTSPOT.xPct}%`, top: `${HOTSPOT.yPct}%` }}
              >
                <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-red-500/60" />
                <span className="relative block h-4 w-4 rounded-full bg-red-500 shadow-lg ring-2 ring-white/70" />
                <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  Click Photo
                </span>
              </button>
            </div>

            {/* Pinned to the VIEWPORT, not the artwork box — that box deliberately overflows to
                fill the screen, so anything inside it slides off-screen as the window widens. */}
            <button
              type="button"
              onClick={close}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur transition hover:bg-black/70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Top-right, mirroring the lobby's own bar — which this overlay covers. */}
            <div className="absolute right-4 top-4 z-10">
              <LobbyActions eventTitle={eventTitle} />
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  /* ------------------------------ step 2: the camera ------------------------------ */
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-40 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm"
        onClick={close}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-panel flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-white">
              <Camera className="h-5 w-5 text-brand-pink" />
              Photo Booth
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-brand-pink/50 hover:text-brand-pink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-5">
            {/* The souvenir frame. The live preview and the captured PNG use the same
                proportions, so what you see is what downloads. */}
            <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl bg-gradient-to-br from-brand-pink to-brand-purple p-3 shadow-xl">
              <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
                {shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot} alt="Your photo" className="h-full w-full object-cover" />
                ) : (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`h-full w-full -scale-x-100 object-cover ${cam === "live" ? "" : "opacity-0"}`}
                  />
                )}

                {cam !== "live" && !shot && (
                  <div className="absolute inset-0 grid place-items-center px-6 text-center">
                    {cam === "error" ? (
                      <p className="flex max-w-sm items-start gap-2 text-xs font-bold text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </p>
                    ) : cam === "starting" ? (
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Waiting for camera permission…
                      </p>
                    ) : (
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Press Access Camera to begin
                      </p>
                    )}
                  </div>
                )}
              </div>

              <span className="pointer-events-none absolute bottom-5 left-6 rounded-lg bg-black/55 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white">
                Digital Age Expo
              </span>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-5 py-4">
            {!shot ? (
              cam === "live" ? (
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="btn-brand-gradient rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:scale-[1.02]"
                >
                  Shoot!
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={cam === "starting"}
                  className="btn-brand-gradient rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {cam === "starting" ? "Starting…" : cam === "error" ? "Try Again" : "Access Camera"}
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={retake}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Take Again
                </button>
                <a
                  href={shot}
                  download="digital-age-expo-photo.png"
                  className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:scale-[1.02]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={sharePhoto}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
