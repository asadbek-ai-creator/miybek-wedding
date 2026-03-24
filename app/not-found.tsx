import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-[family-name:var(--font-playfair)] text-6xl font-bold text-gold mb-4">
        404
      </h1>
      <p className="text-white/60 mb-8">Бет табылмады</p>
      <Link
        href="/"
        className="text-gold hover:text-gold-light transition-colors underline"
      >
        Бас бетке
      </Link>
    </main>
  );
}
