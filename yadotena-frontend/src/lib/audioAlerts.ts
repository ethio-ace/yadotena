/**
 * Yadotena Audio Notification Engine v3
 *
 * Professional restaurant notification sounds using Web Audio API.
 * Each entity type has a TRULY DISTINCT, recognizable sound profile.
 *
 * Sound Design Principles:
 * - Each sound is immediately identifiable even in a busy café
 * - Low-to-mid frequencies for comfort (no piercing highs)
 * - Short, crisp sounds that don't linger
 * - Clear distinction between every event type
 * - No annoying repetition — smart rate limiting built-in
 *
 * v3 changes:
 * - Redesigned all sounds to be unmistakably different
 * - Fixed frequency overlaps between similar sounds
 * - Each sound now has a unique rhythm AND frequency profile
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private lastPlayed: Map<string, number> = new Map();
  private lastAnySound: number = 0;

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
   * Rate limit: per-sound cooldown + global cooldown.
   */
  private canPlay(soundId: string, minIntervalMs: number): boolean {
    const now = Date.now();

    // Global cooldown: no two sounds within 800ms
    if (now - this.lastAnySound < 800) return false;

    // Per-sound cooldown
    const last = this.lastPlayed.get(soundId) || 0;
    if (now - last < minIntervalMs) return false;

    this.lastPlayed.set(soundId, now);
    this.lastAnySound = now;
    return true;
  }

  /**
   * Force-play bypassing per-sound rate limits (test buttons only).
   */
  private canPlayTest(soundId: string): boolean {
    const now = Date.now();
    if (now - this.lastAnySound < 400) return false;
    this.lastPlayed.set(soundId, now);
    this.lastAnySound = now;
    return true;
  }

  // ─── Tone helpers ────────────────────────────────────────────────────

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine"
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(Math.min(volume, 0.7), startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // NEW ORDER — Kitchen chime
  // Bright 3-note ascending: C5 → E5 → G5 (sine)
  // Like a pleasant doorbell — "a new order just came in!"
  // ═══════════════════════════════════════════════════════════════════════
  public playNewOrder(volume: number = 0.6): void {
    if (!this.canPlay("new_order", 5000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, start: 0, dur: 0.12 },    // C5
        { freq: 659.25, start: 0.10, dur: 0.12 },  // E5
        { freq: 783.99, start: 0.20, dur: 0.22 },  // G5
      ];

      notes.forEach(({ freq, start, dur }) => {
        this.playTone(ctx, freq, now + start, dur, volume * 0.65, "sine");
      });
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER READY — Server pickup alert
  // Quick bright double-ding: high A5 → E5 (triangle)
  // "Ding-ding!" — unmistakable, like a service bell
  // ═══════════════════════════════════════════════════════════════════════
  public playOrderReady(volume: number = 0.6): void {
    if (!this.canPlay("order_ready", 5000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Bright double-ding — service bell style
      this.playTone(ctx, 880.00, now, 0.10, volume * 0.5, "triangle");       // A5
      this.playTone(ctx, 880.00, now + 0.12, 0.10, volume * 0.5, "triangle"); // A5
      this.playTone(ctx, 659.25, now + 0.25, 0.25, volume * 0.5, "triangle"); // E5
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER COMPLETED — Quick confirmation pop
  // Soft single high pop: B5 → fade (sine)
  // "Done!" — light, satisfying, very short
  // ═══════════════════════════════════════════════════════════════════════
  public playOrderCompleted(volume: number = 0.5): void {
    if (!this.canPlay("order_completed", 3000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      this.playTone(ctx, 987.77, now, 0.06, volume * 0.35, "sine");  // B5
      this.playTone(ctx, 1318.51, now + 0.04, 0.10, volume * 0.25, "sine"); // E6
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WAITER CALL — Table needs assistance
  // Gentle low doorbell: E4 → A4 (sine)
  // Warm, low — "someone needs you" — completely different from order ready
  // ═══════════════════════════════════════════════════════════════════════
  public playWaiterCall(volume: number = 0.65): void {
    if (!this.canPlay("waiter_call", 4000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Low warm doorbell — completely distinct from order ready
      this.playTone(ctx, 329.63, now, 0.20, volume * 0.55, "sine");       // E4
      this.playTone(ctx, 440.00, now + 0.20, 0.30, volume * 0.55, "sine"); // A4
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BILL REQUEST — Customer wants to pay
  // Triple-tap: G4 → B4 → G4 (triangle)
  // Quick rhythmic pattern — "money" — unique rhythm distinguishes it
  // ═══════════════════════════════════════════════════════════════════════
  public playBillRequest(volume: number = 0.65): void {
    if (!this.canPlay("bill_request", 4000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Distinct triple-tap rhythm on triangle — "check please"
      this.playTone(ctx, 392.00, now, 0.08, volume * 0.50, "triangle");       // G4
      this.playTone(ctx, 493.88, now + 0.09, 0.08, volume * 0.50, "triangle"); // B4
      this.playTone(ctx, 392.00, now + 0.18, 0.15, volume * 0.50, "triangle"); // G4
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENT RECEIVED — Cash register "cha-ching!"
  // Bright 3-note ascending: E5 → A5 → C#6 (sine)
  // Universally understood "ka-ching!" — positive, rewarding
  // ═══════════════════════════════════════════════════════════════════════
  public playPaymentReceived(volume: number = 0.6): void {
    if (!this.canPlay("payment_received", 4000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Classic "ka-ching!" ascending bright
      this.playTone(ctx, 659.25, now, 0.08, volume * 0.45, "sine");       // E5
      this.playTone(ctx, 880.00, now + 0.07, 0.08, volume * 0.50, "sine"); // A5
      this.playTone(ctx, 1108.73, now + 0.14, 0.18, volume * 0.55, "sine"); // C#6
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACTION CONFIRM — Generic success
  // Soft single tone: F5 (sine)
  // Subtle, non-intrusive — "got it"
  // ═══════════════════════════════════════════════════════════════════════
  public playActionConfirm(volume: number = 0.4): void {
    if (!this.canPlay("action_confirm", 2000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      this.playTone(ctx, 698.46, now, 0.06, volume * 0.30, "sine"); // F5
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR — Something went wrong
  // Low descending: G4 → D4 (triangle)
  // "Uh oh" — clearly signals failure
  // ═══════════════════════════════════════════════════════════════════════
  public playError(volume: number = 0.5): void {
    if (!this.canPlay("error", 3000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      this.playTone(ctx, 392.00, now, 0.15, volume * 0.4, "triangle");       // G4
      this.playTone(ctx, 293.66, now + 0.12, 0.22, volume * 0.4, "triangle"); // D4
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // KITCHEN ALERT — Order overdue/urgent
  // Quick double-tap: D5 (sine)
  // Attention-getting double-tap — short and urgent
  // ═══════════════════════════════════════════════════════════════════════
  public playKitchenAlert(volume: number = 0.55): void {
    if (!this.canPlay("kitchen_alert", 15000)) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      this.playTone(ctx, 587.33, now, 0.06, volume * 0.40, "sine");        // D5
      this.playTone(ctx, 587.33, now + 0.10, 0.06, volume * 0.40, "sine"); // D5
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEGACY COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════

  /** @deprecated Use playNewOrder() */
  public playNewOrderChime(volume: number = 0.6): void {
    this.playNewOrder(volume);
  }

  /** @deprecated Use playWaiterCall() or playBillRequest() */
  public playWaiterCallChime(volume: number = 0.65): void {
    this.playWaiterCall(volume);
  }

  /** @deprecated Use playActionConfirm() */
  public playActionPing(volume: number = 0.4): void {
    this.playActionConfirm(volume);
  }
}

export const soundAlerts = new SoundAlertManager();
