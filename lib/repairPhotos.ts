// ── Photos attached to a repair request (shared by the browser and the server) ──

export type PhotoKind = 'ISSUE' | 'CONDITION';
export const PHOTO_KINDS: PhotoKind[] = ['ISSUE', 'CONDITION'];

/** Per section (reported issue / physical condition) */
export const MAX_PHOTOS_PER_KIND = 3;
/** After the browser shrinks the photo; also under Vercel's request size limit */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
/** Longest side after shrinking, in pixels */
const MAX_SIDE = 1600;

/**
 * Shrink a phone photo before upload: longest side 1600 px, saved as JPEG (~300–700 KB).
 * PNG screenshots with transparency are kept as PNG. Falls back to the original file if the
 * browser can't decode it.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Only JPEG, PNG or WebP photos can be attached.');
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const keepPng = file.type === 'image/png';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, keepPng ? 'image/png' : 'image/jpeg', 0.85)
    );
    return blob && blob.size <= MAX_PHOTO_BYTES ? blob : file;
  } catch {
    return file;
  }
}

/** Upload one prepared photo for a repair. Throws with the server's message on failure. */
export async function uploadRepairPhoto(rma: string, kind: PhotoKind, photo: Blob): Promise<void> {
  const form = new FormData();
  form.append('rma', rma);
  form.append('kind', kind);
  form.append('file', photo, 'photo');
  const res = await fetch('/api/repairs/photos', { method: 'POST', body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'The photo could not be uploaded.');
  }
}
