let context: AudioContext | undefined;
let muted = false;
export async function armOrderSound(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    context ??= new AudioContext();
    await context.resume();
    return context.state === "running";
  } catch {
    /* Visual alerts remain available. */
    return false;
  }
}
export function setOrderMuted(value: boolean) {
  muted = value;
}
export function playOrderReady(): boolean {
  if (muted || !context || context.state !== "running") return false;
  try {
    const start = context.currentTime;
    [660, 880, 1100].forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.connect(gain);
      gain.connect(context!.destination);
      oscillator.frequency.value = frequency;
      const at = start + index * 0.22;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.15, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
      oscillator.start(at);
      oscillator.stop(at + 0.22);
    });
    try {
      navigator.vibrate?.([180, 90, 180]);
    } catch {
      /* A vibration failure does not undo successful audio playback. */
    }
    return true;
  } catch {
    /* Unsupported vibration/audio must not interrupt tracking. */
    return false;
  }
}
