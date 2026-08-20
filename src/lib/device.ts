/** Empreinte machine générée par l'application (stable par navigateur/poste). */
export function getMachineId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "gamehub_machine_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `M-${crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getDeviceInfo() {
  if (typeof navigator === "undefined") return { device: "", os: "", browser: "" };
  const ua = navigator.userAgent;
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/i.test(ua)
        ? "iOS"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Inconnu";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Safari\//i.test(ua)
          ? "Safari"
          : /Firefox\//i.test(ua)
            ? "Firefox"
            : "Inconnu";
  const device = /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Ordinateur";
  return { device, os, browser };
}