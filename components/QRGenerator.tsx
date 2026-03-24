"use client";

import { useEffect, useRef, useCallback } from "react";

interface QRGeneratorProps {
  url: string;
  size?: number;
  eventName?: string;
}

const QR_DOWNLOAD_SIZE = 1024;
const QR_QUIET_ZONE = 4;
const QR_PADDING_PX = 40;

export default function QRGenerator({
  url,
  size = 256,
  eventName = "",
}: QRGeneratorProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!displayCanvasRef.current) return;

    import("qrcode").then((QRCode) => {
      // Display version: gold themed for the admin panel
      QRCode.toCanvas(displayCanvasRef.current!, url, {
        width: size,
        margin: QR_QUIET_ZONE,
        errorCorrectionLevel: "H",
        color: {
          dark: "#D4AF37",
          light: "#0A0A0A",
        },
      });

      // Hidden print version: black on white, high res
      if (printCanvasRef.current) {
        QRCode.toCanvas(printCanvasRef.current, url, {
          width: QR_DOWNLOAD_SIZE,
          margin: QR_QUIET_ZONE,
          errorCorrectionLevel: "H",
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      }
    });
  }, [url, size]);

  const createPrintableCanvas = useCallback((): HTMLCanvasElement => {
    const qrCanvas = printCanvasRef.current!;
    const textHeight = eventName ? 60 : 0;
    const totalWidth = QR_DOWNLOAD_SIZE + QR_PADDING_PX * 2;
    const totalHeight =
      QR_DOWNLOAD_SIZE + QR_PADDING_PX * 2 + textHeight;

    const canvas = document.createElement("canvas");
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d")!;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw QR code centered
    ctx.drawImage(qrCanvas, QR_PADDING_PX, QR_PADDING_PX);

    // Event name below QR
    if (eventName) {
      ctx.fillStyle = "#000000";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        eventName,
        totalWidth / 2,
        QR_PADDING_PX + QR_DOWNLOAD_SIZE + 40,
        totalWidth - QR_PADDING_PX * 2
      );
    }

    return canvas;
  }, [eventName]);

  const downloadQR = useCallback(() => {
    if (!printCanvasRef.current) return;
    const canvas = createPrintableCanvas();
    const link = document.createElement("a");
    link.download = `${eventName || "wedding"}-qr-code.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [createPrintableCanvas, eventName]);

  const downloadPDF = useCallback(async () => {
    if (!printCanvasRef.current) return;

    const { default: jsPDF } = await import("jspdf");

    // --- Single large QR page ---
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const qrDataUrl = printCanvasRef.current.toDataURL("image/png");
    const qrSize = 120; // mm (~12cm)
    const qrX = (pageW - qrSize) / 2;
    const qrY = 40;

    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Event name
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(eventName || "Wedding Camera", pageW / 2, qrY + qrSize + 15, {
      align: "center",
    });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Scan to capture memories",
      pageW / 2,
      qrY + qrSize + 25,
      { align: "center" }
    );

    // --- Table cards page (6 per A4) ---
    doc.addPage("a4", "portrait");

    const cols = 2;
    const rows = 3;
    const cardW = 90; // mm
    const cardH = 60; // mm
    const marginX = (pageW - cols * cardW) / 2;
    const marginY = (pageH - rows * cardH) / 2;
    const cardQrSize = 40; // mm

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = marginX + col * cardW;
        const y = marginY + row * cardH;

        // Dotted cut lines
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(x, y, cardW, cardH);

        // QR code centered in card
        const cardQrX = x + (cardW - cardQrSize) / 2;
        const cardQrY = y + 5;
        doc.addImage(qrDataUrl, "PNG", cardQrX, cardQrY, cardQrSize, cardQrSize);

        // Event name
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(eventName || "Wedding", x + cardW / 2, cardQrY + cardQrSize + 5, {
          align: "center",
        });

        // Karakalpak text
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(
          "Scan to capture memories",
          x + cardW / 2,
          cardQrY + cardQrSize + 10,
          { align: "center" }
        );
      }
    }

    doc.save(`${eventName || "wedding"}-qr-cards.pdf`);
  }, [eventName]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Display QR (gold themed) */}
      <div className="p-4 bg-dark rounded-xl border border-dark-border">
        <canvas ref={displayCanvasRef} />
      </div>

      {/* Hidden high-res print canvas */}
      <canvas ref={printCanvasRef} className="hidden" />

      <p className="text-xs text-white/40 break-all max-w-xs text-center">
        {url}
      </p>

      {/* Printing tip */}
      <p className="text-xs text-gold/60 text-center max-w-xs">
        Басып шығарыў ушын қара-ақ версияны жүклең
      </p>

      {/* Download buttons */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={downloadQR}
          className="text-sm text-gold hover:text-gold-light transition-colors underline"
        >
          QR кодты жүклеў (PNG)
        </button>
        <button
          onClick={downloadPDF}
          className="text-sm text-gold hover:text-gold-light transition-colors underline"
        >
          Басып шығарыў ушын жүклеў (PDF)
        </button>
      </div>

      {/* Host instructions */}
      <div className="mt-2 p-3 bg-dark rounded-lg border border-dark-border text-xs text-white/50 space-y-1 max-w-xs">
        <p>• QR кодты үлкен басып шығарың (минимум 5x5 см)</p>
        <p>• Ақ қағазға қара реңде басың</p>
        <p>• Ҳәр столға, кирер есикке ҳәм барға қойың</p>
      </div>
    </div>
  );
}
