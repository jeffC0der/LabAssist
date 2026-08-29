'use client';
import React from 'react';
import { checkPasswordStrength, PasswordStrength } from '@/lib/validators';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
  strength?: PasswordStrength;
  show?: boolean;
}

export default function PasswordStrengthMeter({ password, strength: propStrength, show = true }: PasswordStrengthMeterProps) {
  if (!show) return null;

  const strength = propStrength || (password ? checkPasswordStrength(password) : null);
  if (!strength) return null;

  const checks = [
    { key: 'length',    label: 'At least 8 characters',          met: strength.checks.length },
    { key: 'uppercase', label: '1 uppercase letter (A–Z)',       met: strength.checks.uppercase },
    { key: 'lowercase', label: '1 lowercase letter (a–z)',       met: strength.checks.lowercase },
    { key: 'number',    label: '1 number (0–9)',                 met: strength.checks.number },
    { key: 'special',   label: '1 special character (!@#$%^&*)', met: strength.checks.special },
  ];

  return (
    <div className="space-y-3 animate-fade-in mt-2" role="group" aria-label="Password strength requirements">
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 font-medium">Password strength</span>
          {strength.score > 0 && (
            <span className={`text-xs font-semibold ${strength.score <= 1 ? 'text-red-400' : strength.score <= 2 ? 'text-orange-400' : strength.score <= 3 ? 'text-amber-400' : strength.score <= 4 ? 'text-lime-400' : 'text-emerald-400'}`}>
              {strength.label}
            </span>
          )}
        </div>
        <div className="flex gap-1" role="meter" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={5} aria-label={`Password strength: ${strength.label}`}>
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`
                h-1.5 flex-1 rounded-full transition-all duration-500
                ${strength.score >= level ? strength.color : 'bg-slate-700'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1.5">
        {checks.map(({ key, label, met }) => (
          <li key={key} className="flex items-center gap-2">
            <span
              className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-600'
              }`}
              aria-hidden="true"
            >
              {met ? <Check size={10} /> : <X size={10} />}
            </span>
            <span className={`text-xs transition-colors duration-300 ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
