'use client';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy } from 'lucide-react';

interface AuthenticatorQrProps {
  secret: string;
  otpauthUri: string;
}

/**
 * QR code + setup key for linking Google Authenticator. The QR code is drawn here in the browser,
 * so the secret is never sent to another service.
 */
export default function AuthenticatorQr({ secret, otpauthUri }: AuthenticatorQrProps) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(otpauthUri, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => alive && setQr(url))
      .catch(() => setQr(''));
    return () => {
      alive = false;
    };
  }, [otpauthUri]);

  const grouped = secret.match(/.{1,4}/g)?.join(' ') || secret;

  return (
    <div className="space-y-3 text-xs">
      <ol className="space-y-1 text-slate-300 list-decimal list-inside">
        <li>Install <strong>Google Authenticator</strong> on your phone (Play Store / App Store).</li>
        <li>In the app tap <strong>+</strong> → <strong>Scan a QR code</strong> and scan this code.</li>
        <li>Enter the 6-digit code the app shows for <strong>UMak LabAssist</strong>.</li>
      </ol>
      <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
        {qr ? (
          // White background on purpose: phone cameras read dark-on-light QR codes most reliably
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Authenticator QR code" width={150} height={150} className="rounded-lg bg-white p-1.5 flex-shrink-0" />
        ) : (
          <div className="w-[150px] h-[150px] rounded-lg bg-slate-800 animate-pulse flex-shrink-0" />
        )}
        <div className="min-w-0 space-y-1.5 text-center sm:text-left">
          <p className="text-[11px] text-slate-400">Can&apos;t scan? Choose &quot;Enter a setup key&quot; and type:</p>
          <p className="font-mono text-sm text-slate-100 break-all">{grouped}</p>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(secret).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
            className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200"
          >
            <Copy size={11} /> {copied ? 'Copied' : 'Copy key'}
          </button>
          <p className="text-[11px] text-amber-300">Keep this private. Anyone with it can generate your codes.</p>
        </div>
      </div>
    </div>
  );
}
