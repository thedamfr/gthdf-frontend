# Grand Tour des Hauts-de-France - Implementation Summary

## What Was Built

A completely new frontend homepage that transforms the mockup into a proper **digital travel journal** (carnet de voyage numérique).

## Key Changes from Previous Version

### Before (Strapi-connected generic page)
- Generic CMS-driven content
- Tailwind CSS with default styling
- No distinct visual identity
- Product-like presentation

### After (Editorial journal design)
- **Hardcoded content** with intentional copy
- **Custom CSS modules** (no Tailwind)
- **GTHDF color palette** boldly applied
- **Irregular layouts** with editorial feel
- **Documentary tone** in all copy

## Files Created/Modified

### New Files
1. `/app/page.tsx` - Complete rewrite with journal structure
2. `/app/page.module.css` - Custom styling for all sections
3. `/app/placeholder.module.css` - Image placeholder styles
4. `/DESIGN.md` - Design philosophy documentation
5. `/public/README-images.md` - Image requirements spec

### Modified Files
1. `/app/layout.tsx` - Removed Geist fonts, updated metadata
2. `/app/globals.css` - Removed Tailwind, added proper reset + tokens

## Design Principles Implemented

### ✅ Editorial Over Marketing
- No CTAs, no hype language
- Short, observational descriptions
- Present-tense, grounded copy

### ✅ Color Confidence
- Colored borders on cards (bleu, vert)
- Colored backgrounds on principle cards (charbon, jaune, beige)
- Rouge accent on section titles
- All contained, never overwhelming

### ✅ Irregular Layout
- Horizons grid: `1fr, 1.2fr, 0.9fr` (asymmetric)
- Varied card heights
- Visible borders and frames
- "Lived-in" notebook feel

### ✅ Map as Reference
- Contained in bordered frame
- Not a hero element
- Editorial caption emphasizing flexibility
- Calm treatment

### ✅ Logo Prominence
- Displayed large in header
- Treated as signature element
- Not hidden or miniaturized

## Content Structure

```
Header (logo + title + subtitle)
  ↓
Changing Horizons (3 landscape cards with colored borders)
  ↓
Encounters (3 portrait cards with green frames)
  ↓
Map Overview (framed reference map with caption)
  ↓
The Principle (3 colored philosophy cards)
```

## Typography Improvements

### Copy Refinements
- "Salt air and wide skies. The path follows the cliff edge."
- "History reclaimed by nature. A surprising quiet."
- "Deep woods and sloped tunnels. The route goes gently."
- "Retired, cycling slowly towards Lille."
- "Baker in Arras. Suggested the canal route."
- "First multi-day trip together."

All descriptive, observational, human-scale.

## Technical Approach

- **CSS Modules** for scoped styling
- **Placeholder components** for images (easily replaceable)
- **Custom color tokens** from GTHDF palette
- **No dependencies** on Tailwind or external libraries
- **Semantic HTML** with proper section structure
- **Responsive grid** that collapses cleanly

## What's Missing (Intentional)

### No Images Yet
- Logo placeholder (stained-glass illustration)
- 3 landscape photos (coast, mining, forest)
- 3 portrait photos (René&Marie, Claire, Marc&Léo)

See `/public/README-images.md` for specifications.

### No Map Integration
- Map placeholder in place
- Ready for Leaflet/Mapbox integration
- Should maintain calm, framed treatment

### No CMS Connection
- All content hardcoded
- Validates design before committing CMS structure
- Prevents iteration loops

## Anti-Patterns Avoided

❌ No gradient overlays
❌ No glassmorphism effects
❌ No animation libraries
❌ No "Sign up" CTAs
❌ No feature comparison tables
❌ No social proof widgets
❌ No newsletter popups
❌ No hero video backgrounds
❌ No perfect symmetric grids

## Next Steps

1. **Add real images**
   - Replace placeholders with actual photos
   - Logo, landscapes, portraits

2. **Validate design with user**
   - Does it feel like a travel journal?
   - Is the tone correct?
   - Color balance appropriate?

3. **Iterate on copy**
   - Refine descriptions
   - Test different phrasings
   - Ensure consistency

4. **Map integration**
   - Add interactive map
   - Maintain framed treatment
   - Keep it as reference, not hero

5. **CMS adaptation (later)**
   - Once design validated
   - Document required fields
   - Adapt Strapi content-types to match
   - Replace hardcoded content with API calls

## Success Criteria

This design succeeds if it feels like:
- ✅ A travel journal, not a product site
- ✅ Documentary, not promotional
- ✅ Calm and grounded, not exciting or hyped
- ✅ Editorial, not corporate
- ✅ Human-scale, not efficiency-focused

## Running the Site

```bash
cd gthdf-frontend
npm run dev
```

Visit http://localhost:3000 (or 3001 if port busy)

## Color Reference

```css
Charbon: #272624  /* Dark, primary text */
Creme:   #FAEED4  /* Background, light */
Beige:   #DACEBB  /* Secondary bg */
Rouge:   #F3492F  /* Accent, energy */
Vert:    #4D9678  /* Nature, calm */
Jaune:   #FEAF2C  /* Warmth, sun */
Bleu:    #216173  /* Water, depth */
```

All tokens available as CSS variables:
- `var(--color-charbon)`
- `var(--color-creme)`
- etc.

---

**Philosophy**: Design-first approach. Validate the experience before committing the data structure. Build the journal you want to read, not the product you want to sell.
