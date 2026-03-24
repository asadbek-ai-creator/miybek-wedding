"use client";

import { use, useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { filters, type Filter } from "@/lib/filters";

const Camera = dynamic(() => import("@/components/Camera"), { ssr: false });
const FilterStrip = dynamic(() => import("@/components/FilterStrip"), { ssr: false });
const PhotoCapture = dynamic(() => import("@/components/PhotoCapture"), { ssr: false });

export default function CameraPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>(filters[0]);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guestName] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("guestName") || "Мийман"
      : "Мийман"
  );
  const [guestUID] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("guestUID") || ""
      : ""
  );
  const [photosTaken, setPhotosTaken] = useState(0);

  // Wait for auth to be ready (handles page refresh / cold start)
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthReady(true);
      } else {
        // No session — re-authenticate anonymously
        try {
          await signInAnonymously(auth);
          setAuthReady(true);
        } catch {
          // Auth failed — still allow camera, PhotoCapture will retry
          setAuthReady(true);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleStream = useCallback(() => {
    // Generate thumbnail from video for filter previews
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d")!;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 64, 64);
        setThumbnailSrc(canvas.toDataURL("image/jpeg", 0.5));
        clearInterval(interval);
      }
    }, 500);
  }, []);

  if (!authReady) {
    return (
      <main className="flex flex-col h-[100dvh] bg-black items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-3" />
        <span className="text-white/40 text-sm">Қосылып атыр...</span>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-[100dvh] bg-black overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-gold/30 z-10">
        <a
          href={`/event/${eventId}`}
          className="flex items-center gap-1 text-sm text-gold border border-gold/50 bg-white/10 rounded-full px-4 py-1.5 hover:bg-white/20 active:scale-95 transition-all duration-200"
        >
          <span>&larr;</span>
          <span>{guestName}</span>
        </a>
        <span
          className="font-[family-name:var(--font-playfair)] text-gold text-lg font-semibold"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
        >
          Той Камерасы
        </span>
        <a
          href={`/event/${eventId}/gallery`}
          className="relative flex items-center gap-1.5 text-sm text-gold border border-gold/50 bg-white/10 rounded-full px-4 py-1.5 hover:bg-white/20 active:scale-95 transition-all duration-200"
        >
          <span>Галерея</span>
          {photosTaken > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-gold text-black rounded-full">
              {photosTaken}
            </span>
          )}
        </a>
      </div>

      {/* Camera viewfinder — fills remaining space */}
      <Camera
        filterCSS={activeFilter.css}
        onStream={handleStream}
        videoRef={videoRef}
      />

      {/* Filter strip */}
      <div className="flex-shrink-0 bg-black/90 backdrop-blur-sm">
        <FilterStrip
          activeFilter={activeFilter}
          onSelect={setActiveFilter}
          thumbnailSrc={thumbnailSrc}
        />
      </div>

      {/* Capture controls */}
      <div className="flex-shrink-0 bg-black pb-[env(safe-area-inset-bottom)]">
        <PhotoCapture
          videoRef={videoRef}
          activeFilter={activeFilter}
          eventId={eventId}
          guestName={guestName}
          guestUID={guestUID}
          onPhotoSaved={() => setPhotosTaken((n) => n + 1)}
        />
      </div>
    </main>
  );
}
