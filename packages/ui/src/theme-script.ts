// Runs in the document head before paint; preference never enters a server cache.
export const themeStorageKey = "home-economy-theme-v1";
export const themeBootstrapScript = `(() => {
  let preference = "system";
  try {
    const saved = localStorage.getItem(${JSON.stringify(themeStorageKey)});
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {}
  const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.dataset.themePreference = preference;
  root.style.colorScheme = dark ? "dark" : "light";
})();`;
