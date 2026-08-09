# PRD 06 — Carnets vivants, traces reconnues et informations terrain

**Version :** 0.8\
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

Le principe de confidentialité des photos est conservé pour une extension
future, mais les photos et tout bucket privé sont explicitement exclus du MVP.

L’audit conduit à recommander une séparation ferme entre deux domaines :

- **Strapi reste le CMS éditorial public et l'outil de modération des récits** :
  chapitres, GPX officiels, récits candidats puis publiés, informations terrain
  éditorialisées et médias publics ;
- **un domaine voyageur privé distinct** porte les comptes, sessions, traces,
  voyages, géométries, consentements, tokens tiers, reconnaissances, agrégats
  et signalements bruts ;
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
- lot 1 : compte et session par email/mot de passe ou Strava, import GPX
  privé, synchronisation Strava facultative, bibliothèque et reconnaissance ;
- lot 2 : voyages, agrégation multi-traces et badge de boucle complète ;
- lot 3 : retours terrain privés et triage ;
- lot 4 : récits volontaires créés et modérés dans Strapi, affichage sur les
  chapitres et signal agrégé après la dernière barrière hivernale ;
- lot 5 : FIT, après validation des chaînes GPX et Strava ;
- lot 6 : Garmin seulement après validation du programme partenaire ;
- lot 7 : éventuelle célébration publique « Le temps pris », sans classement
  au MVP.

Le PRD fixe les frontières, contrats, états et garde-fous. Le corridor de
50 mètres et le seuil de reconnaissance de 80 % sont des décisions produit. Le
lot 0 doit les implémenter et les vérifier sur corpus, puis trancher les autres
paramètres géographiques, la politique de conservation et la qualification de
l’infrastructure privée. Le canal transactionnel du MVP est le relais SMTP
Brevo, sans lui déléguer l'identité ni les comptes. Ces arbitrages
sont explicités en section 28 avec recommandation, responsable et lot bloqué.

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
départ ou horaires. Il doit ensuite laisser le voyageur choisir
séparément s’il souhaite raconter son voyage, aider l’équipe ou contribuer à
un indicateur anonyme.

## 4. Objectifs

- créer un compte par email/mot de passe ou par Strava sans fournisseur
  d'identité SaaS supplémentaire ;
- importer et conserver des traces privées indépendamment d’un voyage ;
- reconnaître zéro, un ou plusieurs chapitres à partir d’une trace ;
- agréger plusieurs traces au sein d’un voyage sans double comptage ;
- conserver une preuve reproductible liée à la version exacte du GPX
  officiel ;
- distinguer temps en mouvement, durée d’activité, jours à vélo et durée du
  voyage ;
- proposer des retours terrain localisés et privés à l’équipe ;
- publier des récits textuels sélectionnés puis modérés dans Strapi ;
- afficher un signal récent uniquement lorsque l’anonymat collectif est
  défendable ;
- permettre export, retrait de consentement, suppression et révocation ;
- livrer Strava dans le MVP sans rendre le carnet inutilisable lors d’une panne
  du fournisseur ;
- préparer FIT et Garmin sans rendre le MVP dépendant de Garmin ou Komoot ;
- rendre chaque traitement idempotent, observable, reprenable et testable.

## 5. Non-objectifs

Le MVP ne comprend pas :

- réseau social, abonnements, fil, commentaires publics libres ou messagerie ;
- publication automatique d’une trace, date ou activité ;
- ajout de photos aux récits ou retours terrain et création d'un bucket privé ;
- suivi GPS continu ou permission de localisation en arrière-plan ;
- carte publique d’une trace personnelle ;
- synchronisation Komoot ;
- intégration Garmin promise avant approbation partenaire ;
- classement public, record ou récompense de lenteur ;
- recommandation de sécurité automatique à partir d’un seul passage ;
- réécriture du GPX Builder ou appel de ses endpoints publics ;
- utilisation de l’index simplifié du PRD 02 comme preuve géographique ;
- stockage d'une donnée voyageur privée dans la base ou le bucket public du
  CMS éditorial ;
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
- aucun compte voyageur, login, session applicative, fournisseur d'identité,
  envoi d'email transactionnel, base applicative, ORM, route d’upload privé,
  webhook ou file de travaux ;
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
- les GPX/FIT voyageurs, bornés à 25 Mio, sont stockés dans le PostgreSQL
  privé en `bytea` et ne nécessitent pas Cellar ;
- les photos sont hors MVP : aucun bucket privé n'est créé ; le Cellar
  éditorial public existant reste réservé aux médias déjà publics du CMS ;
- un cron Clever est exécuté sur chaque scaler et peut se chevaucher pendant
  un déploiement ; il ne remplace donc pas une queue durable sans verrouillage ;
- l'add-on PostgreSQL permet de gérer des schémas, mais pas de créer librement
  une seconde base ou un second utilisateur applicatif en écriture ;
- relier deux applications au même add-on leur injecterait les mêmes
  identifiants propriétaire : deux schémas sépareraient les tables, pas les
  autorisations ;
- aucun mécanisme de traitement privé n’est aujourd’hui déployé.

## 7. Principes produit et sécurité non négociables

### 7.1 Privé par défaut

Compte, voyage, trace, géométrie, timestamps, notes, tokens tiers, résultats
détaillés et retours terrain restent privés. Les futurs médias voyageurs
suivront la même règle. Une reconnaissance ne crée aucune projection publique.

### 7.2 Finalités et consentements séparés

Trois choix indépendants sont conservés avec leur version, date, preuve et
retrait :

- proposer un récit public ;
- contribuer au signal agrégé « parcouru récemment » ;
- transmettre un retour privé à l’équipe.

Le consentement au signal agrégé n’autorise ni récit, ni communication
marketing. Le retrait n’efface pas automatiquement les données
nécessaires au carnet privé ; il retire la contribution concernée.

### 7.3 Preuve géographique privée

Une publication peut être proposée seulement si le voyage possède un passage
reconnu sur chaque chapitre sélectionné. Le public ne reçoit jamais la
géométrie preuve.

### 7.4 Projection, jamais changement d’ACL

Soumettre un récit crée dans Strapi un contenu textuel candidat non publié. Le
système ne rend jamais public une trace ou un voyage en changeant son ACL. Une
future extension photo devra créer un dérivé nettoyé au lieu de publier
l'original privé.

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
  V --> D[(PostgreSQL privé + GPX/FIT bytea)]
  V --> Q[(Jobs durables)]
  W[Worker de reconnaissance] --> Q
  W --> D
  W -->|lecture GPX officiels et empreintes| S[Strapi éditorial]
  M[Console terrain privée] --> V
  E[Équipe éditoriale] -->|modération des récits| S
  V -->|récit candidat et chapitres| S
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
- modèle de récit candidat puis publié, relié à un ou plusieurs chapitres ;
- file, états et décisions de modération éditoriale des récits ;
- modèle public d'information terrain ;
- récits textuels au MVP ; leurs médias sont explicitement différés ;
- Draft & Publish, aperçu et SEO ;
- aucun modèle de trace, voyage, consentement, token OAuth ou retour brut.

**Service voyageur privé**

- compte interne accessible par email/mot de passe et/ou identité Strava ;
- autorisations par propriétaire et rôles équipe ;
- métadonnées, consentements, déduplication, voyages et états ;
- stockage des octets GPX/FIT dans PostgreSQL et accès sans URL publique ;
- aucun stockage objet privé au MVP ;
- API idempotente et journal d’audit ;
- vérification des chapitres reconnus avant création d'un récit candidat ;
- lien opaque entre consentement privé et document Strapi pour le retrait ;
- agrégats publics sans PII ;
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
- préparerait prématurément un stockage privé de photos hors périmètre MVP ;
- exposerait le CMS et ses plugins à un trafic d’upload et de calcul privé ;
- partagerait le petit pool PostgreSQL avec le matching ;
- rendrait les droits, suppressions et tokens OAuth plus difficiles à auditer ;
- augmenterait le risque qu’un `populate` ou une permission publie trop.

Cette option ne peut être retenue que si un ADR démontre une isolation
équivalente : stockage privé distinct, routes fail-closed, worker séparé, tests
d'autorisation systématiques et impossibilité de sur-fetch public. Sur Clever
Cloud, un second schéma du même add-on n'est pas une frontière d'autorisation,
car le rôle propriétaire peut gérer tous les schémas. La recommandation reste
un service séparé avec son propre add-on PostgreSQL.

### 8.4 Forme de déploiement proposée

Un dépôt TypeScript/Node distinct contient deux entrypoints :

- API privée ;
- worker asynchrone.

Ils sont déployés comme deux applications Clever Cloud séparées et reliés au
même **nouvel add-on PostgreSQL privé**, distinct de celui de Strapi. Cet add-on
porte les données voyageurs, les octets GPX/FIT en `bytea` et une table de
jobs durable ; Strapi n'en reçoit pas les identifiants. Les blobs sont isolés
dans une table un-à-un pour que les requêtes de bibliothèque ne les chargent
jamais implicitement. Les échanges récit–CMS passent par API, jamais par
jointure SQL.

Le lot 0 dimensionne stockage, sauvegardes et restauration à partir du corpus
pilote. Il doit comparer la file PostgreSQL à un broker dédié. Pour le MVP,
PostgreSQL est recommandé afin de limiter l’infrastructure, à condition
d’utiliser verrous courts, `SKIP LOCKED` ou mécanisme équivalent, idempotency
keys et métriques de retard.

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
| `TravelerAccount` | ID opaque interne, état, locale, fuseau préféré, dates de création/suspension/suppression ; indépendant de tout moyen de connexion |
| `PasswordCredential` | compte, email canonique unique et vérifié, hash Argon2id au format PHC, dates de création/changement et état ; jamais le mot de passe |
| `OneTimeAuthToken` | compte, finalité `verify_email/password_reset`, hash du token, expiration, usage unique et date de consommation |
| `ExternalIdentity` | compte, fournisseur `strava`, sujet externe égal à `athlete.id`, état et dates ; unicité fournisseur + sujet |
| `Trace` | propriétaire, état, hash brut, hash normalisé par propriétaire, bornes temporelles, fuseau source, métriques, format, suppression ; aucune sélection implicite des octets |
| `TracePayload` | relation un-à-un avec la trace, octets GPX/FIT bruts en `bytea`, taille, MIME contrôlé et date de purge ; plafond 25 Mio |
| `TraceSource` | trace canonique, type `file/strava/garmin`, identifiant externe, scopes/provenance ; unicité propriétaire + source + identifiant |
| `Trip` | propriétaire, titre, fuseau IANA, dates observées et éventuellement déclarées, notes privées, état |
| `TripTrace` | association éditable, ordre, date d’ajout ; une trace appartient au maximum à un voyage actif |
| `OfficialRouteSnapshot` | `chapterKey`, direction, SHA-256, métriques source, version du parseur |
| `TraceChapterCoverage` | trace, snapshot, intervalles de chaînage couverts, ratio, direction, confiance, statut, version d’algorithme, rapport borné |
| `TripChapterPassage` | voyage, chapitre, union des couvertures canoniques, statut, métriques et versions contributrices |
| `TravelerRouteProgress` | propriétaire, parcours de référence, union des passages reconnus de tous ses voyages, chapitres couverts, badge, nombre de voyages et jours à vélo |
| `ConsentEvent` | propriétaire, finalité, `granted/withdrawn`, version de notice, horodatage, source de preuve |
| `OAuthConnection` | fournisseur, identifiant externe, scopes accordés, tokens chiffrés, expiration, révocation, dernier curseur |
| `StoryPublicationLink` | voyage, consentement, `documentId` Strapi opaque, version soumise, chapitres reconnus autorisés, état de retrait ; aucun corps éditorial |
| `TerrainReport` | voyage, chapitre, passage, type, niveau, date observée, commentaire, position facultative et statut interne ; aucune photo au MVP |
| `TerrainModerationDecision` | retour terrain, acteur équipe, décision, motif, dates et référence de promotion éditoriale |
| `RecentPassageContribution` | propriétaire, passage reconnu, finalité consentie, barrière hivernale et état d’éligibilité |
| `WinterFreshnessBarrier` | portée globale ou chapitre, instant de coupure, libellé de saison, état, acteur et version |
| `ExportArchive` | propriétaire, état, archive chiffrée en `bytea`, taille, expiration courte, nombre de téléchargements et purge |
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

### 11.2 Récit Strapi

Le contenu éditorial et son workflow vivent dans Strapi :
`draft → submitted → under_review → changes_requested → approved → published`.

Sorties : `rejected`, `withdrawal_pending`, `withdrawn`, `unpublished_by_team`.
`Draft & Publish` contrôle la visibilité publique ; un champ de workflow
distinct conserve l'état de modération. Le domaine privé conserve seulement le
lien vers le `documentId`, la preuve de consentement et l'état de retrait.

Un récit retiré échoue fermé : Strapi le dépublie d'abord puis les pages
chapitre sont revalidées. Aucun média voyageur n'est à purger au MVP.

### 11.3 Retour terrain

`new → triage → analysing → verified → resolved`, avec sorties
`not_retained` et `duplicate`.

`verified` ne publie pas le retour brut. Il autorise la création d’une
`TerrainInfo` éditoriale distincte dans Strapi.

## 12. Import GPX et sécurité des fichiers

### 12.1 Flux

1. le navigateur ouvre un upload authentifié vers l'API privée ;
2. l'API vérifie propriétaire, quota, `Content-Length` lorsqu'il existe et
   limite de débit avant de lire le corps ;
3. elle reçoit le flux avec une limite dure, calcule le hash et contrôle le
   format sans écrire sur le disque local ;
4. elle crée `Trace` et `TracePayload` en quarantaine dans le PostgreSQL
   privé ; les octets bruts sont stockés en `bytea` ;
5. le worker lit le payload, parse et normalise ;
6. le payload devient une trace exploitable seulement après validation ;
7. les erreurs affichent un message utile sans journaliser le contenu.

### 12.2 Garde-fous initiaux

Le lot 0 doit mesurer un corpus avant de figer les bornes. La première
implémentation ne peut toutefois pas être non bornée :

- GPX et Strava au lot 1 ;
- taille maximale recommandée : 25 Mio, à confirmer par corpus ;
- nombre maximal recommandé : 500 000 points ;
- XML sans DTD ni entité externe ;
- nombre de `trk` et `trkseg` borné ;
- coordonnées finies et dans WGS84 ;
- timestamps invalides isolés, jamais interprétés silencieusement ;
- temps CPU, mémoire et taille de rapport bornés ;
- hash calculé pendant la réception ;
- nom de fichier utilisateur conservé au plus comme métadonnée nettoyée, jamais
  comme identifiant ni chemin ;
- `TracePayload` exclu par défaut de toutes les requêtes de liste ;
- quota par compte, concurrence d'upload bornée et limitation de débit ;
- évaluation du besoin antivirus séparée pour GPX/FIT.

Un dépassement produit `rejected_limit` avec la limite concernée. Il ne lance
pas un job indéfini.

### 12.3 FIT

FIT n’est pas un « GPX dégradé ». Son lot exige :

- bibliothèque maintenue et audit de licence/sécurité ;
- conservation des timestamps, pauses, capteurs utiles et fuseaux ;
- fixtures Garmin/Wahoo réelles et synthétiques ;
- parité des métriques nécessaires au matching ;
- limites binaires et détection de corruption.

FIT entre au lot 5 seulement après validation des chaînes GPX et Strava.

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
10. agréger ensuite au niveau du voyage puis de la progression du compte.

Le ratio se calcule en mètres de parcours officiel couverts, pas en proportion
de points. Le rééchantillonnage interne ne remplace pas la géométrie source
dans l’audit.

### 13.3 Paramètres versionnés

Un `MatchingPolicy` immuable conserve :

- `corridorMetres = 50` ;
- `recognizedCoverageRatio = 0.80` ;
- taille des intervalles ou pas de rééchantillonnage ;
- couverture minimale utile pour le statut `partial` ;
- règles de projection des coupures et points aberrants ;
- direction observée, sans en faire une contrainte de performance ;
- qualité temporelle utilisée pour la fraîcheur et les métriques, pas pour la
  reconnaissance géométrique ;
- version parseur et algorithme ;
- hash du corpus de qualification.

Les deux premières valeurs sont fixées par décision produit :

- un point ou segment contribue seulement lorsqu’il se trouve à 50 mètres ou
  moins du GPX officiel AB ou BA correspondant ;
- une trace reconnaît un chapitre lorsque l’union des chaînages ainsi couverts
  atteint au moins 80 % du linéaire officiel ;
- la même règle de 80 % s’applique à l’union des traces d’un voyage et à la
  progression multi-voyages du compte ;
- les 20 % non couverts tolèrent coupures GPS, petits détours et départs ou
  arrivées imparfaits ;
- aucune vitesse minimale, continuité parfaite, durée maximale ou séquence
  chronométrée n’est exigée.

Traverser ponctuellement le chapitre reste insuffisant : le seuil de 80 % doit
être atteint. Le lot 0 ne peut pas durcir ces deux valeurs ; il doit les
implémenter puis réunir un corpus pour qualifier les autres paramètres :

- traces complètes propres ;
- traces quotidiennes qui couvrent ensemble un chapitre ;
- traces partielles utiles à un signalement ;
- pistes parallèles proches mais hors GTHF ;
- demi-tours et boucles locales ;
- points clairsemés, tunnels et coupures ;
- AB et BA réellement différents ;
- fichiers sans temps et temps incohérents ;
- changement d’un GPX officiel.

Le rapport du lot 0 mesure les faux positifs, faux négatifs et cas manuels
avec le corridor de 50 mètres et le seuil de 80 %. Si le corpus révèle un cas
dangereux, le rapport propose une règle complémentaire ciblée ; il ne remplace
pas silencieusement ces seuils par une logique de performance.

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

### 14.3 Progression de boucle et badge MVP

Le badge privé « Boucle GTHF complétée » fait partie du MVP. Il appartient au
compte voyageur, pas à un voyage unique. `TravelerRouteProgress` unit les
`TripChapterPassage.recognized` de tous les voyages du même propriétaire.

Le badge est attribué lorsque :

- l’union de ces voyages couvre toutes les sections requises du
  `ReferenceRoute` ;
- chaque chapitre atteint le seuil `recognized` de la politique courante ou
  une version déclarée compatible ;
- chaque trace contributrice appartient bien à un seul voyage ;
- les doublons sont neutralisés entre sources et voyages.

Le voyageur peut donc compléter le GTHF en six, sept, dix voyages ou davantage.
Aucune durée maximale n’est imposée entre la première et la dernière activité.
Le badge affiche factuellement le nombre de voyages contributeurs, les jours à
vélo et la période observée, sans transformer ces valeurs en performance.

L’ordre des voyages et la direction globale ne bloquent pas le badge au MVP
tant que chaque section est parcourue sur une direction officielle. Les
incohérences restent visibles dans le détail privé. Le lot 0 fixe seulement les
seuils de couverture, les règles de compatibilité lors d’un changement de GPX
et les cas ambigus.

Supprimer un voyage ou une trace recalcule `TravelerRouteProgress` et peut
retirer le badge si la couverture devient insuffisante. Le badge est privé par
défaut. Son affichage dans un récit ou une autre surface publique exige un
consentement explicite et ne publie ni trace, ni dates précises.

## 15. Identité, sessions et autorisations

### 15.1 Email/mot de passe et Strava

Le MVP propose deux moyens de créer ou ouvrir un même `TravelerAccount` :

- email vérifié et mot de passe local ;
- OAuth 2.0 Strava, avec `athlete.id` comme sujet externe stable.

Aucun fournisseur OIDC ou SaaS d'identité supplémentaire n'est requis. Le
compte conserve un ID GTHF opaque ; voyages, traces et consentements ne
référencent jamais directement l'email ou l'identifiant Strava.

Le mot de passe est traité avec Argon2id. Argon2id est une fonction mémoire-dure
de dérivation de mot de passe, pas un algorithme qualifié « post-quantique ».
Son rôle est de rendre chaque essai hors ligne coûteux, y compris après fuite
de la base.

La bibliothèque choisie doit :

- générer un sel aléatoire unique d'au moins 16 octets ;
- produire une chaîne PHC contenant version, paramètres, sel et hash ;
- démarrer au minimum à `m=19456 KiB, t=2, p=1`, puis être benchmarkée sur le
  scaler Clever pour rester sous une seconde sans permettre un déni de service ;
- re-hasher à la connexion lorsque les paramètres deviennent obsolètes ;
- comparer en temps constant et ne jamais journaliser le mot de passe.

Politique MVP : 15 caractères minimum, au moins 64 acceptés, espaces et Unicode
autorisés, aucune règle artificielle majuscule/chiffre/symbole, blocage des mots
de passe communs ou compromis et aucune rotation périodique sans suspicion de
compromission.

L'inscription email crée un token de vérification aléatoire dont seul le hash
est stocké. L'oubli de mot de passe utilise un token distinct, à usage unique,
expirant sous 30 minutes, et révoque les sessions après changement. Les réponses
restent identiques qu'un email existe ou non.

Le callback Strava vérifie `state`, échange le code côté serveur et contrôle les
scopes accordés. Le scope `read` suffit pour la connexion ; les scopes activité
restent facultatifs et leur refus laisse l'import GPX disponible.

Un utilisateur authentifié peut lier Strava à son compte email ou ajouter un
email/mot de passe à son compte créé via Strava. Aucun rapprochement automatique
par nom ou email n'est autorisé. Un conflit crée une erreur explicite et un
parcours support ; aucune fusion silencieuse.

### 15.2 Autorisation

- chaque requête privée filtre par `accountId` dérivé de la session, jamais
  fourni comme autorité par le client ;
- contrôles objet par objet contre IDOR ;
- rôles équipe séparés : support lecture minimale, modérateur, éditeur public,
  administrateur sécurité ;
- MFA obligatoire pour les rôles équipe ;
- élévation et export de données journalisés ;
- aucune route privée indexable ou préchargée dans une page publique.

### 15.3 Authentification web et session

- cookie de session opaque `HttpOnly Secure SameSite`, sans JWT durable dans le
  navigateur ;
- protection CSRF sur les mutations si l’architecture de cookie l’exige ;
- rotation de session après connexion, changement de mot de passe et élévation ;
- limitation des essais par compte et par origine, avec ralentissement
  progressif sans verrouillage permanent exploitable ;
- messages génériques pour connexion, inscription et récupération afin de ne
  pas révéler l'existence d'un compte ;
- tokens de vérification et reset hashés, courts, expirables et à usage unique ;
- autorisation du collage et des gestionnaires de mots de passe ;
- durée, inventaire et révocation explicites des sessions ;
- texte public rendu avec le mécanisme de sanitisation existant ou un schéma
  plus strict ;
- Content Security Policy qualifiée avant l’ajout des pages compte.

### 15.4 Email transactionnel Brevo

Le MVP utilise le relais SMTP Brevo uniquement pour la vérification d'adresse
et la réinitialisation du mot de passe. Brevo n'est ni fournisseur d'identité,
ni source de vérité des comptes, ni base marketing : aucune synchronisation de
la liste des voyageurs n'est requise.

L'intégration passe par un adaptateur SMTP remplaçable. L'application lit
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` et `MAIL_FROM` depuis son
environnement. Seuls `SMTP_USER` et `SMTP_PASSWORD` sont sensibles ; leur valeur
n'apparaît jamais dans Git, le PRD, une pull request ou les logs. Le déploiement
de production les reçoit directement comme variables d'environnement Clever
Cloud. Les environnements de développement et de production emploient des clés
SMTP Brevo distinctes et révocables.

Le domaine expéditeur GTHF est authentifié dans Brevo avec DKIM et DMARC avant
le pilote. Les emails existent en texte brut et HTML, les liens emploient des
tokens aléatoires à usage unique et aucun token n'est journalisé. Un échec
d'envoi laisse le compte non vérifié et permet une relance limitée ; il ne crée
ni second compte ni nouveau signal révélant l'existence de l'adresse.

## 16. Consentement, confidentialité et suppression

### 16.1 Registre de consentement

Chaque finalité possède des événements append-only. L’état courant est dérivé
du dernier événement valide. La notice exacte est versionnée.

Le consentement de publication porte sur une version Strapi du texte, un nom
public et des chapitres. Le domaine privé en conserve la preuve et le hash de
version, sans dupliquer le corps éditorial. Modifier l’un de ces éléments crée
dans Strapi une nouvelle version soumise à modération. Les médias nécessiteront
un consentement et un contrat dédiés dans une extension post-MVP.

### 16.2 Retrait

- contribution récente : exclusion immédiate logique et recomposition du
  prochain agrégat ;
- récit : masquage public fail-closed, dépublication Strapi et purge des
  dérivés ;
- Strava : l'action « déconnecter » arrête les synchronisations et révoque les
  tokens sans supprimer le compte, les traces ni les sessions email/mot de
  passe ; une session ouverte uniquement via Strava est révoquée ;
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
| futur dérivé média public retiré | hors MVP ; politique à définir avant activation | sauvegardes |
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
- récits récupérés depuis Strapi et retours privés ;
- sources connectées.

L’archive est générée en job dans `ExportArchive.payload bytea`, chiffrée au
niveau applicatif avec une clé distincte de la base, puis téléchargée par une
route authentifiée qui revalide le propriétaire. Elle expire et est purgée
automatiquement sous 24 heures. Aucune URL objet signée ni aucun bucket n'est
nécessaire.

## 17. Photos et stockage objet — hors MVP

Le MVP n'accepte aucune photo dans un récit ou un retour terrain et ne
provisionne aucun bucket privé. Les GPX/FIT sont stockés dans
`TracePayload.rawBytes` en PostgreSQL ; les récits Strapi sont textuels.

Une extension photo fera l'objet d'un lot et d'un ADR séparés couvrant au
minimum : bucket privé `deny by default`, URLs signées, quotas, réencodage,
suppression EXIF/GPS, texte alternatif, consentement par version, dérivé public
Strapi, retrait et sauvegardes. Aucun champ, secret ou infrastructure préparée
« au cas où » n'est ajouté au MVP.

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
- vélo, charge et sens lorsque pertinents ;
- aucune photo au MVP.

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

### 18.3 Récits Strapi

Le voyageur choisit texte, nom public et chapitres reconnus depuis l'espace
privé. Lors de la soumission, le service vérifie consentement et passages
reconnus, puis crée ou met à jour un récit non publié dans Strapi. Le texte
destiné au public, les relations aux chapitres et tout le workflow de
modération ont Strapi pour source de vérité. Aucune photo n'est acceptée au
MVP.

L'équipe travaille dans Strapi : elle peut approuver, refuser ou demander une
correction. Le voyageur répond depuis son espace ; le backend applique la
modification au document Strapi sans exposer de jeton CMS. Une correction du
texte, du nom ou des chapitres après approbation repasse en revue.

Un récit multi-chapitres est un document Strapi unique relié à tous les
chapitres choisis. Il apparaît dans le bloc « Carnets de voyageurs » de chacune
de ces pages seulement lorsqu'il est publié. La sélection doit être un
sous-ensemble des `TripChapterPassage.recognized` courants ou déclarés
compatibles au moment de la soumission.

Le domaine privé conserve uniquement `StoryPublicationLink`, le consentement
et les références nécessaires au retrait ; il ne duplique pas le corps du
récit. Le remplacement ultérieur d’un GPX officiel ne dépublie pas
automatiquement un récit déjà modéré ; il ouvre une alerte éditoriale si la
modification est matérielle. Cette tolérance historique ne s’applique pas au
signal récent.

## 19. Signal « parcouru depuis le dernier hiver »

### 19.1 Deux barrières distinctes

La fraîcheur terrain n’utilise pas une fenêtre glissante de 90 jours. Un
passage est frais seulement s’il a été observé après la dernière barrière
hivernale applicable au chapitre.

Cette règle de fraîcheur ne remplace pas la barrière de confidentialité :
l’unité publique reste l’utilisateur distinct, pas le nombre de traces. Un même
utilisateur ne compte qu’une fois par chapitre et saison, même avec plusieurs
voyages.

### 19.2 Barrière hivernale

`WinterFreshnessBarrier` contient :

- `barrierAt`, instant à partir duquel un passage peut compter ;
- un libellé tel que `hiver-2025-2026` ;
- une portée globale, avec surcharge facultative par chapitre ;
- l’acteur, la date d’activation, le motif et la version de politique ;
- un état `draft/active/superseded`.

L’équipe active une nouvelle barrière après l’hiver ou après un événement qui
rend les anciennes observations peu fiables. L’activation masque immédiatement
l’ancien signal. Il réapparaît seulement lorsque suffisamment de voyageurs ont
roulé après cette barrière. En l’absence de barrière active valide, le système
échoue fermé et omet le bloc.

### 19.3 Confidentialité et libellé public

Politique initiale recommandée :

- au moins 5 utilisateurs distincts consentants depuis la barrière ;
- passages reconnus sur une version officielle courante ou compatible ;
- aucun nombre exact, profil, date précise, sens, durée ou trace ;
- texte : « Ce chapitre a été parcouru depuis le dernier hiver » ;
- saison affichable : `hiver 2025-2026`, sans révéler le dernier passage ;
- absence : bloc omis, sans conclusion sur l’état du parcours.

Le seuil de cinq protège contre la réidentification ; la barrière hivernale
porte la fraîcheur métier. Le seuil reste à valider avec le DPO et un test de
réidentification. Les paramètres sont versionnés et ne changent jamais
silencieusement.

### 19.4 Recalcul

Suppression, retrait, nouvelle barrière, déclassement d’une couverture ou
changement de politique recompose l’agrégat. Si le seuil n’est plus atteint, le
bloc disparaît dans le SLO public. Aucun ancien cache ne peut le maintenir
au-delà de 60 secondes.

## 20. Strava, Garmin et Komoot

### 20.1 Strava

Strava est à la fois un second moyen de connexion et, si le voyageur
l'autorise, une source d'activités du MVP. Le lot 1 doit prévoir :

- OAuth 2.0 serveur avec `state`, callback borné et code à usage unique ;
- création, liaison ou réouverture idempotente par `athlete.id` ;
- scope `read` obligatoire pour la connexion Strava, scopes activité
  distincts et vérification de ce qui a réellement été accordé ;
- tokens d’accès courts et refresh token rotatif chiffré ;
- activité privée uniquement avec le scope explicitement requis ;
- import historique borné, paginé, annulable et soumis aux rate limits ;
- webhooks idempotents pour création, mise à jour, suppression et révocation ;
- réponse webhook en moins de deux secondes, traitement asynchrone ;
- aucun polling permanent ;
- suppression ou invalidation lorsque l’activité devient privée ou est
  supprimée selon le scope ;
- déconnexion appliquant l’endpoint de révocation courant ;
- revue Strava et capacité athlètes comme dépendance de mise en production.

Le développement et la recette limitée peuvent avancer avec la capacité de
test disponible. L’ouverture du MVP au public exige une capacité Strava
compatible avec le pilote puis la cible. Une panne Strava empêche seulement ce
mode de connexion et la synchronisation ; email/mot de passe et import GPX
restent disponibles.

Refuser les scopes activité laisse disponibles le compte et l'import GPX. Le
connecteur ne place jamais automatiquement une activité dans un voyage et ne
donne aucun consentement public implicite.

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

- `POST /v1/auth/register`, `POST /v1/auth/verify-email` ;
- `POST /v1/auth/login`, `POST /v1/auth/logout` ;
- `POST /v1/auth/password/forgot`, `POST /v1/auth/password/reset` ;
- départ et callback OAuth Strava, liaison et déconnexion ;
- `POST /v1/traces/import` avec corps borné ;
- `GET /v1/traces` et `GET /v1/traces/{id}` ;
- `POST /v1/trips` ;
- `PUT /v1/trips/{id}/traces/{traceId}` et `DELETE` associé ;
- `GET /v1/trips/{id}/chapter-passages` ;
- `POST /v1/stories` et transitions de soumission/retrait ;
- `POST /v1/terrain-reports` ;
- `POST /v1/consents/{purpose}` et `DELETE` ;
- `POST /v1/exports` ;
- `GET /v1/exports/{exportId}/download` ;
- `DELETE /v1/account` ;
- webhook Strava.

Toutes les créations acceptent une clé d’idempotence. Les listes sont paginées.
Les erreurs utilisent des codes stables et n’incluent aucun secret.

### 21.2 API publique minimale

- `GET /v1/public/chapters/{chapterKey}/recent-passage`.

Réponse possible :

~~~json
{
  "visible": true,
  "label": "Ce chapitre a été parcouru depuis le dernier hiver",
  "season": "hiver-2025-2026",
  "policyVersion": "winter-freshness-v1",
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

Le service crée ou met à jour les récits candidats et les brouillons
d'information terrain via un token technique à portée minimale. Strapi refuse
la publication d'un récit sans relation vers au moins un chapitre. Aucun token
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
- aucune URL de trace ou donnée privée mise en cache publiquement ;
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
- credential stuffing, brute force et épuisement mémoire par Argon2id ;
- énumération d'emails via inscription, connexion ou récupération ;
- interception ou rejeu d'un token de vérification/reset ;
- prise de compte lors d'une liaison email–Strava ou fusion abusive ;
- fichier XML hostile, bombe de taille et épuisement CPU ;
- identifiant d'export copié, deviné ou journalisé ;
- fuite de géométrie par erreur, analytics ou support ;
- sur-fetch d’une projection Strapi ;
- réidentification par date/compteur récent ;
- token OAuth compromis ou rotation concurrente ;
- webhook falsifié, dupliqué, retardé ou réordonné ;
- activation accidentelle d'un upload photo hors périmètre ;
- suppression partielle entre DB, cache et Strapi ;
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
4. créer la base et les secrets privés sans bucket objet ;
5. configurer le relais SMTP Brevo, authentifier le domaine expéditeur,
   injecter les secrets par l'environnement Clever Cloud, puis configurer
   l'application Strava et les rôles équipe ;
6. charger uniquement des comptes et traces de test consentis ;
7. qualifier matching, suppression, export et incident ;
8. réaliser la revue DPO/sécurité ;
9. ouvrir le pilote par liste contrôlée et coupe-circuit.

### 25.2 Pas de migration de données voyageur existantes

Aucune donnée voyageur n’existe dans les dépôts. Les témoignages Strapi actuels
ne sont pas convertis en récits reconnus : ils restent un contenu éditorial
legacy sans prétendre avoir une preuve GPS.

### 25.3 Évolution des GPX

Le remplacement d’un fichier GPX officiel crée un nouveau snapshot. Les anciens
snapshots restent lisibles pour audit privé tant qu'une trace les référence. Un
job de recalcul
progressif utilise un curseur et ne bloque pas les pages publiques.

## 26. Déploiement et retour arrière

### 26.1 Ordre

1. CMS : `chapterKey` et modèles publics, sans permission publique nouvelle ;
2. service privé : DB, migrations, API fermée et worker arrêté, sans bucket ;
3. frontend : UI masquée par feature flag ;
4. worker : corpus de test puis pilote ;
5. équipe : console et promotion en brouillon ;
6. activation privée du pilote avec email/mot de passe, Strava et import GPX ;
7. activation séparée des récits, retours et agrégats publics ;
8. élargissement du pilote seulement après validation de la capacité athlètes
   Strava.

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
| 1 — Auth + traces + Strava | email/mot de passe Argon2id, OAuth Strava, upload GPX, historique borné, webhooks, déduplication, matching | les deux connexions ouvrent le même type de compte ; fichier et activité Strava deviennent des traces privées sans voyage automatique |
| 2 — Voyages + badge | association unique, agrégation par voyage puis progression compte, métriques, badge boucle, export/suppression | plusieurs voyages peuvent compléter la boucle sans double compte ni limite arbitraire |
| 3 — Terrain | formulaire privé, console, états et audit | un retour partiel est trié sans apparaître dans Strapi |
| 4 — Public volontaire | récit textuel candidat et workflow dans Strapi, affichage chapitre, barrière hivernale et agrégat k-anonyme | un récit textuel se modère dans Strapi, apparaît sur ses chapitres et se retire dans le SLO sans géométrie exposée |
| 5 — FIT | parseur et parité de métriques | une trace FIT suit le même contrat de matching |
| 6 — Garmin | étude, accès partenaire et connecteur | connecteur activé seulement si le programme est approuvé |
| 7 — Temps pris public | célébration volontaire sans classement | aucune pause artificielle transformée en record |

Chaque lot possède ses propres PR de production. Le lot 0 peut conclure qu’un
lot doit être divisé davantage.

## 28. Arbitrages techniques à valider

| Arbitrage | Constat | Recommandation | Décision attendue / bloque |
|---|---|---|---|
| Frontière de données | Strapi est éditorial et public | service voyageur séparé | architecture, avant lot 1 |
| Dépôt/déployable | deux dépôts actuels ne portent pas ce domaine | nouveau dépôt API + worker | propriétaire technique, lot 0 |
| Identité | pas de SaaS d'identité souhaité | décidé : email/mot de passe local Argon2id et OAuth Strava, liés à un compte GTHF opaque ; OIDC reporté | implémentation/sécurité, lot 1 |
| Email transactionnel | aucun provider ni SMTP dans les dépôts | décidé : relais SMTP Brevo pour vérification et reset, derrière un adaptateur remplaçable ; secrets injectés par Clever Cloud | implémentation/ops, lot 1 |
| Clé chapitre | slug/order/documentId insuffisants | `chapterKey` immuable | CMS, lot 0 |
| Base privée | Clever autorise les schémas mais pas la création libre d'une base ou d'un rôle RW ; le même add-on partage ses identifiants propriétaire | second add-on PostgreSQL relié seulement à l'API et au worker privés | infra/architecture, lot 1 |
| Stockage traces | fichiers bornés à 25 Mio et fortement liés au cycle de vie DB | décidé : octets GPX/FIT en `bytea` dans une table `TracePayload` séparée | implémentation/infra, lot 1 |
| Photos et bucket | simplification MVP confirmée | décidé : aucune photo et aucun bucket privé au MVP ; lot ultérieur séparé | produit/architecture, post-MVP |
| Queue | aucun worker ; cron dupliqué par scaler | table jobs du PostgreSQL privé + worker séparé au MVP | architecture/ops, lot 1 |
| Matching | tolérance produit confirmée | décidé : corridor de 50 m et chapitre reconnu à 80 % ; corpus pour vérifier les cas limites sans durcir la règle | implémentation/data, lot 1 |
| Dédoublonnage | multi-source attendu | une trace canonique, une appartenance voyage | produit, lot 2 |
| Boucle complète | badge demandé au MVP et pratique réelle en plusieurs sorties | progression du compte sur tous ses voyages, toutes les sections reconnues, aucune limite de durée, badge privé par défaut | seuils data, lot 2 |
| Fraîcheur terrain | une fenêtre glissante ne reflète pas l’hiver | barrière hivernale éditoriale globale avec surcharge par chapitre | administration initiale, lot 4 |
| Confidentialité du signal | risque de réidentification après la barrière | k=5 utilisateurs distincts, aucun compteur ni date précise | DPO/produit, lot 4 |
| Conservation | aucune politique existante | tableau section 16 comme base | DPO/sécurité, avant pilote |
| Modération récit | le contenu est destiné aux pages chapitre | décidé : candidat, workflow, décisions et publication dans Strapi ; preuve et consentement dans le domaine privé | CMS/éditorial, lot 4 |
| Modération terrain | Strapi ne doit pas voir position et retour bruts | console privée puis brouillon d'information Strapi nettoyé | équipe éditoriale, lot 3 |
| Médias publics | photos hors MVP | ADR ultérieur : copie réencodée sans EXIF, jamais changement d'ACL | sécurité/éditorial, post-MVP |
| FIT | dépendances absentes | après qualification GPX et Strava | technique, lot 5 |
| Strava | capacité et rate limits soumis à revue | décidé MVP : OAuth, webhooks et import borné ; approbation comme dépendance externe | partenariat/technique, lot 1 |
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
- aucun bucket privé n'est provisionné et aucune photo voyageur n'est acceptée ;
- l’API privée refuse une requête authentifiée visant un objet d’un autre
  compte ;
- Next ne contient aucun secret tiers dans le bundle client ;
- le worker peut être arrêté et repris sans perte ni doublon ;
- le service fermé ne rend pas les pages chapitre indisponibles.

### 29.2 Import et bibliothèque

- un utilisateur importe plusieurs GPX indépendants ;
- les octets GPX/FIT sont conservés en `bytea` dans `TracePayload`, jamais
  dans Strapi, Cellar ou le disque applicatif ;
- une requête de bibliothèque ne sélectionne jamais le `bytea` ;
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
- seuls les segments situés à 50 mètres ou moins du GPX officiel contribuent à
  la couverture ;
- une trace ou une union de traces obtient `recognized` dès que 80 % du
  linéaire officiel du chapitre est couvert ;
- les 20 % manquants ne bloquent ni le chapitre, ni la progression de boucle ;
- aucune vitesse, continuité parfaite ou durée maximale n’est requise ;
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
- le badge boucle apparaît lorsque l’union des passages reconnus de tous les
  voyages du compte couvre les sections requises, sans limite de durée ;
- chaque trace reste rattachée à un seul voyage et ne compte qu’une fois ;
- nombre de voyages, période observée et jours à vélo restent affichés
  factuellement ;
- le badge est privé par défaut et aucun classement public n’existe au MVP.

### 29.5 Publication

- récit et contribution récente nécessitent chacun une action explicite ;
- le récit candidat, ses états de modération et sa version publiée vivent dans
  Strapi ;
- les chapitres publiables sont un sous-ensemble des passages reconnus ;
- chaque récit publié apparaît dans le bloc « Carnets de voyageurs » de tous
  les chapitres Strapi auxquels il est relié, et d'aucun autre ;
- aucun champ photo n'est présent au MVP ;
- aucune trace, position, heure ou date précise n’est publique ;
- une correction post-approbation repasse en revue ;
- le retrait masque la projection dans le SLO ;
- un témoignage legacy ne devient pas automatiquement récit reconnu.

### 29.6 Signal agrégé

- un utilisateur compte au plus une fois par chapitre et barrière hivernale ;
- activer une nouvelle barrière masque les passages antérieurs ;
- seuls les passages postérieurs à la barrière active peuvent faire réapparaître
  le bloc ;
- le bloc reste absent sous le seuil de confidentialité ;
- le DTO ne contient aucun compteur exact ni date de dernier passage ;
- le retrait d’un consentement recompose l’agrégat ;
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

- une révocation Strava invalide ses tokens sans supprimer les données ni le
  moyen de connexion email/mot de passe ;
- réautoriser le même `athlete.id` retrouve le même compte GTHF ;
- changer ou réinitialiser le mot de passe révoque les autres sessions ;
- l’utilisateur exporte ses données via une archive `bytea` temporaire,
  authentifiée et purgée sous 24 heures ;
- il supprime une trace sans supprimer son compte ;
- il supprime un voyage sans publier d’information ;
- déconnecter Strava révoque et supprime les tokens et ferme les sessions qui
  reposent uniquement sur Strava ;
- supprimer le compte révoque immédiatement les sessions ;
- la purge couvre DB, contenus Strapi, caches et agrégats ;
- une restauration rejoue les tombstones de suppression ;
- toutes les étapes sont auditables sans conserver la géométrie dans l’audit.

### 29.9 Authentification et connecteurs

- email/mot de passe et Strava permettent chacun de créer ou ouvrir un compte ;
- une liaison explicite associe les deux moyens au même `TravelerAccount` ;
- aucun compte n'est fusionné automatiquement par nom ou email ;
- le scope Strava `read` suffit à la connexion et à l'import GPX manuel ;
- refuser un scope activité désactive seulement la synchronisation d'activités ;
- Strava vérifie les scopes réellement accordés ;
- un webhook dupliqué est idempotent ;
- un webhook est acquitté rapidement puis traité en job ;
- une révocation coupe toute synchronisation future ;
- les rate limits sont suivis et l’import historique ralentit sans perte ;
- Garmin n’est activé qu’après approbation partenaire.

## 30. Plan de validation pour les agents de production

### 30.1 Tests unitaires

- Argon2id avec paramètres et vecteurs connus, génération de sel et rehash ;
- politique de mot de passe, blocklist et normalisation email ;
- expiration, hash et usage unique des tokens email/reset ;
- rendu texte et HTML des deux emails Brevo sans secret ni token dans les logs ;
- parser GPX hostile et bornes ;
- hashes bruts et normalisés ;
- projection sur linéaire, union d’intervalles et direction ;
- déduplication certaine/probable ;
- agrégation multi-traces ;
- jours locaux et changements d’heure ;
- états et idempotence ;
- politique k-anonyme ;
- transitions de consentement et suppression ;
- validation du rejet de tout champ ou upload photo.

### 30.2 Tests d’intégration

- inscription, vérification email, connexion, oubli et reset sans énumération ;
- envoi par l'adaptateur SMTP Brevo, relance bornée et comportement contrôlé en
  cas d'indisponibilité du relais ;
- limitation des tentatives et révocation des sessions après reset ;
- création par email, création par Strava et liaison explicite sans doublon ;
- refus de fusion automatique d'identités conflictuelles ;
- upload GPX borné vers l'API puis stockage `bytea` ;
- isolation entre deux comptes ;
- job concurrent et reprise après crash ;
- création puis reconnexion du même compte par `athlete.id` ;
- rotation OAuth concurrente ;
- refus des scopes activité avec import GPX toujours fonctionnel ;
- révocation Strava sans suppression du compte ni de l'accès par mot de passe ;
- webhook dupliqué/réordonné ;
- lecture Strapi d’un nouveau snapshot ;
- promotion vers brouillon, publication puis retrait ;
- purge DB + contenu Strapi + cache ;
- panne Strapi, DB, email transactionnel et Strava, avec repli attendu ;
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

- taille réelle des GPX pilotes ;
- débit d'upload vers l'API ;
- CPU/mémoire du worker sur le plus gros fichier accepté ;
- profondeur maximale de queue ;
- connexions PostgreSQL ;
- coût DB, email transactionnel, capacité Strava et egress ;
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
- modèle de récit candidat/publié et modèle d'information terrain ;
- relations récit–chapitres ;
- états, file et décisions de modération des récits dans Strapi ;
- validations de publication et garde de cohérence dans `src/index.ts` ou
  domaine dédié ;
- token/rôle technique de promotion à portée minimale ;
- migration et recette ;
- aucun modèle privé voyageur.

### Nouveau domaine voyageur

- API, worker et migrations ;
- schéma DB privé avec `TracePayload.rawBytes bytea` ;
- aucun adaptateur objet ou média au MVP ;
- credentials email/Argon2id, tokens de vérification/reset et sessions ;
- identité OAuth Strava et mécanisme extensible `ExternalIdentity` ;
- clients email, Strapi et Strava ;
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
- [RFC 9106 — Argon2](https://www.rfc-editor.org/rfc/rfc9106.html) :
  fonction mémoire-dure, Argon2id, sel unique recommandé et paramètres
  versionnés ;
- [OWASP — Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) :
  Argon2id, paramètres minimaux, sel géré par la bibliothèque et rehash ;
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) :
  quinze caractères en facteur unique, longueur maximale d'au moins 64,
  blocklist, limitation des essais et absence de rotation arbitraire ;
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
- [Clever Cloud — PostgreSQL](https://www.clever-cloud.com/developers/doc/addons/postgresql/) :
  gestion des schémas autorisée, mais création de bases et d'utilisateurs
  supplémentaires indisponible par défaut ;
- [Clever Cloud — Cellar](https://www.clever-cloud.com/developers/doc/addons/cellar/) :
  stockage S3, URLs pré-signées et versioning ;
- [Clever Cloud — CRON](https://www.clever-cloud.com/developers/doc/administrate/cron/) :
  exécution par scaler et nécessité de déduplication ;
- [Clever Cloud — File System Buckets](https://www.clever-cloud.com/developers/doc/addons/fs-bucket/) :
  disque applicatif non durable entre redéploiements ;
- [Clever Cloud — Configuration des variables d'environnement](https://www.clever-cloud.com/developers/doc/cli/applications/configuration/) :
  injection de la configuration applicative sans l'inscrire dans Git ;
- [Brevo — SMTP relay integration](https://developers.brevo.com/docs/smtp-integration) :
  relais transactionnel, identifiants SMTP dédiés et paramètres de connexion ;
- [Brevo — Authentifier son domaine](https://help.brevo.com/hc/fr/articles/12163873383186-Authentifier-votre-domaine-dans-Brevo-code-Brevo-enregistrement-DKIM-enregistrement-DMARC) :
  configuration du domaine expéditeur, DKIM et DMARC.

Ces références doivent être revérifiées au lancement des lots Strava, Garmin
et infrastructure.

## 34. Décisions prises et questions réellement restantes

### Décisions prises par ce PRD

- données privées séparées de Strapi dans un add-on PostgreSQL distinct ;
- un schéma séparé dans l'add-on Strapi ne constitue pas une isolation
  suffisante sur Clever Cloud ;
- Strapi source de vérité éditoriale et des GPX officiels ;
- Next comme expérience web, pas comme stockage durable ;
- worker asynchrone obligatoire ;
- octets GPX/FIT stockés en `bytea` dans une table privée séparée des
  métadonnées ;
- aucune photo et aucun bucket privé au MVP ;
- email/mot de passe local et Strava comme deux moyens de connexion du MVP,
  sans SaaS d'identité supplémentaire ;
- mots de passe en Argon2id avec sel unique, politique longue sans règles de
  composition arbitraires, blocklist et reset à usage unique ;
- relais SMTP Brevo pour les emails de vérification et reset, sans délégation
  d'identité, avec secrets injectés par l'environnement Clever Cloud ;
- `ExternalIdentity.subject = athlete.id` pour Strava ;
- scope Strava `read` suffisant pour le compte et l'import GPX, scopes
  activité facultatifs pour la synchronisation ;
- GPX et Strava au premier lot ;
- AB et BA analysés séparément ;
- SHA-256 officiel et version d’algorithme conservés ;
- corridor de reconnaissance fixé à 50 mètres autour du GPX officiel ;
- chapitre reconnu à partir de 80 % de couverture, sans critère de vitesse ;
- une trace canonique dans au plus un voyage actif ;
- consentements distincts et versionnés ;
- texte public, modération et publication des récits dans Strapi, avec
  relations vers les chapitres ;
- seules la preuve de consentement et la référence opaque du récit restent dans
  le domaine privé ;
- aucune page récit indexable au MVP ;
- aucun compteur public exact ;
- badge privé de boucle complète au MVP, agrégé sur tous les voyages du compte
  et sans limite de durée ;
- aucune page de classement au MVP ;
- Strava inclus au MVP avec import GPX toujours disponible ;
- fraîcheur publique fondée sur une barrière hivernale éditoriale ;
- `chapterKey` immuable à ajouter ;
- retrait et suppression conçus avant le pilote.

### Questions bloquantes du lot 0

1. dépôt, langage final et ownership du domaine voyageur ;
2. offre, région, sauvegarde et politique du stockage privé ;
3. queue PostgreSQL ou broker dédié après mesure ;
4. paramètres de projection complémentaires pour les cas ambigus, sans modifier
   le corridor de 50 mètres ni le seuil de 80 % ;
5. durées de conservation et besoin d’analyse d’impact ;
6. validation DPO du seuil de confidentialité k=5 ;
7. acteur et procédure d’activation de la première barrière hivernale, ainsi que
   les éventuelles surcharges par chapitre ;
8. rôles et personnes habilitées à voir les retours précis ;
9. coût et taille du pilote, y compris la capacité Strava ;
10. forme du package géographique partagé ;
11. SLO définitifs de retrait, purge et reprise.

## 35. Définition de terminé

Le lot initial est terminé lorsqu’un voyageur peut créer son compte GTHF par
email/mot de passe ou par Strava, lier ensuite les deux moyens sans doublon,
puis importer un GPX ou autoriser la synchronisation de ses activités, obtenir
une reconnaissance reproductible, conserver
la trace dans sa bibliothèque puis l’associer à un voyage. La progression de
son compte agrège tous ses voyages ; lorsque leur union couvre les sections
requises, il reçoit son badge privé de boucle complète. Le voyageur peut
exporter et supprimer ses données. Aucun élément n’est public sans action
distincte.

Le périmètre public est terminé lorsqu’un récit textuel candidat est modéré
dans Strapi puis apparaît dans le bloc « Carnets de voyageurs » de chacun de
ses chapitres reconnus, et d'aucun autre, qu’un retour brut devient au besoin
une information éditoriale séparée et que le signal récent reste absent sous
son seuil. Aucun parcours photo ni bucket privé n'est livré. Le retrait ferme
toutes les surfaces dans le SLO.

Le système reste un carnet de slow travel et un canal de connaissance terrain,
pas un réseau social ni un classement.
