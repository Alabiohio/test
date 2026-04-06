# Campwork Payments Implementation Plan (Paystack + Escrow)

## Overview
This document describes how to implement the Campwork job-posting payment system using Paystack with an internal escrow model. Clients fund jobs upfront, payments are held by the platform, and funds are released to freelancers after approval.

---

# Architecture

## Core Flow
1. Client posts job
2. Freelancers apply
3. Client selects freelancer
4. Client funds job via Paystack
5. Platform holds funds (escrow)
6. Freelancer completes work
7. Client approves
8. Platform deducts commission
9. Freelancer is paid

---

# Phase 1 — Project Setup

## Tasks
- Create Paystack business account
- Get Test API key
- Get Live API key
- Setup webhook endpoint
- Create environment variables

## Environment Variables
```
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PLATFORM_COMMISSION=0.10
```

---

# Phase 2 — Database Design

## Users Table
```
id
name
email
role (client | freelancer)
bank_code
account_number
created_at
```

## Jobs Table
```
id
title
description
budget
client_id
status (open, assigned, funded, in_progress, submitted, completed)
created_at
```

## Applications Table
```
id
job_id
freelancer_id
proposal
price
delivery_time
status
```

## Orders Table (Escrow)
```
id
job_id
client_id
freelancer_id
amount
commission
freelancer_amount
status (pending, funded, submitted, released, refunded)
paystack_reference
created_at
```

## Transactions Table
```
id
order_id
type (payment, payout, refund)
amount
status
reference
created_at
```

---

# Phase 3 — Job Posting Flow

## Step 1: Client Posts Job
Status:
- Job: OPEN
- Payment: NOT FUNDED

## Step 2: Freelancer Applies
Client selects freelancer

Status:
- Job: ASSIGNED

---

# Phase 4 — Payment Integration

## Step 1: Initialize Payment
Endpoint:
```
POST /api/payments/initialize
```

Payload:
```
{
  jobId,
  amount,
  email
}
```

Backend:
- Create order
- Call Paystack initialize
- Return checkout URL

---

## Step 2: User Pays
User redirected to Paystack checkout.

Payment methods:
- Card
- Bank transfer
- USSD

---

## Step 3: Webhook Verification
Endpoint:
```
POST /api/webhooks/paystack
```

Logic:
- Verify signature
- Confirm payment success
- Update order status = funded
- Update job status = in_progress

Escrow activated.

---

# Phase 5 — Work Submission

Freelancer submits work

Endpoint:
```
POST /api/orders/submit
```

Status:
- Order: submitted
- Job: submitted

---

# Phase 6 — Client Approval

Client clicks approve.

Endpoint:
```
POST /api/orders/approve
```

Backend Logic:
1. Calculate commission
2. Calculate freelancer payout
3. Trigger payout

Example:
```
Amount = 10000
Commission = 1000
Freelancer = 9000
```

---

# Phase 7 — Payout to Freelancer

Use Paystack Transfer API.

Endpoint:
```
POST /api/payouts/send
```

Steps:
1. Create transfer recipient
2. Initiate transfer
3. Save transaction
4. Mark order released

---

# Phase 8 — Dispute Handling

Client can:
- Request revision
- Open dispute

Admin actions:
- Release funds
- Refund client

Admin endpoints:
```
POST /api/admin/release
POST /api/admin/refund
```

---

# Status Flow

```
OPEN
↓
ASSIGNED
↓
FUNDED
↓
IN_PROGRESS
↓
SUBMITTED
↓
APPROVED
↓
RELEASED
```

---

# Commission Logic

Config:
```
PLATFORM_COMMISSION = 10%
```

Formula:
```
commission = amount * 0.10
freelancer = amount - commission
```

---

# Security Requirements

- Verify Paystack webhook signature
- Validate payment reference
- Prevent double payout
- Use idempotent payout logic
- Store transaction logs

---

# MVP Features

- Job posting
- Freelancer applications
- Job funding
- Escrow holding
- Work submission
- Client approval
- Commission deduction
- Freelancer payout
- Basic dispute handling

---

# Future Improvements

- Wallet system
- Milestone payments
- Partial releases
- Refund automation
- Multi-currency support
- Crypto escrow
- Ratings & reviews
- Auto dispute timer

---

# Complete Payment Flow

```
Client posts job
↓
Freelancers apply
↓
Client selects freelancer
↓
Client funds job
↓
Paystack collects payment
↓
Campwork holds escrow
↓
Freelancer works
↓
Client approves
↓
Campwork deducts commission
↓
Freelancer paid
```

---

# End of Implementation Plan

