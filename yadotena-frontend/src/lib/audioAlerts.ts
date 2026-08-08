/**
 * Yadotena Audio Notification Engine
 * Zero-dependency Web Audio API synthesizer for crisp, clear restaurant alerts.
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public unlockAudio(): void {
    if (this.isUnlocked || typeof window === "undefined") return;
    try {
      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        // Play silent oscillator to unlock iOS / Chrome autoplay restriction
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(ctx.currentTime + 0.05);
        this.isUnlocked = true;
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Triple-tone ascending chime for new pending orders
   * 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5) -> 1046Hz (C6)
   */
  public playNewOrderChime(volume: number = 0.8): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, start: 0, duration: 0.18 },
        { freq: 659.25, start: 0.15, duration: 0.2 },
        { freq: 783.99, start: 0.32, duration: 0.22 },
        { freq: 1046.50, start: 0.50, duration: 0.45 },
      ];

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Use pleasant triangle/sine hybrid
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        // Envelope: quick attack, natural exponential decay
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(Math.min(volume, 1.0), now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Two-tone urgent bell chime for Waiter Call & Bill Requests
   * 880Hz (A5) -> 587Hz (D5)
   */
  public playWaiterCallChime(volume: number = 0.85): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const tones = [
        { freq: 880.00, start: 0, duration: 0.3 },
        { freq: 587.33, start: 0.28, duration: 0.55 },
      ];

      tones.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(Math.min(volume, 1.0), now + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Positive single ping for action completed / order served
   */
  public playActionPing(volume: number = 0.6): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(Math.min(volume, 1.0), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }
}

export const soundAlerts = new SoundAlertManager();
