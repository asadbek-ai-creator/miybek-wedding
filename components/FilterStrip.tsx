"use client";

import { useRef } from "react";
import { filters, type Filter } from "@/lib/filters";

interface FilterStripProps {
  activeFilter: Filter;
  onSelect: (filter: Filter) => void;
  thumbnailSrc: string | null;
}

export default function FilterStrip({
  activeFilter,
  onSelect,
  thumbnailSrc,
}: FilterStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="filter-strip flex gap-3 overflow-x-auto py-3 px-4"
    >
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onSelect(filter)}
          className={`flex-shrink-0 flex flex-col items-center gap-1 ${
            activeFilter.id === filter.id ? "opacity-100" : "opacity-60"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
              activeFilter.id === filter.id
                ? "border-gold"
                : "border-transparent"
            }`}
          >
            {thumbnailSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailSrc}
                alt={filter.name}
                className="w-full h-full object-cover"
                style={{
                  filter: filter.css === "none" ? undefined : filter.css,
                }}
              />
            ) : (
              <div
                className="w-full h-full bg-dark-surface"
                style={{
                  filter: filter.css === "none" ? undefined : filter.css,
                }}
              />
            )}
          </div>
          <span
            className={`text-[10px] ${
              activeFilter.id === filter.id
                ? "text-gold font-semibold"
                : "text-white/60"
            }`}
          >
            {filter.name}
          </span>
        </button>
      ))}
    </div>
  );
}
