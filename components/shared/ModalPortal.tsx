'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a full-screen dialog at the top level of the page.
 *
 * Dialogs use `fixed inset-0` to cover the screen, but inside a panel with a backdrop blur
 * (the `.glass` cards) `fixed` is measured from that panel instead of the window, so a dialog in a
 * tall panel opened far down the page. Mounting it on document.body keeps it centred on the screen.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
