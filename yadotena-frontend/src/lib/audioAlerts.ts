/**
 * Yadotena Audio Notification Engine — Final
 *
 * Five simple, pleasant bell sounds designed for a real café.
 * Each sound is immediately distinguishable by rhythm and pitch.
 *
 * Sound map:
 *   📋 New Order      → Ding → Dong          (2-note warm chime)
 *   🛎️ Table Call     → Ding!                 (single bell strike)
 *   🧾 Bill Request   → Ding → Ding           (double polite chime)
 *   ✅ Order Ready    → Ding → Ding → DING↑   (3-note ascending)
 *   💰 Payment        → click → Ding           (soft confirmation)
 *
 * Design rules:
 *   - Sounds ≤ 1.2s, comfortable at hundreds of plays/day
 *   - Consistent sonic identity: all bell-like sine tones
 *   - No music, no melodies, no harsh frequencies
 *   - Differentiation through rhythm (1/2/3 notes) and pitch
 *   - Smart rate limiting: no overlapping playback
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private lastPlayed: Map<string, number> = new Map();
  private lastAnySound: number = 0;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (C) this.audioCtx = new C();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /** Unlock audio on first user gesture (iOS / Chrome autoplay policy). */
  public unlockAudio(): void {
    if (this.isUnlocked || typeof window === "undefined") return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.001;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.05);
      this.isUnlocked = true;
    } catch {}
  }

  // ─── Rate limiting ───────────────────────────────────────────────────

  private canPlay(soundId: string, cooldownMs: number): boolean {
    const now = Date.now();
    if (now - this.lastAnySound < 800) return false; // global gap
    const last = this.lastPlayed.get(soundId) || 0;
    if (now - last < cooldownMs) return false;
    this.lastPlayed.set(soundId, now);
    this.lastAnySound = now;
    return true;
  }

  /** Test buttons skip per-sound cooldown, keep global gap. */
  private canPlayTest(): boolean {
    const now = Date.now();
    if (now - this.lastAnySound < 400) return false;
    this.lastAnySound = now;
    return true;
  }

  // ─── Bell tone primitive ─────────────────────────────────────────────

  /**
   * Play a single bell note: sine oscillator with fast attack,
   * natural exponential decay. Clean, pleasant, no harshness.
   */
  private bell(
    ctx: AudioContext,
    freq: number,
    at: number,
    dur: number,
    vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);

    // Bell envelope: instant attack → exponential decay
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(Math.min(vol, 0.6), at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📋 NEW ORDER — Ding → Dong
  // Two-note warm chime. First note slightly higher than second.
  // Communicates: "something new just arrived"
  // ═══════════════════════════════════════════════════════════════════════
  public playNewOrder(volume: number = 0.6): void {
    if (!this.canPlay("new_order", 6000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 659.25, t,         0.35, volume * 0.55); // E5  (Ding)
      this.bell(ctx, 523.25, t + 0.18,  0.45, volume * 0.55); // C5  (Dong)
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🛎️ TABLE CALL — Ding!
  // Single bell strike. Slightly higher pitch than New Order.
  // Communicates: "customer needs staff attention NOW"
  // Impossible to confuse with any other sound.
  // ═══════════════════════════════════════════════════════════════════════
  public playWaiterCall(volume: number = 0.65): void {
    if (!this.canPlay("waiter_call", 4000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 783.99, t, 0.40, volume * 0.60); // G5  (Ding!)
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧾 BILL REQUEST — Ding → Ding
  // Double polite chime. Softer than Table Call.
  // Communicates: "customer wants to pay"
  //
  // Distinction:
  //   Ding      = Table needs attention
  //   Ding-Ding = Customer wants the bill
  // ═══════════════════════════════════════════════════════════════════════
  public playBillRequest(volume: number = 0.65): void {
    if (!this.canPlay("bill_request", 4000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 659.25, t,         0.30, volume * 0.45); // E5  (Ding)
      this.bell(ctx, 659.25, t + 0.20,  0.35, volume * 0.45); // E5  (Ding)
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ ORDER READY — Ding → Ding → DING↑
  // 3-note ascending chime. Brightest, most recognizable sound.
  // Communicates: "completed → ready → come collect it"
  //
  // This is the strongest audio identity in the system.
  // Final note is slightly longer and higher.
  // ═══════════════════════════════════════════════════════════════════════
  public playOrderReady(volume: number = 0.6): void {
    if (!this.canPlay("order_ready", 5000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 523.25, t,          0.25, volume * 0.50); // C5  (Ding)
      this.bell(ctx, 659.25, t + 0.15,   0.25, volume * 0.55); // E5  (Ding)
      this.bell(ctx, 783.99, t + 0.30,   0.50, volume * 0.60); // G5  (DING↑)
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 💰 PAYMENT RECEIVED — click → Ding
  // Short confirmation. Low volume, soft, positive but subtle.
  // Communicates: "transaction completed"
  // Does NOT sound like a casino.
  // ═══════════════════════════════════════════════════════════════════════
  public playPaymentReceived(volume: number = 0.5): void {
    if (!this.canPlay("payment_received", 3000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      // Soft click (noise burst via very short oscillator)
      this.bell(ctx, 1200, t, 0.03, volume * 0.20);           // click
      // Followed by gentle confirmation ding
      this.bell(ctx, 523.25, t + 0.04, 0.30, volume * 0.35); // C5
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER COMPLETED — Quick success pop
  // Short single note, lighter than Order Ready.
  // Used when an order is marked served/completed.
  // ═══════════════════════════════════════════════════════════════════════
  public playOrderCompleted(volume: number = 0.45): void {
    if (!this.canPlay("order_completed", 2000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 659.25, t, 0.20, volume * 0.35); // E5
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACTION CONFIRM — Generic success
  // Very soft single tone. "Got it."
  // ═══════════════════════════════════════════════════════════════════════
  public playActionConfirm(volume: number = 0.35): void {
    if (!this.canPlay("action_confirm", 1500)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 587.33, t, 0.15, volume * 0.30); // D5
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR — Low descending tone
  // "Uh oh." Clearly signals failure.
  // ═══════════════════════════════════════════════════════════════════════
  public playError(volume: number = 0.5): void {
    if (!this.canPlay("error", 2500)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 440.00, t,          0.20, volume * 0.40); // A4
      this.bell(ctx, 349.23, t + 0.15,   0.25, volume * 0.40); // F4
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // KITCHEN ALERT — Order overdue/urgent
  // Quick double-tap. Attention-getting, short.
  // ═══════════════════════════════════════════════════════════════════════
  public playKitchenAlert(volume: number = 0.5): void {
    if (!this.canPlay("kitchen_alert", 15000)) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.bell(ctx, 587.33, t,          0.08, volume * 0.40); // D5
      this.bell(ctx, 587.33, t + 0.12,   0.08, volume * 0.40); // D5
    } catch {}
  }

  // ─── Legacy compatibility ────────────────────────────────────────────

  /** @deprecated Use playNewOrder() */
  public playNewOrderChime(v?: number): void { this.playNewOrder(v); }
  /** @deprecated Use playWaiterCall() */
  public playWaiterCallChime(v?: number): void { this.playWaiterCall(v); }
  /** @deprecated Use playActionConfirm() */
  public playActionPing(v?: number): void { this.playActionConfirm(v); }
}

export const soundAlerts = new SoundAlertManager();
