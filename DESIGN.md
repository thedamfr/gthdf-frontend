# Grand Tour des Hauts-de-France - Design Documentation

## Design Philosophy

This is a **digital travel journal** (carnet de voyage numérique), not a product website. The design prioritizes:

- **Editorial sensibility** over marketing polish
- **Observation** over promotion
- **Calm, grounded tone** over excitement and hype
- **Documentary feel** over brand perfection

## What This Is NOT

❌ A startup landing page
❌ A SaaS product site
❌ A performance/challenge website
❌ A tourism office brochure
❌ A conversion-optimized funnel

## Visual Strategy

### Layout Philosophy
- **App-like panels** inspired by cartography apps (Komoot, etc.)
- **Irregular grids** - varied card sizes, asymmetry
- **Visible borders and frames** - no gradients, no blur, no glassmorphism
- **Lived-in feeling** - imperfect, notebook-like, not sterile

### Color Usage
- **GTHDF palette** used boldly but contained
- Colors frame content (borders, tags, section dividers)
- No full-width color blocks without editorial purpose
- Pastel tones, warm and grounded

### Typography & Tone
- **Short, observational sentences**
- **Present-tense, descriptive** language
- **No calls to action**, no hype
- **Human, calm, authentic**

## Content Sections

### 1. Header
- **Logo prominently displayed** as signature element
- Title + subtitle establishing the journal concept
- Border underneath to frame the header

### 2. Changing Horizons
- **Irregular 3-column grid** (1fr, 1.2fr, 0.9fr)
- Each card with colored border (varies by region)
- Framed images with visible borders
- Short descriptive text, no marketing copy

### 3. Encounters
- **People-first documentary approach**
- Portrait-style photos in green-bordered frames
- Names + brief observational descriptions
- No testimonials, no quotes - just notes

### 4. Map Overview
- **Map as reference, not hero feature**
- Contained in blue-bordered frame
- Caption emphasizes flexibility ("no rush", "open to interpretation")
- Calm, editorial treatment

### 5. The Principle
- **Bold color blocks** with core values
- Direct, grounded language
- No feature lists, no benefits - just philosophy
- Charbon, Jaune, Beige backgrounds for variation

## Design Tokens

```css
--color-charbon: #272624  /* Primary text, borders */
--color-creme: #FAEED4    /* Background */
--color-beige: #DACEBB    /* Secondary bg, frames */
--color-rouge: #F3492F    /* Accent, section dividers */
--color-vert: #4D9678     /* Frames, nature */
--color-jaune: #FEAF2C    /* Warmth, highlights */
--color-bleu: #216173     /* Map, water, calm */
```

## Responsive Strategy

- **Desktop-first** design
- Mobile breakpoint at 1024px
- Columns collapse to single column
- Logo/header stack vertically
- Maintains editorial feel on all sizes

## Next Steps (Images)

Replace placeholder components with real photos:
1. Logo (stained-glass illustration)
2. Landscape photos (coastal, mining, forest)
3. Documentary portraits (encounters)

See `/public/README-images.md` for specifications.

## Avoiding Product-Site Patterns

### Never use:
- "Sign up now" / "Get started" buttons
- Social proof counters
- Feature comparison tables
- Pricing sections
- Newsletter signup in hero
- Animated scrolling effects
- Gradient overlays
- Hero videos with autoplay
- "Trusted by X companies"

### Always maintain:
- Observational, descriptive copy
- Documentary photography aesthetic
- Irregular, lived-in layouts
- Visible, honest structure
- Calm, unrushed pacing
- Editorial integrity
