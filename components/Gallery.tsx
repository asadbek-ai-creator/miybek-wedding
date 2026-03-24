"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Photo } from "@/lib/types";

const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

const PAGE_SIZE = 20;

interface GalleryProps {
  eventId: string;
}

export default function Gallery({ eventId }: GalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visiblePhotos, setVisiblePhotos] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Firestore query with pagination
  useEffect(() => {
    const q = query(
      collection(getFirebaseDb(), "events", eventId, "photos"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newPhotos = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Photo)
      );
      setPhotos(newPhotos);
      setHasMore(snapshot.docs.length === pageSize);
      setLoading(false);
    });

    return () => unsub();
  }, [eventId, pageSize]);

  // "Load more" sentinel observer
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPageSize((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "400px" }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [hasMore, photos.length]);

  // Lazy loading with IntersectionObserver
  const imageRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const id = (entry.target as HTMLElement).dataset.photoId;
                if (id) {
                  setVisiblePhotos((prev) => new Set(prev).add(id));
                  observerRef.current?.unobserve(entry.target);
                }
              }
            });
          },
          { rootMargin: "200px" }
        );
      }

      observerRef.current.observe(node);
    },
    []
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-dark-surface rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <svg
          className="w-16 h-16 text-gold/30 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v12a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <p className="text-white/40">Ҳәлиге суўрет жоқ</p>
        <p className="text-white/20 text-sm mt-1">
          Биринши болып суўретке түсиң!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-1">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            ref={imageRef}
            data-photo-id={photo.id}
            className="aspect-square bg-dark-surface rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            style={
              photo.blurDataURL
                ? {
                    backgroundImage: `url(${photo.blurDataURL})`,
                    backgroundSize: "cover",
                  }
                : undefined
            }
            onClick={() => setSelectedIndex(index)}
          >
            {visiblePhotos.has(photo.id) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.thumbnailURL || photo.imageURL}
                alt={`${photo.guestName} түсирген суўрет`}
                className="w-full h-full object-cover fade-in"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Load more sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {selectedIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}
