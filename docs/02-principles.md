# Time-Locked Letters: Core Principles

When building React applications, adhering to established software engineering principles prevents bugs, reduces complexity, and makes the code predictable. Here are the core principles driving the Time-Locked Letters app.

---

## 1. Single Source of Truth
In UI development, the UI should be a direct reflection of a specific piece of data. By storing the `letters` in a single `useState` hook, we ensure there is only one "truth" about what letters exist. 

```tsx
// The single source of truth for all letters in the vault
const [letters, setLetters] = useState<Letter[]>([]);
```

---

## 2. Persistence (Data Durability)
React state is ephemeral—it dies when the browser refreshes. To create "patience as a product," the letters must survive. We achieve persistence by aggressively synchronizing our state with the browser's native `localStorage`.

```tsx
const saveLetters = (newLetters: Letter[]) => {
  setLetters(newLetters); // Update the React state (truth)
  // Persist the truth to the browser disk immediately
  localStorage.setItem('timeLockedLetters', JSON.stringify(newLetters)); 
};
```

---

## 3. Side Effects Management
A "side effect" is anything that interacts with systems outside of React's pure rendering cycle (like the browser's local storage or global timers). We manage these using the `useEffect` hook. Crucially, we clean up the interval effect when the component unmounts to prevent memory leaks and ghost timers.

```tsx
useEffect(() => {
  // Effect 1: Reading from external storage
  const saved = localStorage.getItem('timeLockedLetters');
  if (saved) {
    setLetters(JSON.parse(saved));
  }

  // Effect 2: Interacting with the global browser timer
  const interval = setInterval(() => setNow(new Date()), 1000);
  
  // Cleanup: Destroying the timer if the component is removed
  return () => clearInterval(interval);
}, []);
```

---

## 4. Derived State (Computed Properties)
Beginners often make the mistake of storing `isLocked` or `timeLeft` inside the `letters` state array. Instead, we **derive** these values during the render cycle based on the current time (`now`). This guarantees the UI is always perfectly in sync with the clock without needing complex state updates for every letter.

```tsx
// Inside the render loop:
letters.map(letter => {
  // Derived state! We calculate these purely from existing data.
  // We do NOT store 'timeLeft' or 'isLocked' in the database.
  const timeLeft = calculateTimeLeft(letter.unlockDate);
  const isLocked = timeLeft !== null;

  return (
    // UI rendering...
  )
})
```

---

## 5. Immutability
React requires you to treat state as read-only. Instead of mutating (modifying) the existing array of letters, we create a completely new array whenever a letter is added or deleted. This signals to React that a change has occurred and a re-render is necessary.

```tsx
// Adding a letter (creating a new array using the spread operator)
saveLetters([...letters, newLetter]);

// Deleting a letter (creating a new array using .filter)
saveLetters(letters.filter(l => l.id !== id));
```

---

## 6. Controlled Components
In traditional HTML, form inputs manage their own memory. In React, we "control" them by binding their value directly to our state, enforcing a single source of truth for user input.

```tsx
<input 
  type="text" 
  value={recipient} // Read from state
  onChange={(e) => setRecipient(e.target.value)} // Write to state
  required
/>
```
