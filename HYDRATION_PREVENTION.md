# Hydration Error Prevention Guide

This document outlines critical rules to prevent hydration errors in Next.js with React Server Components.

## What is Hydration?

Hydration is the process where React attaches event listeners to the server-rendered HTML. For this to work, the **server-rendered HTML must match exactly** what React expects to render on the client during the initial render.

## Root Cause

**Hydration errors occur when server HTML ≠ client HTML on initial render**

## Critical Rules

### 1. **Client-Only Hooks Require Mounted Guards**

Any component using client-only hooks (wagmi, browser APIs, etc.) must implement a mounted state check:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi"; // or any client-only hook

function MyComponent() {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount(); // This returns different values on server vs client

  useEffect(() => {
    setMounted(true);
  }, []);

  // CRITICAL: Check mounted BEFORE using client-only state
  if (!mounted) {
    // Return a matching placeholder or null
    return <div className="w-[200px] h-[42px]" />; // Match expected dimensions
  }

  // Now safe to use isConnected
  return (
    <div>
      {isConnected ? "Connected" : "Not connected"}
    </div>
  );
}
```

### 2. **Conditional Rendering Based on Client State**

When conditionally rendering based on client-only state, ALWAYS guard with mounted:

❌ **WRONG - Causes Hydration Error:**
```tsx
function Nav() {
  const { isConnected } = useAccount();

  return (
    <nav>
      {isConnected && <button>Publish</button>}
      <WalletConnect />
    </nav>
  );
}
```

✅ **CORRECT:**
```tsx
function Nav() {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav>
      {mounted && isConnected && <button>Publish</button>}
      <WalletConnect />
    </nav>
  );
}
```

### 3. **Motion Components with Conditional Content**

When using framer-motion with conditional rendering:

```tsx
// Add mounted check BEFORE the conditional
{mounted && isConnected && (
  <motion.button whileHover={{ scale: 1.02 }}>
    Click me
  </motion.button>
)}
```

### 4. **Common Client-Only Values**

These always need mounted guards:
- `useAccount()` - wallet connection state
- `useBalance()` - wallet balance
- `useConnect()` - connector state
- `window`, `document`, `localStorage` - browser globals
- `Date.now()`, `Math.random()` - non-deterministic values
- User locale/timezone formatting
- Browser extensions

### 5. **Placeholder Strategy**

When returning early (before mounted), match the expected layout:

```tsx
if (!mounted) {
  // Match the dimensions of what will render
  return <div className="glass-macos w-[200px] h-[42px]" />;
}
```

This prevents layout shift and maintains visual consistency.

### 6. **Server vs Client Branches**

NEVER use `typeof window !== 'undefined'` to branch in render:

❌ **WRONG:**
```tsx
function Component() {
  if (typeof window !== 'undefined') {
    return <ClientVersion />;
  }
  return <ServerVersion />;
}
```

✅ **CORRECT:**
```tsx
function Component() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ServerVersion />;
  }

  return <ClientVersion />;
}
```

### 7. **Dynamic Imports for Client-Only Components**

For components that are entirely client-only:

```tsx
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);
```

### 8. **suppressHydrationWarning - Use Sparingly**

Only use `suppressHydrationWarning` for content that intentionally differs (like timestamps):

```tsx
<time suppressHydrationWarning>
  {new Date().toLocaleString()}
</time>
```

**Don't** use it to hide real hydration bugs!

## Debugging Hydration Errors

1. **Read the error carefully** - it shows what the server rendered vs what the client expected
2. **Look for client-only hooks** - useAccount, useBalance, etc.
3. **Check conditional rendering** - is it based on client-only state?
4. **Add mounted guards** - wrap the problematic code with mounted checks
5. **Test in production mode** - some errors only appear in production builds

## Quick Checklist

Before pushing code, verify:

- [ ] All components using wagmi hooks have mounted guards
- [ ] All conditional rendering based on `isConnected` checks `mounted` first
- [ ] No `typeof window` checks in render
- [ ] No `Math.random()` or `Date.now()` in render without mounted guard
- [ ] Early returns have matching placeholder dimensions
- [ ] Motion components with conditional content check `mounted`

## Pattern Template

Use this template for all wallet-connected components:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export function WalletDependentComponent() {
  const [mounted, setMounted] = useState(false);
  const { isConnected, address } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return matching placeholder
    return <div className="skeleton-loader" />;
  }

  return (
    <div>
      {isConnected && <p>Connected: {address}</p>}
    </div>
  );
}
```

## Remember

**The golden rule: Server render must match client's first render**

If you're using any client-only API or hook, wrap it with a mounted guard. Period.
