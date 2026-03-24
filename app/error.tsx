"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-gold mb-4">
        Бир нәрсе қәте болды
      </h1>
      <p className="text-white/60 mb-8">
        Күтилмеген қәтелик жүз берди. Қайта урыныў.
      </p>
      <button
        onClick={reset}
        className="bg-gold text-dark font-semibold py-3 px-6 rounded-full hover:bg-gold-light transition-colors"
      >
        Қайта урыныў
      </button>
    </main>
  );
}
