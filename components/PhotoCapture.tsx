"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { UploadTask } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { doc, setDoc, increment } from "firebase/firestore";
import { getFirebaseStorage, getFirebaseDb, getFirebaseAuth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { compressImage, generateId, generateThumbnail, generateBlurDataURL } from "@/lib/utils";
import type { Filter } from "@/lib/filters";
import GalleryUpload from "@/components/GalleryUpload";

const MAX_CONCURRENT = 2;
const UPLOAD_TIMEOUT_MS = 15_000;
const IOS_MAX_CAPTURE_DIM = 4096;

interface PendingUpload {
  id: string;
  thumbnailUrl: string;
  status: "compressing" | "uploading" | "done" | "failed";
  progress: number;
  blob: Blob | null;
  galleryThumbBlob: Blob | null;
  blurDataURL: string | null;
  width: number;
  height: number;
  filter: Filter;
  retryCount: number;
}

interface PhotoCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeFilter: Filter;
  eventId: string;
  guestName: string;
  guestUID: string;
}

async function ensureAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}

export default function PhotoCapture({
  videoRef,
  activeFilter,
  eventId,
  guestName,
  guestUID,
}: PhotoCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isCapturingRef = useRef(false);
  const [showFlash, setShowFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const activeCountRef = useRef(0);
  const queueRef = useRef<PendingUpload[]>([]);
  const activeTasksRef = useRef<Map<string, UploadTask>>(new Map());

  // Update ref synchronously so processQueue always sees latest data.
  // setUploads triggers React re-render (may be batched — that's fine for UI).
  const updateUploads = useCallback(
    (updater: PendingUpload[] | ((prev: PendingUpload[]) => PendingUpload[])) => {
      const next =
        typeof updater === "function" ? updater(queueRef.current) : updater;
      queueRef.current = next;
      setUploads(next);
    },
    []
  );

  // Pre-warm auth on mount so first upload doesn't stall
  useEffect(() => {
    ensureAuth().catch(() => {});
  }, []);

  const processQueue = useCallback(() => {
    const current = queueRef.current;
    if (activeCountRef.current >= MAX_CONCURRENT) return;

    const next = current.find(
      (u) => u.status === "uploading" && u.blob && u.progress <= 1
    );
    if (!next) return;

    activeCountRef.current++;

    const photoId = next.id;
    const storageRef = ref(
      getFirebaseStorage(),
      `events/${eventId}/photos/${photoId}.jpg`
    );
    const task = uploadBytesResumable(storageRef, next.blob!);
    activeTasksRef.current.set(photoId, task);

    // Timeout: if upload takes too long, cancel and recompress at lower quality
    const timeoutId = setTimeout(async () => {
      const entry = queueRef.current.find((u) => u.id === photoId);
      if (!entry || entry.status !== "uploading") return;

      // Cancel the stalled upload
      task.cancel();
      activeTasksRef.current.delete(photoId);
      activeCountRef.current--;

      if (entry.retryCount < 2 && entry.blob) {
        // Recompress at lower quality and smaller size for retry
        try {
          const img = new Image();
          const blobUrl = URL.createObjectURL(entry.blob);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = blobUrl;
          });
          const retryCanvas = document.createElement("canvas");
          const maxDim = 1280;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          retryCanvas.width = Math.round(img.width * scale);
          retryCanvas.height = Math.round(img.height * scale);
          const ctx = retryCanvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, retryCanvas.width, retryCanvas.height);
          URL.revokeObjectURL(blobUrl);

          const smallerBlob = await compressImage(retryCanvas, 0.5, 1280);
          updateUploads((prev) =>
            prev.map((u) =>
              u.id === photoId
                ? { ...u, blob: smallerBlob, progress: 1, retryCount: u.retryCount + 1 }
                : u
            )
          );
          setTimeout(() => processQueue(), 0);
        } catch {
          updateUploads((prev) =>
            prev.map((u) =>
              u.id === photoId ? { ...u, status: "failed" } : u
            )
          );
          processQueue();
        }
      } else {
        updateUploads((prev) =>
          prev.map((u) =>
            u.id === photoId ? { ...u, status: "failed" } : u
          )
        );
        processQueue();
      }
    }, UPLOAD_TIMEOUT_MS);

    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.max(
          1,
          Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          )
        );
        updateUploads((prev) =>
          prev.map((u) => (u.id === photoId ? { ...u, progress: pct } : u))
        );
      },
      (err) => {
        clearTimeout(timeoutId);
        activeTasksRef.current.delete(photoId);
        // Cancelled by timeout — don't mark failed here, timeout handler does it
        if (err.code === "storage/canceled") return;

        activeCountRef.current--;
        updateUploads((prev) =>
          prev.map((u) =>
            u.id === photoId ? { ...u, status: "failed" } : u
          )
        );
        processQueue();
      },
      async () => {
        clearTimeout(timeoutId);
        activeTasksRef.current.delete(photoId);

        // Upload succeeded — upload thumbnail then save to Firestore
        try {
          const imageURL = await getDownloadURL(storageRef);

          // Upload gallery thumbnail if available
          let thumbnailURL: string | undefined;
          const entry = queueRef.current.find((u) => u.id === photoId);
          if (entry?.galleryThumbBlob) {
            const thumbRef = ref(
              getFirebaseStorage(),
              `events/${eventId}/thumbnails/${photoId}.jpg`
            );
            await uploadBytesResumable(thumbRef, entry.galleryThumbBlob);
            thumbnailURL = await getDownloadURL(thumbRef);
          }

          await addDoc(
            collection(getFirebaseDb(), "events", eventId, "photos"),
            {
              eventId,
              imageURL,
              ...(thumbnailURL && { thumbnailURL }),
              ...(entry?.blurDataURL && { blurDataURL: entry.blurDataURL }),
              filter: next.filter.id,
              guestName,
              guestUID,
              createdAt: Date.now(),
              width: next.width,
              height: next.height,
            }
          );
          await setDoc(
            doc(getFirebaseDb(), "events", eventId),
            { photoCount: increment(1) },
            { merge: true }
          );
        } catch {
          activeCountRef.current--;
          updateUploads((prev) =>
            prev.map((u) =>
              u.id === photoId ? { ...u, status: "failed" } : u
            )
          );
          processQueue();
          return;
        }

        activeCountRef.current--;
        updateUploads((prev) =>
          prev.map((u) =>
            u.id === photoId
              ? { ...u, status: "done", progress: 100, blob: null }
              : u
          )
        );

        // Auto-remove after 3s
        setTimeout(() => {
          updateUploads((prev) => prev.filter((u) => u.id !== photoId));
        }, 3000);

        processQueue();
      }
    );

    // Try to start another if under limit
    if (activeCountRef.current < MAX_CONCURRENT) {
      processQueue();
    }
  }, [eventId, guestName, guestUID, updateUploads]);

  const retryUpload = useCallback(
    (id: string) => {
      updateUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "uploading", progress: 1 } : u
        )
      );
      setTimeout(() => processQueue(), 0);
    },
    [processQueue, updateUploads]
  );

  const dismissUpload = useCallback((id: string) => {
    updateUploads((prev) => prev.filter((u) => u.id !== id));
  }, [updateUploads]);

  const capturePhoto = useCallback(async () => {
    // Prevent double capture from rapid taps or StrictMode
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      isCapturingRef.current = false;
      setCapturing(false);
      return;
    }

    // Ensure auth is ready before any Firebase operation
    await ensureAuth();

    // Flash
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

    // Determine capture dimensions — cap for iOS canvas memory limits
    let captureW = video.videoWidth;
    let captureH = video.videoHeight;
    if (captureW > IOS_MAX_CAPTURE_DIM || captureH > IOS_MAX_CAPTURE_DIM) {
      const scale = Math.min(
        IOS_MAX_CAPTURE_DIM / captureW,
        IOS_MAX_CAPTURE_DIM / captureH
      );
      captureW = Math.round(captureW * scale);
      captureH = Math.round(captureH * scale);
    }

    canvas.width = captureW;
    canvas.height = captureH;
    const ctx = canvas.getContext("2d")!;
    if (activeFilter.css !== "none") {
      ctx.filter = activeFilter.css;
    }
    ctx.drawImage(video, 0, 0, captureW, captureH);
    ctx.filter = "none";

    // Generate thumbnail synchronously (tiny, fast)
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 80;
    thumbCanvas.height = 80;
    const thumbCtx = thumbCanvas.getContext("2d")!;
    const size = Math.min(captureW, captureH);
    const sx = (captureW - size) / 2;
    const sy = (captureH - size) / 2;
    thumbCtx.drawImage(canvas, sx, sy, size, size, 0, 0, 80, 80);
    const thumbnailUrl = thumbCanvas.toDataURL("image/jpeg", 0.5);

    const photoId = generateId();
    const filter = activeFilter;

    const entry: PendingUpload = {
      id: photoId,
      thumbnailUrl,
      status: "compressing",
      progress: 0,
      blob: null,
      galleryThumbBlob: null,
      blurDataURL: null,
      width: captureW,
      height: captureH,
      filter,
      retryCount: 0,
    };
    updateUploads((prev) => [entry, ...prev]);

    // Compress in background (non-blocking — camera is already free)
    try {
      const [blob, galleryThumbBlob] = await Promise.all([
        compressImage(canvas, 0.7, 1920),
        generateThumbnail(canvas, 400, 0.6),
      ]);
      const blurDataURL = generateBlurDataURL(canvas);
      updateUploads((prev) =>
        prev.map((u) =>
          u.id === photoId
            ? { ...u, status: "uploading", progress: 1, blob, galleryThumbBlob, blurDataURL }
            : u
        )
      );
      processQueue();
    } catch {
      updateUploads((prev) =>
        prev.map((u) =>
          u.id === photoId ? { ...u, status: "failed" } : u
        )
      );
    } finally {
      // Release capture lock after a short cooldown to prevent double-tap
      setTimeout(() => {
        isCapturingRef.current = false;
        setCapturing(false);
      }, 800);
    }
  }, [videoRef, activeFilter, processQueue, updateUploads]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      {showFlash && (
        <div className="fixed inset-0 bg-white flash-overlay z-50 pointer-events-none" />
      )}

      {/* Upload thumbnails — fixed in top-left of viewport */}
      {uploads.length > 0 && (
        <div className="fixed top-14 left-3 z-40 flex flex-col gap-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="relative w-14 h-14 rounded-lg overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={upload.thumbnailUrl}
                alt="Түсирилди"
                className="w-full h-full object-cover"
              />

              {/* Overlay based on status */}
              {upload.status === "compressing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {upload.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {upload.progress}%
                  </span>
                </div>
              )}

              {upload.status === "done" && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {upload.status === "failed" && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-0.5">
                  <button
                    onClick={() =>
                      upload.blob
                        ? retryUpload(upload.id)
                        : dismissUpload(upload.id)
                    }
                    className="text-[9px] text-red-400 font-bold"
                  >
                    {upload.blob ? "Қайта" : "Қәте"}
                  </button>
                  <button
                    onClick={() => dismissUpload(upload.id)}
                    className="text-[8px] text-white/50"
                  >
                    Жабыў
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Capture controls */}
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Upload from gallery */}
        <GalleryUpload
          eventId={eventId}
          guestName={guestName}
          guestUID={guestUID}
          defaultFilter={activeFilter}
        />

        {/* Capture button */}
        <button
          onClick={capturePhoto}
          disabled={capturing}
          className={`w-18 h-18 rounded-full border-4 flex items-center justify-center transition-all ${
            capturing
              ? "border-gold/40 scale-95"
              : "border-gold hover:scale-105 active:scale-95"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full transition-colors ${
              capturing ? "bg-gold/40" : "bg-gold"
            }`}
          />
        </button>

        {/* Upload count indicator */}
        <div className="w-10 h-10 flex items-center justify-center">
          {uploads.filter((u) => u.status === "uploading" || u.status === "compressing").length > 0 && (
            <span className="text-[10px] text-gold whitespace-nowrap">
              {uploads.filter((u) => u.status === "uploading" || u.status === "compressing").length} жүкленип атыр
            </span>
          )}
        </div>
      </div>
    </>
  );
}
