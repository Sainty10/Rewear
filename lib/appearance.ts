export const APPEARANCE_KEY = "rewear-appearance";
export type Appearance = "light" | "dark" | "system";
export function appearance(value: unknown): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolvedAppearance(
  preference: Appearance,
  systemDark: boolean,
) {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
// Constant, trusted code runs in the document head before the page is painted.
// Reading localStorage can fail in privacy modes; system preference still works.
export const appearanceBootstrap = `(function(){var p='system';try{var v=localStorage.getItem('rewear-appearance');if(v==='light'||v==='dark')p=v;}catch(e){}var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.appearance=p;document.documentElement.dataset.theme=d?'dark':'light';})();`;
