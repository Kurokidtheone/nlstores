"use client";
import { useRef, useState } from "react";

const MAX_SIDE = 1600;
const QUALITY = 0.82;

const LOGO_SIDE = 512;

/**
 * Resize + re-encode in the browser so phones upload ~200 KB instead of 5 MB.
 * square: centre-crop to a 512×512 square (logos).
 */
async function compress(file: File, square: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  if (square) {
    const side = Math.min(bitmap.width, bitmap.height);
    canvas.width = canvas.height = Math.min(LOGO_SIDE, side);
    ctx.fillStyle = "#fff"; // transparent PNG logos -> white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  } else {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, QUALITY));
  // Old Safari silently returns PNG for webp: fall back to JPEG then
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  return (await toBlob("image/jpeg")) ?? file;
}

async function upload(file: File, square: boolean): Promise<string> {
  const blob = await compress(file, square);
  const form = new FormData();
  form.append("file", blob, file.name);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { key?: string; error?: string };
  if (!res.ok || !data.key) throw new Error(data.error ?? "Échec de l'envoi");
  return data.key;
}

type Props = {
  /** called once per uploaded file, in order */
  onUploaded: (key: string) => void;
  multiple?: boolean;
  /** how many more files are allowed */
  remaining?: number;
  label?: { fr: string; ar: string };
  /** crop to a square (logo) */
  square?: boolean;
};

/** Photo picker -> browser compression -> /api/upload (R2). Returns R2 keys. */
export function UploadField({ onUploaded, multiple = false, remaining = 10, label = { fr: "Ajouter des photos", ar: "إضافة صور" }, square = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, remaining));
    e.target.value = "";
    setError(null);
    for (let i = 0; i < files.length; i++) {
      setProgress(`${i + 1}/${files.length}`);
      try {
        onUploaded(await upload(files[i], square));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    }
    setProgress(null);
  }

  const disabled = remaining <= 0 || progress !== null;
  return (
    <div>
      <input ref={input} type="file" accept="image/*" multiple={multiple} onChange={onChange} className="hidden" />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="dash-btn w-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-700"
      >
        <span aria-hidden className="text-xl">📷</span>
        {progress ? (
          <span>Envoi {progress} · <span className="ar">جاري الرفع</span></span>
        ) : (
          <span>{label.fr} · <span className="ar">{label.ar}</span></span>
        )}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
