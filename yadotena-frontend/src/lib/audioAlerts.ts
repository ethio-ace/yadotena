/**
 * Yadotena Audio Notification Engine v2
 * 
 * Professional restaurant notification sounds using Web Audio API.
 * Each entity type has a distinct, pleasant sound profile.
 * 
 * Sound Design Principles:
 * - Low-to-mid frequencies for comfort (avoid piercing highs)
 * - Short, crisp sounds that don't linger
 * - Clear distinction between urgent vs informational
 * - No annoying repetition - smart rate limiting built-in
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private lastPlayed: Map<string, number> = new Map();

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
   * Rate limit a sound to prevent annoying repetition.
   * Two layers of protection:
   * 1. Per-sound cooldown (e.g. new_order can't repeat within 8s)
   * 2. Global cooldown (no sound of ANY kind can play within 800ms)
   */
  private lastAnySound: number = 0;

  private canPlay(soundId: string, minIntervalMs: number): boolean {
    const now = Date.now();
    
    // Global cooldown: no two sounds within 800ms of each other
    if (now - this.lastAnySound < 800) {
      return false;
    }
    
    // Per-sound cooldown
    const last = this.lastPlayed.get(soundId) || 0;
    if (now - last < minIntervalMs) {
      return false;
    }
    
    this.lastPlayed.set(soundId, now);
    this.lastAnySound = now;
    return true;
  }

  /**
   * Force-play a sound bypassing rate limits (for test buttons only)
   */
  private canPlayTest(soundId: string): boolean {
    const now = Date.now();
    // Only enforce global cooldown for tests, skip per-sound
    if (now - this.lastAnySound < 400) {
      return false;
    }
    this.lastPlayed.set(soundId, now);
    this.lastAnySound = now;
    return true;
  }

  /**
   * Helper to create a pleasant tone with envelope
   */
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

    // Smooth envelope
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(Math.min(volume, 0.7), startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * New Order - Kitchen notification
   * Pleasant 3-note ascending chime (G4 → B4 → D5)
   * Warm, inviting, not alarming
   */
  public playNewOrder(volume: number = 0.6): void {
    if (!this.canPlay("new_order", 5000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 392.00, start: 0, dur: 0.15 },    // G4
        { freq: 493.88, start: 0.12, dur: 0.15 },  // B4
        { freq: 587.33, start: 0.24, dur: 0.25 },  // D5
      ];

      notes.forEach(({ freq, start, dur }) => {
        this.playTone(ctx, freq, now + start, dur, volume * 0.7, "sine");
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Order Ready - For waiters to pick up
   * Two-note descending chime (E5 → C5) - satisfying completion sound
   */
  public playOrderReady(volume: number = 0.6): void {
    if (!this.canPlay("order_ready", 5000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Pleasant "ding-dong" descending
      this.playTone(ctx, 659.25, now, 0.2, volume * 0.6, "sine");      // E5
      this.playTone(ctx, 523.25, now + 0.15, 0.3, volume * 0.6, "sine"); // C5
    } catch {
      // Ignore
    }
  }

  /**
   * Order Completed/Served - Confirmation sound
   * Single soft "pop" - quick confirmation
   */
  public playOrderCompleted(volume: number = 0.5): void {
    if (!this.canPlay("order_completed", 3000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Short, satisfying pop
      this.playTone(ctx, 880, now, 0.08, volume * 0.4, "sine");
      this.playTone(ctx, 1100, now + 0.06, 0.12, volume * 0.3, "sine");
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE SERVICE NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Waiter Call - Table needs assistance
   * Gentle two-tone (C5 → E5) - attention-getting but not piercing
   */
  public playWaiterCall(volume: number = 0.65): void {
    if (!this.canPlay("waiter_call", 4000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Gentle ascending - "service needed"
      this.playTone(ctx, 523.25, now, 0.18, volume * 0.55, "triangle");       // C5
      this.playTone(ctx, 659.25, now + 0.18, 0.25, volume * 0.55, "triangle"); // E5
    } catch {
      // Ignore
    }
  }

  /**
   * Bill Request - Customer wants to pay
   * Three-note pattern (G4 → B4 → G4) - distinct from waiter call
   */
  public playBillRequest(volume: number = 0.65): void {
    if (!this.canPlay("bill_request", 4000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // "Money" pattern - three notes
      this.playTone(ctx, 392.00, now, 0.15, volume * 0.5, "sine");       // G4
      this.playTone(ctx, 493.88, now + 0.12, 0.15, volume * 0.5, "sine"); // B4
      this.playTone(ctx, 392.00, now + 0.24, 0.2, volume * 0.5, "sine");  // G4
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Payment Received - Cash register "cha-ching"
   * Classic ascending two-note - universally understood
   */
  public playPaymentReceived(volume: number = 0.6): void {
    if (!this.canPlay("payment_received", 4000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // "Cha-ching" - bright ascending
      this.playTone(ctx, 880.00, now, 0.1, volume * 0.5, "triangle");      // A5
      this.playTone(ctx, 1174.66, now + 0.08, 0.2, volume * 0.5, "triangle"); // D6
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION CONFIRMATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Action Confirmation - Generic success
   * Soft single tone - "done"
   */
  public playActionConfirm(volume: number = 0.4): void {
    if (!this.canPlay("action_confirm", 2000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Quick confirmation blip
      this.playTone(ctx, 660, now, 0.06, volume * 0.35, "sine");
    } catch {
      // Ignore
    }
  }

  /**
   * Action Error - Something went wrong
   * Low two-note descending - "uh oh"
   */
  public playError(volume: number = 0.5): void {
    if (!this.canPlay("error", 3000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Descending "error" tones
      this.playTone(ctx, 440, now, 0.15, volume * 0.4, "triangle");      // A4
      this.playTone(ctx, 349.23, now + 0.12, 0.2, volume * 0.4, "triangle"); // F4
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KITCHEN NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Kitchen Alert - Order overdue/urgent
   * Quick double-tap - attention-getting without being annoying
   */
  public playKitchenAlert(volume: number = 0.55): void {
    if (!this.canPlay("kitchen_alert", 15000)) return;
    
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Quick double "tap"
      this.playTone(ctx, 520, now, 0.08, volume * 0.45, "sine");
      this.playTone(ctx, 520, now + 0.1, 0.08, volume * 0.45, "sine");
    } catch {
      // Ignore
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY COMPATIBILITY (deprecated - use new methods above)
  // ═══════════════════════════════════════════════════════════════════════════

  /** @deprecated Use playNewOrder() instead */
  public playNewOrderChime(volume: number = 0.6): void {
    this.playNewOrder(volume);
  }

  /** @deprecated Use playWaiterCall() or playBillRequest() instead */
  public playWaiterCallChime(volume: number = 0.65): void {
    this.playWaiterCall(volume);
  }

  /** @deprecated Use playActionConfirm() instead */
  public playActionPing(volume: number = 0.4): void {
    this.playActionConfirm(volume);
  }
}

export const soundAlerts = new SoundAlertManager();
