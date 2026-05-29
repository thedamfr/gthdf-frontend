# PRD — Homepage : bloc intro + FAQ accordéon

**Date** : 2026-05-29  
**Statut** : Approuvé  
**Scope** : `gthdf-frontend` + `gthdf-cms`

---

## Contexte

La homepage actuelle enchaîne : header → carte → principes → horizons → rencontres → footer.  
Deux sections manquent :
1. Un texte d'introduction visible haut de page (avant la carte)
2. Une FAQ dynamique en accordéon (après les horizons / paysages, avant les rencontres)

---

## Section 1 — Bloc intro (texte explicatif au-dessus de la carte)

### Position
Entre le header (logo/titre) et la section carte "La boucle".

### Champs CMS — homepage Single Type

| Champ | Type Strapi | Obligatoire | Défaut |
|---|---|---|---|
| `introTitle` | string | non | — |
| `introText` | text (longtext) | non | — |

### Comportement
- Si `introTitle` ET `introText` sont vides → section non rendue (pas de bloc vide)

### Rendu front
- Titre `<h2>` + paragraphe
- Positionné entre header et section carte
- Style sobre : même police, fond crème, max-width 780px

---

## Section 2 — FAQ accordéon

### Position
Après la section Horizons (paysages), avant la section Rencontres.

### Nouveau composant Strapi : `homepage.faq-item`

| Champ | Type | Obligatoire |
|---|---|---|
| `question` | string | oui |
| `answer` | text | oui |

### Champs CMS — homepage Single Type

| Champ | Type Strapi | Obligatoire | Défaut |
|---|---|---|---|
| `faqTitle` | string | non | "Questions fréquentes" |
| `faqItems` | component `homepage.faq-item`, repeatable | non | — |

### Comportement
- Si `faqItems` est vide → section non rendue
- N items → N accordéons indépendants

### Rendu front
- Composant `FaqSection`
- Accordéon via `<details>/<summary>` natif HTML (pas de JS custom)
- Animé en CSS

---

## Ordre des sections après implémentation

1. Header (logo + titre + sous-titre)
2. **Bloc intro**
3. Carte "La boucle" (DeferredMapEmbed)
4. Principes
5. Horizons (paysages)
6. **FAQ accordéon**
7. Rencontres
8. Footer

---

## Critères d'acceptation

- **Intro** : Given introTitle + introText renseignés → When homepage chargée → Then bloc visible entre header et carte
- **Intro vide** : Given introTitle vide ET introText vide → Then aucun bloc rendu
- **FAQ 3 items** : Given 3 items FAQ dans Strapi → Then 3 accordéons visibles, chacun indépendamment dépliable
- **FAQ vide** : Given 0 items FAQ → Then section FAQ non rendue
- **FAQ position** : Given FAQ configurée → Then apparaît après Horizons, avant Rencontres

---

## Risques OWASP

- **A03 Injection** : Le champ `introText` et les réponses FAQ sont du texte libre — rendu via `{text}` React (pas de `dangerouslySetInnerHTML`), pas de risque XSS
- **A05 Security Misconfiguration** : Pas de nouveaux endpoints exposés, champs en lecture seule depuis le front
