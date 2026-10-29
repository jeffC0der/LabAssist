import { ValidationError } from '@/lib/validation';
import { MAX_PHOTO_BYTES } from '@/lib/repairPhotos';

// ── Server-side checks shared by repair and ticket photo uploads ──

/** Private storage bucket for all photos (repairs at <rma>/..., tickets at tickets/<id>/...) */
export const PHOTO_BUCKET = 'repair-photos';
/** Signed viewing links last one hour */
export const PHOTO_LINK_SECONDS = 60 * 60;

/** Real file type from the first bytes (the browser's claimed type is not trusted). */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

/** The uploaded file from a multipart form, checked for size and real image type. */
export async function readPhotoFromForm(form: FormData): Promise<{ buf: Buffer; mime: string; ext: string }> {
  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) throw new ValidationError('Choose a photo to upload.');
  if (file.size > MAX_PHOTO_BYTES) throw new ValidationError(`Photos must be ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB or smaller.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffImage(buf);
  if (!type) throw new ValidationError('Only JPEG, PNG or WebP photos can be attached.');
  return { buf, ...type };
}
