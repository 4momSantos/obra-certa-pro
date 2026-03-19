

# Fix: Duplicate React Error (blank screen)

## Problem

The app crashes with `Cannot read properties of null (reading 'useEffect')` at `QueryClientProvider`. This is the classic **duplicate React copies** issue — two separate instances of React are loaded, causing hooks to fail.

This typically happens when dependencies (like `framer-motion` v12 or `@tanstack/react-query`) resolve their own copy of React instead of sharing the project's single copy.

## Solution

Add `resolve.dedupe` to `vite.config.ts` to force Vite to use a single copy of React:

**File: `vite.config.ts`**
- Add `dedupe: ["react", "react-dom"]` inside the existing `resolve` config

This is a one-line fix that tells Vite's dependency optimizer to always resolve `react` and `react-dom` to the same instance, eliminating the duplicate copies.

