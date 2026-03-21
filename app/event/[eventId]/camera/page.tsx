"use client";

import { use, useRef, useState, useCallback } from "react";
import Camera from "@/components/Camera";
import FilterStrip from "@/components/FilterStrip";
import PhotoCapture from "@/components/PhotoCapture";
import { filters, type Filter } from "@/lib/filters";

export default function CameraPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>(filters[0]);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [guestName] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("guestName") || "Guest"
      : "Guest"
  );
  const [guestUID] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("guestUID") || ""
      : ""
  );

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

  return (
    <main className="flex flex-col h-[100dvh] bg-black overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-10">
        <span className="text-sm text-gold-light/60">{guestName}</span>
        <span className="font-[family-name:var(--font-playfair)] text-gold text-sm font-semibold">
          Wedding Camera
        </span>
        <a
          href={`/event/${eventId}/gallery`}
          className="text-sm text-gold hover:text-gold-light transition-colors"
        >
          Gallery
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
        />
      </div>
    </main>
  );
}
