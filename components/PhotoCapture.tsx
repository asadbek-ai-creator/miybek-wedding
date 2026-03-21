"use client";

import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { doc, setDoc, increment } from "firebase/firestore";
import { getFirebaseStorage, getFirebaseDb } from "@/lib/firebase";
import { compressImage, generateId } from "@/lib/utils";
import type { Filter } from "@/lib/filters";

interface PhotoCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeFilter: Filter;
  eventId: string;
  guestName: string;
  guestUID: string;
}

export default function PhotoCapture({
  videoRef,
  activeFilter,
  eventId,
  guestName,
  guestUID,
}: PhotoCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || capturing) return;

    setCapturing(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d")!;

    // Apply filter
    if (activeFilter.css !== "none") {
      ctx.filter = activeFilter.css;
    }

    ctx.drawImage(video, 0, 0, width, height);
    ctx.filter = "none";

    try {
      setUploadProgress("Compressing...");
      const blob = await compressImage(canvas, 0.85);

      setUploadProgress("Uploading...");
      const photoId = generateId();
      const storageRef = ref(
        getFirebaseStorage(),
        `events/${eventId}/photos/${photoId}.jpg`
      );
      await uploadBytes(storageRef, blob);
      const imageURL = await getDownloadURL(storageRef);

      await addDoc(collection(getFirebaseDb(), "events", eventId, "photos"), {
        eventId,
        imageURL,
        filter: activeFilter.id,
        guestName,
        guestUID,
        createdAt: Date.now(),
        width,
        height,
      });

      // Increment photo counts
      await setDoc(
        doc(getFirebaseDb(), "events", eventId),
        { photoCount: increment(1) },
        { merge: true }
      );

      setUploadProgress("Done!");
      setTimeout(() => setUploadProgress(null), 1000);
    } catch {
      setUploadProgress("Upload failed");
      setTimeout(() => setUploadProgress(null), 2000);
    }

    setCapturing(false);
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      {showFlash && (
        <div className="fixed inset-0 bg-white flash-overlay z-50 pointer-events-none" />
      )}

      {/* Capture controls */}
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Gallery link */}
        <a
          href={`/event/${eventId}/gallery`}
          className="w-10 h-10 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center"
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
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v12a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </a>

        {/* Capture button */}
        <button
          onClick={capturePhoto}
          disabled={capturing}
          className="w-18 h-18 rounded-full border-4 border-gold flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
        >
          <div className="w-14 h-14 rounded-full bg-gold" />
        </button>

        {/* Upload status */}
        <div className="w-10 h-10 flex items-center justify-center">
          {uploadProgress && (
            <span className="text-[10px] text-gold whitespace-nowrap">
              {uploadProgress}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
