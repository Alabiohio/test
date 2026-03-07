# Campwork – Special Implementation Plan

These are the remaining unchecked tasks from the main improvement roadmap. Each item below requires a more deliberate design or infrastructure decision before implementation.

---

## 1. 🔄 SWR / React Query — Client-Side Caching
> **From:** Roadmap Section 1A – Performance & Data Fetching

**Problem:** Navigating between categories or filter states causes a full re-fetch from Supabase each time, even if the data hasn't changed.

**Goal:** Cache the results of Jobs and Products queries so that switching between filters or returning to a listing page feels instantaneous.

**Recommended Approach:**
- Install `swr` (lighter, built by Vercel — fits well with Next.js)
- Create custom hooks: `useJobs(filters)` and `useProducts(filters)`which wrap the current Supabase fetch logic
- Use a cache key based on the current filter state (category, search, price range, location)
- Pair with the existing skeleton loaders as the fallback UI

**Considerations:**
- Current SSR setup already seeds initial data — SWR's `fallbackData` prop can accept this directly, so the first render stays flicker-free.
- Defer this until user scale justifies the added complexity.

---

## 2. 📧 Email Notifications — Proposal Alerts via Supabase Edge Functions
> **From:** Roadmap Section 2B – Notifications

**Problem:** When a student receives a proposal on their job, there is no email notification. Users must actively check the platform.

**Goal:** Automatically send a transactional email to the job poster when a new proposal is submitted.

**Recommended Approach:**
- Use **Supabase Edge Functions** (Deno) triggered by a `postgres_changes` webhook on the `proposals` table
- Use **Resend** (already used in the waitlist flow) as the email provider
- Email template should include:
  - Job title
  - Proposer's name / university
  - Proposal budget
  - A direct link to `/jobs/[id]/proposals`

**Steps:**
1. Create a new Edge Function: `supabase/functions/notify-proposal/index.ts`
2. Set up a `postgres_changes` trigger in Supabase pointing to the function
3. Add `RESEND_API_KEY` to Supabase Edge Function secrets
4. Design a clean HTML email template matching Campwork branding

---

## 3. 🔐 Escrow Logic — Secure Payment Holding (Phase 5)
> **From:** Roadmap Section 3B – Trust & Safety

**Problem:** There is currently no mechanism to hold payment securely between a client and a student until a job is completed and approved.

**Goal:** Implement a basic escrow system where:
- A client deposits funds when accepting a proposal
- Funds are held in a "pending" state
- Funds are released to the student only when the client marks the job as "Accepted & Complete"
- Funds can be refunded if the job is disputed/cancelled

**Recommended Approach:**
- Use **Stripe** as the payment processor (Stripe Connect for student payouts)
- Database schema additions:

```sql
-- Escrow transactions table
CREATE TABLE public.escrow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id),
  student_id UUID REFERENCES auth.users(id),
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'refunded', 'disputed')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  released_at TIMESTAMPTZ
);
```

**Flow:**
1. Client accepts proposal → Stripe Payment Intent created, funds held
2. Student completes work → Client reviews
3. Client clicks "Mark as Complete" → Stripe transfer releases funds to student's connected account
4. Dispute → Admin reviews via Sentry + Supabase dashboard

**Dependencies:**
- Stripe account with Connect enabled
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`
- New API routes: `/api/create-payment-intent` and `/api/release-funds`

---

**Priority Order:** Email Notifications → Escrow Logic → SWR Caching

**Last Updated:** 2026-02-23
