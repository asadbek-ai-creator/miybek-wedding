"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Event } from "@/lib/types";

function FlowerOrnament() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      style={{ opacity: 0.12 }}
    >
      <path
        d="M8 72C8 72 20 60 28 45C32 37 30 28 22 24C14 20 8 28 12 36C16 44 28 45 28 45"
        stroke="#D4AF37"
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M28 45C28 45 40 52 52 48C60 45 62 36 56 30C50 24 42 30 46 38C50 46 52 48 52 48"
        stroke="#D4AF37"
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M4 64C4 64 14 54 18 42"
        stroke="#D4AF37"
        strokeWidth="0.8"
        fill="none"
      />
      <path
        d="M28 45C28 45 22 56 26 68"
        stroke="#D4AF37"
        strokeWidth="0.8"
        fill="none"
      />
      <circle cx="12" cy="36" r="2.5" fill="#D4AF37" />
      <circle cx="46" cy="38" r="2.5" fill="#D4AF37" />
      <circle cx="22" cy="24" r="2" fill="#D4AF37" />
      <circle cx="56" cy="30" r="2" fill="#D4AF37" />
      <circle cx="18" cy="42" r="1.5" fill="#D4AF37" />
      <circle cx="26" cy="68" r="1.5" fill="#D4AF37" />
      <circle cx="8" cy="72" r="1.5" fill="#D4AF37" />
      <circle cx="28" cy="45" r="3" fill="#D4AF37" fillOpacity="0.5" />
    </svg>
  );
}

function parseCoupleNames(name: string): [string, string] {
  const separators = [" & ", " and ", " AND ", " va "];
  for (const sep of separators) {
    if (name.includes(sep)) {
      const parts = name.split(sep);
      return [parts[0].trim(), parts.slice(1).join(sep).trim()];
    }
  }
  return [name, ""];
}

export default function EventEntryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  // Fetch event data on first render
  if (!fetched) {
    setFetched(true);
    getDoc(doc(getFirebaseDb(), "events", eventId)).then((snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() } as Event);
      } else {
        setError("Event not found");
      }
    });
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoading(true);

    try {
      const userCred = await signInAnonymously(getFirebaseAuth());
      const uid = userCred.user.uid;

      await setDoc(doc(getFirebaseDb(), "events", eventId, "guests", uid), {
        uid,
        name: guestName.trim(),
        eventId,
        joinedAt: Date.now(),
        photoCount: 0,
      });

      await setDoc(
        doc(getFirebaseDb(), "events", eventId),
        { guestCount: increment(1) },
        { merge: true }
      );

      // Store guest name in sessionStorage for camera page
      sessionStorage.setItem("guestName", guestName.trim());
      sessionStorage.setItem("guestUID", uid);

      router.push(`/event/${eventId}/camera`);
    } catch {
      setError("Failed to join. Please try again.");
      setLoading(false);
    }
  };

  if (error && !event) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center px-8"
        style={{ background: "linear-gradient(to bottom, #0A0A0A, #1A1A2E)" }}
      >
        <p className="text-red-400 text-lg">{error}</p>
      </main>
    );
  }

  const [name1, name2] = event ? parseCoupleNames(event.name) : ["", ""];

  return (
    <main
      className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, #0A0A0A, #1A1A2E)",
        padding: "32px",
      }}
    >
      {/* Corner ornaments */}
      <div className="absolute top-5 left-5 entry-ornament">
        <FlowerOrnament />
      </div>
      <div className="absolute top-5 right-5 entry-ornament" style={{ transform: "scaleX(-1)" }}>
        <FlowerOrnament />
      </div>
      <div className="absolute bottom-5 left-5 entry-ornament" style={{ transform: "scaleY(-1)" }}>
        <FlowerOrnament />
      </div>
      <div className="absolute bottom-5 right-5 entry-ornament" style={{ transform: "scale(-1, -1)" }}>
        <FlowerOrnament />
      </div>

      {event ? (
        <div className="w-full max-w-sm entry-content">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span
              className="inline-block px-4 py-1.5"
              style={{
                border: "0.5px solid #D4AF37",
                color: "#D4AF37",
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                borderRadius: "4px",
              }}
            >
              Wedding Celebration
            </span>
          </div>

          {/* Couple names */}
          <div className="text-center mb-2">
            <h1
              className="font-[family-name:var(--font-playfair)]"
              style={{ color: "#D4AF37", fontSize: "32px", lineHeight: 1.2 }}
            >
              {name1}
            </h1>
            {name2 && (
              <>
                <span
                  className="inline-block font-[family-name:var(--font-playfair)] my-1"
                  style={{ color: "#D4AF37", fontSize: "20px", opacity: 0.7 }}
                >
                  &amp;
                </span>
                <h1
                  className="font-[family-name:var(--font-playfair)]"
                  style={{ color: "#D4AF37", fontSize: "32px", lineHeight: 1.2 }}
                >
                  {name2}
                </h1>
              </>
            )}
          </div>

          {/* Date */}
          <p
            className="text-center mt-3"
            style={{
              fontSize: "12px",
              color: "#888",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            {event.date}
          </p>

          {/* Gold divider */}
          <div className="flex justify-center" style={{ margin: "24px auto 28px" }}>
            <div className="entry-divider" />
          </div>

          {/* Invitation text */}
          <p
            className="text-center"
            style={{ fontSize: "14px", color: "#aaa", marginBottom: "20px" }}
          >
            Help us capture every moment
          </p>

          {/* Form */}
          <form onSubmit={handleJoin}>
            <label
              htmlFor="guestName"
              className="block mb-2"
              style={{ fontSize: "13px", color: "#999" }}
            >
              What&apos;s your name?
            </label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              maxLength={50}
              className="w-full mb-4 px-4 text-white outline-none transition-colors"
              style={{
                height: "48px",
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid #D4AF37",
                borderRadius: "4px",
                fontSize: "15px",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F5E6CC")}
              onBlur={(e) => (e.target.style.borderColor = "#D4AF37")}
            />

            {/* Primary button */}
            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="w-full font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: "52px",
                background: "#D4AF37",
                color: "#0A0A0A",
                borderRadius: "4px",
                fontSize: "15px",
              }}
              onMouseEnter={(e) => {
                if (!(e.target as HTMLButtonElement).disabled)
                  (e.target as HTMLElement).style.filter = "brightness(1.1)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.filter = "none";
              }}
            >
              {loading ? "Joining..." : "Start Capturing"}
            </button>
          </form>

          {/* Secondary button */}
          <a
            href={`/event/${eventId}/gallery`}
            className="block text-center mt-3 transition-colors hover:brightness-125"
            style={{
              height: "44px",
              lineHeight: "44px",
              border: "0.5px solid #D4AF37",
              color: "#D4AF37",
              borderRadius: "4px",
              fontSize: "13px",
            }}
          >
            View Gallery
          </a>

          {/* Bottom text */}
          <p
            className="text-center"
            style={{ fontSize: "11px", color: "#555", marginTop: "12px" }}
          >
            No app download needed
          </p>

          {error && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span style={{ fontSize: "12px", color: "#555" }}>Loading...</span>
        </div>
      )}
    </main>
  );
}
