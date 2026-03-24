"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import dynamic from "next/dynamic";
import type { Event, Photo } from "@/lib/types";

const QRGenerator = dynamic(() => import("@/components/QRGenerator"), { ssr: false });

export default function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const eventUrl = `${appUrl}/event/${eventId}`;

  const loadData = useCallback(async () => {
    const eventSnap = await getDoc(doc(getFirebaseDb(), "events", eventId));
    if (!eventSnap.exists()) {
      router.push("/admin");
      return;
    }
    setEvent({ id: eventSnap.id, ...eventSnap.data() } as Event);

    const photosSnap = await getDocs(
      query(
        collection(getFirebaseDb(), "events", eventId, "photos"),
        orderBy("createdAt", "desc")
      )
    );
    setPhotos(
      photosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Photo))
    );
    setLoading(false);
  }, [eventId, router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      if (!u || !u.email) {
        router.push("/admin");
      } else {
        loadData();
      }
    });
    return () => unsub();
  }, [router, loadData]);

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    setDownloading(true);

    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import("jszip"),
        import("file-saver"),
      ]);
      const zip = new JSZip();
      const folder = zip.folder("wedding-photos")!;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const response = await fetch(photo.imageURL);
        const blob = await response.blob();
        folder.file(
          `${photo.guestName}-${i + 1}.jpg`,
          blob
        );
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${event?.name || "wedding"}-photos.zip`);
    } catch {
      // handle error
    }

    setDownloading(false);
  };

  const handleDeletePhoto = async (photo: Photo) => {
    setDeletingPhoto(photo.id);
    try {
      // Delete from storage
      const storageRef = ref(getFirebaseStorage(), `events/${eventId}/photos/${photo.id}.jpg`);
      try {
        await deleteObject(storageRef);
      } catch {
        // File may not exist in storage with this exact path
      }

      // Delete from Firestore
      await deleteDoc(doc(getFirebaseDb(), "events", eventId, "photos", photo.id));
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      // handle error
    }
    setDeletingPhoto(null);
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      // Delete all photos
      for (const photo of photos) {
        try {
          await deleteDoc(doc(getFirebaseDb(), "events", eventId, "photos", photo.id));
        } catch {
          // continue
        }
      }
      // Delete event
      await deleteDoc(doc(getFirebaseDb(), "events", eventId));
      router.push("/admin");
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/admin")}
          className="text-gold hover:text-gold-light transition-colors"
        >
          &larr;
        </button>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-gold">
          {event?.name}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="p-4 bg-dark-surface rounded-xl border border-dark-border text-center">
          <p className="text-2xl font-bold text-gold">{photos.length}</p>
          <p className="text-white/40 text-sm">Суўретлер</p>
        </div>
        <div className="p-4 bg-dark-surface rounded-xl border border-dark-border text-center">
          <p className="text-2xl font-bold text-gold">
            {event?.guestCount || 0}
          </p>
          <p className="text-white/40 text-sm">Mийманлар</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="mb-8 p-6 bg-dark-surface rounded-xl border border-dark-border">
        <h2 className="text-gold font-semibold text-center mb-4">
          Mийман QR коды
        </h2>
        <QRGenerator url={eventUrl} eventName={event?.name || ""} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleDownloadAll}
          disabled={downloading || photos.length === 0}
          className="flex-1 bg-gold text-dark text-sm font-semibold py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {downloading ? "Жүкленип атыр..." : `Барлығын жүклеў (${photos.length})`}
        </button>
        <a
          href={`/event/${eventId}/gallery`}
          className="flex-1 text-center border border-gold text-gold text-sm font-semibold py-3 rounded-full hover:bg-gold/10 transition-colors"
        >
          Галереяны көриў
        </a>
      </div>

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-gold font-semibold mb-3">Суўретлер</h2>
          <div className="grid grid-cols-3 gap-1">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailURL || photo.imageURL}
                  alt={`${photo.guestName} түсирген суўрет`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    disabled={deletingPhoto === photo.id}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    {deletingPhoto === photo.id ? "..." : "Өшириў"}
                  </button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white/60 text-[10px] px-1 py-0.5 truncate rounded-b">
                  {photo.guestName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete event */}
      <div className="border-t border-dark-border pt-6">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-400/60 text-sm hover:text-red-400 transition-colors"
          >
            Тойды өшириў
          </button>
        ) : (
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
            <p className="text-red-400 text-sm mb-3">
              Бул той ҳәм барлық суўретлерди мәңгиге өшириў. Буны қайтарыў мүмкин емес.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="bg-red-600 text-white text-sm px-4 py-2 rounded-full hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? "Өширилип атыр атыр..." : "Аўа, барлығын өшириў"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-white/40 text-sm hover:text-white/60 transition-colors"
              >
                Бийкар етиў
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
