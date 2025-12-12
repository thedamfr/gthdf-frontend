# 🚲 Grand Tour des Hauts-de-France - Complete Rebuild Summary

## What Was Delivered

A complete redesign of the frontend homepage transforming it from a generic Strapi-connected page into a proper **digital travel journal** (carnet de voyage numérique).

## ✅ Completed Work

### 1. Complete Frontend Redesign
- **New page structure** with hardcoded content
- **Custom CSS modules** (removed Tailwind dependency)
- **GTHDF color palette** applied throughout
- **Irregular, editorial layouts** (not perfect grids)
- **Documentary tone** in all copy
- **Placeholder system** for images (easy to replace)

### 2. Design Philosophy Established
Three comprehensive guides created:
- `DESIGN.md` - Design philosophy and principles
- `IMPLEMENTATION.md` - Technical decisions and next steps
- `VISUAL-GUIDE.md` - Visual mockup interpretation

### 3. Content Strategy
New observational copy that feels like **travel notes**, not marketing:
- "Salt air and wide skies. The path follows the cliff edge."
- "History reclaimed by nature. A surprising quiet."
- "Deep woods and sloped tunnels. The route goes gently."
- "Retired, cycling slowly towards Lille."

### 4. Files Created/Modified

**New Files:**
```
/app/page.tsx              - Complete rewrite
/app/page.module.css       - Section styling
/app/placeholder.module.css - Image placeholders
/DESIGN.md                 - Design philosophy
/IMPLEMENTATION.md         - Technical summary
/VISUAL-GUIDE.md          - Visual reference
/public/README-images.md   - Image specifications
```

**Modified Files:**
```
/app/layout.tsx    - Removed Geist fonts, updated metadata
/app/globals.css   - Removed Tailwind, proper reset + tokens
```

## 🎨 Design Decisions

### What Makes This a "Travel Journal"

#### ✅ Editorial Approach
- Observational, not promotional
- Short, present-tense descriptions
- No CTAs, no hype
- Human-scale language

#### ✅ Color Confidence
- Bold color usage **contained in frames**
- Colored borders on cards (bleu, vert)
- Colored backgrounds on philosophy cards
- Never overwhelming

#### ✅ Irregular Layouts
- Horizons grid: `1fr, 1.2fr, 0.9fr` (asymmetric)
- Varied card sizes
- "Lived-in" notebook feel
- Not pixel-perfect alignment

#### ✅ Visible Structure
- Borders define zones
- Frames contain content
- No gradients, no blur
- Honest, transparent design

#### ✅ Map as Reference
- Framed, not hero
- Editorial caption
- Tool, not feature
- Calm presentation

### What This Avoids

❌ No startup landing page patterns
❌ No "Sign up" or "Get started" CTAs
❌ No social proof widgets
❌ No gradient overlays or glassmorphism
❌ No animated scrolling effects
❌ No perfect symmetric grids
❌ No hype language or marketing copy

## 🎯 Current Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  Grand Tour des Hauts-de-France                      │
│         Carnet de voyage numérique. Notes from the road.    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Changing Horizons                                           │
│ ┌────────────┐ ┌──────────────┐ ┌───────────┐            │
│ │ Opal Coast │ │ Mining Basin │ │ Ardennes  │            │
│ │ [blue]     │ │ [green]      │ │ [green]   │            │
│ └────────────┘ └──────────────┘ └───────────┘            │
│   1fr             1.2fr             0.9fr                   │
│                                                             │
│ Encounters                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│ │ René &   │ │ Claire   │ │ Marc &   │                   │
│ │ Marie    │ │          │ │ Léo      │                   │
│ │ [green]  │ │ [green]  │ │ [green]  │                   │
│ └──────────┘ └──────────┘ └──────────┘                   │
│                                                             │
│ ╔═══════════════════════════════════════════════════════╗ │
│ ║ Map Overview [blue frame]                             ║ │
│ ║ The Reference Path                                    ║ │
│ ║ [Map placeholder]                                     ║ │
│ ╚═══════════════════════════════════════════════════════╝ │
│ A general direction. Open to interpretation. No rush.      │
│                                                             │
│ The Principle                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│ │ACCESSIBLE│ │ TIMELESS │ │ GROUNDED │                   │
│ │[charbon] │ │ [jaune]  │ │ [beige]  │                   │
│ └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## 🖼️ Next Steps: Images

**Priority: Add real images to replace placeholders**

See `/public/README-images.md` for specifications.

### Required Images:
1. **Logo** - GTHDF stained-glass illustration (140x280px)
2. **Opal Coast** - Coastal path, dunes (~600x400px)
3. **Mining Basin** - Hills/terrils landscape (~600x400px)
4. **Ardennes** - Forest path (~600x400px)
5. **René & Marie** - Couple with bikes (~400x300px)
6. **Claire** - Baker portrait (~400x300px)
7. **Marc & Léo** - Father/child cycling (~400x300px)

### Photography Style:
- Documentary, not Instagram-perfect
- Natural light, slightly desaturated
- Candid moments, not posed
- Authentic, lived-in feel
- Film photography aesthetic preferred

## 🚀 Running the Site

```bash
cd gthdf-frontend
npm run dev
```

Visit: http://localhost:3000

## 🎨 Color Palette Reference

```css
Charbon: #272624  /* Dark, text, borders */
Creme:   #FAEED4  /* Background */
Beige:   #DACEBB  /* Secondary bg */
Rouge:   #F3492F  /* Accent, energy */
Vert:    #4D9678  /* Nature, frames */
Jaune:   #FEAF2C  /* Warmth, sun */
Bleu:    #216173  /* Water, calm */
```

Available as CSS variables: `var(--color-charbon)`, etc.

## 📝 Design Validation Checklist

When reviewing, ask:

- [ ] Does it feel like a **travel journal**, not a product site?
- [ ] Is the tone **observational** and calm?
- [ ] Are colors **bold but contained**?
- [ ] Does layout feel **lived-in**, not sterile?
- [ ] Is the logo **prominent**, not hidden?
- [ ] Does copy sound **human**, not marketing?
- [ ] Is the map a **reference**, not a hero?
- [ ] Are there **no CTAs or hype language**?

## 🔄 Strategy: Design-First

This approach validates the user experience **before committing the CMS structure**.

### Current Phase: Design Validation
- All content hardcoded
- Easy to iterate on copy and layout
- No CMS complexity

### Next Phase: CMS Adaptation (Later)
Once design is validated:
1. Document required content fields
2. Adapt Strapi content-types to match
3. Replace hardcoded content with API calls
4. Minimal code changes needed

## 📚 Documentation

Three comprehensive guides created:

1. **DESIGN.md** - Philosophy, principles, anti-patterns
2. **IMPLEMENTATION.md** - Technical decisions, next steps
3. **VISUAL-GUIDE.md** - Visual mockup interpretation, photography direction

## ✨ Success Criteria

This design succeeds if it feels like:
- ✅ A personal travel journal
- ✅ Documentary reportage
- ✅ Calm and grounded
- ✅ Editorial, not corporate
- ✅ Human-scale, not efficiency-focused

**It fails if it looks like:**
- ❌ A SaaS landing page
- ❌ A tourism brochure
- ❌ A performance/challenge site
- ❌ A product marketing page

## 🎯 Philosophy

**"Build the journal you want to read, not the product you want to sell."**

This is a digital field notebook about slow travel through Hauts-de-France. It should feel personal, observational, and grounded. No hype, no rush, no conversion optimization.

---

**Status**: ✅ Ready for design review and image integration
**Next Step**: Add real images and validate with user
