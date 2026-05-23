# Time-Locked Letters: Edge Cases, Security & Principle Violations

An audit of what breaks, what leaks, and what principles the code ignores.

---

## 1. localStorage Full

`src/App.tsx:29` writes unconditionally:

```tsx
localStorage.setItem('timeLockedLetters', JSON.stringify(newLetters));
```

**What happens:** `setItem` throws a `QuotaExceededError` (DOMException) when the origin's 5–10 MB storage budget is exhausted. The `saveLetters` function (`src/App.tsx:27-30`) does not catch this error. The React state update (`setLetters`) runs _before_ the `setItem` call, so the UI shows the letter as added, but the write to disk fails. On next page load, the letter is gone.

**Affected operations:**
- Adding a letter (uncaught exception, UI may partially update)
- Deleting a letter (same — state updates, localStorage write fails, letter reappears on reload)

**No user feedback** — the error silently kills the write.

---

## 2. localStorage Disabled / Unavailable

Some environments do not provide `localStorage`:
- Private/Incognito modes in certain browsers
- `file://` protocol in Safari
- `localStorage` set to `null` or `undefined` by browser policy
- `localStorage` deleted or access-restricted by extensions

`src/App.tsx:19` and `src/App.tsx:29` both reference `localStorage` directly without a guard:

```tsx
const saved = localStorage.getItem('timeLockedLetters');  // line 19
localStorage.setItem('timeLockedLetters', JSON.stringify(newLetters)); // line 29
```

**What happens:** A `SecurityError` or `ReferenceError` is thrown on the very first access. The entire app crashes at mount time (`useEffect`, line 18) or on any save operation. There is no try/catch, no feature detection, and no fallback (e.g., in-memory storage or a user-facing warning).

---

## 3. User Changes System Clock

The unlock mechanism uses `Date.now()` via `new Date().getTime()`, updated every second:

```tsx
const interval = setInterval(() => setNow(new Date()), 1000);  // line 23
...
const current = now.getTime();                                  // line 55
const diff = unlock - current;                                  // line 56
```

**What happens:**
- Moving the clock **forward** past a letter's unlock date: the letter unlocks immediately on the next tick (within 1 second). No server-side validation exists — the entire timekeeping system is client-side.
- Moving the clock **backward**: countdown timers increase. A user could make a letter appear to have _more_ time remaining than it should.
- There is no mechanism to detect clock skew, no use of `performance.timeOrigin` or server-provided timestamps.

**This is a fundamental trust problem.** The app's core promise ("letters sleep until their time comes") is enforced entirely by the client's system clock, which the user controls completely.

---

## 4. Two Letters Share the Same Unlock Minute

Letters are keyed by `crypto.randomUUID()` (`src/App.tsx:37`), so there is no ID collision. But the rendering logic processes them independently in a flat map:

```tsx
letters.map(letter => {
  const timeLeft = calculateTimeLeft(letter.unlockDate);
  const isLocked = timeLeft !== null;
  ...
});
```

**Current behavior:** Each letter is evaluated independently against `now`. If two letters share the same unlock timestamp, they both flip from locked to unlocked simultaneously on the same 1-second tick. This is correct but worth noting:

- All such letters cross the threshold at exactly the same render — there is a visual "burst" of unlocks.
- The ordering of simultaneous unlocks depends on array order (insertion order), which is somewhat arbitrary.
- No notification or animation differentiates them — they all just appear.

**No ordering guarantee problem** for the current flat UI, but if a future feature sorted or grouped letters by unlock time, same-minute letters would need a secondary sort key.

---

## 5. XSS (Cross-Site Scripting)

Letter content is rendered via standard React JSX interpolation:

```tsx
<p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
  {letter.content}
</p>
```

**Verdict: Safe by default.** React escapes all string content before rendering. JSX `{expression}` does not interpret HTML tags or execute JavaScript. Even if a user types `<script>alert('xss')</script>` as the recipient or content, it will appear as literal text.

**But there is no CSP:** `vite.config.ts` and `index.html` set no `Content-Security-Policy` headers. If a future contributor switches to `dangerouslySetInnerHTML` (a common React pitfall), there will be no CSP fallback. The Google Fonts stylesheet loaded in `index.html:10` is the only external resource, which is low-risk, but the absence of CSP means any injected script would execute without restriction.

**Reality check:** Since this is a single-user localStorage app, the XSS surface is minimal — the attacker can already read/write localStorage from the same origin. XSS only matters if data flows between users (e.g., sharing letter links), which this app does not support.

---

## 6. Principle Violations

### 6.1 No Separation of Concerns

A single file (`src/App.tsx`, 180 lines) handles:
- State management
- localStorage persistence
- Countdown math
- Form rendering
- Letter card rendering
- Event handlers

Compare with `01-explanation.md` and `02-principles.md`, which celebrate patterns like "Single Source of Truth" and "Derived State" — but apply them within a monolith. The architecture violates the **Single Responsibility Principle** at the component level.

### 6.2 No Error Handling (Defensive Programming Violation)

Every external interaction (localStorage read/write, JSON parse, date construction) is an unchecked gamble:

| Operation | Line | Risk | Handled? |
|---|---|---|---|
| `localStorage.getItem` | 19 | `SecurityError` if disabled | No |
| `JSON.parse(saved)` | 21 | `SyntaxError` if data is corrupted | No |
| `localStorage.setItem` | 29 | `QuotaExceededError` | No |
| `new Date(unlockDate)` | 40, 54, 151 | `Invalid Date` if stored data is malformed | No |

One corrupt localStorage entry blows up the entire app on load (`JSON.parse` at line 21 has no try/catch).

### 6.3 Violation of Least Privilege

The app's security model trusts the client entirely:
- The clock source (`new Date()`) is user-controlled
- The data store (`localStorage`) is user-readable and user-writable
- No server-side validation, no checksum, no encryption

A user who wants to read a locked letter can: change system clock, edit localStorage directly via DevTools, or read the raw JSON. The "lock" is cosmetic, not cryptographic.

### 6.4 Hardcoded Storage Key

```tsx
localStorage.getItem('timeLockedLetters');  // line 19
localStorage.setItem('timeLockedLetters', JSON.stringify(newLetters)); // line 29
```

The key `'timeLockedLetters'` is a magic string duplicated in two places. If one reference is changed without the other, data silently splits into two storage buckets. This is a **DRY violation**.

### 6.5 useEffect Overloading

The single `useEffect` (`src/App.tsx:18-25`) does two unrelated things:
1. Hydrate state from localStorage
2. Start a global interval timer

These are semantically different concerns bundled together for convenience. If the timer logic needed different dependencies (e.g., clearing on focus loss), this would require a refactor. **Separation of concerns** suggests two `useEffect` calls.

### 6.6 No Input Validation or Sanitization

- `recipient` is rendered directly (`src/App.tsx:149`) with no length limit
- `content` is rendered directly (`src/App.tsx:164`) with no length limit
- A user could store megabytes of text, crashing the renderer on the next load
- The `datetime-local` input is validated by the browser, but stored data loaded from localStorage bypasses all form validation entirely (a corrupted `unlockDate` string produces `Invalid Date`, which makes `getTime()` return `NaN`, breaking all comparisons)

---

## Summary Table

| Concern | Severity | Root Cause |
|---|---|---|
| localStorage full | Medium | No quota error handling |
| localStorage disabled | High | No feature detection, no fallback |
| System clock tampering | Critical | Full trust in client `Date()` |
| XSS | Low (now) / High (future) | No CSP, relies on React escaping |
| Same-minute letters | Low | Correct behavior, no ordering |
| Error handling | High | Zero try/catch blocks |
| Separation of concerns | Medium | Single monolithic component |
| Least privilege | Critical | No server-side enforcement |
