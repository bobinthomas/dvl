# PRD: Returns Pickup Scheduling

**Status:** Draft for review
**Owner:** Returns Product Team
**Date:** 2026-08-01

## Summary

Customers who initiate a return today get a generic "we'll contact you" message
with no visibility into pickup timing. This PRD adds a self-serve scheduling
flow: pick a pickup date and time slot, see the request's status, and cancel
or reschedule.

## Flow

1. Customer taps **Schedule Pickup** on the return confirmation screen. This is
   a primary call-to-action button — the main thing we want them to do next.
2. A calendar opens showing the next 7 available days. Unavailable days
   (courier capacity full) are visibly disabled and cannot be selected.
3. Once a day is picked, available time slots for that day are shown as a
   list of selectable chips (e.g. "9–11 AM", "2–4 PM"). Full slots are
   disabled.
4. Customer confirms. A secondary "Change slot" button lets them go back
   without losing the selected day.
5. The request now shows a status indicator — Scheduled, Courier Assigned,
   Picked Up, or Cancelled — on the returns list and on the request detail
   screen. The indicator must be readable at a glance in a dense list.
6. On the address step, the customer sees their pickup address in a
   card-style summary (address lines, contact name and phone) with an "Edit"
   link. This same summary card appears in three other flows already
   (checkout, delivery address confirmation, profile), just styled slightly
   differently in each.
7. If the customer cancels, we show a confirmation dialog with a destructive
   "Cancel pickup" action and a "Never mind" way out.

## Constraints

- Must work on the existing mobile web checkout surface (React) and the
  native app (React Native). No Angular surface for this flow.
- Pickup slot availability changes in real time; the UI must reflect
  disabled/full slots without a full page reload.
- Accessibility: this flow is used by customers on low-end Android devices
  with screen readers enabled at a meaningfully higher rate than the rest of
  the app. Every interactive element needs a clear accessible name and state.

## Out of scope

- Courier-side scheduling tools (internal ops app, not customer-facing).
- Payment or refund logic — handled by the existing returns service.
- Multi-item split pickups (one request per return for v1).
