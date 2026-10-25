'use client';
import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Copy, ShieldCheck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface AuthenticatorSetupProps {
  /** Called once the first code is accepted and the app is linked */
  onLinked: () => void;
  onCancel: () => void;
}

/**
 * One-time linking of Google Authenticator (or any authenticator app) to the signed-in staff account.
 * The QR code is drawn here in the browser, so the secret is never sent to another service.
 */
export default function AuthenticatorSetup({ onLinked, onCancel }: AuthenticatorSetupProps) {
  const toast = useToast();
  const [step, setStep] = useState<'intro' | 'scan'>('intro');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/pc-credentials/authenticator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start the setup.');
      setSecret(data.secret);
      setQr(await QRCode.toDataURL(data.otpauthUri, { width: 200, margin: 1, errorCorrectionLevel: 'M' }));
      setStep('scan');
    } catch (err: any) {
      toast.error('Authenticator setup', err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/pc-credentials/authenticator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not link the app.');
      setSecret('');
      setQr('');
      toast.success('Authenticator linked', 'From now on, use the code from the app to view PC credentials.');
      onLinked();
    } catch (err: any) {
      setCode('');
      toast.error('Code not accepted', err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
          <Smartphone size={20} className="text-indigo-300 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-slate-300">
            <p className="font-semibold text-slate-100">Link an authenticator app first</p>
            <p>
              Viewing PC credentials needs a code from <strong>Google Authenticator</strong> on your phone. The code changes every
              30 seconds, so a stolen password alone can&apos;t reveal anything. You only set this up once.
            </p>
            <p className="text-slate-400">Install Google Authenticator (Play Store / App Store) before you continue.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Set up authenticator'}
          </button>
        </div>
      </div>
    );
  }

  const grouped = secret.match(/.{1,4}/g)?.join(' ') || secret;
  return (
    <form onSubmit={confirm} className="space-y-3">
      <ol className="space-y-1 text-slate-300 list-decimal list-inside">
        <li>Open Google Authenticator and tap <strong>+</strong> → <strong>Scan a QR code</strong>.</li>
        <li>Scan this code (or choose <em>Enter a setup key</em> and type the key below).</li>
        <li>Enter the 6-digit code the app shows for <strong>UMak LabAssist</strong>.</li>
      </ol>
      <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
        {qr && (
          // White background on purpose: phone cameras read dark-on-light QR codes most reliably
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Authenticator QR code" width={160} height={160} className="rounded-lg bg-white p-1.5 flex-shrink-0" />
        )}
        <div className="min-w-0 space-y-1.5 text-center sm:text-left">
          <p className="text-[11px] text-slate-400">Setup key (if you can&apos;t scan)</p>
          <p className="font-mono text-sm text-slate-100 break-all">{grouped}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(secret).then(() => toast.info('Copied', 'Setup key copied.'))}
            className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200"
          >
            <Copy size={11} /> Copy key
          </button>
          <p className="text-[11px] text-amber-300">Keep this private. Anyone with it can generate your codes.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="authenticator-first-code" className="block font-semibold text-slate-300">Code from the app</label>
        <input
          id="authenticator-first-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-100 border border-slate-700 focus:border-indigo-400 focus:outline-none font-mono text-base tracking-[0.4em]"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-40"
        >
          <ShieldCheck size={14} />
          {busy ? 'Checking…' : 'Link app'}
        </button>
      </div>
    </form>
  );
}
