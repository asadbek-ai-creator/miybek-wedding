import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      {/* Camera icon */}
      <div className="mb-8">
        <div className="w-24 h-24 rounded-full border-2 border-gold flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        </div>
      </div>

      <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl font-bold text-gold mb-4">
        Wedding Camera
      </h1>
      <p className="text-gold-light/80 text-lg max-w-md mb-12">
        Capture beautiful moments with filters and share them in a live gallery
        with everyone.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/admin"
          className="bg-gold text-dark font-semibold py-3 px-6 rounded-full text-center hover:bg-gold-light transition-colors"
        >
          Host Login
        </Link>
        <p className="text-sm text-white/40 mt-4">
          Guests: scan the QR code at your table to start capturing!
        </p>
      </div>
    </main>
  );
}
