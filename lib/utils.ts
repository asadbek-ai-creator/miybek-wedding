export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const IOS_MAX_CANVAS_DIM = 4096;

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function compressImage(
  canvas: HTMLCanvasElement,
  quality: number = 0.7,
  maxWidth: number = 1920
): Promise<Blob> {
  let targetW = canvas.width;
  let targetH = canvas.height;

  // Clamp to maxWidth
  if (targetW > maxWidth) {
    const scale = maxWidth / targetW;
    targetW = maxWidth;
    targetH = Math.round(targetH * scale);
  }

  // iOS canvas memory limit: cap either dimension at 4096
  if (targetW > IOS_MAX_CANVAS_DIM) {
    const scale = IOS_MAX_CANVAS_DIM / targetW;
    targetW = IOS_MAX_CANVAS_DIM;
    targetH = Math.round(targetH * scale);
  }
  if (targetH > IOS_MAX_CANVAS_DIM) {
    const scale = IOS_MAX_CANVAS_DIM / targetH;
    targetH = IOS_MAX_CANVAS_DIM;
    targetW = Math.round(targetW * scale);
  }

  // Only create a resized canvas if dimensions changed
  let sourceCanvas = canvas;
  if (targetW !== canvas.width || targetH !== canvas.height) {
    const resized = document.createElement("canvas");
    resized.width = targetW;
    resized.height = targetH;
    const ctx = resized.getContext("2d")!;
    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    sourceCanvas = resized;
  }

  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to compress image"));
      },
      "image/jpeg",
      quality
    );
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
