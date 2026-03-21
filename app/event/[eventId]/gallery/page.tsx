"use client";

import { use, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import Gallery from "@/components/Gallery";

export default function GalleryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    getDoc(doc(getFirebaseDb(), "events", eventId)).then((snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() } as Event);
      }
    });
  }, [eventId]);

  return (
    <main className="flex-1 flex flex-col min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 bg-dark/90 backdrop-blur-sm border-b border-dark-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <a
            href={`/event/${eventId}/camera`}
            className="text-gold text-sm hover:text-gold-light transition-colors"
          >
            Camera
          </a>
          <h1 className="font-[family-name:var(--font-playfair)] text-gold font-semibold">
            {event?.name || "Gallery"}
          </h1>
          <div className="w-14" />
        </div>
      </div>

      {/* Gallery grid */}
      <Gallery eventId={eventId} />
    </main>
  );
}
