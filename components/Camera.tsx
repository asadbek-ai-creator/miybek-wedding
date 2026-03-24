"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { isIOS } from "@/lib/utils";

interface CameraProps {
  filterCSS: string;
  onStream: (stream: MediaStream) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function Camera({ filterCSS, onStream, videoRef }: CameraProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState("");
  const [needsGesture, setNeedsGesture] = useState(false);
  const [started, setStarted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef(facingMode);
  facingRef.current = facingMode;

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
      setStarted(true);
      setError("");
    } catch {
      setError("Камераға рухсат берилмеди. Суўретке түсиў ушын камераға рухсат бериң.");
    }
  }, [onStream, videoRef]);

  // On mount: auto-start on non-iOS, show prompt on iOS
  useEffect(() => {
    if (isIOS()) {
      setNeedsGesture(true);
    } else {
      startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart camera when facingMode changes (but only if already started)
  useEffect(() => {
    if (started) {
      startCamera(facingMode);
    }
  }, [facingMode, started, startCamera]);

  // Try to lock portrait orientation (API exists on mobile but not in TS types)
  useEffect(() => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (dir: string) => Promise<void>;
      };
      orientation.lock?.("portrait-primary")?.catch(() => {
        // Not supported or not allowed — fine
      });
    } catch {
      // screen.orientation.lock not available
    }
  }, []);

  // Restart camera stream on orientation change
  useEffect(() => {
    if (!started) return;

    const handleOrientation = () => {
      // Brief delay for the browser to settle the new orientation
      setTimeout(() => {
        if (started) {
          startCamera(facingRef.current);
        }
      }, 300);
    };

    // Modern API
    screen.orientation?.addEventListener?.("change", handleOrientation);
    // Fallback for older iOS
    window.addEventListener("orientationchange", handleOrientation);

    return () => {
      screen.orientation?.removeEventListener?.("change", handleOrientation);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, [started, startCamera]);

  const handleStartTap = () => {
    setNeedsGesture(false);
    startCamera(facingMode);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // iOS gesture prompt
  if (needsGesture) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-dark-surface">
        <button
          onClick={handleStartTap}
          className="flex flex-col items-center gap-4 px-8 py-6 rounded-2xl active:scale-95 transition-transform"
        >
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </div>
          <span className="text-gold font-semibold text-lg">Камераны қосыў ушын басың</span>
          <span className="text-white/40 text-sm">Камераға рухсат керек</span>
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-dark-surface rounded-2xl mx-4 p-8">
        <div className="text-center">
          <svg className="w-16 h-16 text-gold/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
          </svg>
          <p className="text-white/60">{error}</p>
          <button
            onClick={handleStartTap}
            className="mt-4 px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm"
          >
            Қайта урыныў
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
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
        aria-label="Камераны алмастырыў"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.016 4.357v4.992" />
        </svg>
      </button>
    </div>
  );
}
