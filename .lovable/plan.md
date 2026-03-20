

# Fix: Duplicate React Instance Error

## Problem
The app crashes with "Cannot read properties of null (reading 'useEffect')" at `QueryClientProvider`. This is caused by multiple copies of React being loaded by the bundler, which breaks hooks.

## Root Cause
Despite `resolve.dedupe` being set in `vite.config.ts`, the bundler is loading separate React instances. This commonly happens when dependencies (like `@tanstack/react-query`, `framer-motion`, etc.) bundle their own copy of React.

## Fix

### `vite.config.ts`
Add `optimizeDeps.include` to force Vite to pre-bundle React into a single copy:

```ts
optimizeDeps: {
  include: ["react", "react-dom", "react/jsx-runtime"],
},
```

This ensures Vite resolves React to a single pre-bundled instance during development, preventing the duplicate module issue.

Single file change, no other modifications needed.

