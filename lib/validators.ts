// ─── Validators ──────────────────────────────────────────────────────────────

/** RFC 5322-compliant email regex (simplified but robust) */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export const ALLOWED_EMAIL_DOMAIN = '@umak.edu.ph';

/** Check if email belongs to @umak.edu.ph or is an authorized root admin account */
export function isUmakEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (
    lower === 'labadmin@gmail.com' ||
    lower === 'labadmin@campus.edu' ||
    lower === 'labadmin' ||
    lower === 'admin@campus.edu'
  ) {
    return true;
  }
  return lower.endsWith(ALLOWED_EMAIL_DOMAIN);
}

export function validateEmail(email: string): { valid: boolean; message: string } {
  if (!email || !email.trim()) return { valid: false, message: 'Campus email is required.' };
  const lower = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(lower)) {
    return { valid: false, message: 'Invalid email address format.' };
  }
  if (!isUmakEmail(lower)) {
    return { valid: false, message: 'Only @umak.edu.ph email addresses are allowed.' };
  }
  return { valid: true, message: '' };
}


export interface PasswordStrength {
  score: number;         // 0–5
  label: string;
  color: string;
  width: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const levels = [
    { label: '',          color: 'bg-slate-700',  width: '0%'   },
    { label: 'Very Weak', color: 'bg-red-500',    width: '20%'  },
    { label: 'Weak',      color: 'bg-orange-500', width: '40%'  },
    { label: 'Fair',      color: 'bg-amber-500',  width: '60%'  },
    { label: 'Strong',    color: 'bg-lime-500',   width: '80%'  },
    { label: 'Very Strong', color: 'bg-emerald-500', width: '100%' },
  ];

  const level = levels[score] || levels[0];

  return { score, checks, ...level };
}

export function validateFullName(name: string): { valid: boolean; message: string } {
  if (!name.trim()) return { valid: false, message: 'Full name is required.' };
  if (name.trim().length < 2) return { valid: false, message: 'Name must be at least 2 characters.' };
  if (!/^[a-zA-Z\s\-'.]+$/.test(name)) return { valid: false, message: 'Name contains invalid characters.' };
  return { valid: true, message: '' };
}
