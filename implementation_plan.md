# Campwork – Implementation Plan

## 1. Goal
Build **Campwork**, a student-only freelance marketplace (Upwork-style) with **Web (Next.js)** and **Mobile (Expo/React Native)** apps sharing the same backend.

This plan breaks development into **clear, buildable phases** so you don’t get stuck or overbuild.

---

## 2. Tech Stack (Locked In)

### Frontend
- **Web:** Next.js (App Router, TypeScript)
- **Mobile:** Expo (React Native + TypeScript)

### Backend / Services
- **Database & Auth:** Supabase
- **File Storage (Images):** Cloudinary
- **Payments:** Paystack
- **Deployment:**
  - Web → Vercel
  - Mobile → Expo EAS

---

## 3. Development Phases

### Phase 1 – Project Setup (Week 1)
**Goal:** Working dev environment for web + mobile

- [x] Create Next.js app
- [x] Create Expo app
- [x] Install Supabase client
- [x] Environment variables configured
- [x] Shared Supabase helper (auth, queries)
- [ ] GitHub repo setup

Deliverable:
- Both apps run locally
- Supabase connection confirmed

---

### Phase 2 – Database & Auth (Week 1–2)
**Goal:** Students can sign up and have profiles

#### Database
- Users (students)
- Profiles
- Jobs
- Proposals
- Reviews

#### Auth
- [x] Email + password signup
- [x] University email validation (optional MVP rule)
- [x] Profile creation after signup (via trigger)

Deliverable:
- [x] Student can register, login, logout
- [x] Profile saved in Supabase
- [x] Foreign key constraints working

---

### Phase 3 – Core Marketplace (Week 2–3)
**Goal:** Students can post and apply for jobs

#### Jobs
- [x] Create job (UI built)
- [x] View jobs (UI built)
- [x] Filter by category
- [x] Job status (open, in-progress, completed)

#### Proposals
- [x] Apply for a job
- [x] Client accepts one proposal

Deliverable:
- Basic job marketplace functional

---

### Phase 4 – Messaging (Week 3)
**Goal:** Students communicate inside Campwork

- [x] One-to-one messaging (job-based)
- [x] Supabase real-time subscriptions
- [x] Read receipts
- [x] Typing indicators
- [x] Media/image sharing in chat
- [x] Toast notifications for new messages

Deliverable:
- [x] Real-time chat per job

---

### Phase 5 – Payments (Week 4)
**Goal:** Safe student-to-student payments

- Paystack integration
- Escrow-style flow (simplified MVP)
- Payment status tracking

Deliverable:
- Job payment flow working

---

### Phase 6 – Reviews & Trust (Week 4)
**Goal:** Build trust in the platform

- Rate freelancer after job completion
- Display ratings on profile

Deliverable:
- Reviews visible on profiles

---

### Phase 7 – Polish & Launch Prep (Week 5)
**Goal:** Ready for real users

- [x] Error handling (Sentry – client, server, edge)
- [ ] Empty states
- [x] Mobile responsiveness
- [x] Basic SEO (sitemap, robots.ts, OG/Twitter tags per page)
- [ ] App icon & splash screen (Expo)

Deliverable:
- [ ] MVP ready for beta users

---

## 4. Web vs Mobile Scope (Important)

### Web First
- Full job posting
- Profile editing
- Admin-style features

### Mobile Focus
- Browsing jobs
- Applying
- Messaging
- Notifications

This avoids building everything twice at once.

---

## 5. MVP Rules (Do NOT Skip)

- No advanced AI matching
- No complex escrow logic
- No public freelancer profiles
- No bidding wars

Keep it simple.

---

## 6. Post-MVP Ideas (Later)

- University verification
- AI job matching
- Admin dashboard
- Subscription plans
- In-app notifications

---

## 7. Next Immediate Tasks

1. Paystack integration – escrow-style payment flow (Phase 5)
2. Reviews & ratings system – rate freelancer after job completion (Phase 6)
3. Display ratings on profile page (Phase 6)
4. Empty states across all listing pages (Phase 7)
5. Expo app icon & splash screen (Phase 7)
6. GitHub repo setup (Phase 1)

---

**This plan is your roadmap.**
If you follow it step-by-step, Campwork will ship.

