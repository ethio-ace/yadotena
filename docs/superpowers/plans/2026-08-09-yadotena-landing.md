# Yadotena Public Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` menu redirect with a staff-aware marketing landing that shows seed/settings cafe facts, dual guest CTAs, and a staff role map to `/login`.

**Architecture:** Add a `(marketing)` route group that owns `/` with a light layout (no cart/SessionManager). Pure helpers in `cafe-facts.ts` resolve display name/address/phone from `GET /public/settings` with seed fallbacks. Landing UI is section components under `components/landing/`. Customer routes stay under `(customer)` for `/menu`, `/checkout`, `/order/[id]`.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, Tailwind v4, existing `api` client + `/api/backend` proxy, framer-motion (already in package.json).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-yadotena-landing-design.md`
- Public brand name on landing: **Yadotena Milk & Foods** (even if DB `cafe_name` is “Yadotena Cafe & Resto”)
- Tagline: **Fresh Dairy & Artisanal Kitchen**
- Facts only from settings/seed: address **Bole Road, Addis Ababa**, phone **+251911234567** — **no hours**, no fake ratings
- Demo table UUID: `d0000000-0000-0000-0000-000000000004`
- Primary CTA → `/menu?table=<demo uuid>`; secondary → `/menu`; staff → `/login`
- Landing must not use customer cart header shell
- Do not invent testimonials or “520+ reviews” on the landing
- Commits only when the user explicitly asks (skip commit steps unless requested)

---

## File structure

| Path | Responsibility |
|------|----------------|
| `yadotena-frontend/src/lib/cafe-facts.ts` | Constants + `resolveCafeFacts()` |
| `yadotena-frontend/src/app/(marketing)/layout.tsx` | Minimal shell + display font |
| `yadotena-frontend/src/app/(marketing)/page.tsx` | Compose landing sections |
| `yadotena-frontend/src/components/landing/LandingHero.tsx` | First viewport |
| `yadotena-frontend/src/components/landing/CafeDetails.tsx` | Address/phone block |
| `yadotena-frontend/src/components/landing/StaffMap.tsx` | Role tiles → login |
| `yadotena-frontend/src/components/landing/LandingFooter.tsx` | Compact footer |
| `yadotena-frontend/src/services/api.ts` | `settings.getPublic()` |
| `yadotena-frontend/src/app/(customer)/page.tsx` | **Delete** (route conflict) |
| `yadotena-frontend/src/app/(auth)/login/page.tsx` | Add “Back to home” link |
| `yadotena-frontend/src/app/(customer)/layout.tsx` | Logo home link → `/` |

---

### Task 1: Cafe facts helper

**Files:**
- Create: `yadotena-frontend/src/lib/cafe-facts.ts`
- Create: `yadotena-frontend/scripts/verify-cafe-facts.mjs` (no new test runner)

**Interfaces:**
- Produces:
  - `DEMO_TABLE_ID = "d0000000-0000-0000-0000-000000000004"`
  - `BRAND_NAME = "Yadotena Milk & Foods"`
  - `BRAND_TAGLINE = "Fresh Dairy & Artisanal Kitchen"`
  - `SEED_FALLBACK = { phone: "+251911234567", address: "Bole Road, Addis Ababa" }`
  - `resolveCafeFacts(raw: Record<string, unknown> | null | undefined): { displayName: string; phone: string; address: string }`

- [ ] **Step 1: Write helper module**

```ts
// yadotena-frontend/src/lib/cafe-facts.ts
export const DEMO_TABLE_ID = "d0000000-0000-0000-0000-000000000004";
export const BRAND_NAME = "Yadotena Milk & Foods";
export const BRAND_TAGLINE = "Fresh Dairy & Artisanal Kitchen";
export const SEED_FALLBACK = {
  phone: "+251911234567",
  address: "Bole Road, Addis Ababa",
} as const;

export function resolveCafeFacts(raw?: Record<string, unknown> | null) {
  const phone =
    (typeof raw?.cafe_phone === "string" && raw.cafe_phone.trim()) ||
    SEED_FALLBACK.phone;
  const address =
    (typeof raw?.cafe_address === "string" && raw.cafe_address.trim()) ||
    SEED_FALLBACK.address;
  return {
    displayName: BRAND_NAME,
    phone,
    address,
  };
}
```

- [ ] **Step 2: Write verification script**

```js
// yadotena-frontend/scripts/verify-cafe-facts.mjs
import assert from "node:assert/strict";

// Inline mirror of resolveCafeFacts logic for Node without TS loader
const BRAND_NAME = "Yadotena Milk & Foods";
const SEED_FALLBACK = { phone: "+251911234567", address: "Bole Road, Addis Ababa" };
function resolveCafeFacts(raw) {
  const phone = (typeof raw?.cafe_phone === "string" && raw.cafe_phone.trim()) || SEED_FALLBACK.phone;
  const address = (typeof raw?.cafe_address === "string" && raw.cafe_address.trim()) || SEED_FALLBACK.address;
  return { displayName: BRAND_NAME, phone, address };
}

assert.equal(resolveCafeFacts(null).phone, "+251911234567");
assert.equal(resolveCafeFacts({ cafe_phone: "  ", cafe_address: "CMC" }).address, "CMC");
assert.equal(resolveCafeFacts({ cafe_name: "Yadotena Cafe & Resto" }).displayName, BRAND_NAME);
console.log("cafe-facts ok");
```

- [ ] **Step 3: Run verification**

Run: `node scripts/verify-cafe-facts.mjs` (from `yadotena-frontend/`)  
Expected: `cafe-facts ok`

- [ ] **Step 4: Commit only if user requested**

---

### Task 2: Public settings API helper

**Files:**
- Modify: `yadotena-frontend/src/services/api.ts` (settings section ~554–565)

**Interfaces:**
- Consumes: `apiFetch` with `{ auth: false }`
- Produces: `api.settings.getPublic(): Promise<Record<string, unknown>>`

- [ ] **Step 1: Add `getPublic` beside existing `get`**

```ts
settings: {
  async get(): Promise<Record<string, unknown>> {
    try {
      return await apiFetch("/staff/settings");
    } catch {
      return apiFetch("/public/settings", { auth: false });
    }
  },
  async getPublic(): Promise<Record<string, unknown>> {
    return apiFetch("/public/settings", { auth: false });
  },
  async update(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiFetch("/staff/settings", { method: "PATCH", body: data });
  },
},
```

- [ ] **Step 2: Smoke-check via proxy (dev server running)**

Run: `curl -sS http://127.0.0.1:3002/api/backend/api/v1/public/settings | head -c 300`  
Expected: JSON including `cafe_phone` and `cafe_address`

---

### Task 3: Marketing layout (no customer chrome)

**Files:**
- Create: `yadotena-frontend/src/app/(marketing)/layout.tsx`

**Interfaces:**
- Produces: layout wrapping only marketing pages; ThemeToggle in a minimal top bar; Fraunces (or **Newsreader**) via `next/font/google` as `--font-display`

- [ ] **Step 1: Create marketing layout**

```tsx
// yadotena-frontend/src/app/(marketing)/layout.tsx
import { Newsreader } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND_NAME } from "@/lib/cafe-facts";

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} min-h-screen flex flex-col bg-background`}>
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 md:px-8 py-4">
        <Link href="/" className="font-semibold tracking-tight text-sm md:text-base">
          {BRAND_NAME}
        </Link>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Confirm no import of `SessionManager` or cart store in this layout**

---

### Task 4: Landing section components

**Files:**
- Create: `yadotena-frontend/src/components/landing/LandingHero.tsx`
- Create: `yadotena-frontend/src/components/landing/CafeDetails.tsx`
- Create: `yadotena-frontend/src/components/landing/StaffMap.tsx`
- Create: `yadotena-frontend/src/components/landing/LandingFooter.tsx`

**Interfaces:**
- Consumes: `DEMO_TABLE_ID`, `BRAND_*`, `resolveCafeFacts` result type `{ displayName, phone, address }`
- Produces: presentational components with Link CTAs

- [ ] **Step 1: LandingHero** — full-bleed atmosphere (CSS gradient + optional Unsplash dairy/kitchen background already allowed in `next.config` images), brand as hero, tagline, one support sentence (no ratings), CTAs:

```tsx
// Key links (exact hrefs)
const demoHref = `/menu?table=${DEMO_TABLE_ID}`;
// Primary Button → demoHref "Order at table (demo)"
// Secondary Button outline → "/menu" "View menu"
// Text link → "/login" "Staff portal"
```

Use `font-[family-name:var(--font-display)]` for the brand headline. Add 2–3 motion entrances via `framer-motion` (fade/slide on hero copy + CTA row). No cards in hero. No hours. No “4.9” badges.

- [ ] **Step 2: CafeDetails** — props `{ phone: string; address: string; displayName: string }`; single section “Visit us” with address + tel: link. No hours row.

- [ ] **Step 3: StaffMap** — four tiles:

| Role | Blurb |
|------|--------|
| Owner | Settings, staff, expenses, and full ops oversight |
| Manager | Payments, menu ops, and day-to-day control |
| Waiter | Tables, floor orders, and service requests |
| Kitchen | Prep queue and order status |

Each tile is a `Link` to `/login` (not a card-for-decoration: interactive links). One section heading: “How the cafe runs”.

- [ ] **Step 4: LandingFooter** — compact brand + phone + address; links View menu + Staff portal.

---

### Task 5: Marketing page + remove customer index redirect

**Files:**
- Create: `yadotena-frontend/src/app/(marketing)/page.tsx`
- Delete: `yadotena-frontend/src/app/(customer)/page.tsx`

**Interfaces:**
- Consumes: `api.settings.getPublic`, `resolveCafeFacts`, landing components

- [ ] **Step 1: Create page**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { resolveCafeFacts } from "@/lib/cafe-facts";
import { LandingHero } from "@/components/landing/LandingHero";
import { CafeDetails } from "@/components/landing/CafeDetails";
import { StaffMap } from "@/components/landing/StaffMap";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.settings.getPublic(),
    staleTime: 60_000,
  });
  const cafe = resolveCafeFacts(data);

  return (
    <>
      <LandingHero />
      <CafeDetails {...cafe} />
      <StaffMap />
      <LandingFooter phone={cafe.phone} address={cafe.address} />
    </>
  );
}
```

- [ ] **Step 2: Delete** `src/app/(customer)/page.tsx` so `/` is only the marketing page.

- [ ] **Step 3: Manual check**

Open `http://127.0.0.1:3002/`  
Expected: landing content, **not** “Loading Menu…” redirect.

---

### Task 6: Login + customer header home links

**Files:**
- Modify: `yadotena-frontend/src/app/(auth)/login/page.tsx`
- Modify: `yadotena-frontend/src/app/(customer)/layout.tsx` (logo `Link href`)

- [ ] **Step 1: Login** — add footer/header link:

```tsx
<a href="/" className="...">← Back to home</a>
```

Keep demo account buttons unchanged.

- [ ] **Step 2: Customer layout** — change brand `Link` from `href="/menu"` to `href="/"` so guests can return to the landing.

- [ ] **Step 3: Verify** `/login` shows back link; from `/menu` logo returns to landing.

---

### Task 7: Visual polish + craft floor pass

**Files:**
- Touch landing components + optional `globals.css` utilities for landing atmosphere only
- Run impeccable detector after UI files exist

- [ ] **Step 1: Apply craft rules** — one hero composition; brand-dominant; no purple gradient theme; no fake stats; amber retained as accent; atmospheric background (not flat white only).

- [ ] **Step 2: Desktop + mobile screenshot pass** (browser) — fix spacing/overflow in one batch.

- [ ] **Step 3: Run detector**

```bash
node /home/yene/.agents/skills/impeccable/scripts/detect.mjs --json \
  yadotena-frontend/src/app/\(marketing\) \
  yadotena-frontend/src/components/landing
```

Fix any P0/P1 hits that are real (ignore false positives from SVG/emoji).

- [ ] **Step 4: Build**

Run: `cd yadotena-frontend && npm run build`  
Expected: success; `/` listed as static or client route without conflict.

---

### Task 8: End-to-end acceptance

- [ ] **Step 1: Checklist**

| Check | Expected |
|-------|----------|
| `/` | Landing, no auto-redirect |
| Order at table (demo) | Opens menu with Table 04 session |
| View menu | Opens `/menu` without required table |
| Staff portal / role tiles | `/login` |
| Cafe block | Bole address + +251… (from API or fallback) |
| No hours / no fake ratings on landing | Absent |
| Brand name | Yadotena Milk & Foods |

- [ ] **Step 2: Update spec status line** to `Implemented` only after checklist passes.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `/` landing, no redirect | 5 |
| Demo + browse CTAs | 4, 5 |
| Staff map → login | 4 |
| Settings/seed facts only, no hours | 1, 2, 4, 5 |
| Brand name Milk & Foods | 1, 4 |
| No customer chrome on landing | 3 |
| Login back link | 6 |
| Public settings | 2 (endpoint exists; FE `getPublic`) |
| Visual craft / persuade mode | 7 |

**Placeholder scan:** none intentional.  
**Type consistency:** `resolveCafeFacts` return shape used by CafeDetails/Footer.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-yadotena-landing.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
