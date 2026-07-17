# storytime-layer

A shared Nuxt layer that provides Autumn’s **scrolly story engine** and minimal primitives.

## What’s included

- **Engine** (ported from `_support/partner-stories`):
  - `app/composables/storytime/useIoScroller.ts` — step activation (desktop IntersectionObserver + mobile heuristic), snap-to-step, mobile spacing.
  - `app/composables/storytime/useCssVarScroll.ts` — scroll-derived CSS variables (parallax + offsets).
  - `app/composables/storytime/useStepStructure.ts` — flattens scene → steps.
- **Primitives**
  - `app/components/storytime/StoryScrollyPage.vue` — canonical page-mode scrolly layout (sticky visual + article steps + optional controls).
  - Blocks: `ArticleStep`, `ArticleCopy`, `ArticleCTA`, `ArticleMediaCaption`, `ScrollVisual`.
  - Controls: `BottomActionBar.client.vue` (simplified, host-agnostic).
- **CSS**
  - `app/assets/css/storytime.css` — scrolly defaults (`--mobile-step-height`, pointer-events behavior).
- **Types**
  - `app/types/storytime/scenes.ts` — serializable story payload types.

## Scene payload format (Serializable)

`StoryScene[]` is intentionally serializable so it can be produced by the backend later.

Key fields:
- `scene.key`: stable identifier
- `scene.layout`: `'split' | 'full'`
- `scene.visual`: `{ podSlug, props? }`
- `scene.articles[]`: step entries; each step may contain `blocks[]`
- `blocks[]` are typed:
  - `copy` → `ArticleCopy` props
  - `cta` → `ArticleCTA` props
  - `mediaCaption` → `ArticleMediaCaption` props
  - `html` → raw html string

## How the engine works

### Desktop step activation
- Uses `IntersectionObserver` over `.step` elements.
- Chooses the step whose **center** is closest to a desired Y in the viewport.
- Each step can override `triggerCenterFraction` (defaults to `0.5`).

### Mobile step activation
- Uses a scroll heuristic:
  - activate step *i* when the previous card’s bottom is at least `100px` above the top.

### Mobile spacing/min-height
- Uses `--mobile-step-height` as a baseline min-height per `.step`.
- Applies per-step and per-scene spacing via inline margins when needed.

## Controls (BottomActionBar)

The layer includes a simplified bottom control strip:
- On mobile: hides when scrolling down, shows when scrolling up
- On desktop: always visible
- Provides:
  - prev/next navigation (scroll to step)
  - copy link
  - optional video play/mute controls if the active visual exposes `__isHeroVideo` + methods

## Consumers

### cms-story-components playground
- Adds a Story mode link from the component page:
  - `cms-story-components/src/playground/app/pages/components/[slug].vue`
- Story preview route:
  - `cms-story-components/src/playground/app/pages/story-preview/[slug].vue`

### cms-frontend
- Extends the layer in `cms-frontend/nuxt.config.ts`.
- Smoke test page:
  - `cms-frontend/app/pages/[org]/stories/storytime-preview.vue`
  - Example: `/acme/stories/storytime-preview?pod=hero-image`

## Analytics integration contract (AUM-497)

The Autumn first-party tracker bundle (hosted by `edge-renderer`, sourced
from `cms-story-components`) is **DOM-driven** — it observes the rendered
output of this layer through stable data attributes rather than coupling
to Vue composables. This contract lets the layer evolve internally without
breaking analytics emission.

### Attributes the layer SHALL emit

Scene root elements (currently `.step` inside `StoryScrollyPage`):

| Attribute | Source | Notes |
| --- | --- | --- |
| `data-au-scene-id` | `scene.key` (a UUID when served from cms-backend) | Multiple `.step` elements may share the same id when one scene has multiple narrative beats; the tracker dedupes by id within a session. |
| `data-au-scene-index` | step's `sceneIdx` | Zero-based position in `scenes[]`. |

Interactive elements (currently `ArticleCTA`'s `<a>`/`<button>`):

| Attribute | Source | Notes |
| --- | --- | --- |
| `data-au-track` | constant — `"cta"`/`"pod"`/`"link"`/`"form"` | The tracker filters click events to elements bearing this. |
| `data-au-label` | the visible CTA label | Surfaces in the "top interactions" rollup. |
| `data-au-modifier` | `action.action` (`"url"` \| `"modal"` \| `"scroll"`) | Distinguishes CTA variants in analytics. |

Future interactive surfaces inside pods (carousel arrows, form submits,
etc.) will add `data-au-pod-slug` and `data-au-pod-version` so the rollup
can attribute interactions to specific pods.

### What this contract guarantees

- The tracker bundle does NOT import any Vue composable from this layer.
- The tracker observes the DOM via `IntersectionObserver` (scene visibility)
  and a delegated click handler (`document.addEventListener('click', …,
  { capture: true })`).
- Removing, renaming, or replacing any composable is safe as long as the
  data attributes continue to appear on the rendered DOM with the same
  semantics.

