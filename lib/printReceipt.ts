// ── Print one receipt / invoice ──
// window.print() printed the whole dark dashboard, and the pop-up's fixed overlay and scroll area cut the
// receipt off. Instead we copy just the receipt card (the nearest [data-print-root]) into a hidden frame
// with the page's styles, turn it into black text on white paper, and print only that.

const PRINT_CSS = `
  @page { size: auto; margin: 10mm; }
  html, body { background: #fff !important; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-root, .print-root * {
    color: #111827 !important;
    background: transparent !important;
    box-shadow: none !important;
    text-shadow: none !important;
    backdrop-filter: none !important;
    border-color: #d1d5db !important;
    overflow: visible !important;
    max-height: none !important;
    animation: none !important;
    transition: none !important;
  }
  .print-root { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 16px 18px !important; border: 1px solid #d1d5db !important; border-radius: 12px; }
  /* Paper copy: tighter spacing than on screen so a receipt fits on one page */
  .print-root [class*="space-y-"] > :not([hidden]) ~ :not([hidden]) { margin-top: 10px !important; }
  .print-root .p-4, .print-root .p-3.5, .print-root .p-3 { padding: 8px 10px !important; }
  .print-root .pb-5, .print-root .pb-4 { padding-bottom: 8px !important; }
  .print-root .pt-3 { padding-top: 6px !important; }
  .print-root .my-8 { margin-top: 0 !important; margin-bottom: 0 !important; }
  .print-root .text-slate-500, .print-root .text-slate-400 { color: #4b5563 !important; }
  .print-root table { width: 100%; border-collapse: collapse; }
  .print-root tr, .print-root section, .print-root .rounded-xl { break-inside: avoid; }
  .print-root img { max-width: 100%; }
`;

// Printable area of Letter paper with 10 mm margins (the smaller of Letter and A4), in CSS pixels
const PAGE_WIDTH_PX = 740;
const PAGE_HEIGHT_PX = 960;

/** Shrink the receipt (never enlarge) so it prints on a single page. */
function fitToOnePage(doc: Document) {
  const root = doc.querySelector<HTMLElement>('.print-root');
  if (!root) return;
  const height = root.getBoundingClientRect().height;
  if (height > PAGE_HEIGHT_PX) {
    const scale = Math.max(0.5, (PAGE_HEIGHT_PX - 4) / height);
    root.style.setProperty('zoom', String(scale));
  }
}

export function printReceipt(trigger: HTMLElement, title = 'UMakLabAssist Receipt') {
  const root = trigger.closest<HTMLElement>('[data-print-root]');
  if (!root) {
    window.print();
    return;
  }

  // Copy of the receipt without buttons or anything marked as screen-only
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button, [data-print-hide]').forEach((el) => el.remove());
  clone.classList.add('print-root');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  // Off-screen at the printable width of Letter/A4 paper (~740 px), so the receipt can be measured
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH_PX}px;height:${PAGE_HEIGHT_PX}px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    window.print();
    return;
  }

  // Same styles as the app (Tailwind classes), so the layout of the receipt is kept
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${location.origin}/">
    <title>${title.replace(/[<>&"]/g, '')}</title>${styles}<style>${PRINT_CSS}</style></head>
    <body>${clone.outerHTML}</body></html>`);
  doc.close();

  let printed = false;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  const doPrint = () => {
    if (printed) return;
    printed = true;
    fitToOnePage(doc);
    win.focus();
    win.print();
    cleanup();
  };

  // Wait for the stylesheets and images in the frame, but never hang
  const pending = Array.from(doc.querySelectorAll<HTMLLinkElement | HTMLImageElement>('link[rel="stylesheet"], img')).filter(
    (el) => !(el instanceof HTMLImageElement && el.complete)
  );
  if (pending.length === 0) {
    setTimeout(doPrint, 100);
  } else {
    let left = pending.length;
    const done = () => --left <= 0 && setTimeout(doPrint, 100);
    pending.forEach((el) => {
      el.addEventListener('load', done, { once: true });
      el.addEventListener('error', done, { once: true });
    });
    setTimeout(doPrint, 3000);
  }
}
