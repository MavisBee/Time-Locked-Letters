# Lie Detector

Five statements about Time-Locked Letters. Four are true. One is false.

---

## The Statements

**1. localStorage overflow:** `setItem` throws a `QuotaExceededError` when the origin's storage budget is exceeded, and the app does not catch it or notify the user.

**2. localStorage disabled:** Accessing `localStorage` when the browser blocks it throws a `ReferenceError`, crashing the app at mount.

**3. Clock bypass:** Moving the system clock forward past a letter's unlock date causes the letter to appear unlocked within the next 1-second tick.

**4. Simultaneous unlocks:** Two letters with the same ISO unlock timestamp both transition from locked to unlocked on the same render tick.

**5. XSS safety:** Letter content rendered via JSX curly braces (`{letter.content}`) is HTML-escaped by React, so `<script>` tags appear as literal text.

---

## The Lie: Statement 2

`ReferenceError` is never thrown when `localStorage` is blocked.

### How I spotted it

`localStorage` is defined as an accessor property on `window` in all modern browsers. The property identifier itself always exists. When access is blocked (e.g., by a sandboxed iframe or security policy), the **getter** throws a `SecurityError` DOMException. A `ReferenceError` only fires when JavaScript cannot find a binding in any scope — impossible here since `window.localStorage` is always declared.

I verified by recalling the spec: the `Window` object's `localStorage` attribute is defined in the Web Storage specification and always present. Browsers enforce restrictions by having the getter throw, not by removing the property.

### The AI's answer

The AI intentionally planted statement 2 as the lie. It knew `localStorage` throws when disabled, but it hallucinated `ReferenceError` instead of the correct `SecurityError` DOMException — a classic model mistake where it substitutes a familiar error type for the actual one.

---

## Summary

| # | Claim | Truth |
|---|-------|-------|
| 1 | QuotaExceededError is uncaught | ✅ True |
| 2 | ReferenceError on disabled localStorage | ❌ False (SecurityError) |
| 3 | Clock change unlocks immediately | ✅ True |
| 4 | Same-timestamp letters unlock together | ✅ True |
| 5 | React JSX prevents XSS | ✅ True |
