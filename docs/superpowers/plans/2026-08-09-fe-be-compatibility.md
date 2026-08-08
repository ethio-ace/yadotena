# FE/BE Compatibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make hosted API and `yadotena-frontend` fully compatible (service requests, reviews, payments, totals, settings, staff, soft-delete, analytics range).

**Architecture:** Migration `000003` + handlers/DTOs in existing Chi server; wire FE `api.ts` and dependent pages.

**Tech Stack:** Go, pgx, Next.js, React Query

## Tasks

### Task 1: Migration + models
- Add `service_requests`, `reviews`
- Add order columns `tax_etb`, `service_charge_etb`, `delivery_fee_etb`

### Task 2: DTO payment status + staff phone + order totals in OrderAPI

### Task 3: Service request handlers + routes

### Task 4: Review handlers + routes

### Task 5: createOrder totals; partial settings PATCH; staff phone/status; filter soft-deleted menu

### Task 6: Frontend types + api client

### Task 7: FE pages (checkout payments, payments verify, reviews, service requests, analytics range, dashboard)

### Task 8: Tests + verify build
