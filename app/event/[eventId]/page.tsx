"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Event } from "@/lib/types";

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
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-red-400 text-lg">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm fade-in">
        {event ? (
          <>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-gold text-center mb-2">
              {event.name}
            </h1>
            <p className="text-gold-light/60 text-center mb-8">
              {event.coupleName}
            </p>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label
                  htmlFor="guestName"
                  className="block text-sm text-gold-light/80 mb-2"
                >
                  What&apos;s your name?
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-dark-surface border border-dark-border text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !guestName.trim()}
                className="w-full bg-gold text-dark font-semibold py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Joining..." : "Open Camera"}
              </button>
            </form>

            {error && (
              <p className="text-red-400 text-sm text-center mt-4">{error}</p>
            )}
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </main>
  );
}
