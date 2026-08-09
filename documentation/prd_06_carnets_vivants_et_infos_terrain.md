# PRD 06 — Carnets vivants, traces reconnues et informations terrain

**Version :** 0.1\
**Date :** 9 août 2026\
**Statut :** prêt pour revue produit, sécurité et architecture\
**Source produit :** `PRD_04_carnets_vivants_et_infos_terrain.md` transmis le 9 août 2026 ; renuméroté pour éviter une collision avec les PRD déjà attribués\
**Dépôts existants concernés :** `gthdf-frontend`, `gthdf-cms`\
**Nouveau déployable recommandé :** domaine privé voyageur, nom de dépôt à confirmer\
**Dépendances :** PRD 01 — référentiel des villes ; PRD 02 — ordre public des chapitres ; [PRD 03](prd_03_gpx_builder_ville_a_ville.md) — sources GPX, empreintes et noyau géographique ; [PRD 04](prd_04_catalogue_itineraires_ville_a_ville.md) — parcours de référence et révisions géographiques\
**Marque publique :** GTHF

---

## 1. Résumé de la décision

Ce PRD transforme le projet produit initial en un contrat d’architecture
livrable. Il préserve les quatre principes non négociables du document source :

1. carnet, traces, photos et retours privés par défaut ;
2. une trace reconnue constitue la preuve de passage ; une photo ne la remplace
   pas ;
3. publication d’un récit, contribution au signal agrégé et retour terrain
   reposent sur trois choix indépendants ;
4. le produit valorise les jours vécus à vélo, pas l’inactivité ni un record de
   lenteur.

L’audit conduit à recommander une séparation ferme entre deux domaines :

- **Strapi reste le CMS éditorial public** : chapitres, GPX officiels,
  informations terrain éditorialisées, récits approuvés et médias publics ;
- **un domaine voyageur privé distinct** porte les comptes, sessions, traces,
  voyages, géométries, médias privés, consentements, tokens tiers,
  reconnaissances, agrégats et signalements bruts ;
- **Next.js porte l’expérience web** et ne reçoit que les données privées de
  l’utilisateur connecté ou des projections publiques minimales ;
- **un worker asynchrone durable** valide les fichiers, calcule les couvertures,
  produit les agrégats et exécute les suppressions.

La présence du plugin Strapi `users-permissions` ne justifie pas d’y placer le
domaine voyageur. Le CMS actuel, son API, son pool PostgreSQL de trois
connexions et son bucket média public sont conçus pour l’éditorial. Les données
de déplacement précises et les tokens OAuth créeraient un rayon d’exposition
et une charge opérationnelle incompatibles avec cette frontière.

La livraison est progressive :

- lot 0 : ADR, identité stable des chapitres, corpus de traces et protocole de
  confidentialité ;
- lot 1 : compte, import GPX privé, bibliothèque et reconnaissance ;
- lot 2 : voyages et agrégation multi-traces ;
- lot 3 : retours terrain privés et triage ;
- lot 4 : récits volontaires, projections publiques et signal agrégé ;
- lot 5 : Strava après revue de l’application et mise en place du worker ;
- lot 6 : FIT, puis Garmin seulement après validation du programme partenaire ;
- lot 7 : éventuelle célébration « Le temps pris », sans classement au MVP.

Le PRD fixe les frontières, contrats, états et garde-fous. Il laisse au lot 0
les seuils géographiques définitifs, le fournisseur d’identité, la politique
de conservation validée et la qualification de l’infrastructure privée. Ces
arbitrages sont explicités en section 28 avec recommandation, responsable et
lot bloqué.

## 2. Pourquoi le document devient PRD 06

Le document Drive portait le numéro 04. Le dépôt principal contient déjà
`prd_04_catalogue_itineraires_ville_a_ville.md` et une seconde recette
historique numérotée 04. Le 9 août 2026, la PR GitHub CMS no 19,
« PRD05: add DataMaster admin role », réserve également le numéro 05.

Le présent document devient donc PRD 06 et sa branche documentaire est
`agent/prd-06-carnets-vivants`. Ce changement ne modifie pas le périmètre
produit.

## 3. Contexte et problème

Le site public permet aujourd’hui de découvrir les chapitres, les villes et des
portions officielles du GTHF. Il ne possède ni compte voyageur, ni stockage
privé, ni bibliothèque de traces, ni file de travaux, ni mécanisme de
consentement.

Un voyage réel produit rarement un seul fichier propre :

- un GPS peut être arrêté chaque soir ;
- une activité peut traverser plusieurs chapitres ;
- une longue trace peut couvrir plusieurs jours ;
- la même activité peut arriver par fichier, Strava et plus tard Garmin ;
- une trace peut être incomplète, sans horodatage ou proche du parcours sans
  réellement le couvrir.

Le service doit reconnaître ces parcours sans révéler les habitudes, lieux de
départ, horaires ou médias privés. Il doit ensuite laisser le voyageur choisir
séparément s’il souhaite raconter son voyage, aider l’équipe ou contribuer à
un indicateur anonyme.

## 4. Objectifs

- importer et conserver des traces privées indépendamment d’un voyage ;
- reconnaître zéro, un ou plusieurs chapitres à partir d’une trace ;
- agréger plusieurs traces au sein d’un voyage sans double comptage ;
- conserver une preuve reproductible liée à la version exacte du GPX
  officiel ;
- distinguer temps en mouvement, durée d’activité, jours à vélo et durée du
  voyage ;
- proposer des retours terrain localisés et privés à l’équipe ;
- publier uniquement des récits et médias sélectionnés puis modérés ;
- afficher un signal récent uniquement lorsque l’anonymat collectif est
  défendable ;
- permettre export, retrait de consentement, suppression et révocation ;
- préparer les connecteurs sans rendre le MVP dépendant de Strava, Garmin ou
  Komoot ;
- rendre chaque traitement idempotent, observable, reprenable et testable.

## 5. Non-objectifs

Le MVP ne comprend pas :

- réseau social, abonnements, fil, commentaires publics libres ou messagerie ;
- publication automatique d’une trace, photo, date ou activité ;
- suivi GPS continu ou permission de localisation en arrière-plan ;
- carte publique d’une trace personnelle ;
- synchronisation Komoot ;
- intégration Garmin promise avant approbation partenaire ;
- classement public, record ou récompense de lenteur ;
- recommandation de sécurité automatique à partir d’un seul passage ;
- réécriture du GPX Builder ou appel de ses endpoints publics ;
- utilisation de l’index simplifié du PRD 02 comme preuve géographique ;
- partage de base de données ou de bucket privé avec le CMS éditorial ;
- ajout de données privées dans les analytics, logs ou outils marketing ;
- décision juridique définitive sur la base légale et les durées de
  conservation sans revue dédiée.

## 6. État des dépôts confirmé par inspection

Les constats suivants proviennent de `gthdf-frontend@8deb0fd` et de
`gthdf-cms@c1cc309` observés le 9 août 2026.

### 6.1 Frontend Next.js

- Next.js 16.3.0, React 19.2.1, App Router et Node.js 22.12 à 24 ;
- application publique déployée sur Clever Cloud, runtime `nano` et build `M` ;
- pages rendues par Server Components, Route Handlers et lectures Strapi
  serveur ;
- token `STRAPI_API_TOKEN` strictement serveur et Draft Mode protégé par
  `PREVIEW_SECRET` ;
- caches publics de 60 à 300 secondes selon les surfaces ;
- endpoints actuels synchrones et bornés pour le Builder et le catalogue ;
- aucun compte voyageur, login, session applicative, fournisseur OIDC, base
  applicative, ORM, route d’upload privé, webhook ou file de travaux ;
- aucune dépendance FIT, Strava, queue ou stockage privé ;
- le disque local du runtime ne peut pas devenir un stockage de traces
  durable.

### 6.2 CMS Strapi

- Strapi 5.51.1, Node.js 20 à 24 et PostgreSQL ;
- plugin `users-permissions` installé mais aucun parcours voyageur, rôle
  voyageur, contrôleur privé ou politique métier associé ;
- pool PostgreSQL configuré de 1 à 3 connexions ;
- aucun cron, worker, webhook Strava ou mécanisme de queue ;
- médias stockés via le provider S3 dans MinIO en développement et Cellar en
  production ;
- bucket actuel orienté médias publics ; sa documentation et le code existant
  permettent des URLs publiques ;
- limite d’upload globale actuelle de 10 Mio ;
- MIME GPX/XML admis, FIT absent ;
- contrôleurs `Chapter` standard, validations de publication dans
  `src/index.ts` et commandes explicites pour les migrations/calculs ;
- les champs Strapi marqués `private` protègent un DTO, mais ne constituent pas
  à eux seuls une isolation de données sensibles, une politique objet privée
  ou une séparation opérationnelle.

### 6.3 Sources géographiques existantes

- dix chapitres publiés et ordonnés par `displayOrder` ;
- un `gpxFileAB` et un `gpxFileBA` par chapitre ;
- AB et BA sont deux parcours administrés distincts : ils ne doivent jamais
  être obtenus l’un par simple inversion de l’autre ;
- les ancrages et jonctions du PRD 03 sont liés au SHA-256 binaire de leur
  source et à une version d’algorithme ;
- `ReferenceRoute` possède déjà `routeKey`, `isLoop`,
  `algorithmVersion`, `sourceManifestHash` et des segments ordonnés ;
- `RouteAnchor` conserve chapitre, direction, indices source, chaînage,
  `sourceHash`, version d’algorithme et statut de validation ;
- `Chapter` ne possède pas encore de clé métier immuable portable entre
  environnements ; `slug` peut évoluer, `displayOrder` n’est pas une identité
  et `documentId` est technique.

### 6.4 Hébergement

- Clever Cloud utilise une infrastructure immuable : le disque local ne doit
  contenir aucun fichier utilisateur durable ;
- Cellar est compatible S3 et sait produire des URLs pré-signées, mais le
  bucket éditorial existant est public et ne doit pas être réutilisé pour les
  traces privées ;
- un cron Clever est exécuté sur chaque scaler et peut se chevaucher pendant
  un déploiement ; il ne remplace donc pas une queue durable sans verrouillage ;
- aucun mécanisme de traitement privé n’est aujourd’hui déployé.

## 7. Principes produit et sécurité non négociables

### 7.1 Privé par défaut

Compte, voyage, trace, géométrie, timestamps, médias, notes, tokens tiers,
résultats détaillés et retours terrain restent privés. Une reconnaissance ne
crée aucune projection publique.

### 7.2 Finalités et consentements séparés

Trois choix indépendants sont conservés avec leur version, date, preuve et
retrait :

- proposer un récit public ;
- contribuer au signal agrégé « parcouru récemment » ;
- transmettre un retour privé à l’équipe.

Le consentement au signal agrégé n’autorise ni récit, ni photo, ni
communication marketing. Le retrait n’efface pas automatiquement les données
nécessaires au carnet privé ; il retire la contribution concernée.

### 7.3 Preuve géographique privée

Une publication peut être proposée seulement si le voyage possède un passage
reconnu sur chaque chapitre sélectionné. Le public ne reçoit jamais la
géométrie preuve.

### 7.4 Projection, jamais changement d’ACL

Publier une photo ou un texte crée une copie dérivée, nettoyée et modérée dans
le domaine public. Le système ne rend jamais public l’objet privé d’origine en
changeant son ACL.

### 7.5 Pas d’inférence négative

L’absence de passage récent ne signifie ni fermeture, ni danger, ni
impraticabilité. Les informations terrain publiques restent éditoriales,
datées et qualifiées.

### 7.6 Pas de géolocalisation dans la télémétrie

Coordonnées, polyline, nom de fichier, token tiers, texte de retour et URL
signée sont exclus des logs, traces APM, analytics, messages d’erreur et
événements marketing.

## 8. Architecture cible recommandée

### 8.1 Découpage

~~~mermaid
flowchart LR
  B[Navigateur] -->|session same-origin| N[Next.js GTHF]
  N -->|API privée authentifiée| V[Service voyageur privé]
  V --> D[(PostgreSQL privé)]
  V --> O[(Bucket privé)]
  V --> Q[(Jobs durables)]
  W[Worker de reconnaissance] --> Q
  W --> D
  W --> O
  W -->|lecture GPX officiels et empreintes| S[Strapi éditorial]
  M[Console équipe privée] --> V
  V -->|promotion nettoyée en brouillon| S
  S -->|contenus publiés uniquement| N
  V -->|projection agrégée sans identité| N
~~~

### 8.2 Responsabilités

**`gthdf-frontend`**

- pages compte, bibliothèque, voyages, contributions et retrait ;
- BFF same-origin ou client serveur du service privé ;
- cookie de session `Secure`, `HttpOnly` et `SameSite=Lax` au minimum ;
- aucune clé objet privée, aucun token OAuth tiers, aucun calcul lourd ;
- rendu public des récits Strapi et du signal agrégé minimal ;
- garde commune pour page, sitemap, cache et retrait de publication.

**`gthdf-cms`**

- identité éditoriale des chapitres et parcours officiels ;
- nouveaux modèles publics de récit approuvé et d’information terrain ;
- médias publics dérivés ;
- Draft & Publish, aperçu, modération éditoriale et SEO ;
- aucun modèle de trace, voyage, consentement, token OAuth ou retour brut.

**Service voyageur privé**

- identité applicative liée à un fournisseur OIDC ;
- autorisations par propriétaire et rôles équipe ;
- métadonnées, consentements, déduplication, voyages et états ;
- URLs pré-signées courtes pour le bucket privé ;
- API idempotente et journal d’audit ;
- projections publiques sans PII ;
- demandes d’export et de suppression.

**Worker**

- inspection sûre des fichiers ;
- normalisation géographique et temporelle ;
- empreintes et déduplication ;
- synchronisation des snapshots de parcours officiels ;
- couverture trace–chapitre, agrégation voyage–chapitre et métriques ;
- reprise, backoff, dead-letter et recalcul versionné ;
- suppression physique et recomposition des agrégats.

### 8.3 Pourquoi Strapi seul est écarté

L’option « tout dans Strapi » réduirait le nombre de services mais :

- mélangerait données éditoriales publiques et historiques de déplacement ;
- réutiliserait un bucket public ou exigerait deux politiques média très
  différentes dans la même application ;
- exposerait le CMS et ses plugins à un trafic d’upload et de calcul privé ;
- partagerait le petit pool PostgreSQL avec le matching ;
- rendrait les droits, suppressions et tokens OAuth plus difficiles à auditer ;
- augmenterait le risque qu’un `populate` ou une permission publie trop.

Cette option ne peut être retenue que si un ADR démontre une isolation
équivalente : base ou schéma privé, bucket privé distinct, routes
fail-closed, worker séparé, tests d’autorisation systématiques et impossibilité
de sur-fetch public. La recommandation reste un service séparé.

### 8.4 Forme de déploiement proposée

Un dépôt TypeScript/Node distinct contient deux entrypoints :

- API privée ;
- worker asynchrone.

Ils sont déployés comme deux applications Clever Cloud séparées, partagent une
base PostgreSQL privée et une table de jobs durable. Le lot 0 doit comparer
cette file PostgreSQL à un broker dédié. Pour le MVP, PostgreSQL est recommandé
afin de limiter l’infrastructure, à condition d’utiliser verrous courts,
`SKIP LOCKED` ou mécanisme équivalent, idempotency keys et métriques de retard.

## 9. Identités techniques et synchronisation éditoriale

### 9.1 Clé stable du chapitre

Une clé métier immuable `chapterKey` est ajoutée à `Chapter` :

- unique, obligatoire à la publication ;
- indépendante du slug, du titre, de l’ordre et du `documentId` ;
- format conseillé : `chapter-01` à `chapter-10` ou clé sémantique validée ;
- migrée dans brouillons et versions publiées avant activation du service.

Le service privé référence `chapterKey`. Il peut conserver `documentId` et
`slug` dans un snapshot de diagnostic, jamais comme identité principale.

### 9.2 Version officielle

Une `OfficialRouteSnapshot` immuable identifie :

- `chapterKey` ;
- direction `ab` ou `ba` ;
- SHA-256 des octets GPX ;
- identifiant du média Strapi et date de publication observée ;
- longueur, nombre de traces/segments/points et bounding box ;
- version de parsing ;
- état `current`, `superseded` ou `invalid`.

Le SHA-256 est calculé sur les octets réellement analysés. `updatedAt` ou l’URL
du média ne suffisent pas.

### 9.3 Synchronisation

Le worker synchronise un manifeste Strapi borné et authentifié. Toute nouvelle
empreinte :

1. crée un snapshot sans écraser l’ancien ;
2. marque les couvertures courantes comme à recalculer ;
3. conserve les reconnaissances historiques et leur source ;
4. interdit leur contribution publique récente tant qu’une règle de
   compatibilité ou un recalcul n’est pas validé ;
5. produit un rapport de changement.

## 10. Modèle métier privé

Les noms SQL/ORM peuvent évoluer, mais les identités et relations suivantes
sont contractuelles.

### 10.1 Entités

| Entité | Champs et invariants principaux |
|---|---|
| `TravelerAccount` | ID opaque, fournisseur et `subject` OIDC uniques, état, locale, fuseau préféré, dates de création/suspension/suppression |
| `Trace` | propriétaire, état, clé objet privée, hash brut, hash normalisé par propriétaire, bornes temporelles, fuseau source, métriques, format, suppression |
| `TraceSource` | trace canonique, type `file/strava/garmin`, identifiant externe, scopes/provenance ; unicité propriétaire + source + identifiant |
| `Trip` | propriétaire, titre, fuseau IANA, dates observées et éventuellement déclarées, notes privées, état |
| `TripTrace` | association éditable, ordre, date d’ajout ; une trace appartient au maximum à un voyage actif |
| `OfficialRouteSnapshot` | `chapterKey`, direction, SHA-256, métriques source, version du parseur |
| `TraceChapterCoverage` | trace, snapshot, intervalles de chaînage couverts, ratio, direction, confiance, statut, version d’algorithme, rapport borné |
| `TripChapterPassage` | voyage, chapitre, union des couvertures canoniques, statut, métriques et versions contributrices |
| `ConsentEvent` | propriétaire, finalité, `granted/withdrawn`, version de notice, horodatage, source de preuve |
| `OAuthConnection` | fournisseur, identifiant externe, scopes accordés, tokens chiffrés, expiration, révocation, dernier curseur |
| `StorySubmission` | voyage, auteur public choisi, texte public, chapitres sélectionnés, état de modération |
| `StoryMediaSelection` | média privé source, dérivé public, ordre, texte alternatif, preuve de sélection |
| `TerrainReport` | voyage, chapitre, passage, type, niveau, date observée, commentaire, position facultative, photo privée et statut interne |
| `ModerationDecision` | objet, acteur équipe, décision, motif, dates et référence de projection |
| `RecentPassageContribution` | propriétaire, passage reconnu, finalité consentie, fenêtre et état d’éligibilité |
| `DeletionRequest` | périmètre, état, étapes, erreurs, dates et preuve de purge |

### 10.2 Contrainte voyage–trace

Une trace ne peut appartenir qu’à un voyage actif à la fois. Le voyageur peut
la déplacer vers un autre voyage après confirmation ; les deux voyages sont
recalculés. Cette règle évite qu’une activité réelle double distances, jours ou
couvertures.

La bibliothèque conserve la trace sans voyage. Une future demande de narration
multiple doit créer plusieurs sélections éditoriales sur le même voyage, pas
copier la preuve.

### 10.3 Déduplication

- certitude : identifiant externe unique d’une source ;
- forte probabilité : même propriétaire, chevauchement temporel, distance,
  durée et hash géométrique normalisé proches ;
- doute : groupe de doublons soumis à confirmation ;
- aucune déduplication entre utilisateurs ;
- plusieurs `TraceSource` peuvent pointer vers une trace canonique ;
- une source supprimée ne supprime pas la trace si une autre source ou un
  import volontaire la justifie ;
- seule la trace canonique contribue aux métriques.

## 11. États et idempotence

### 11.1 Trace

`upload_pending → quarantined → validating → ready_for_matching → matching →
ready`.

Sorties possibles : `duplicate_pending_confirmation`, `ignored`, `rejected`,
`failed_retryable`, `failed_final`, `deleting`, `deleted`.

Chaque transition possède un acteur, une date et un code raison. Rejouer un job
avec la même clé d’idempotence ne crée ni trace, ni couverture supplémentaire.

### 11.2 Récit

`private_draft → submitted → under_review → changes_requested → approved →
published`.

Sorties : `rejected`, `withdrawal_pending`, `withdrawn`, `unpublished_by_team`.
Un récit retiré échoue fermé : la projection publique est d’abord masquée,
puis les objets sont supprimés selon la politique de rétention.

### 11.3 Retour terrain

`new → triage → analysing → verified → resolved`, avec sorties
`not_retained` et `duplicate`.

`verified` ne publie pas le retour brut. Il autorise la création d’une
`TerrainInfo` éditoriale distincte dans Strapi.

## 12. Import GPX et sécurité des fichiers

### 12.1 Flux

1. le navigateur demande une intention d’upload authentifiée ;
2. le service vérifie quota et propriétaire puis renvoie une URL pré-signée
   courte vers le bucket privé ;
3. le navigateur envoie directement l’objet ;
4. le service vérifie taille et empreinte attendues ;
5. le worker place l’objet en quarantaine logique, parse et normalise ;
6. l’objet devient une trace seulement après validation ;
7. les erreurs affichent un message utile sans journaliser le contenu.

### 12.2 Garde-fous initiaux

Le lot 0 doit mesurer un corpus avant de figer les bornes. La première
implémentation ne peut toutefois pas être non bornée :

- GPX seul au lot 1 ;
- taille maximale recommandée : 25 Mio, à confirmer par corpus ;
- nombre maximal recommandé : 500 000 points ;
- XML sans DTD ni entité externe ;
- nombre de `trk` et `trkseg` borné ;
- coordonnées finies et dans WGS84 ;
- timestamps invalides isolés, jamais interprétés silencieusement ;
- temps CPU, mémoire et taille de rapport bornés ;
- hash calculé en flux ;
- aucun nom de fichier utilisateur utilisé comme clé objet ;
- quota par compte et limitation de débit ;
- analyse antivirus des médias et évaluation séparée pour GPX/FIT.

Un dépassement produit `rejected_limit` avec la limite concernée. Il ne lance
pas un job indéfini.

### 12.3 FIT

FIT n’est pas un « GPX dégradé ». Son lot exige :

- bibliothèque maintenue et audit de licence/sécurité ;
- conservation des timestamps, pauses, capteurs utiles et fuseaux ;
- fixtures Garmin/Wahoo réelles et synthétiques ;
- parité des métriques nécessaires au matching ;
- limites binaires et détection de corruption.

FIT entre au lot 6 seulement après validation de la chaîne GPX.

## 13. Reconnaissance géographique

### 13.1 Règle générale

Le matching compare la géométrie privée aux deux directions officielles
courantes de chaque chapitre. Il ne valide jamais un chapitre à partir d’une
simple intersection, d’un point proche ou du nombre brut de points.

### 13.2 Pipeline recommandé

1. sélectionner les candidats par bounding box élargie ;
2. parser les snapshots officiels immuables ;
3. projeter les points ou segments de la trace sur le linéaire officiel ;
4. éliminer les sauts impossibles et projections hors corridor ;
5. convertir les projections valides en intervalles de chaînage ;
6. unir les intervalles, sans compter deux fois les aller-retours ;
7. mesurer couverture, continuité, écarts, ordre et sens ;
8. calculer confiance et statut ;
9. persister les preuves bornées, les versions et les raisons ;
10. agréger ensuite au niveau du voyage.

Le ratio se calcule en mètres de parcours officiel couverts, pas en proportion
de points. Le rééchantillonnage interne ne remplace pas la géométrie source
dans l’audit.

### 13.3 Paramètres versionnés

Un `MatchingPolicy` immuable conserve :

- distance maximale au tracé ;
- taille des intervalles ou pas de rééchantillonnage ;
- longueur minimale continue ;
- couverture minimale `partial` et `recognized` ;
- tolérance aux coupures ;
- règle de direction ;
- qualité temporelle minimale ;
- version parseur et algorithme ;
- hash du corpus de qualification.

Aucune valeur finale ne peut être choisie seulement à partir des GPX
officiels. Le lot 0 doit réunir :

- traces complètes propres ;
- traces quotidiennes qui couvrent ensemble un chapitre ;
- traces partielles utiles à un signalement ;
- pistes parallèles proches mais hors GTHF ;
- demi-tours et boucles locales ;
- points clairsemés, tunnels et coupures ;
- AB et BA réellement différents ;
- fichiers sans temps et temps incohérents ;
- changement d’un GPX officiel.

Les valeurs de départ à expérimenter, non contractuelles, sont un corridor de
50 à 100 m selon la précision et une reconnaissance de 85 à 90 % au niveau
voyage. Le rapport du lot 0 fixe les valeurs retenues, les faux positifs, faux
négatifs et cas manuels.

### 13.4 Statuts

- `irrelevant` : pas de couverture utile ;
- `partial` : couverture utile mais insuffisante ;
- `recognized` : politique satisfaite ;
- `ambiguous` : plusieurs projections plausibles ou données insuffisantes ;
- `stale` : source officielle remplacée ;
- `failed` : calcul non interprétable.

Une trace `partial` peut créer un retour terrain. Seul un
`TripChapterPassage.recognized` autorise récit public ou contribution récente.

Une trace sans horodatage fiable peut être reconnue géométriquement et servir
à un récit, mais elle ne contribue ni au signal récent, ni aux jours à vélo,
ni à une durée prouvée. Une date saisie manuellement reste narrative et ne
remplace jamais un timestamp source.

### 13.5 Changement de tracé officiel

Une reconnaissance acquise n’est jamais réécrite. L’interface conserve
« reconnue sur la version X ». Le nouveau snapshot déclenche un recalcul
distinct.

Une couverture ancienne ne contribue plus au signal récent tant qu’elle n’est
pas recalculée ou déclarée compatible par une migration auditable. Une
information terrain déjà éditorialisée garde sa propre décision et peut être
marquée obsolète par l’équipe.

## 14. Voyages et métriques

### 14.1 Agrégation

`TripChapterPassage` unit les intervalles de toutes les traces canoniques du
voyage pour un même chapitre et une même politique. Retirer ou déplacer une
trace invalide puis recalcule les passages et statistiques dépendants.

### 14.2 Mesures distinctes

| Mesure | Définition | Usage autorisé |
|---|---|---|
| Temps en mouvement | somme des périodes de déplacement fiables | statistique privée |
| Durée d’activité | fin moins début d’une trace, pauses incluses | lecture d’étape |
| Jours à vélo | dates locales distinctes possédant une activité retenue | « temps pris » |
| Durée observée du voyage | première à dernière activité retenue | contexte privé |
| Durée déclarée | dates corrigées par le voyageur | récit, jamais preuve |
| Couverture | union métrique du parcours officiel | reconnaissance |
| Distance | distance de la trace canonique normalisée | statistique privée |

Chaque voyage possède un fuseau IANA. Pour le GTHF, `Europe/Paris` est proposé
par défaut ; le voyageur peut le corriger. Les jours ne sont jamais calculés
selon le fuseau du serveur.

### 14.3 Boucle complète

Le MVP stocke la couverture du `ReferenceRoute`, mais n’affiche pas de badge
public. Le lot 0 doit trancher :

- seuil de couverture globale et par chapitre ;
- continuité et ordre attendus ;
- cohérence de direction ;
- durée maximale entre première et dernière activité ;
- traitement d’une modification de la boucle.

Recommandation produit à tester : un seul voyage, toutes les sections requises,
au moins le seuil `recognized` par chapitre et une fenêtre observée maximale de
90 jours. Une simple addition de sorties de plusieurs années est exclue. La
direction globale n’est pas rendue obligatoire tant que les parcours AB et BA
restent tous deux officiels, mais les incohérences sont signalées.

## 15. Identité, sessions et autorisations

### 15.1 Fournisseur d’identité

Le dépôt ne possède aucune authentification voyageur. Le lot 0 compare :

- fournisseur OIDC managé ;
- service d’identité auto-hébergé ;
- plugin Strapi `users-permissions`.

La recommandation est un fournisseur OIDC managé avec identifiant externe
opaque, vérification d’email et flux passwordless ou passkey lorsque
disponible. Le service privé ne stocke pas de mot de passe GTHF.

Le choix doit documenter coût, région, DPA, export, suppression, MFA,
récupération de compte, portabilité et absence de dépendance irréversible.

### 15.2 Autorisation

- chaque requête privée filtre par `accountId` dérivé de la session, jamais
  fourni comme autorité par le client ;
- contrôles objet par objet contre IDOR ;
- rôles équipe séparés : support lecture minimale, modérateur, éditeur public,
  administrateur sécurité ;
- MFA obligatoire pour les rôles équipe ;
- élévation et export de données journalisés ;
- liens médias signés après autorisation et à durée courte ;
- aucune route privée indexable ou préchargée dans une page publique.

### 15.3 CSRF, XSS et session

- cookie `HttpOnly Secure SameSite` ;
- protection CSRF sur les mutations si l’architecture de cookie l’exige ;
- rotation de session après connexion et élévation ;
- durée et révocation explicites ;
- texte public rendu avec le mécanisme de sanitisation existant ou un schéma
  plus strict ;
- Content Security Policy qualifiée avant l’ajout des pages compte.

## 16. Consentement, confidentialité et suppression

### 16.1 Registre de consentement

Chaque finalité possède des événements append-only. L’état courant est dérivé
du dernier événement valide. La notice exacte est versionnée.

Le consentement de publication porte sur une version du texte, une liste de
médias, un nom public et des chapitres. Modifier l’un de ces éléments crée une
nouvelle version soumise à modération.

### 16.2 Retrait

- contribution récente : exclusion immédiate logique et recomposition du
  prochain agrégat ;
- récit : masquage public fail-closed, dépublication Strapi et purge des
  dérivés ;
- connecteur : arrêt des synchronisations, révocation fournisseur puis
  suppression des tokens ;
- compte : session révoquée, traitements gelés, suppression orchestrée ;
- cache public maximal recommandé : 60 secondes ;
- objectif de disparition publique : 15 minutes, incident déclenché au-delà.

### 16.3 Conservation à valider

Valeurs techniques proposées pour la revue DPO/sécurité :

| Donnée | Proposition | Point à valider |
|---|---|---|
| upload rejeté | purge sous 7 jours | besoin support |
| trace et voyage | jusqu’à suppression par le voyageur | durée d’inactivité |
| token tiers | jusqu’à déconnexion ; purge immédiate après révocation | preuve de révocation |
| dérivé public retiré | masquage immédiat, purge sous 30 jours | sauvegardes |
| données primaires supprimées | inaccessibles immédiatement, purge sous 30 jours | contraintes fournisseur |
| sauvegardes | expiration maximale 90 jours | capacité de restauration sélective |
| audit sécurité | durée minimale nécessaire | base légale et accès |
| retour terrain clos | durée à fixer avec l’équipe et le DPO | sécurité et historique |

Une analyse d’impact et la base légale de chaque finalité doivent être validées
avant pilote public. Le consentement n’autorise pas une conservation illimitée
ou une précision inutile.

### 16.4 Export

L’utilisateur peut exporter :

- métadonnées du compte ;
- voyages, traces sources disponibles et métriques ;
- consentements ;
- récits et retours ;
- sources connectées.

L’archive est générée en job, chiffrée au repos, téléchargeable par URL signée
courte et purgée automatiquement.

## 17. Médias privés et publics

### 17.1 Privé

- bucket distinct, politique `deny by default` ;
- aucune URL permanente ;
- chiffrement au repos qualifié ;
- clés objet aléatoires sans email, nom ou date lisible ;
- upload et lecture par URL signée de cinq minutes maximum recommandée ;
- quotas par utilisateur ;
- dérivés privés séparés de l’original ;
- sauvegarde et région documentées.

### 17.2 Public

L’approbation d’une photo :

1. relit la sélection et le consentement ;
2. décode puis réencode dans un format sûr ;
3. supprime EXIF, GPS, commentaire et miniature embarquée ;
4. applique dimensions et poids publics ;
5. demande un texte alternatif ;
6. crée un nouvel objet dans le stockage public Strapi ;
7. lie ce média à un brouillon éditorial ;
8. conserve une référence de provenance privée inaccessible au public.

Le retrait supprime la projection et le dérivé public ; l’original privé suit
le choix de conservation du voyageur.

## 18. Retours terrain et modération

### 18.1 Retour privé

Chaque retour cible exactement un voyage et un chapitre. Une position ou une
portion de trace est facultative. Plusieurs retours restent possibles pour le
même couple.

Champs minimums :

- type : blocage, travaux/déviation, danger, difficulté/montée,
  eau/ravitaillement, variante, autre ;
- niveau : information, inconfort, difficile, dangereux, impraticable ;
- date observée préremplie et modifiable ;
- commentaire ;
- position/portion facultative ;
- photo facultative ;
- vélo, charge et sens lorsque pertinents.

La position précise n’entre jamais dans Strapi. La console équipe privée
l’affiche uniquement aux rôles habilités.

### 18.2 Promotion éditoriale

L’action « créer une info terrain » produit un brouillon Strapi nettoyé :

- `chapterKey` ;
- titre et texte rédigés par l’équipe ;
- zone publique volontairement arrondie si utile ;
- statut public `verified/analysing/resolved` ;
- date d’observation arrondie et date de mise à jour ;
- aucun identifiant de compte, commentaire brut ou média privé ;
- référence interne opaque pour retrait ou audit.

La publication reste une décision Strapi distincte.

### 18.3 Récits

Le voyageur choisit texte, nom public, photos et chapitres reconnus. L’équipe
peut approuver, refuser ou demander une correction. Une correction du texte ou
des médias après approbation repasse en revue.

Un récit multi-chapitres possède une projection publique unique et des
relations vers les chapitres choisis. La sélection doit être un sous-ensemble
des `TripChapterPassage.recognized` courants ou déclarés compatibles au moment
de la soumission. Le remplacement ultérieur d’un GPX officiel ne dépublie pas
automatiquement un récit déjà modéré ; il ouvre une alerte éditoriale si la
modification est matérielle. Cette tolérance historique ne s’applique pas au
signal récent.

## 19. Signal « parcouru récemment »

### 19.1 Unité et minimisation

L’unité de confidentialité est l’utilisateur distinct, pas le nombre de
traces. Un même utilisateur ne compte qu’une fois par chapitre et fenêtre,
même avec plusieurs voyages.

Le DTO public ne donne ni nombre exact, ni profil, ni date précise, ni sens, ni
durée, ni trace.

### 19.2 Politique initiale recommandée

- fenêtre glissante : 90 jours ;
- seuil : au moins 5 utilisateurs distincts consentants ;
- délai de sécurité : exclure les passages des 7 derniers jours ;
- date affichée : mois du cinquième passage distinct le plus récent, pas mois
  du dernier voyageur ;
- texte : « Des voyageurs ont parcouru ce chapitre récemment » ;
- absence : bloc omis avec aucune conclusion sur l’état du parcours.

Ces valeurs sont une recommandation à valider avec le DPO et un test de
réidentification. Elles sont versionnées dans `AggregationPolicy` et ne sont
pas modifiables silencieusement.

### 19.3 Recalcul

Suppression, retrait, déclassement d’une couverture ou changement de politique
recompose l’agrégat. Si le seuil n’est plus atteint, le bloc disparaît dans le
SLO public. Aucun ancien cache ne peut le maintenir au-delà de 60 secondes.

## 20. Strava, Garmin et Komoot

### 20.1 Strava

Strava est un lot postérieur au GPX. Le design doit prévoir :

- OAuth 2.0 avec `state`, scopes minimaux et vérification des scopes réellement
  accordés ;
- tokens d’accès courts et refresh token rotatif chiffré ;
- activité privée uniquement avec le scope explicitement requis ;
- import historique borné, paginé, annulable et soumis aux rate limits ;
- webhooks idempotents pour création, mise à jour, suppression et révocation ;
- réponse webhook en moins de deux secondes, traitement asynchrone ;
- aucun polling permanent ;
- suppression ou invalidation lorsque l’activité devient privée ou est
  supprimée selon le scope ;
- déconnexion appliquant l’endpoint de révocation courant ;
- revue Strava et capacité athlètes avant ouverture.

Le connecteur ne place jamais automatiquement une activité dans un voyage et
ne donne aucun consentement public implicite.

### 20.2 Garmin

Garmin Connect reste conditionné à l’acceptation du Garmin Connect Developer
Program, réservé à un usage professionnel et utilisant OAuth 2.0. Le produit
ne promet ni délai, ni métriques avant accès et contrat.

Le repli est l’import de fichier GPX, puis FIT lorsque son lot est qualifié.

### 20.3 Komoot

Aucune connexion de compte n’est annoncée. Un export GPX compatible peut être
importé comme n’importe quel fichier.

## 21. API et contrats

Les chemins sont indicatifs ; les invariants sont obligatoires.

### 21.1 API privée

- `POST /v1/uploads/intents` ;
- `POST /v1/traces/{id}/complete-upload` ;
- `GET /v1/traces` et `GET /v1/traces/{id}` ;
- `POST /v1/trips` ;
- `PUT /v1/trips/{id}/traces/{traceId}` et `DELETE` associé ;
- `GET /v1/trips/{id}/chapter-passages` ;
- `POST /v1/stories` et transitions de soumission/retrait ;
- `POST /v1/terrain-reports` ;
- `POST /v1/consents/{purpose}` et `DELETE` ;
- `POST /v1/exports` ;
- `DELETE /v1/account` ;
- callbacks OAuth et webhook fournisseurs.

Toutes les créations acceptent une clé d’idempotence. Les listes sont paginées.
Les erreurs utilisent des codes stables et n’incluent aucun secret.

### 21.2 API publique minimale

- `GET /v1/public/chapters/{chapterKey}/recent-passage`.

Réponse possible :

~~~json
{
  "visible": true,
  "label": "Des voyageurs ont parcouru ce chapitre récemment",
  "period": "2026-07",
  "policyVersion": "recent-passage-v1",
  "updatedAt": "2026-08-09T12:00:00Z"
}
~~~

Aucun identifiant, compteur exact ou géométrie n’est ajouté. Si le seuil n’est
pas atteint, la réponse est `visible: false` ou 404 selon l’ADR de cache.

Les récits et informations terrain publics sont lus depuis Strapi, pas depuis
l’API privée.

### 21.3 Contrat service–Strapi

Le service lit un manifeste officiel minimal avec token serveur :

- `chapterKey`, publication, slug ;
- `routeKey` et segments requis ;
- directions GPX, URL de média autorisée, empreinte et état ;
- version d’algorithme géographique.

La promotion écrit uniquement des brouillons publics nettoyés via un token
technique à portée minimale ou une commande d’équipe explicite. Aucun token
Strapi n’est exposé au navigateur.

## 22. Expérience utilisateur et accessibilité

- toutes les actions sont réalisables au clavier ;
- zones d’upload standard, libellées et compatibles lecteur d’écran ;
- progression asynchrone annoncée par `aria-live` sans rafraîchissement imposé ;
- statut de reconnaissance expliqué en texte, pas seulement par couleur ;
- ambiguïté de doublon résolue par un choix explicite ;
- aucun geste cartographique nécessaire pour soumettre un retour ;
- la position facultative peut être saisie sur une liste/portion accessible ;
- le carnet affiche clairement « privé » sur chaque surface ;
- les trois consentements ne sont ni précochés, ni regroupés ;
- le retrait est aussi accessible que l’activation ;
- erreurs de fichier indiquent quoi corriger sans exposer le contenu ;
- focus renvoyé vers le résumé après une action longue ;
- contraste, taille des cibles et texte alternatif suivent les règles du site.

## 23. Publication, rendu, cache et SEO

### 23.1 Surfaces privées

- `noindex, nofollow` ;
- aucune génération statique ;
- `Cache-Control: private, no-store` ;
- pas de données privées dans le HTML d’une route publique ;
- nettoyage de l’état client à la déconnexion ;
- URLs signées exclues des préchargements.

### 23.2 Pages chapitre

Les blocs publics sont indépendants et absents lorsque vides :

1. signal agrégé récent ;
2. carnets de voyageurs publiés ;
3. infos terrain publiées.

Le rendu essentiel est serveur. Une panne du service agrégé masque uniquement
le signal et produit une métrique ; elle ne transforme pas le chapitre en 404.
Une panne Strapi suit les gardes éditoriales existantes.

### 23.3 Cache et retrait

- projections Strapi : garde de publication commune et revalidation maximale
  60 secondes pour les contenus retirables par leur auteur ;
- signal récent : cache public maximal 60 secondes ;
- aucune URL média privée mise en cache publiquement ;
- un retrait crée un état de fermeture autoritatif qui prime sur une ancienne
  projection ;
- sitemap : récits seulement si une page canonique dédiée est décidée plus
  tard ; aucun récit n’est indexé automatiquement au MVP ;
- aucune route privée, callback ou endpoint de compte dans le sitemap.

## 24. Sécurité et observabilité

### 24.1 Menaces minimales

Le threat model du lot 0 couvre :

- IDOR entre voyageurs ;
- vol de session et CSRF ;
- fichier XML hostile, bombe de taille et épuisement CPU ;
- URL signée copiée ou journalisée ;
- fuite de géométrie par erreur, analytics ou support ;
- sur-fetch d’une projection Strapi ;
- réidentification par date/compteur récent ;
- token OAuth compromis ou rotation concurrente ;
- webhook falsifié, dupliqué, retardé ou réordonné ;
- publication d’un média privé non sélectionné ;
- suppression partielle entre DB, bucket, cache et Strapi ;
- employé trop privilégié ;
- sauvegarde contenant des données déjà supprimées.

### 24.2 Chiffrement et secrets

- TLS partout ;
- chiffrement des tokens tiers au niveau applicatif avec clé séparée de la DB ;
- rotation de clés et version de chiffrement ;
- secrets uniquement dans le gestionnaire de configuration de plateforme ;
- aucun secret `NEXT_PUBLIC_*` ;
- sauvegardes chiffrées et accès audité ;
- token Strapi de promotion distinct du token de lecture Next.

### 24.3 Métriques sans contenu

- profondeur et âge de la queue ;
- temps et mémoire de parsing/matching ;
- taux d’échec par code ;
- taux de doublons et ambiguïtés ;
- durée de suppression et de retrait public ;
- nombre agrégé de consentements actifs, sans identifiant ;
- erreurs fournisseur et consommation des rate limits ;
- échecs de synchronisation des sources officielles.

Les logs utilisent des IDs internes non réversibles et une durée bornée. Une
interface support requiert une action explicite et journalisée pour accéder au
contenu privé.

## 25. Migration et reprise

### 25.1 Avant pilote

1. ajouter et migrer `Chapter.chapterKey` dans le CMS ;
2. produire le manifeste des 20 GPX officiels et leurs SHA-256 ;
3. figer un `ReferenceRoute` publié pour la boucle ;
4. créer base, bucket et secrets privés sans données réelles ;
5. créer le fournisseur d’identité et les rôles équipe ;
6. charger uniquement des comptes et traces de test consentis ;
7. qualifier matching, suppression, export et incident ;
8. réaliser la revue DPO/sécurité ;
9. ouvrir le pilote par liste contrôlée et coupe-circuit.

### 25.2 Pas de migration de données voyageur existantes

Aucune donnée voyageur n’existe dans les dépôts. Les témoignages Strapi actuels
ne sont pas convertis en récits reconnus : ils restent un contenu éditorial
legacy sans prétendre avoir une preuve GPS.

### 25.3 Évolution des GPX

Le remplacement d’un média crée un nouveau snapshot. Les anciens objets restent
lisibles pour audit privé tant que la trace existe. Un job de recalcul
progressif utilise un curseur et ne bloque pas les pages publiques.

## 26. Déploiement et retour arrière

### 26.1 Ordre

1. CMS : `chapterKey` et modèles publics, sans permission publique nouvelle ;
2. service privé : DB, migrations, bucket, API fermée et worker arrêté ;
3. frontend : UI masquée par feature flag ;
4. worker : corpus de test puis pilote ;
5. équipe : console et promotion en brouillon ;
6. activation privée du pilote ;
7. activation séparée des récits, retours et agrégats publics ;
8. Strava dans un déploiement ultérieur.

Chaque étape possède un coupe-circuit indépendant :

- création de compte ;
- upload ;
- matching ;
- promotion de récit ;
- retours terrain ;
- signal agrégé ;
- chaque connecteur tiers.

### 26.2 Compatibilité

- le frontend reste compatible avec service absent ou fermé ;
- le CMS reste compatible avec aucun récit/info terrain ;
- les champs CMS sont additifs avant d’être obligatoires ;
- les jobs savent lire au moins la version précédente de leurs payloads pendant
  un déploiement ;
- aucune migration destructive dans la première version.

### 26.3 Retour arrière

- fermer les flags publics et uploads ;
- laisser les données privées lisibles au propriétaire ;
- arrêter le worker sans perdre les jobs ;
- revenir au frontend précédent ;
- ne jamais restaurer une sauvegarde par-dessus des suppressions sans rejouer
  le registre de purge ;
- dépublier les projections concernées ;
- documenter les objets orphelins et les nettoyer par commande séparée.

## 27. Lots de livraison

| Lot | Contenu | Livrable vérifiable |
|---|---|---|
| 0 — Cadrage | ADR, threat model, DPO, clé chapitre, corpus, seuils, identité, stockage, queue | décisions bloquantes signées et corpus versionné |
| 1 — Traces | compte, upload GPX, bibliothèque, déduplication, matching | une trace privée est reconnue sans voyage |
| 2 — Voyages | association unique, agrégation, métriques, export/suppression | dix traces peuvent former un voyage sans double compte |
| 3 — Terrain | formulaire privé, console, états et audit | un retour partiel est trié sans apparaître dans Strapi |
| 4 — Public volontaire | récit, médias dérivés, modération, agrégat k-anonyme | retrait public dans le SLO et aucune géométrie exposée |
| 5 — Strava | OAuth, historique borné, webhooks, révocation | une activité autorisée devient trace, jamais voyage automatique |
| 6 — FIT/Garmin | parseur FIT puis étude/accès Garmin | parité de matching et connecteur seulement si approuvé |
| 7 — Temps pris | règles de boucle et célébration privée/volontaire | aucune pause artificielle transformée en record |

Chaque lot possède ses propres PR de production. Le lot 0 peut conclure qu’un
lot doit être divisé davantage.

## 28. Arbitrages techniques à valider

| Arbitrage | Constat | Recommandation | Décision attendue / bloque |
|---|---|---|---|
| Frontière de données | Strapi est éditorial et public | service voyageur séparé | architecture, avant lot 1 |
| Dépôt/déployable | deux dépôts actuels ne portent pas ce domaine | nouveau dépôt API + worker | propriétaire technique, lot 0 |
| Identité | aucune auth voyageur | OIDC managé, pas mot de passe GTHF | produit/sécurité/achat, lot 1 |
| Clé chapitre | slug/order/documentId insuffisants | `chapterKey` immuable | CMS, lot 0 |
| Stockage privé | bucket actuel public | bucket Cellar/add-on distinct ou fournisseur équivalent qualifié | infra/DPO, lot 1 |
| Queue | aucun worker ; cron dupliqué par scaler | table jobs PostgreSQL + worker séparé au MVP | architecture/ops, lot 1 |
| Matching | aucune trace voyageur réelle dans le dépôt | corpus versionné puis politique chiffrée | produit/data, lot 1 |
| Dédoublonnage | multi-source attendu | une trace canonique, une appartenance voyage | produit, lot 2 |
| Boucle complète | ordre et fenêtre non définis | pas de badge MVP ; tester fenêtre 90 jours | produit/data, lot 7 |
| Signal récent | risque de réidentification | k=5, 90 jours, délai 7 jours, mois du k-ième | DPO/produit, lot 4 |
| Conservation | aucune politique existante | tableau section 16 comme base | DPO/sécurité, avant pilote |
| Modération | Strapi ne doit pas voir le brut | console privée puis brouillon Strapi nettoyé | équipe éditoriale, lot 3 |
| Médias publics | changement d’ACL dangereux | copie réencodée sans EXIF | sécurité/éditorial, lot 4 |
| FIT | dépendances absentes | après GPX et corpus | technique, lot 6 |
| Strava | capacité et rate limits soumis à revue | webhooks + import borné après approbation | partenariat/technique, lot 5 |
| Garmin | programme partenaire | ne pas promettre avant acceptation | partenariat, lot 6 |
| Analytics | géométrie très sensible | événements minimaux sans contenu | produit/data, lot 1 |
| Récit indexable | retrait auteur et contenu mince | aucune page indexable au MVP | SEO/éditorial, lot 4 |
| SLO de retrait | caches actuels jusqu’à 300 s | garde 60 s, disparition cible 15 min | ops/produit, lot 4 |

Les décisions recommandées peuvent être acceptées dans la revue de ce PRD. Un
écart nécessite un ADR qui démontre un niveau de confidentialité et de
réversibilité au moins équivalent.

## 29. Critères d’acceptation

### 29.1 Architecture

- aucune table voyageur, trace, token ou retour brut n’est créée dans Strapi ;
- aucune donnée privée n’utilise le bucket éditorial public ;
- l’API privée refuse une requête authentifiée visant un objet d’un autre
  compte ;
- Next ne contient aucun secret tiers dans le bundle client ;
- le worker peut être arrêté et repris sans perte ni doublon ;
- le service fermé ne rend pas les pages chapitre indisponibles.

### 29.2 Import et bibliothèque

- un utilisateur importe plusieurs GPX indépendants ;
- un fichier hors limite est refusé avant calcul lourd ;
- une trace est visible avec son état et son erreur éventuelle ;
- zéro, un ou plusieurs chapitres peuvent être reconnus avant tout voyage ;
- une trace ignorée n’est pas reproposée en boucle ;
- un doublon certain ne double aucune métrique ;
- un doublon probable demande confirmation ;
- la trace reste privée dans tous les cas.

### 29.3 Reconnaissance

- chaque résultat conserve `chapterKey`, direction, SHA-256 officiel,
  intervalles, couverture, confiance, statut, date et version d’algorithme ;
- une intersection ponctuelle ne produit pas `recognized` ;
- AB et BA sont testés comme sources distinctes ;
- deux traces quotidiennes peuvent reconnaître ensemble un chapitre ;
- retirer une trace recalcule le passage ;
- un changement de GPX ne réécrit pas l’historique et déclenche un nouveau
  calcul ;
- une couverture `stale` ne contribue pas au signal récent.

### 29.4 Voyages et temps

- une trace ne compte que dans un voyage actif ;
- temps en mouvement, durée d’activité, jours à vélo, durée observée et durée
  déclarée restent distincts ;
- les jours utilisent le fuseau du voyage ;
- une pause de quinze jours ne crée pas quinze jours à vélo ;
- plusieurs années ne produisent pas une boucle reconnue ;
- aucun classement public n’existe au MVP.

### 29.5 Publication

- récit, photo et contribution récente nécessitent chacun une action explicite ;
- les chapitres publiables sont un sous-ensemble des passages reconnus ;
- une photo publique est un dérivé sans EXIF ;
- aucune trace, position, heure ou date précise n’est publique ;
- une correction post-approbation repasse en revue ;
- le retrait masque la projection dans le SLO ;
- un témoignage legacy ne devient pas automatiquement récit reconnu.

### 29.6 Signal agrégé

- un utilisateur compte au plus une fois par chapitre/fenêtre ;
- le bloc reste absent sous le seuil ;
- le DTO ne contient aucun compteur exact ;
- le retrait d’un consentement recompose l’agrégat ;
- le mois affiché ne révèle pas le dernier passage individuel ;
- l’absence du bloc n’affiche aucun message d’impraticabilité.

### 29.7 Retours terrain

- une trace partielle permet un retour ;
- chaque retour vise un voyage et un chapitre ;
- plusieurs retours restent possibles ;
- le brut et la position restent hors Strapi ;
- la promotion crée un brouillon éditorial nettoyé ;
- publier l’info terrain exige une décision éditoriale distincte ;
- le retrait d’une trace n’efface pas silencieusement une décision sécurité
  déjà éditorialisée : l’équipe reçoit un état à traiter.

### 29.8 Droits et suppression

- l’utilisateur exporte ses données ;
- il supprime une trace sans supprimer son compte ;
- il supprime un voyage sans publier d’information ;
- déconnecter Strava révoque et supprime les tokens ;
- supprimer le compte révoque immédiatement les sessions ;
- la purge couvre DB, bucket, dérivés, projections et agrégats ;
- une restauration rejoue les tombstones de suppression ;
- toutes les étapes sont auditables sans conserver la géométrie dans l’audit.

### 29.9 Connecteurs

- le MVP fonctionne sans connecteur ;
- Strava vérifie les scopes réellement accordés ;
- un webhook dupliqué est idempotent ;
- un webhook est acquitté rapidement puis traité en job ;
- une révocation coupe toute synchronisation future ;
- les rate limits sont suivis et l’import historique ralentit sans perte ;
- Garmin n’est activé qu’après approbation partenaire.

## 30. Plan de validation pour les agents de production

### 30.1 Tests unitaires

- parser GPX hostile et bornes ;
- hashes bruts et normalisés ;
- projection sur linéaire, union d’intervalles et direction ;
- déduplication certaine/probable ;
- agrégation multi-traces ;
- jours locaux et changements d’heure ;
- états et idempotence ;
- politique k-anonyme ;
- transitions de consentement et suppression ;
- sanitisation et suppression EXIF.

### 30.2 Tests d’intégration

- upload direct signé ;
- isolation entre deux comptes ;
- job concurrent et reprise après crash ;
- rotation OAuth concurrente ;
- webhook dupliqué/réordonné ;
- lecture Strapi d’un nouveau snapshot ;
- promotion vers brouillon, publication puis retrait ;
- purge DB + objet + cache ;
- panne Strapi, bucket, DB, identité et fournisseur tiers ;
- limite de pool et backpressure.

### 30.3 Corpus géographique

Le corpus versionné conserve données synthétiques dans Git et données réelles
pseudonymisées dans un stockage privé de recette. Un manifeste donne pour
chaque trace le résultat attendu sans publier la géométrie.

Mesures obligatoires :

- précision et rappel par chapitre/direction ;
- taux d’ambiguïté ;
- temps chaud/froid ;
- mémoire maximale ;
- influence du nombre de points ;
- erreurs sur voies parallèles ;
- effet d’un changement de GPX ;
- résultats au niveau trace et voyage.

### 30.4 Recette sécurité et confidentialité

- matrice d’autorisation complète ;
- scan des bundles, logs et réponses pour secrets/coordonnées ;
- tentative d’accès aux objets signés d’un autre compte ;
- retrait sous caches chauds ;
- suppression puis restauration contrôlée ;
- test de réidentification de l’agrégat ;
- revue des rôles équipe ;
- exercice de révocation de clé et de token fournisseur.

### 30.5 Mesures de plateforme

- taille réelle des GPX et photos pilotes ;
- débit upload direct ;
- CPU/mémoire du worker sur le plus gros fichier accepté ;
- profondeur maximale de queue ;
- connexions PostgreSQL ;
- coût objet, DB, identité et egress ;
- comportement pendant un déploiement zéro-downtime ;
- SLO de retrait et suppression.

## 31. Fichiers et zones probablement concernés

### `gthdf-frontend`

- nouvelles routes privées sous `app/` ;
- Route Handlers/BFF sous `app/api/` ;
- client serveur du domaine voyageur sous `lib/` ;
- composants upload, bibliothèque, voyage, consentement et retrait ;
- page chapitre pour les trois blocs publics ;
- `app/sitemap.ts` pour garantir l’exclusion ;
- `proxy.ts` et configuration sécurité/session ;
- variables d’environnement serveur ;
- tests unitaires, composants et intégration.

### `gthdf-cms`

- `src/api/chapter/content-types/chapter/schema.json` pour `chapterKey` ;
- modèles publics de récit et information terrain ;
- relations chapitre et médias publics ;
- validations de publication et garde de cohérence dans `src/index.ts` ou
  domaine dédié ;
- token/rôle technique de promotion à portée minimale ;
- migration et recette ;
- aucun modèle privé voyageur.

### Nouveau domaine voyageur

- API, worker et migrations ;
- schéma DB privé ;
- adaptateur objet privé ;
- adaptateur OIDC ;
- clients Strapi/Strava futurs ;
- matching géographique ;
- jobs, audit, export et suppression ;
- console équipe privée ou API correspondante ;
- tests de sécurité et corpus.

Le partage du noyau géographique PRD 03/04 nécessite un choix explicite :
extraire un package versionné ou porter une copie serveur avec fixtures
communes. Le service ne doit pas appeler les endpoints publics du Builder.

## 32. Dépendances avec les autres PRD

### PRD 01

La ville n’est pas une identité de couverture. Les pages hubs peuvent plus tard
afficher des récits liés à leurs chapitres, mais le MVP cible le chapitre.

### PRD 02

`displayOrder` reste un ordre d’affichage. L’index de proximité simplifié ne
sert ni de preuve, ni de géométrie de matching.

### PRD 03

Le matching reprend les invariants de parsing, SHA-256, direction distincte,
géométrie source et algorithme versionné. Il ne modifie pas le Builder, ne
persiste rien par son endpoint et ne publie jamais un GPX privé.

### PRD 04

`ReferenceRoute` et ses segments donnent la définition technique de la boucle.
Les snapshots et empreintes sont réutilisés. Les itinéraires publics du
catalogue ne deviennent pas des traces voyageur.

### PRD 05 CMS

La PR 19 DataMaster concerne un rôle d’administration du catalogue. Elle ne
doit pas recevoir par défaut l’accès aux traces ou retours privés. Les rôles
équipe du présent PRD appartiennent au domaine privé et font l’objet d’une
matrice séparée.

## 33. Références externes vérifiées le 9 août 2026

- [CNIL — Géolocalisation et applications mobiles](https://www.cnil.fr/fr/geolocalisation-applications-mobiles-quelles-regles) :
  minimisation, maîtrise, accès, effacement, opposition et retrait ;
- [Strava — Authentication](https://developers.strava.com/docs/authentication/) :
  OAuth 2.0, scopes réellement accordés, tokens courts, refresh rotatif et
  révocation ;
- [Strava — Webhooks](https://developers.strava.com/docs/webhooks/) :
  événements activité/révocation, accusé en moins de deux secondes et
  traitement asynchrone ;
- [Strava — Rate limits](https://developers.strava.com/docs/rate-limits/) :
  quotas courts/journaliers, capacité athlètes et revue de l’application ;
- [Garmin Connect Developer Program — FAQ](https://developer.garmin.com/gc-developer-program/program-faq/) :
  accès entreprise sur demande et OAuth 2.0 ;
- [Clever Cloud — Cellar](https://www.clever-cloud.com/developers/doc/addons/cellar/) :
  stockage S3, URLs pré-signées et versioning ;
- [Clever Cloud — CRON](https://www.clever-cloud.com/developers/doc/administrate/cron/) :
  exécution par scaler et nécessité de déduplication ;
- [Clever Cloud — File System Buckets](https://www.clever-cloud.com/developers/doc/addons/fs-bucket/) :
  disque applicatif non durable entre redéploiements.

Ces références doivent être revérifiées au lancement des lots Strava, Garmin
et infrastructure.

## 34. Décisions prises et questions réellement restantes

### Décisions prises par ce PRD

- données privées séparées de Strapi ;
- Strapi source de vérité éditoriale et des GPX officiels ;
- Next comme expérience web, pas comme stockage durable ;
- worker asynchrone obligatoire ;
- GPX seul au premier lot ;
- AB et BA analysés séparément ;
- SHA-256 officiel et version d’algorithme conservés ;
- une trace canonique dans au plus un voyage actif ;
- consentements distincts et versionnés ;
- projection publique par copie nettoyée ;
- aucune page récit indexable au MVP ;
- aucun compteur public exact ;
- aucune boucle publique ni classement au MVP ;
- aucun connecteur obligatoire ;
- `chapterKey` immuable à ajouter ;
- retrait et suppression conçus avant le pilote.

### Questions bloquantes du lot 0

1. fournisseur d’identité et responsabilités contractuelles ;
2. dépôt, langage final et ownership du domaine voyageur ;
3. offre, région, sauvegarde et politique du stockage privé ;
4. queue PostgreSQL ou broker dédié après mesure ;
5. seuils de matching issus du corpus ;
6. durées de conservation et besoin d’analyse d’impact ;
7. validation du seuil k=5, de la fenêtre 90 jours et du délai 7 jours ;
8. règle finale de boucle complète ;
9. rôles et personnes habilitées à voir les retours précis ;
10. coût et taille du pilote ;
11. forme du package géographique partagé ;
12. SLO définitifs de retrait, purge et reprise.

## 35. Définition de terminé

Le lot initial est terminé lorsqu’un voyageur peut créer un compte, importer
un GPX dans un stockage privé, obtenir une reconnaissance reproductible,
conserver la trace dans sa bibliothèque puis l’associer à un voyage. Il peut
exporter et supprimer ses données. Aucun élément n’est public sans action
distincte.

Le périmètre public est terminé lorsqu’un récit sélectionné et modéré apparaît
uniquement sur les chapitres reconnus, qu’une photo publique ne contient plus
de métadonnées privées, qu’un retour brut devient au besoin une information
éditoriale séparée et que le signal récent reste absent sous son seuil. Le
retrait ferme toutes les surfaces dans le SLO.

Le système reste un carnet de slow travel et un canal de connaissance terrain,
pas un réseau social ni un classement.
