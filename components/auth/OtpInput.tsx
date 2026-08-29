'use client';
import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  hasError?: boolean;
  onComplete?: (code: string) => void;
  idPrefix?: string;
}

export default function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  hasError = false,
  onComplete,
  idPrefix = 'otp-digit',
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into an array of digits padded with empty strings
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Auto-focus the first input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/\D/g, '');

    if (!cleanVal) {
      // Empty input
      const newDigits = [...digits];
      newDigits[index] = '';
      const updated = newDigits.join('');
      onChange(updated);
      return;
    }

    if (cleanVal.length > 1) {
      // Multiple characters typed/pasted into a single box
      handlePasteData(cleanVal, index);
      return;
    }

    // Single digit entered
    const newDigits = [...digits];
    newDigits[index] = cleanVal[0];
    const updated = newDigits.join('');
    onChange(updated);

    // Auto advance to next box
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }

    // Trigger onComplete if full code is entered
    if (updated.length === length && onComplete) {
      onComplete(updated);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current is already empty, move to previous and clear it
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handlePasteData = (pastedText: string, startIndex = 0) => {
    const numbersOnly = pastedText.replace(/\D/g, '');
    if (!numbersOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < length && i < numbersOnly.length; i++) {
      newDigits[i] = numbersOnly[i];
    }

    const updated = newDigits.join('').slice(0, length);
    onChange(updated);

    // Focus on the next empty box or the last box
    const nextIndex = Math.min(numbersOnly.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
    inputRefs.current[nextIndex]?.select();

    if (updated.length === length && onComplete) {
      onComplete(updated);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    handlePasteData(paste, 0);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-2" role="group" aria-label="OTP verification code input">
      {Array.from({ length }).map((_, i) => {
        const isFilled = !!digits[i];
        return (
          <input
            key={i}
            id={`${idPrefix}-${i}`}
            ref={el => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={digits[i] || ''}
            disabled={disabled}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            className={`
              w-11 h-13 sm:w-12 sm:h-14
              text-center font-mono text-xl sm:text-2xl font-bold
              rounded-xl transition-all duration-200 outline-none select-none
              ${
                hasError
                  ? 'border-2 border-rose-500/80 bg-rose-500/10 text-rose-200 focus:ring-2 focus:ring-rose-500/40'
                  : isFilled
                  ? 'border-2 border-indigo-500/80 bg-slate-900/90 text-indigo-200 shadow-glow-indigo/20 ring-1 ring-indigo-500/30'
                  : 'border border-slate-700/90 bg-slate-900/60 text-slate-100 hover:border-slate-600 focus:border-indigo-400 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            `}
            aria-label={`Digit ${i + 1} of ${length}`}
          />
        );
      })}
    </div>
  );
}
