

## Plan: Landing page at `/` for unauthenticated users

### Summary
Replace the `<AuthPage />` fallback in `src/routes/index.tsx` with a new `<LandingPage />` component. The `/` route stays as-is — unauthenticated users see the landing page, authenticated users see the board. No new routes needed.

### Step 1: Create `src/components/landing/LandingPage.tsx`

A single-file component with these sections, all mobile-responsive:

1. **Hero** — heading "Vote on what we build next", subtitle about internal teams prioritizing features, two CTAs ("Get started" scrolls to auth, "See how it works" scrolls down). Decorative radial gradient background using existing primary palette.

2. **App mockup** — a CSS-only browser frame containing styled mock cards (vote buttons, titles, status badges, categories) to visually represent the board without needing a screenshot image.

3. **How it works** — three-step cards with Lucide icons: Submit an idea (Lightbulb), Vote and discuss (ThumbsUp), Watch it ship (Rocket).

4. **CTA section** — final call to action with the existing `<AuthPage />` embedded inline (email/password + Google sign-in), so users can sign up without navigating away.

### Step 2: Edit `src/routes/index.tsx`

Replace line 50 (`<AuthPage />`) with `<LandingPage />`. The landing page itself embeds the auth form in its CTA section.

### Step 3: Edit `src/styles.css`

Add a subtle mesh-gradient animation keyframe for the hero background.

### Files
- **Create**: `src/components/landing/LandingPage.tsx`
- **Edit**: `src/routes/index.tsx` (swap `<AuthPage />` → `<LandingPage />`)
- **Edit**: `src/styles.css` (add gradient keyframe)

