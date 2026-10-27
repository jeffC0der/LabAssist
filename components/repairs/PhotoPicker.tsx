'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, ImagePlus } from 'lucide-react';
import { MAX_PHOTOS_PER_KIND, preparePhoto } from '@/lib/repairPhotos';

export interface PickedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
}

interface PhotoPickerProps {
  label: string;
  hint?: string;
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  disabled?: boolean;
}

/** Optional photo attachments for the repair intake form (up to 3, shrunk before upload). */
export default function PhotoPicker({ label, hint, photos, onChange, disabled }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Free the preview images when they're removed or the form is reset
  const previews = useRef<string[]>([]);
  useEffect(() => {
    previews.current = photos.map((p) => p.previewUrl);
  }, [photos]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_PHOTOS_PER_KIND - photos.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Only ${MAX_PHOTOS_PER_KIND} photos can be attached here.`);
    setBusy(true);
    const added: PickedPhoto[] = [];
    for (const file of chosen) {
      try {
        const blob = await preparePhoto(file);
        added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, previewUrl: URL.createObjectURL(blob) });
      } catch (err: any) {
        setError(err.message);
      }
    }
    setBusy(false);
    if (added.length) onChange([...photos, ...added]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Camera size={13} className="text-violet-400" />
          {label} <span className="text-slate-500 font-normal">(optional, up to {MAX_PHOTOS_PER_KIND})</span>
        </span>
        <span className="text-[11px] text-slate-500">{photos.length}/{MAX_PHOTOS_PER_KIND}</span>
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="Attached photo" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              disabled={disabled}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600"
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS_PER_KIND && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="w-20 h-20 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-violet-300 hover:border-violet-500/60 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold disabled:opacity-50"
          >
            <ImagePlus size={18} />
            {busy ? 'Adding…' : 'Add photo'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      {error && <p className="text-[11px] text-amber-400">{error}</p>}
    </div>
  );
}
