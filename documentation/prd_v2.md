# PRD V2 — Grand Tour des Hauts-de-France

**Version:** 2.0  
**Date:** 23 avril 2026  
**Auteur:** @thedamfr  
**Statut:** En cours d'implémentation  
**ADRs liés:** [adr_legal_notice.md](adr_legal_notice.md)

---

## Objectifs V2

Transformer le site en plateforme découvrable (SEO) avec navigation claire, gamification (checkpoints), et centre de contenus éditoriaux pour enrichir l'expérience utilisateur et attirer du trafic organique.

### Priorités
1. **Performance** : Corriger les bugs de requêtes Strapi existants
2. **Navigation** : Header/menu persistant (surtout mobile)
3. **SEO** : Metadata complètes sur toutes les pages
4. **Checkpoints** : Système de collection d'illustrations physiques (24 éléments)
5. **Blog** : Page index pour valoriser les articles existants
6. **À propos** : Exposer le content type existant

---

## État des lieux (Audit code — 23 avril 2026)

### Déjà implémenté
- Système de chapitres complet (GPX, Komoot embeds, navigation bidirectionnelle)
- Content type Article avec catégories, auteurs, blocs dynamiques
- GPX Builder fonctionnel (client-side)
- Metadata homepage & layout global
- ISR caching configuré (60s défaut, 1h pour legal)
- Image optimization (MinIO/Cellar S3)

### Manquant pour V2
- Header/navigation persistante
- Metadata sur chapters, articles, checkpoints, blog
- Page `/checkpoints` (concept gamification)
- Page `/blog` (index articles)
- Page `/a-propos` (content type `about` existe dans Strapi mais pas de route)
- SEO component dans Strapi pour Article & Chapter
- Champ `cities[]` dans Chapter pour SEO local
- Relations bidirectionnelles Article ↔ Chapter

### Bugs de performance identifiés

Six problèmes concrets expliquent la surcharge de requêtes Strapi :

| Bug | Localisation | Impact |
|-----|-------------|--------|
| `getHomepage()` appelé 2x par render | `app/page.tsx` — `generateMetadata` + composant | Double fetch sans déduplication |
| `getGlobal()` défini en double | `lib/global.ts` ET `lib/strapi.ts` — caches et champs différents | Confusion + requêtes incohérentes |
| `cache: 'no-store'` sur tous les chapitres | `lib/chapters.ts` — 3 fonctions | Zéro ISR, 1 fetch Strapi live par visite |
| `populate=*` pour juste récupérer les slugs | `lib/chapters.ts` `getChapters()` | Charge GPX, testimonials, routeNotes pour `generateStaticParams` uniquement |
| Logique de tri `nextChapter` dupliquée | `lib/chapters.ts` ET `app/gpx-builder/page.tsx` | Maintenance double |
| `console.log` debug en production | `lib/strapi.ts` + `app/chapitres/[slug]/page.tsx` | Log par fetch en prod |

Cause principale du problème des "1000 requêtes" : `cache: 'no-store'` combiné à `generateMetadata` + composant page qui appellent chacun les mêmes fonctions non-cachées.

---

## Architecture V2

### Routes

| Route | Type | Statut | Metadata |
|-------|------|--------|----------|
| `/` | Existant | OK | ✅ Fait |
| `/chapitres` | Existant | OK | ⚠️ À ajouter |
| `/chapitres/[slug]` | Existant | OK | ⚠️ À ajouter |
| `/checkpoints` | **Nouveau** | À créer | À créer |
| `/blog` | **Nouveau** | À créer | À créer |
| `/article/[slug]` | Existant | CSS à refaire | ⚠️ À ajouter |
| `/gpx-builder` | Existant | OK | ⚠️ À ajouter |
| `/a-propos` | **Nouveau** | À créer | À créer |
| `/mentions-legales` | Existant | OK | ✅ Fait |

### Composants à créer

| Composant | Responsabilité |
|-----------|----------------|
| `components/Header.tsx` | Navigation principale (logo + 6 liens) |
| `components/MobileNav.tsx` | Menu hamburger mobile (<768px) |
| `components/CheckpointCard.tsx` | Carte checkpoint (what3words + énigme, sans illustration) |
| `components/BlogCard.tsx` | Carte article (cover + title + excerpt + catégorie) |

---

## Modifications Strapi (CMS)

### 1. Content Type : Checkpoint (nouveau)

**Schema :** `gthdf-cms/src/api/checkpoint/content-types/checkpoint/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "checkpoints",
  "info": {
    "singularName": "checkpoint",
    "pluralName": "checkpoints",
    "displayName": "Checkpoint"
  },
  "options": { "draftAndPublish": true },
  "attributes": {
    "number": { "type": "integer", "required": true, "min": 1, "max": 24 },
    "what3words": { "type": "string", "required": true },
    "enigma": { "type": "text", "required": true },
    "title": { "type": "string" },
    "hint": { "type": "text" }
  }
}
```

**Champs :**
- `number` (1-24) : Numéro du checkpoint pour l'ordre de collection
- `what3words` : Adresse what3words (ex: `cheval.table.maison`)
- `enigma` : Texte de l'énigme pour trouver le checkpoint
- `title` (optionnel) : Nom du checkpoint
- `hint` (optionnel) : Indice supplémentaire

**Règle produit :** Pas d'image uploadée — les 24 illustrations restent physiques pour préserver le mystère de la collection.

### 2. Content Type : Article (modifications)

**Fichier :** `gthdf-cms/src/api/article/content-types/article/schema.json`

Champs à ajouter :
```json
{
  "seo": {
    "type": "component",
    "component": "shared.seo",
    "repeatable": false
  },
  "excerpt": {
    "type": "text",
    "maxLength": 200
  },
  "relatedChapters": {
    "type": "relation",
    "relation": "manyToMany",
    "target": "api::chapter.chapter",
    "mappedBy": "relatedArticles"
  }
}
```

**Rationale :**
- `seo` : Metadata individuelles par article (remplace `description` limité à 80 chars pour SEO)
- `excerpt` : Résumé 200 chars pour les cartes blog (le champ `description` existant reste, trop court)
- `relatedChapters` : Maillage bidirectionnel avec chapitres pour le SEO interne et l'UX

### 3. Content Type : Chapter (modifications)

**Fichier :** `gthdf-cms/src/api/chapter/content-types/chapter/schema.json`

Champs à ajouter :
```json
{
  "seo": {
    "type": "component",
    "component": "shared.seo",
    "repeatable": false
  },
  "cities": {
    "type": "json"
  },
  "relatedArticles": {
    "type": "relation",
    "relation": "manyToMany",
    "target": "api::article.article",
    "inversedBy": "relatedChapters"
  }
}
```

**Rationale :**
- `seo` : Metadata SEO ciblant des requêtes comme "Lille Saint-Omer vélo"
- `cities` : Array JSON des villes traversées (ex: `["Lille","Haubourdin","Armentières","Saint-Omer"]`) pour enrichir les meta descriptions automatiquement
- `relatedArticles` : Côté inverse de la relation bidirectionnelle

### 4. Content Type : Global (modification)

**Fichier :** `gthdf-cms/src/api/global/content-types/global/schema.json`

Champ à ajouter :
```json
{
  "checkpointMap": {
    "type": "media",
    "allowedTypes": ["images", "files"],
    "multiple": false
  }
}
```

**Rationale :** Héberger la carte A3 des checkpoints (PDF pour impression + PNG pour preview). Upload unique dans Media Library, référencé par le singleton Global.

---

## Frontend V2

### Phase 0 — Corrections de performance

#### Fix 1 : Supprimer `lib/global.ts`, centraliser dans `lib/strapi.ts`

`lib/global.ts` est un doublon de `getGlobal()` qui existe déjà dans `lib/strapi.ts`. Les deux ont des populate et caches différents, créant une incohérence.

**Action :** Supprimer `lib/global.ts`, mettre à jour `app/layout.tsx` pour importer depuis `lib/strapi.ts`.

#### Fix 2 : `React.cache()` sur toutes les fonctions de fetch

Le problème du double fetch `getHomepage()` vient de ce que Next.js App Router **ne déduplique pas** les appels entre `generateMetadata()` et le composant page dans le même render.

**Solution :**
```typescript
// lib/strapi.ts
import { cache } from 'react';

export const getHomepage = cache(async () => { ... });
export const getGlobal = cache(async () => { ... });
export const getArticles = cache(async () => { ... });
// etc.
```

```typescript
// lib/chapters.ts
import { cache } from 'react';

export const getChapters = cache(async () => { ... });
export const getChaptersInOrder = cache(async () => { ... });
export const getChapterBySlug = cache(async (slug: string) => { ... });
```

#### Fix 3 : ISR sur les chapitres

`lib/chapters.ts` utilise `cache: 'no-store'` sur les 3 fonctions → zéro mise en cache, chaque visite déclenche un fetch live.

**Action :** Remplacer par `next: { revalidate: 300 }` (5 min). Les chapitres ne changent pas souvent.

#### Fix 4 : `populate` ciblé dans `getChapters()`

`getChapters()` est utilisé uniquement dans `generateStaticParams()` pour récupérer les slugs, mais charge tous les champs avec `populate=*`.

**Avant :**
```
/api/chapters?populate=*
```

**Après :**
```
/api/chapters?fields[0]=slug&fields[1]=title&populate[0]=thumbnail
```

#### Fix 5 : Extraire `sortChaptersByChain()`

La logique de tri par chaîne `nextChapter` est dupliquée mot pour mot dans `lib/chapters.ts` et `app/gpx-builder/page.tsx`.

**Action :** Extraire en fonction utilitaire exportée dans `lib/chapters.ts`, importer dans `gpx-builder/page.tsx`.

#### Fix 6 : Supprimer les `console.log` debug

- `lib/strapi.ts` : `console.log('Fetching:', requestUrl)` — 1 log par fetch HTTP en production
- `app/chapitres/[slug]/page.tsx` : 2 `console.log` de debug chapitre

### Phase 1 — Navigation Header

**Design :** Fond `--color-creme`, bordure basse `2px solid var(--color-charbon)`, liens `--color-charbon`.

**Menu (6 liens) :**
- Accueil `/`
- Chapitres `/chapitres`
- Checkpoints `/checkpoints`
- Contenus `/blog`
- Trace GPX `/gpx-builder`
- À propos `/a-propos`

**Mobile :** Hamburger toggle, menu déroulant en colonne pleine largeur.

**Fichiers :** `components/Header.tsx`, `components/Header.module.css`, `components/MobileNav.tsx`

**Modification :** `app/layout.tsx` — intégrer `<Header />`, migrer l'import `getGlobal` vers `lib/strapi.ts`.

### Phase 2 — Page Checkpoints

**Route :** `/checkpoints`

**Concept produit :** 24 illustrations métalliques physiques, fraisées et collées sur le parcours. L'artiste de la DA a créé les designs. Le visiteur imprime la carte A3 (à télécharger sur la page), gratte les emplacements avec un crayon pour révéler les checkpoints, puis trouve chaque illustration grâce au what3words ou à une énigme. **Aucune illustration n'est visible sur le site.**

**Contenu de la page :**
- Introduction + bouton télécharger carte A3 (PDF depuis `global.checkpointMap`)
- Grille de 24 cartes triées par `number` ascendant

**CheckpointCard :**
```
#[number] — [title si présent]
[enigma]
///[what3words] → lien https://what3words.com/[what3words]
[hint si présent]
```

**Design :** Grille asymétrique (pattern `PagedSection`), bordures colorées selon `number % 4` → bleu/vert/rouge/jaune.

**Fetching :**
```typescript
// lib/checkpoints.ts
export const getCheckpoints = cache(async () =>
  fetchAPI({
    endpoint: '/checkpoints',
    query: { 'sort[0]': 'number:asc', 'pagination[pageSize]': 100 },
    wrappedByList: true,
  })
);
```

### Phase 3 — Page Blog

**Route :** `/blog`

**Concept :** Index des articles existants (content type Article déjà dans Strapi), avec filtres par catégorie via `searchParams.category`.

**Fetching :**
```typescript
// lib/strapi.ts — modifier getArticles pour accepter un filtre catégorie
export const getArticles = cache(async (category?: string) =>
  fetchAPI({
    endpoint: '/articles',
    query: {
      ...(category && { 'filters[category][slug][$eq]': category }),
      'sort[0]': 'publishedAt:desc',
      'populate[0]': 'cover',
      'populate[1]': 'category',
      'populate[2]': 'author.avatar',
    },
    wrappedByList: true,
  })
);
```

**Structure :** `Promise.all([getArticles(category), getCategories()])` pour paralléliser.

**BlogCard :** cover, title, `excerpt || description`, badge catégorie, lien vers `/article/[slug]`.

**Catégories à créer dans Strapi :**
- Préparer son voyage
- Train + vélo
- Camping
- Matériel
- Inspiration

### Phase 4 — Page À propos

**Route :** `/a-propos`

**Contenu :** Le content type `about` existe déjà dans Strapi avec `title` et `blocks` (dynamic zone). Réutiliser le `BlockRenderer` existant de `article/[slug]/page.tsx` en le factorisant.

### Phase 5 — SEO Metadata

**Pattern général :**
- Valeur issue de `content.seo.metaTitle` / `content.seo.metaDescription` (champs Strapi)
- Fallback sur les champs texte existants si SEO non renseigné
- OpenGraph + Twitter card sur toutes les pages
- `twitter: { card: 'summary_large_image' }`

**Chapitre détail — SEO local :**
```typescript
description: seo?.metaDescription
  || `${chapter.introSentence}. Itinéraire vélo de ${chapter.distance}km entre ${chapter.startStation} et ${chapter.endStation}. ${chapter.cities?.join(', ') || ''}`
```

**Article — OG type article :**
```typescript
openGraph: {
  type: 'article',
  publishedTime: article.publishedAt,
  images: [seo?.shareImage?.url || article.cover?.url]
}
```

### Refactor article/[slug] — CSS Modules

`app/article/[slug]/page.tsx` utilise des classes Tailwind (`min-h-screen bg-zinc-50 prose prose-lg dark:prose-invert`) alors que tout le projet utilise CSS Modules avec les tokens GTHDF. À réécrire avec `article.module.css`.

---

## Implémentation — Ordre des phases

### Phase 0 — Performance (priorité absolue)
1. Supprimer `lib/global.ts`, fusionner dans `lib/strapi.ts` (`populate: ['favicon', 'defaultSeo.shareImage']`, `revalidate: 3600`)
2. Wrapper toutes les fonctions `lib/strapi.ts` + `lib/chapters.ts` avec `React.cache()`
3. Remplacer `cache: 'no-store'` par `next: { revalidate: 300 }` dans `lib/chapters.ts`
4. Remplacer `populate=*` dans `getChapters()` par champs ciblés
5. Extraire `sortChaptersByChain()` en utilitaire partagé dans `lib/chapters.ts`
6. Supprimer tous les `console.log` debug
7. Réécrire `app/article/[slug]/page.tsx` en CSS Modules

### Phase 1 — Backend Strapi
8. Créer content type Checkpoint (via Strapi admin ou fichiers JSON)
9. Modifier schema Article : ajouter `seo`, `excerpt`, `relatedChapters`
10. Modifier schema Chapter : ajouter `seo`, `cities`, `relatedArticles`
11. Modifier schema Global : ajouter `checkpointMap`
12. `cd gthdf-cms && npm run strapi ts:generate-types`

### Phase 2 — Header Navigation
13. Créer `components/Header.tsx` + `Header.module.css`
14. Créer `components/MobileNav.tsx`
15. Intégrer `<Header />` dans `app/layout.tsx`

### Phase 3 — Nouvelles pages
16. Créer `lib/checkpoints.ts` : `getCheckpoints()` avec `React.cache()`
17. Créer `app/checkpoints/page.tsx` + `page.module.css`
18. Créer `components/CheckpointCard.tsx` + `CheckpointCard.module.css`
19. Modifier `lib/strapi.ts` : `getArticles(category?)` avec filtre optionnel
20. Créer `app/blog/page.tsx` + `page.module.css`
21. Créer `components/BlogCard.tsx` + `BlogCard.module.css`
22. Créer `app/a-propos/page.tsx`, extraire `BlockRenderer` depuis `article/[slug]/page.tsx`

### Phase 4 — SEO Metadata
23. `app/chapitres/page.tsx` → `generateMetadata()` statique
24. `app/chapitres/[slug]/page.tsx` → `generateMetadata()` dynamique (seo + cities)
25. `app/article/[slug]/page.tsx` → `generateMetadata()` avec seo, OG `type: 'article'`
26. `app/gpx-builder/page.tsx` → `export const metadata: Metadata`
27. `app/checkpoints/page.tsx` → `generateMetadata()` statique
28. `app/blog/page.tsx` → `generateMetadata()` statique
29. `app/a-propos/page.tsx` → `generateMetadata()` statique

### Phase 5 — Contenu Strapi (hors dev)
30. Remplir 24 entries Checkpoint (number, what3words, enigma)
31. Uploader carte A3 (PDF + thumbnail PNG) dans `global.checkpointMap`
32. Ajouter `cities[]` et `seo` sur les 8 chapitres existants
33. Créer catégories blog dans Strapi admin
34. Ajouter `seo` sur les articles existants

### Phase Dessert — Contenu destination par chapitre (nice-to-have)
35. Phase explicitement ultérieure (dessert), hors backlog coeur V2
36. Pour chaque chapitre, ajouter un bloc destination avec des suggestions touristiques pour la ville d'arrivee
37. Exemple: chapitre Lille -> Saint-Omer, bloc "Que visiter a Saint-Omer"
38. Le JSON-LD est rattache au niveau de la page chapitre, meme sans pages ville dediees
39. Demarrer par un chapitre pilote avant generalisation

---

## Fichiers impactés

### Nouveaux fichiers
- `gthdf-cms/src/api/checkpoint/` (schema + controllers + routes + services)
- `gthdf-frontend/lib/checkpoints.ts`
- `gthdf-frontend/components/Header.tsx` + `Header.module.css`
- `gthdf-frontend/components/MobileNav.tsx` + `MobileNav.module.css`
- `gthdf-frontend/components/CheckpointCard.tsx` + `CheckpointCard.module.css`
- `gthdf-frontend/components/BlogCard.tsx` + `BlogCard.module.css`
- `gthdf-frontend/app/checkpoints/page.tsx` + `page.module.css`
- `gthdf-frontend/app/blog/page.tsx` + `page.module.css`
- `gthdf-frontend/app/a-propos/page.tsx` + `page.module.css`
- `gthdf-frontend/app/article/[slug]/article.module.css`

### Fichiers modifiés
- `gthdf-frontend/lib/strapi.ts` (React.cache, getArticles avec filtre, getGlobal unifié)
- `gthdf-frontend/lib/chapters.ts` (React.cache, revalidate, populate ciblé, sortChaptersByChain)
- `gthdf-frontend/lib/global.ts` (**supprimé**)
- `gthdf-frontend/app/layout.tsx` (import getGlobal depuis strapi.ts, Header)
- `gthdf-frontend/app/page.tsx` (double fetch corrigé par React.cache)
- `gthdf-frontend/app/chapitres/page.tsx` (generateMetadata)
- `gthdf-frontend/app/chapitres/[slug]/page.tsx` (generateMetadata, suppr console.log)
- `gthdf-frontend/app/article/[slug]/page.tsx` (generateMetadata, CSS Modules, BlockRenderer extrait)
- `gthdf-frontend/app/gpx-builder/page.tsx` (metadata, import sortChaptersByChain)
- `gthdf-cms/src/api/article/content-types/article/schema.json`
- `gthdf-cms/src/api/chapter/content-types/chapter/schema.json`
- `gthdf-cms/src/api/global/content-types/global/schema.json`

---

## Critères d'acceptation

### Performance
- Given je charge une page chapitre, When j'observe les requêtes réseau, Then Strapi reçoit **1 seule requête** (pas de doublon dû au double appel `generateMetadata`/composant)
- Given je recharge la même page dans les 5 minutes, When j'observe les requêtes, Then la réponse vient du cache Next.js (header `X-Nextjs-Cache: HIT`)
- Given je lance Lighthouse, When le rapport génère, Then Performance score ≥ 85

### Navigation
- Given je suis sur n'importe quelle page, When je regarde le header, Then je vois le logo + 6 liens
- Given je suis sur mobile (<768px), When je clique le bouton hamburger, Then un menu déroulant s'ouvre avec les 6 liens

### Checkpoints
- Given je visite `/checkpoints`, When la page charge, Then je vois 24 cartes triées 1→24
- Given j'inspecte une carte, When je regarde, Then je vois numéro + énigme + lien what3words, **mais aucune illustration**
- Given je clique le lien what3words, When il s'ouvre, Then je suis redirigé vers `https://what3words.com/[adresse]`
- Given je clique "Télécharger la carte", When le lien s'active, Then un PDF/PNG se télécharge

### Blog
- Given je visite `/blog`, When la page charge, Then je vois les articles triés par date DESC
- Given je clique un filtre catégorie, When la page recharge, Then seuls les articles de cette catégorie s'affichent
- Given je clique une carte article, When je clique, Then je suis redirigé vers `/article/[slug]`

### SEO
- Given je visite `/chapitres/[slug]`, When j'inspecte le HTML, Then `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:image">` sont présents
- Given un chapitre a `cities: ["Lille","Saint-Omer"]`, When je lis la meta description, Then elle contient ces noms de villes
- Given je visite `/article/[slug]`, When j'inspecte le HTML, Then `<meta property="og:type" content="article">` est présent

### Relations Article ↔ Chapter
- Given j'édite un article dans Strapi et j'ajoute un relatedChapter, When je sauvegarde, Then le chapitre affiche cet article dans `relatedArticles` (bidirectionnel)

---

## Risques OWASP ciblés

- **A01 Broken Access Control** : Endpoints checkpoints publics (lecture seule) — édition réservée admin Strapi
- **A03 Injection** : `what3words` affiché dans href — valider format `word.word.word` côté Strapi (pattern) ou frontend
- **A05 Security Misconfiguration** : `console.log` supprimés — ne plus logger les URLs avec tokens en production
- **A07 Identification Failures** : Pas d'auth pour V2 (tout public), STRAPI_API_TOKEN en variable d'env serveur

---

## Considérations futures (hors scope V2)

- Sitemap XML auto-généré (`app/sitemap.ts`)
- Structured Data JSON-LD (schema.org `Article`, `TouristAttraction`)
- Analytics Plausible ou Matomo (respect vie privée)
- Validation checkpoint physique (QR code ou NFC → déblocker badge numérique)
- Map interactive Leaflet/Mapbox (remplacer iframe static)
- Blog RSS Feed (`/blog/rss.xml`)
- Multilingue EN/NL pour cyclotouristes internationaux

---

## Références

### Code existant
- `gthdf-frontend/lib/strapi.ts` — API client principal
- `gthdf-frontend/lib/chapters.ts` — Client chapitres
- `gthdf-frontend/app/chapitres/[slug]/page.tsx` — Template page chapitre (référence pour nouvelles pages)
- `gthdf-frontend/components/PagedSection.tsx` — Pagination responsive réutilisable
- `gthdf-cms/src/components/shared/seo.json` — Component SEO réutilisable (`metaTitle`, `metaDescription`, `shareImage`)

### Design
- `gthdf-frontend/DESIGN.md` — Principes design (grilles asymétriques, pas de gradients)
- `gthdf-frontend/VISUAL-GUIDE.md` — Tokens couleur : `--color-charbon`, `--color-creme`, `--color-beige`, `--color-bleu`, `--color-vert`, `--color-rouge`, `--color-jaune`

### ADRs
- `documentation/adr_legal_notice.md` — Exemple ADR, pattern à suivre pour les décisions V2
