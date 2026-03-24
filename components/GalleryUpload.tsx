"use client";

import { useRef, useState, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { doc, setDoc, increment } from "firebase/firestore";
import { getFirebaseStorage, getFirebaseDb } from "@/lib/firebase";
import { compressImage, generateId, generateThumbnail, generateBlurDataURL } from "@/lib/utils";
import { filters, type Filter } from "@/lib/filters";

const MAX_CONCURRENT = 2;
const AGGRESSIVE_QUALITY = 0.5;
const AGGRESSIVE_MAX_WIDTH = 1280;
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  filter: Filter;
  status: "pending" | "compressing" | "uploading" | "done" | "failed";
  progress: number;
}

interface GalleryUploadProps {
  eventId: string;
  guestName: string;
  guestUID: string;
  defaultFilter: Filter;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export default function GalleryUpload({
  eventId,
  guestName,
  guestUID,
  defaultFilter,
}: GalleryUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const selected: SelectedPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Check for image types (includes HEIC which canvas handles)
        if (!file.type.startsWith("image/") && !file.name.match(/\.heic$/i)) {
          continue;
        }
        selected.push({
          id: generateId(),
          file,
          previewUrl: URL.createObjectURL(file),
          filter: defaultFilter,
          status: "pending",
          progress: 0,
        });
      }

      if (selected.length === 0) return;

      setPhotos(selected);
      setCurrentIndex(0);
      setShowPreview(true);

      // Reset file input so the same files can be re-selected
      e.target.value = "";
    },
    [defaultFilter]
  );

  const setFilterForCurrent = useCallback(
    (filter: Filter) => {
      setPhotos((prev) =>
        prev.map((p, i) => (i === currentIndex ? { ...p, filter } : p))
      );
    },
    [currentIndex]
  );

  const closePreview = useCallback(() => {
    if (uploading) return;
    // Revoke object URLs
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setShowPreview(false);
    setCurrentIndex(0);
  }, [uploading, photos]);

  const processAndUploadPhoto = useCallback(
    async (photo: SelectedPhoto): Promise<boolean> => {
      // Update status to compressing
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, status: "compressing" } : p
        )
      );

      try {
        const img = await loadImage(photo.previewUrl);

        const canvas = document.createElement("canvas");
        const isLarge = photo.file.size > LARGE_FILE_THRESHOLD;
        const maxW = isLarge ? AGGRESSIVE_MAX_WIDTH : 1920;
        const quality = isLarge ? AGGRESSIVE_QUALITY : 0.7;

        // Scale to fit within maxW, maintaining aspect ratio
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW) {
          const scale = maxW / w;
          w = maxW;
          h = Math.round(h * scale);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;

        // Apply filter
        if (photo.filter.css !== "none") {
          ctx.filter = photo.filter.css;
        }
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = "none";

        const [blob, galleryThumbBlob] = await Promise.all([
          compressImage(canvas, quality, maxW),
          generateThumbnail(canvas, 400, 0.6),
        ]);
        const blurDataURL = generateBlurDataURL(canvas);

        // Update status to uploading
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, status: "uploading" } : p
          )
        );

        // Upload to Firebase
        const photoId = photo.id;
        const storageRef = ref(
          getFirebaseStorage(),
          `events/${eventId}/photos/${photoId}.jpg`
        );

        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, blob);
          task.on(
            "state_changed",
            (snapshot) => {
              const pct = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setPhotos((prev) =>
                prev.map((p) =>
                  p.id === photo.id ? { ...p, progress: pct } : p
                )
              );
            },
            (err) => reject(err),
            () => resolve()
          );
        });

        const imageURL = await getDownloadURL(storageRef);

        // Upload gallery thumbnail
        const thumbRef = ref(
          getFirebaseStorage(),
          `events/${eventId}/thumbnails/${photoId}.jpg`
        );
        await uploadBytesResumable(thumbRef, galleryThumbBlob);
        const thumbnailURL = await getDownloadURL(thumbRef);

        await addDoc(
          collection(getFirebaseDb(), "events", eventId, "photos"),
          {
            eventId,
            imageURL,
            thumbnailURL,
            blurDataURL,
            filter: photo.filter.id,
            guestName,
            guestUID,
            createdAt: Date.now(),
            width: w,
            height: h,
          }
        );

        await setDoc(
          doc(getFirebaseDb(), "events", eventId),
          { photoCount: increment(1) },
          { merge: true }
        );

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? { ...p, status: "done", progress: 100 }
              : p
          )
        );
        return true;
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, status: "failed" } : p
          )
        );
        return false;
      }
    },
    [eventId, guestName, guestUID]
  );

  const uploadAll = useCallback(async () => {
    setUploading(true);
    const pending = photos.filter(
      (p) => p.status === "pending" || p.status === "failed"
    );

    // Process in batches of MAX_CONCURRENT
    let successCount = 0;
    for (let i = 0; i < pending.length; i += MAX_CONCURRENT) {
      const batch = pending.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.all(
        batch.map((p) => processAndUploadPhoto(p))
      );
      successCount += results.filter(Boolean).length;
    }

    setUploading(false);

    // Show toast and close
    const totalCount = pending.length;
    if (successCount > 0) {
      // Clean up and close preview
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setShowPreview(false);
      setCurrentIndex(0);

      setToast(
        successCount === totalCount
          ? `${successCount} суўрет жүкленди!`
          : `${successCount}/${totalCount} суўрет жүкленди`
      );
      setTimeout(() => setToast(null), 3000);
    }
  }, [photos, processAndUploadPhoto]);

  const current = photos[currentIndex];
  const allDoneOrFailed =
    uploading === false &&
    photos.length > 0 &&
    photos.every((p) => p.status === "done" || p.status === "failed");

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Trigger button — replaces old gallery link */}
      <button
        onClick={openFilePicker}
        className="w-10 h-10 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Галереядан жүклеў"
      >
        <svg
          className="w-5 h-5 text-white/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v12a2.25 2.25 0 002.25 2.25zm14.25-12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </button>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] bg-gold text-black px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-bounce">
          {toast}
        </div>
      )}

      {/* Preview overlay */}
      {showPreview && current && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 pt-[max(12px,env(safe-area-inset-top))]">
            <button
              onClick={closePreview}
              disabled={uploading}
              className="text-white/70 text-sm disabled:opacity-30"
            >
              Бийкар етиў
            </button>
            <span className="text-white/60 text-sm">
              {currentIndex + 1} / {photos.length}
            </span>
            <div className="w-14" />
          </div>

          {/* Photo preview */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.previewUrl}
              alt={`Суўрет ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{
                filter:
                  current.filter.css === "none"
                    ? undefined
                    : current.filter.css,
              }}
            />

            {/* Upload status overlay */}
            {current.status === "compressing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white/80 text-sm">Сығылып атыр...</span>
                </div>
              </div>
            )}

            {current.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold text-white">
                    {current.progress}%
                  </span>
                  <span className="text-white/60 text-sm">Жүкленип атыр...</span>
                </div>
              </div>
            )}

            {current.status === "done" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg
                  className="w-16 h-16 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}

            {current.status === "failed" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-red-400 font-semibold">
                  Жүклеў қәтеси
                </span>
              </div>
            )}

            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={() => setCurrentIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                )}
                {currentIndex < photos.length - 1 && (
                  <button
                    onClick={() => setCurrentIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Photo dots indicator */}
          {photos.length > 1 && (
            <div className="flex-shrink-0 flex justify-center gap-1.5 py-2">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex
                      ? "bg-gold"
                      : p.status === "done"
                        ? "bg-green-400/60"
                        : p.status === "failed"
                          ? "bg-red-400/60"
                          : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Filter strip */}
          <div className="flex-shrink-0 overflow-x-auto">
            <div className="flex gap-2 px-4 py-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterForCurrent(filter)}
                  disabled={uploading}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    current.filter.id === filter.id
                      ? "bg-gold text-black font-semibold"
                      : "bg-white/10 text-white/60"
                  } disabled:opacity-50`}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex-shrink-0 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {allDoneOrFailed ? (
              <button
                onClick={closePreview}
                className="w-full py-3 bg-gold text-black font-semibold rounded-xl text-sm"
              >
                Таяр
              </button>
            ) : (
              <button
                onClick={uploadAll}
                disabled={uploading}
                className="w-full py-3 bg-gold text-black font-semibold rounded-xl text-sm disabled:opacity-50"
              >
                {uploading
                  ? `Жүкленип атыр... (${photos.filter((p) => p.status === "done").length}/${photos.length})`
                  : `${photos.filter((p) => p.status === "pending" || p.status === "failed").length} суўрет жүклеў`}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
