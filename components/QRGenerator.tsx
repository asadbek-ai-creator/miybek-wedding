"use client";

import { useEffect, useRef } from "react";

interface QRGeneratorProps {
  url: string;
  size?: number;
}

export default function QRGenerator({ url, size = 256 }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvas, url, {
        width: size,
        margin: 2,
        color: {
          dark: "#D4AF37",
          light: "#0A0A0A",
        },
      });
    });
  }, [url, size]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "wedding-camera-qr.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-dark rounded-xl border border-dark-border">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-xs text-white/40 break-all max-w-xs text-center">
        {url}
      </p>
      <button
        onClick={downloadQR}
        className="text-sm text-gold hover:text-gold-light transition-colors underline"
      >
        QR кодты жүклеў
      </button>
    </div>
  );
}
