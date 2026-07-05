---
name: animate-ui
description: Helps implement Animate UI components correctly. Use when adding animated React components (tabs, dialogs, tooltips, accordions, buttons, text effects, animated backgrounds, animated Lucide icons) built with Motion and Tailwind CSS, choosing between Radix/Base UI/Headless UI variants, or troubleshooting Animate UI installation and behavior.
compatibility: Requires React 19+, Tailwind CSS 4.1+, and Motion 12.23+. Distributed via the shadcn registry (shadcn CLI).
license: MIT
metadata:
  upstream: https://github.com/animate-ui/animate-ui
---

# Animate UI

Animate UI is an open component distribution (not an npm library) of fully animated React components built with TypeScript, Tailwind CSS, and [Motion](https://motion.dev). Like shadcn/ui, components are copied into your codebase via the shadcn CLI so you own and can modify the source.

## Source of truth

- Docs: `https://animate-ui.com/docs`
- Repo: `https://github.com/animate-ui/animate-ui` (docs live at `apps/www/content/docs`, source at `apps/www/registry`)

## What's included

1. **Primitives** (`primitives/*`) — headless building blocks with animation baked in, authored by Animate UI or ported from Radix UI, Base UI, and Headless UI.
2. **Components** (`components/*`) — styled pieces built on the primitives, with minimal shadcn-inspired baseline styles. Groups: `animate`, `backgrounds`, `base`, `buttons`, `community`, `headless`, `radix`.
3. **Icons** (`icons/*`, beta) — 260 animated Lucide icons.

The same UI element often exists in multiple flavors (e.g. tooltip exists as `components-radix-tooltip`, `components-base-tooltip`, `components-animate-tooltip`, plus primitive variants). **Pick the flavor matching the primitive library already used in the project** (Radix if the project uses shadcn/ui defaults, Base UI if on Base UI, etc.). Do not mix flavors of the same component.

## Installation

Registry item names follow `<section>-<group>-<name>`; install with the shadcn CLI:

```bash
npx shadcn@latest add @animate-ui/components-radix-tooltip
npx shadcn@latest add @animate-ui/primitives-texts-sliding-number
npx shadcn@latest add @animate-ui/icons-icon && npx shadcn@latest add @animate-ui/icons-arrow-right
```

Files land in `components/animate-ui/<section>/<group>/<name>.tsx`; import from `@/components/animate-ui/<section>/<group>/<name>`. Components automatically pull their primitive as a registry dependency.

Consult `./references/component-registry.md` for the full index of all 154 components/primitives, and `./references/icons.md` for the icon catalog and wrapper usage.

## Critical usage rules

- Do not invent APIs. Verify prop names against the component's docs page (`https://animate-ui.com/docs/<section>/<group>/<name>`) or the installed source file — you own the source after install, so reading it is authoritative.
- Prefer styled `components/*` first; drop to `primitives/*` only when custom styling/composition requires it.
- Trigger-based components (Tooltip, Popover, Dialog, Menu, Dropdown) follow their upstream primitive's composition (Radix/Base UI/Headless UI hierarchy). Keep the documented Trigger/Content structure.
- Icons are **beta**: install the `icons-icon` wrapper before any icon; APIs may change, so recommend updating the wrapper when icons misbehave.

## Accessibility (recommended by upstream)

Wrap the app root with Motion's `MotionConfig` so all Animate UI animations respect `prefers-reduced-motion`:

```tsx
import { MotionConfig } from 'motion/react';

<MotionConfig reducedMotion="user">{children}</MotionConfig>
```

## Known pitfalls (from upstream troubleshooting)

- Minimum versions: Motion ≥ 12.23.0, React ≥ 19, Tailwind CSS ≥ 4.1.0, Base UI 1.0.0-beta.3, Radix UI ≥ 1.4.0, Headless UI ≥ 2.2.0.
- The CLI may not respect `components.json` aliases for target paths (open shadcn issue); if files land in the wrong place, fall back to manual installation (copy from `apps/www/registry` in the repo).
- The `Highlight` component can flicker under React strict mode in development; disable strict mode locally to verify.

## Output checklist

Before returning Animate UI code:

- registry item name and import path match the `<section>/<group>/<name>` convention
- the chosen flavor (radix/base/headless/animate) matches the project's existing primitive library
- `MotionConfig reducedMotion="user"` is present (or suggested) at the app root
- version prerequisites are satisfied or called out
