'use client';
import React, { useEffect, useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import type { PhotoKind } from '@/lib/repairPhotos';
import type { RepairPhoto } from '@/app/api/repairs/photos/route';

type RepairPhotoGalleryProps =
  | { rma: string; kind: PhotoKind; ticketId?: never; title: string }
  | { ticketId: string; rma?: never; kind?: never; title: string };

type GalleryPhoto = Pick<RepairPhoto, 'id' | 'url'>;

/**
 * Photos the client attached: one section of a repair (rma + kind), or a lab PC ticket (ticketId).
 * Click a thumbnail to view it full size.
 */
export default function RepairPhotoGallery({ rma, kind, ticketId, title }: RepairPhotoGalleryProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const url = ticketId
      ? `/api/tickets/photos?ticket=${encodeURIComponent(ticketId)}`
      : `/api/repairs/photos?rma=${encodeURIComponent(rma || '')}`;
    fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d) => alive && setPhotos((d.photos || []).filter((p: RepairPhoto) => !kind || p.kind === kind)))
      .catch(() => alive && setPhotos([]));
    return () => {
      alive = false;
    };
  }, [rma, kind, ticketId]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight' && photos) setOpen((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft' && photos) setOpen((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, photos]);

  if (photos === null) return <p className="text-[11px] text-slate-500">Loading photos…</p>;

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
        <Camera size={12} className="text-violet-400" />
        {title} ({photos.length})
      </span>
      {photos.length === 0 ? (
        <p className="text-[11px] text-slate-500">No photos attached.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              className="w-24 h-24 rounded-lg overflow-hidden border border-slate-700 hover:border-violet-400 bg-slate-900"
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {open !== null && photos[open] && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
            onClick={() => setOpen(null)}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[open].url}
              alt={`${title} ${open + 1}`}
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex items-center gap-3 text-white text-xs">
              <span>{open + 1} / {photos.length}</span>
              <button type="button" onClick={() => setOpen(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
