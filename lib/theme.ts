// Dark (original) / Light theme: shared by the header switch and the root layout
export type Theme = 'dark' | 'light';
export const THEME_STORAGE_KEY = 'labassist_theme';

/** Runs in <head> before the page paints, so a saved Light theme never flashes Dark first. */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='light'){var h=document.documentElement;h.classList.remove('dark');h.classList.add('light');}}catch(e){}})();`;
