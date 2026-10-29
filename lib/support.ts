/** Where users get help (help panel, footer, privacy policy and terms) */
export const SUPPORT_EMAIL = 'umak.labassist@gmail.com';
export const supportMailto = (subject = 'LabAssist support request') => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
