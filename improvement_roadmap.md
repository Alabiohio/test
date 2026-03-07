# Campwork – Improvement & Optimization Roadmap

This document outlines strategic and technical improvements to elevate **Campwork** from an MVP to a robust, scalable product.

---

## 🛠 1. Technical Enhancements

### A. Performance & Data Fetching
- [x] **Server-Side Rendering (SSR)**: Transition from purely client-side fetching (`useEffect`) to Next.js Server Components for Job and Product listings. This improves SEO and eliminates initial loading flickers.
- [ ] **SWR/React Query**: Implement a caching layer for client-side data. This will make navigation between categories and search results feel instantaneous.
- [x] **Image Optimization**: Use Cloudinary's dynamic transformations to deliver appropriately sized images based on the user's device, significantly reducing bandwidth.

### B. Type Safety & Architecture
- [x] **Stricter Types**: Move away from `any` in components (e.g., `currentUser` in `MessagesContent`).
- [x] **Zod Validation**: Implement `zod` for form validation in "Create Job" and "Sell Item" flows to prevent malformed data from reaching Supabase.
- [x] **Centralized API Layer**: Create a dedicated `services/` directory to abstract Supabase calls, making the frontend logic cleaner and easier to test.

---

## 💬 2. Messaging & Communication (Phase 4 Refinement)

### A. Advanced Chat Features
- [x] **Typing Indicators**: Show when the other participant is typing using Supabase real-time presence.
- [x] **Read Receipts**: Visual indicators (single vs. double checks) to confirm when a message has been seen.
- [x] **Media Sharing**: Allow students to send images (via Cloudinary) directly in the chat to share item conditions or project proofs.

### B. Notifications
- [x] **In-App Alerts**: Live toast notifications using `sonner` or `react-hot-toast` when a new message arrives while the user is on another page.
- **Email Notifications**: Trigger emails via Supabase Edge Functions when a user receives a proposal.

---

## 🛍 3. Marketplace & Product Features

### A. Discovery & Search
- [x] **Fuzzy Search**: Implemented multi-column search with support for SQL Full-Text Search integration.
- [x] **Advanced Filters**: Added price range, location filtering, and and expandable UI for better discovery.
- [x] **Recently Viewed**: Added a persistent history of recently visited items using localStorage.

### B. Trust & Safety
- [x] **Verified University Emails**: Enforced `.edu` email domain requirement for Students during signup.
- [x] **Report System**: Added a "Flag" button on jobs/products allowing authenticated users to report suspicious content.
- **Escrow Logic (Phase 5 Prep)**: Design the DB schema to hold funds in a "pending" state until a student marks a job as "Accepted & Complete."

---

## 🎨 4. Design & UX Refinements

### A. Micro-interactions
- [x] **Skeleton Loaders**: Implemented custom skeletons for Job and Product cards.
- [x] **Haptic Feedback**: Added `.active-scale` transitions for mobile interactions.

### B. SEO & Accessibility
- [x] **Dynamic Metadata**: Added nested layouts with `generateMetadata` for dynamic OG tags on Jobs/Products.
- [x] **Aria Labels**: Added accessibility labels to core navigation components.

---

## 📈 5. Monitoring & Analytics
- [x] **Vercel Analytics**: Tracked page views and user drop-off points in the registration/posting flows.
- [x] **Error Tracking**: Integrated **Sentry** to capture and debug client-side crashes in real-time.

---

**Date**: 2026-02-16  
