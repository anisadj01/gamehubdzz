const SOUND_KEY = "arcade-beep";

export function isBeepEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function setBeepEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
}

/** Short triple beep used when a session timer reaches its planned duration. */
export function playBeep(force = false) {
  if (typeof window === "undefined") return;
  if (!force && !isBeepEnabled()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      const t = start + i * 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* audio unavailable */
  }
}