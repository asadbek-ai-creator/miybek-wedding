"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface CameraProps {
  filterCSS: string;
  onStream: (stream: MediaStream) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function Camera({ filterCSS, onStream, videoRef }: CameraProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      onStream(stream);
      setError("");
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, [onStream, videoRef]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-surface rounded-2xl mx-4 p-8">
        <div className="text-center">
          <svg className="w-16 h-16 text-gold/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
          </svg>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ filter: filterCSS === "none" ? undefined : filterCSS }}
      />

      {/* Camera flip button */}
      <button
        onClick={toggleCamera}
        className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
        aria-label="Switch camera"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.016 4.357v4.992" />
        </svg>
      </button>
    </div>
  );
}
