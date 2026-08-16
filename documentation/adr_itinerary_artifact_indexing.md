# ADR — Exclure les artefacts d’itinéraire non HTML de l’index

**Date :** 16 août 2026\
**Statut :** accepté et implémenté côté frontend ; déploiement en attente\
**Périmètre :** `gthdf-frontend`\
**Décision liée :**
[`prd_04_catalogue_itineraires_ville_a_ville.md`](prd_04_catalogue_itineraires_ville_a_ville.md)\
**Implémentation :**
[`handler-core.ts`](../lib/itineraries/handler-core.ts),
[`itinerary-handler-core.test.ts`](../tests/itinerary-handler-core.test.ts)

## Lecture en 30 secondes

Les routes suivantes servent des fichiers techniques, pas des pages de contenu :

- `/itineraires-velo/[slug]/geometry` renvoie du JSON pour la carte et le
  profil d’élévation ;
- `/itineraires-velo/[slug]/gpx` renvoie le fichier GPX téléchargeable.

Google peut découvrir ces URL pendant le rendu ou en suivant le lien de
téléchargement. Elles restent accessibles, mais toutes leurs réponses valides
`200` et `304` portent désormais :

```http
X-Robots-Tag: noindex, nofollow
```

Les pages HTML `/itineraires-velo/[slug]` ne sont pas concernées. Elles
conservent leurs règles éditoriales `index, follow` ou `noindex, follow`.
Les artefacts ne sont pas bloqués dans `robots.txt`, car les robots doivent
pouvoir lire l’en-tête `X-Robots-Tag`.

## Lecture en 3 minutes

### Contexte observé

L’export Search Console du 16 août 2026 pour le motif « explorée,
actuellement non indexée » contenait 102 URL :

- 93 routes `/geometry` ;
- cinq routes `/gpx` ;
- quatre véritables pages HTML d’itinéraires.

Les 98 artefacts n’étaient pas présents dans le sitemap, mais répondaient en
`200` sans directive d’indexation. Le filtre Search Console « toutes les pages
connues » les mélangeait donc avec les documents HTML canoniques.

### Décision

Le handler commun des artefacts ajoute `X-Robots-Tag: noindex, nofollow` à
toute réponse valide, publique ou de prévisualisation. Construire l’en-tête
avant le traitement de `If-None-Match` garantit sa présence sur les réponses
`200` et `304`.

| URL | Représentation | Indexation voulue | Signal |
|---|---|---|---|
| `/itineraires-velo/[slug]` | HTML éditorial | selon `seoStatus` | balise `meta robots` |
| `/itineraires-velo/[slug]/geometry` | JSON technique | jamais | `X-Robots-Tag` |
| `/itineraires-velo/[slug]/gpx` | GPX téléchargeable | jamais | `X-Robots-Tag` |

La décision ne modifie ni le sitemap, déjà limité aux pages HTML indexables,
ni la garde de publication, ni le cache, ni les ETag, ni les téléchargements.

### Conséquences attendues

- Google peut continuer à charger les artefacts nécessaires au rendu et au
  téléchargement, mais ne doit plus les proposer comme résultats autonomes ;
- Search Console peut les reclasser sous « exclue par `noindex` » après un
  nouveau crawl ; cet état est correct ;
- le nombre total d’URL « indexées » peut diminuer si un artefact technique
  avait déjà été retenu, sans que cela constitue une perte de contenu ;
- le suivi SEO pertinent reste le nombre de pages HTML canoniques du sitemap
  qui sont indexées, pas le total de toutes les URL connues de Google.

### Déploiement et retour arrière

Le changement concerne uniquement le frontend. Il ne demande aucune migration
CMS, aucune modification de données et aucune nouvelle variable
d’environnement. Le retour arrière consiste à retirer l’en-tête du handler
commun et les assertions associées ; il n’entraîne aucune restauration de
données.

## Lecture exhaustive — contrat normatif et contexte LLM

### 1. Problème à résoudre

Une fiche d’itinéraire est un document HTML public qui peut être candidat à
l’indexation. Sa géométrie JSON et son GPX sont des représentations auxiliaires
consommées par cette fiche ou téléchargées par l’utilisateur. Une réponse
`200`, un type MIME correct ou un `Content-Disposition: attachment` ne
constituent pas, à eux seuls, une interdiction d’indexation.

Les trois représentations partagent le même slug et la même garde de
publication, mais elles n’ont pas la même finalité SEO. La décision doit donc
être portée par la réponse de chaque représentation, sans déduire
l’indexabilité du seul fait que l’itinéraire parent est indexable.

### 2. Définitions

- **Page canonique** : document HTML servi sur
  `/itineraires-velo/[slug]`.
- **Artefact GPX** : fichier `application/gpx+xml` servi sur
  `/itineraires-velo/[slug]/gpx`.
- **Artefact de géométrie** : document `application/json` servi sur
  `/itineraires-velo/[slug]/geometry`.
- **Réponse valide** : réponse `200 OK` ou `304 Not Modified` produite après
  réussite de la garde et du contrôle d’intégrité.
- **Prévisualisation** : accès autorisé en Draft Mode, avec cache privé.

### 3. Règles obligatoires

1. Le frontend **DOIT** envoyer
   `X-Robots-Tag: noindex, nofollow` sur chaque réponse valide d’un artefact
   GPX ou de géométrie.
2. Cette règle **DOIT** s’appliquer aux artefacts publics et aux artefacts de
   prévisualisation.
3. Une réponse conditionnelle `304` **DOIT** conserver l’en-tête, l’ETag, le
   type de contenu et la politique de cache applicables.
4. La page HTML canonique **NE DOIT PAS** hériter de cet en-tête. Son
   indexabilité reste déterminée par `seoStatus` dans ses métadonnées HTML.
5. Les artefacts **NE DOIVENT PAS** être ajoutés au sitemap.
6. Les artefacts **NE DOIVENT PAS** être bloqués dans `robots.txt` pour tenter
   de remplacer `noindex` : un robot bloqué ne peut pas lire l’en-tête.
7. Le changement **NE DOIT PAS** modifier le corps, le hash, l’ETag, le nom de
   téléchargement, le type MIME, la garde ou la durée de cache des artefacts.
8. Les réponses `404` et `503` ne sont pas tenues de porter l’en-tête : leur
   statut HTTP exprime respectivement une absence ou une indisponibilité
   transitoire. Elles ne doivent pas être transformées en `200` pour des motifs
   SEO.
9. Une future route technique ne reçoit pas automatiquement cette politique :
   sa finalité doit être évaluée explicitement avant de réutiliser la décision.

### 4. Matrice de réponse attendue

| Cas | Statut | Cache | `X-Robots-Tag` | Autres invariants |
|---|---:|---|---|---|
| GPX public valide | `200` | public, maximum 60 s | `noindex, nofollow` | MIME GPX, téléchargement, ETag |
| Géométrie publique valide | `200` | public, maximum 60 s | `noindex, nofollow` | MIME JSON, ETag |
| Artefact public non modifié | `304` | politique publique conservée | `noindex, nofollow` | aucun corps, ETag conservé |
| Artefact de preview valide | `200` ou `304` | `private, no-store` | `noindex, nofollow` | session Draft Mode requise |
| Itinéraire fermé ou invalide | `404` | politique bornée ou privée selon le cas | non requis | aucun artefact servi |
| Amont temporairement indisponible | `503` | `private, no-store` | non requis | aucun faux `404` cacheable |

### 5. Point d’application unique

La politique est appliquée dans
`lib/itineraries/handler-core.ts`, au moment où l’objet `Headers` commun est
créé. Les deux Route Handlers `/gpx` et `/geometry` délèguent déjà à ce noyau.
Cette position évite :

- deux implémentations divergentes ;
- un oubli sur les réponses `304` ;
- une dépendance au proxy, au CDN ou à une configuration Clever Cloud ;
- une modification de la logique éditoriale des pages HTML.

### 6. Alternatives examinées et écartées

#### Ne rien faire

Google n’avait pas indexé les 98 exemples au moment de l’export, mais cette
décision restait implicite et réversible côté moteur. Elle produisait aussi un
rapport Search Console difficile à interpréter. L’absence actuelle de résultat
ne constitue pas un contrat d’exclusion.

#### Bloquer les routes dans `robots.txt`

Écarté : le blocage empêcherait le robot de charger la réponse et donc de lire
`noindex`. Il contrôlerait le crawl, pas correctement l’indexation d’une URL
déjà connue.

#### Ajouter une balise `<meta name="robots">`

Écarté : les réponses sont du JSON et du GPX, pas des documents HTML. La
directive appropriée est l’en-tête HTTP `X-Robots-Tag`.

#### Déclarer la page HTML comme canonique des artefacts

Écarté : une canonical HTTP exprimerait une relation de duplication alors que
le JSON, le GPX et la page HTML ont des formats et des usages distincts. La
décision produit est plus simple : les artefacts ne sont jamais des résultats
de recherche autonomes.

#### Supprimer ou rendre privées les routes

Écarté : la carte publique consomme la géométrie et l’utilisateur doit pouvoir
télécharger le GPX. L’objectif porte sur l’indexation, pas sur l’accès.

### 7. Vérifications requises

Avant livraison :

1. un test unitaire rouge puis vert vérifie l’en-tête sur un GPX public en
   `200` ;
2. un test vérifie sa conservation sur une géométrie publique en `304` ;
3. la suite `npm test` doit passer ;
4. `npm run lint` doit passer ;
5. `npm run build` doit passer avec l’environnement applicatif attendu ;
6. une vérification runtime contrôle un GPX `200`, une géométrie `200`, une
   géométrie `304` et une page HTML canonique.

Après déploiement :

1. contrôler avec une requête GET dont le corps est ignoré
   (`curl -sS -D - -o /dev/null URL`) que les deux routes techniques exposent
   l’en-tête en production ;
2. vérifier qu’une page HTML témoin reste `index, follow` avec sa canonical ;
3. laisser Google recrawler les URL ;
4. suivre leur reclassement dans Search Console sans demander leur indexation ;
5. filtrer le rapport principal par sitemap pour mesurer les seules pages
   canoniques attendues.

### 8. Risques et limites

- `noindex` n’interdit pas le crawl : les ressources peuvent encore être
  demandées par Google ;
- Search Console peut conserver l’ancien motif jusqu’au prochain crawl ;
- le compteur global d’URL indexées peut baisser si des artefacts étaient déjà
  indexés ;
- cette décision ne résout pas les 404 historiques ni les véritables pages
  HTML « explorées, actuellement non indexées » ; ces groupes ont des causes
  et des actions distinctes.

### 9. Conditions de réexamen

Réexaminer cet ADR seulement si :

- un artefact doit devenir une page publique recherchable pour un besoin
  utilisateur explicite ;
- Google ne respecte plus `X-Robots-Tag` pour le type de ressource concerné ;
- les routes passent derrière un stockage ou un CDN qui supprime l’en-tête ;
- une nouvelle représentation non HTML nécessite une politique différente.

### 10. Résumé structuré pour agents et LLM

```yaml
decision_id: itinerary-artifact-indexing
status: accepted_implemented_frontend_pending_deployment
scope:
  application: gthdf-frontend
  included_paths:
    - /itineraires-velo/[slug]/geometry
    - /itineraires-velo/[slug]/gpx
  excluded_paths:
    - /itineraires-velo/[slug]
required_header:
  name: X-Robots-Tag
  value: noindex, nofollow
required_statuses:
  - 200
  - 304
page_html_policy: determined_by_seoStatus
sitemap_policy: artifacts_absent
robots_txt_policy: do_not_block_artifacts_as_noindex_replacement
implementation_owner: lib/itineraries/handler-core.ts
data_migration: none
cms_change: none
environment_change: none
rollback: remove_shared_header_and_associated_assertions
```
