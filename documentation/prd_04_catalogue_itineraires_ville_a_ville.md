# PRD 04 — Catalogue d’itinéraires vélo ville à ville

**Version :** 0.6\
**Date :** 6 août 2026\
**Statut :** prêt pour revue produit et technique\
**Dépôts concernés par l’implémentation :** `gthdf-cms`, `gthdf-frontend`\
**Dépendances fonctionnelles :**\
PRD 01 — Référentiel des villes et pages hubs ;\
[`PRD 03`](prd_03_gpx_builder_ville_a_ville.md) — ancrages primaires et noyau de découpe GPX\
**Marque publique :** GTHF

---

## 1. Résumé de la décision

Ce lot crée un catalogue administré de portions réelles du GTHF entre deux
villes. Un calcul serveur part des dix GPX canoniques `gpxFileAB`, de villes
qualifiées et d’ancres validées. Il produit des candidats reproductibles, mais
aucune page n’est rendue publique ou indexable sans décisions éditoriales
explicites.

Le PRD 03 fournit en amont un outil interactif ville à ville, un ancrage
primaire AB et BA par `cityPassage` et le contrat commun de découpe. Le
présent lot réutilise ce socle, mais conserve son propre modèle exhaustif :
les arrêts éditoriaux du Builder ne représentent pas toutes les occurrences
géographiques nécessaires au catalogue.

Depuis l’implémentation PRD 03, ce socle comprend aussi des jonctions
directionnelles qualifiées, liées aux empreintes des médias adjacents, et des
fixtures exécutables sous `lib/gpx/`. Le PRD 04 peut reprendre leur contrat et
leurs résultats, mais doit porter sa propre copie serveur ou extraire un
package commun : il ne doit pas importer le code depuis l’application Next ni
appeler ses endpoints HTTP.

Les décisions structurantes sont les suivantes :

1. le parcours de référence est une boucle ordonnée indépendante de l’ordre
   d’affichage des chapitres du PRD 02 ; son origine de calcul reste Hirson afin
   de reproduire l’inventaire fourni ;
2. une paire métier est non ordonnée et unique par parcours et paire de
   communes ; le moteur choisit ensuite les occurrences et le plus court arc
   de la boucle ;
3. la direction publique d’une révision suit le sens canonique des GPX AB sur
   cet arc ; la paire inverse ne possède ni second produit ni seconde URL ;
4. l’éligibilité conserve strictement le `OU` produit : moins de 60 000 mètres
   sur la trace ou moins de 40 000 mètres à vol d’oiseau, sans arrondi ;
5. les 3 891 lignes du classeur sont une référence de migration et de
   non-régression, pas des pages à publier automatiquement ;
6. le classeur permet d’importer les identités de 223 communes, mais ne décrit
   explicitement que 355 des 449 occurrences annoncées : les ancres restantes
   doivent être recalculées puis validées ;
7. les ruptures entre GPX ne sont jamais comblées par une ligne inventée ; une
   jonction non exacte doit être explicitement acceptée ou bloque les portions
   qui la traversent ;
8. le job MVP est une commande serveur explicite, verrouillée et reprenable ;
   il n’est déclenché ni dans une requête HTTP longue, ni par un lifecycle, ni
   automatiquement à chaque modification éditoriale ;
9. un itinéraire éditorial stable et ses révisions calculées sont séparés afin
   de comparer une nouvelle géométrie, conserver l’ancienne et activer la
   nouvelle sans écrasement silencieux ;
10. les GPX et géométries générés sont immuables et adressés par leur empreinte
    de contenu ; aucun fichier inchangé n’est régénéré ou réenvoyé ;
11. Next filtre à nouveau chaque page, téléchargement, sitemap et lien interne
    selon la publication Strapi, les deux flags éditoriaux, la validité de la
    révision et un coupe-circuit global désactivé par défaut ;
12. toutes les nouvelles lectures Strapi de ce catalogue utilisent un token
    serveur. Aucun secret n’est ajouté à une variable `NEXT_PUBLIC_*`.
13. les ancrages AB primaires validés par le PRD 03 amorcent les occurrences
    correspondantes avec une provenance explicite ; ils ne remplacent ni le
    calcul, ni la revue des 449 occurrences attendues.
14. le catalogue reprend aussi la qualification AB des lieux de jonction du
    PRD 03 ; il ne crée pas une seconde décision éditoriale pour le même lieu.

## 2. Contexte et problème

Les chapitres décrivent de grands ensembles éditoriaux de 82 à 204 kilomètres.
Ils sont adaptés à la découverte du Grand Tour, mais pas toujours aux requêtes
de préparation telles que `Calais Boulogne à vélo` ou `GPX Wissant Boulogne`.

Une page ville à ville n’est utile que si elle représente réellement le GTHF :
géométrie téléchargeable, métriques cohérentes, villes et chapitres traversés.
Une combinaison de mots-clés sans portion exploitable créerait une page faible
et trompeuse.

Le calcul initial existe sous la forme d’un classeur daté. Il démontre le
volume et les règles, mais ne constitue ni un modèle Strapi, ni un pipeline
réexécutable lorsque les GPX évoluent. Ce lot transforme cet inventaire en
processus administrable, versionné et sûr.

## 3. Objectifs

- calculer des portions à partir des GPX officiels, jamais d’une droite entre
  deux villes ;
- reproduire les seuils stricts et expliquer quelle condition rend une paire
  éligible ;
- traiter correctement la boucle, les villes à plusieurs passages et les
  portions passant par l’origine ;
- préserver la géométrie source pour l’export tout en servant une géométrie
  légère pour l’affichage ;
- calculer distance, dénivelé positif et négatif avec des méthodes versionnées ;
- rendre chaque calcul traçable aux médias, ancres, constantes et algorithmes ;
- produire un rapport avant toute écriture ;
- rendre les applications idempotentes, verrouillées et reprenables ;
- permettre la comparaison puis l’activation explicite d’une nouvelle
  révision ;
- publier progressivement des pages réellement utiles ;
- fournir des routes, téléchargements, métadonnées et liens internes qui
  respectent tous les garde-fous de publication ;
- réutiliser le classeur pour accélérer la saisie des villes sans transformer
  ses données OSM en contenu éditorial public.
- réutiliser le contrat de découpe, de métriques et de sérialisation du
  PRD 03, ainsi que ses ancrages AB primaires lorsqu’ils correspondent à une
  occurrence qualifiée.

## 4. Non-objectifs

Ce lot ne doit pas :

- calculer un itinéraire libre sur voirie ;
- chercher une adresse, un hébergement ou un commerce en temps réel ;
- appeler Overpass, l’API française ou une API belge pendant une requête
  publique ;
- republier automatiquement les commerces contenus dans le classeur ;
- créer une page pour les 3 891 candidats sans revue ;
- créer une variante indexable par direction, query string ou facette ;
- importer ou exploiter un GPX personnel ;
- modifier l’expérience publique du GPX Builder ou dépendre de sa route HTTP
  de génération à la demande ;
- utiliser l’index simplifié de proximité du PRD 02 comme source exportable ;
- synchroniser Google My Maps ou des services tiers ;
- mettre en place une navigation GPS ;
- ajouter un catalogue public filtrable ou une route d’index
  `/itineraires-velo` dans le MVP ;
- exécuter un recalcul massif dans un lifecycle Strapi ou au sein d’une
  requête d’administration ;
- supprimer automatiquement une ancienne révision ou un ancien média ;
- garantir un trajet continu en inventant un raccord entre deux GPX ;
- renommer globalement les identifiants techniques legacy `GTHDF`.

## 5. Utilisateurs et parcours principaux

### Cyclotouriste

Il ouvre une URL canonique, comprend immédiatement entre quelles villes passe
la portion, sa longueur réelle sur le GTHF, son dénivelé disponible et les
éventuelles ruptures connues. Il télécharge un GPX sans devoir revenir au
chapitre complet.

### Éditeur GTHF

Il consulte un rapport de calcul, repère les changements et avertissements,
ouvre un candidat dans Strapi, complète son contenu puis choisit la révision à
publier. Il décide séparément si la page est accessible et si elle est
indexable.

### Opérateur technique

Il lance un dry run ciblé ou complet, vérifie les empreintes, puis applique
exactement le rapport relu. En cas d’échec, il reprend la même exécution sans
dupliquer produits ou médias.

### Moteur de recherche

Il reçoit une seule URL canonique par paire et parcours. Une page indexable
contient dans son HTML les informations essentielles, des liens réels et un
GPX valide ; elle ne dépend pas d’une carte hydratée pour avoir du sens.

## 6. État des dépôts confirmé par inspection

### 6.1 CMS Strapi

- `gthdf-cms` utilise Strapi `5.51.1`, Node 20 à 24 et PostgreSQL ;
- les médias sont stockés par le provider S3 dans MinIO en développement et
  Cellar en production ;
- le provider accepte déjà `application/gpx+xml`, `application/xml` et
  `text/xml`, avec une limite globale de 10 Mio ;
- les GPX actuellement importés sont néanmoins déclarés
  `application/octet-stream` ; les nouveaux exports doivent corriger ce MIME ;
- `Chapter` possède notamment `gpxFileAB`, `gpxFileBA`, `nextChapter`,
  `previousChapter`, `displayOrder` et `cityPassages`, mais aucun type
  `Route`, `Anchor` ou `Itinerary` ;
- la chaîne de chapitres publiée est une boucle ;
- le dépôt n’active aucun cron et n’intègre aucune queue ;
- `src/index.ts` porte les validations de publication des villes et chapitres,
  les gardes de documents et le verrou PostgreSQL du PRD 02, en plus des
  validations transversales existantes ;
- les contrôleurs et services `Chapter` sont les factories Strapi standard ;
- le script de seed existant montre comment charger Strapi depuis une commande
  Node autonome ;
- les reprises PRD 01/02 sont des scripts npm explicites et idempotents ; elles
  ne sont jamais lancées au démarrage de Strapi ;
- la base de production est PostgreSQL et le pool configuré est limité à trois
  connexions ; le job ne doit donc pas monopoliser de nombreuses connexions ;
- Strapi documente ses transactions comme expérimentales : seules de petites
  unités testées peuvent employer `strapi.db.transaction`, jamais l’ensemble
  du catalogue dans une transaction longue.

Références officielles vérifiées le 4 août 2026 :

- [cron Strapi 5](https://docs.strapi.io/cms/configurations/cron) ;
- [transactions Strapi 5](https://docs.strapi.io/cms/database-transactions) ;
- [Draft & Publish](https://docs.strapi.io/cms/features/draft-and-publish) ;
- [paramètre REST `status`](https://docs.strapi.io/cms/api/rest/status).

### 6.2 Frontend Next

- `gthdf-frontend` utilise Next.js `16.3.0`, React `19.2.1`, Node.js 22.12 à
  24 et App Router ;
- les pages dynamiques actuelles utilisent `generateStaticParams()`, des
  Server Components et `notFound()` ;
- les requêtes Strapi sont revalidées en général après 60 ou 300 secondes ;
- le sitemap est un fichier `app/sitemap.ts` revalidé toutes les heures ;
- le sitemap actuel avale une erreur Strapi et remplace la famille concernée
  par une liste vide ; ce comportement n’est pas acceptable pour un catalogue
  entier lors d’une panne transitoire ;
- aucun webhook ou endpoint de revalidation à la demande n’existe ;
- aucun registre de redirections dynamique n’existe ;
- aucune bibliothèque cartographique ou de profil altimétrique n’est installée ;
- le Draft Mode est protégé par `PREVIEW_SECRET` et le helper emploie le
  paramètre Strapi 5 `status` ; une éventuelle route catalogue doit réutiliser
  cette garde ;
- le token Strapi éventuel porte actuellement un nom `NEXT_PUBLIC_*` ; le
  catalogue introduit une variable serveur distincte et ne transmet jamais ce
  secret au navigateur ;
- le frontend est déployé sur Clever Cloud, avec un runtime `nano` et une
  instance de build `M` ; le partage du cache ISR entre plusieurs instances
  autoscalées reste à qualifier avant le catalogue.

### 6.3 Conséquence sur la livraison

L’implémentation nécessite deux PR de production coordonnées :

1. `gthdf-cms` : modèles, migration/import, noyau géographique, job, rapports,
   validations et médias ;
2. `gthdf-frontend` : client serveur Strapi, route publique, téléchargement,
   carte, métadonnées, maillage, sitemap et redirections.

Le CMS est déployé en premier avec tous les flags publics désactivés. Le
frontend doit rester compatible avec un catalogue vide.

Ces PR partent du schéma d’ancrage et de jonction directionnels et du contrat
de découpe livrés par le PRD 03. Les fixtures et champs partagés sont figés et
cross-linkés avant la mise en œuvre des modèles catalogue ; aucun second
format d’ancrage primaire ou de jonction n’est créé.

## 7. Audit du classeur fourni

### 7.1 Identité et structure

Fichier inspecté :
[`GTHF_villes_et_produits_SEO.xlsx`](data/gthf_villes_et_produits_seo/source/GTHF_villes_et_produits_SEO.xlsx)\
Exports reproductibles et manifeste :
[`documentation/data/gthf_villes_et_produits_seo/`](data/gthf_villes_et_produits_seo/)\
Taille : 1 015 386 octets\
SHA-256 :
`dc7c251553907bf98ea444f79840cc52f9b702989353b241eaa083bb24d240a2`

Le classeur contient six onglets :

- `Synthèse` ;
- `Villes` ;
- `Produits` ;
- `QA seuils` ;
- `Chapitres` ;
- `Méthode`.

Il date son calcul du 19 juillet 2026 et son instantané OSM du
`2026-07-19T13:38:10Z`.

### 7.2 Villes

- 223 communes admissibles : 217 françaises et 6 belges ;
- aucun identifiant, code de commune ou nom dupliqué dans cet instantané ;
- toutes possèdent une latitude et une longitude d’ancre communale ;
- 125 communes ont un seul passage et 98 en ont plusieurs ;
- la somme des nombres de passages annoncés est 449 ;
- 19 communes signalent un commerce à plus de 2 km de la trace ;
- la qualification est fondée sur au moins une boulangerie, supérette ou
  grande surface active dans la commune ;
- les coordonnées françaises proviennent d’une mairie ; les coordonnées
  belges d’un centre géographique documenté dans le classeur.

Ces données accélèrent la création des identités et la proposition de
coordonnées. Elles ne constituent ni du contenu public relu, ni une preuve
permanente de commerce disponible.

### 7.3 Produits

Les 3 891 produits sont tous conformes au `OU` demandé :

| Classification | Nombre |
|---|---:|
| les deux critères | 2 417 |
| itinéraire seulement | 43 |
| vol d’oiseau seulement | 1 431 |

Autres constats :

- 60 portions choisissent le plus court arc en passant par l’origine de la
  boucle ;
- 1 739 relient des ancres situées dans des chapitres différents ;
- aucune duplication d’identifiant, de slug ou de paire non ordonnée ;
- 10 produits sont à ±250 m du seuil de trace et 27 du seuil direct ;
- 617 candidats dépassent 100 km sur le GTHF, 40 dépassent 200 km ;
- 27 candidats mesurent moins de 100 m sur la trace ;
- 1 702 ont un rapport distance GTHF / distance directe supérieur à 2 ;
- le maximum observé est environ 218,35 km sur le GTHF pour moins de 40 km à
  vol d’oiseau.

Ces extrêmes restent éligibles par la règle produit, mais doivent apparaître
dans le rapport de qualité et ne sont jamais auto-validés ni auto-indexés.

### 7.4 Méthode confirmée

- la paire est non ordonnée ;
- la distance de trace est le minimum sur la boucle entre toutes les
  occurrences des deux communes ;
- les ancres sont échantillonnées tous les 10 m pour l’inventaire ;
- les seuils sont stricts sur les mètres non arrondis ;
- la distance directe correspond, à moins du nanomètre sur les 3 891 lignes,
  à l’inverse géodésique de l’ellipsoïde WGS84 ;
- les 70 lignes de `QA seuils` comprennent volontairement 37 retenues et 33
  non retenues.

### 7.5 Limite du classeur pour les ancres

L’onglet `Villes` donne seulement le premier chaînage et le nombre total de
passages. Les produits permettent de retrouver 355 positions distinctes, soit
94 de moins que les 449 annoncées.

Le fichier ne peut donc pas être transformé directement en table exhaustive
d’ancres. Il sert à :

- importer les identités et coordonnées candidates ;
- proposer les premiers chaînages ;
- vérifier le nombre d’occurrences attendu ;
- comparer les produits et seuils recalculés ;
- détecter toute différence avec la méthode historique.

Les limites administratives versionnées et la trace restent nécessaires pour
reconstituer puis valider toutes les occurrences.

## 8. Audit des GPX de référence

### 8.1 Correspondance avec Strapi

Le 4 août 2026, les SHA-256 des dix `gpxFileAB` publics correspondent tous à
l’onglet `Chapitres` du classeur. Les noms de fichier normalisés du XLSX ne
sont pas des identifiants : la correspondance utilise le slug du chapitre et
l’empreinte binaire.

Le corpus représente :

- 10 GPX 1.1 Komoot ;
- 3 444 547 octets ;
- 25 469 `trkpt` originaux ;
- un `trk` et un `trkseg` par fichier ;
- altitude et horodatage présents sur 100 % des points ;
- aucun élément `extensions` détecté ;
- environ 1 406,42 km selon la méthode WGS84 du classeur.

Les fichiers sont administrativement distincts des dix sens BA. Le catalogue
utilise exclusivement AB comme géométrie canonique. Le PRD 03 qualifie aussi
BA pour son sélecteur interactif, mais cette disponibilité n’ajoute ni produit
inverse, ni seconde URL au catalogue MVP.

### 8.2 Ordre canonique du catalogue

L’ordre reproduisant l’inventaire est :

1. Hirson → Soissons ;
2. Soissons → Beauvais ;
3. Beauvais → Amiens ;
4. Amiens → Étaples ;
5. Étaples → Calais ;
6. Calais → Saint-Omer ;
7. Saint-Omer → Lille ;
8. Lille → Arras ;
9. Arras → Condé-sur-l’Escaut ;
10. Condé-sur-l’Escaut → Hirson.

Cet ordre démarre à Hirson pour garder les chaînages du XLSX. Il ne remplace
pas `displayOrder` du PRD 02, qui démarre à Lille pour l’interface publique.

### 8.3 Jonctions constatées

| Jonction | Écart géodésique approximatif |
|---|---:|
| Hirson → Soissons / Soissons → Beauvais | 40,8 m |
| Soissons → Beauvais / Beauvais → Amiens | 0 m |
| Beauvais → Amiens / Amiens → Étaples | 0 m |
| Amiens → Étaples / Étaples → Calais | 0 m |
| Étaples → Calais / Calais → Saint-Omer | 0 m |
| Calais → Saint-Omer / Saint-Omer → Lille | 0 m |
| Saint-Omer → Lille / Lille → Arras | 75,1 m |
| Lille → Arras / Arras → Condé-sur-l’Escaut | 45,3 m |
| Arras → Condé-sur-l’Escaut / Condé-sur-l’Escaut → Hirson | 53,7 m |
| Condé-sur-l’Escaut / retour à Hirson | 225,1 m |

La longueur logique de la boucle est la somme des segments source. Elle
n’ajoute pas ces écarts comme des lignes droites.

Chaque jonction reçoit un statut administré :

- `exact` : extrémités identiques à la tolérance numérique ;
- `accepted_gap` : rupture connue, relue et admise ;
- `blocked` : rupture non résolue ;
- `pending_review` : état initial d’une jonction non exacte.

Une valeur initiale supérieure à 1 m n’est jamais acceptée automatiquement.
Une rupture supérieure à 250 m est bloquée par défaut. Modifier ces seuils
exige une décision documentée et une nouvelle version d’algorithme.

Une portion traversant `accepted_gap` est exportée avec plusieurs `trkseg` et
porte un avertissement calculé. Une portion traversant `blocked` ou
`pending_review` ne peut pas atteindre l’état prêt à publier.

Le lieu éditorial est commun aux qualifications AB et BA du PRD 03. Il utilise
la gare SNCF voyageurs par défaut ; Condé-sur-l’Escaut retient le point près
des fortifications. Comme le catalogue MVP ne calcule que la géométrie AB, il
importe la qualification AB et sa provenance au lieu de redemander une revue
du même lieu. Les empreintes et l’écart restent néanmoins ceux des médias AB
canoniques.

## 9. Définitions métier affinées

| Terme | Définition |
|---|---|
| parcours de référence | boucle éditoriale et ordre de GPX canoniques |
| commune candidate | document `City` associé à une preuve de qualification datée pour un parcours |
| ancre | occurrence précise d’une commune sur un segment source et à un chaînage donné |
| paire métier | ensemble non ordonné de deux communes distinctes sur un parcours |
| arc dirigé | sous-parcours retenu dans le sens AB canonique entre deux ancres |
| itinéraire | document éditorial stable portant l’URL et les flags publics |
| révision | résultat calculé immuable pour un ensemble exact de sources |
| run | exécution identifiée d’un dry run ou d’une application |

Une ville, une commune candidate et une ancre ne sont pas interchangeables.
Le nom ou les coordonnées d’une ville ne suffisent jamais à choisir une
occurrence sur la boucle.

## 10. Reprise contrôlée du XLSX

### 10.1 Contrat d’entrée

Le frontend, Strapi en production et le job récurrent ne lisent jamais un
XLSX arbitraire. La PR de production fournit un convertisseur ou une étape
manuelle contrôlée qui :

1. vérifie le nom, le SHA-256, les six onglets et leurs en-têtes ;
2. lit uniquement les valeurs, jamais des macros ou du code ;
3. convertit les données utiles en un manifeste JSON versionné ;
4. conserve le SHA-256 du classeur, la date des sources et les dix empreintes
   GPX dans ce manifeste ;
5. rejette toute colonne manquante, valeur incohérente ou doublon ;
6. produit un rapport signé par son propre hash.

La bibliothèque de lecture XLSX n’entre pas dans le runtime public si elle ne
sert qu’à cette conversion.

### 10.2 Usage dans le PRD 01

Le PRD 01 peut utiliser l’onglet `Villes` comme table de correspondance pour
les seules villes sélectionnées dans les passages éditoriaux initiaux :

- proposer `municipalityKey`, pays, code administratif et coordonnées ;
- désambiguïser un nom ;
- préremplir une source de coordonnées à relire ;
- ne pas copier les commerces dans le contenu public ;
- ne pas publier une page ville automatiquement.

Il ne charge toujours pas les 223 villes en masse. Cette reprise complète
appartient au présent lot.

### 10.3 Import complet du PRD 04

Le présent lot peut créer ou compléter les 223 `City` en brouillon avec
`hasPublicPage=false`. L’import :

- rapproche d’abord par `municipalityKey`, jamais par le seul nom ;
- enrichit un document existant sans écraser un nom, slug, contenu ou
  coordonnée éditorialement modifiés ;
- présente toute divergence dans le dry run ;
- n’ajoute aucun `cityPassage` de chapitre automatiquement ;
- ne publie aucun document `City` ;
- conserve la qualification OSM dans un objet administratif lié au parcours,
  pas dans le texte public de la ville.

### 10.4 Sources géographiques complémentaires

Pour produire les 449 occurrences, l’import prépare des instantanés
versionnés des limites administratives françaises et belges citées dans le
classeur. Chaque instantané possède : source, date, licence, empreinte et
format normalisé.

Le moteur intersecte la trace avec ces polygones et utilise le chaînage du
XLSX comme contrôle. Il ne dépend pas d’une API distante pendant les runs
ordinaires. Un rafraîchissement de limites ou de commerces est une opération
explicite produisant un nouveau lot d’import.

## 11. Extension du modèle `City`

La revue croisée du PRD 01 ajoute les champs d’identité nécessaires à la
France et à la Belgique :

| Champ | Type | Règle |
|---|---|---|
| `municipalityKey` | string unique | ex. `FR-02381`, stable et insensible au nom |
| `countryCode` | string | ISO 3166-1 alpha-2 |
| `municipalityCode` | string | code national conservé comme texte ; code INSEE en France |
| `administrativeArea` | string | département ou province, sans promesse de fraîcheur |
| `coordinateSource` | JSON ou composant | source, date et nature de la coordonnée |

Ces champs restent administratifs. `name`, `slug`, contenu et
`hasPublicPage` demeurent éditoriaux. Une donnée importée ne remplace jamais
silencieusement une valeur relue.

## 12. Modèle Strapi du parcours et des ancres

Les noms suivent les conventions anglaises du dépôt. Les libellés admin et
publics restent en français.

### 12.1 Collection `ReferenceRoute`

UID proposé : `api::reference-route.reference-route`\
Option : `draftAndPublish=true`

| Champ | Type | Règle |
|---|---|---|
| `name` | string | nom administratif et public |
| `routeKey` | string unique | identité stable, ex. `gthf-main-loop` |
| `slug` | UID | usage administratif futur |
| `isLoop` | boolean | `true` pour le parcours actuel |
| `catalogueEnabled` | boolean | défaut `false` |
| `algorithmVersion` | string | version active des règles |
| `segments` | composant répétable | ordre canonique des chapitres et direction |
| `sourceManifestHash` | string | empreinte du dernier manifeste activé |
| `currentInputFingerprint` | string | empreinte système de l’état publié courant |
| `notes` | text | décisions de jonction et exploitation |

Composant `route.reference-segment` :

| Champ | Type | Règle |
|---|---|---|
| `chapter` | relation `Chapter` | chapitre source |
| `direction` | enum `ab`, `ba` | `ab` pour les dix segments initiaux |
| `junctionAfterStatus` | enum | statuts définis en section 8.3 |
| `junctionAfterGapMetres` | decimal | calculé, non saisi comme distance produit |
| `junctionNote` | text court | justification de la validation |

L’ordre natif du composant est la source de vérité. Publier le parcours exige
dix médias lisibles, une boucle sans doublon de chapitre et une décision pour
chaque jonction.

### 12.2 Collection `RouteCity`

UID proposé : `api::route-city.route-city`\
Option : `draftAndPublish=false`

| Champ | Type | Règle |
|---|---|---|
| `routeCityKey` | string unique | `<routeKey>:<municipalityKey>` |
| `route` | relation | parcours de référence |
| `city` | relation | ville normalisée |
| `qualificationStatus` | enum | `proposed`, `validated`, `rejected`, `stale` |
| `qualificationSourceHash` | string | lot XLSX/OSM exact |
| `qualifiedAt` | datetime | date de l’évidence |
| `expectedOccurrences` | integer | contrôle issu du XLSX |
| `qualificationEvidence` | JSON privé | compte et provenance, jamais rendu tel quel |
| `currentInputFingerprint` | string | empreinte système des coordonnées et ancres validées |
| `reviewNote` | text | décision humaine |

Une qualification commerciale périmée n’efface pas automatiquement une
ville : elle passe à `stale` et exige une nouvelle décision.

Les deux `currentInputFingerprint` sont maintenus par un service technique,
jamais saisis dans l’administration. Toute mutation pertinente doit les
modifier dans la même unité courte que la donnée source ; une empreinte absente
ou impossible à recalculer ferme les pages concernées sans lancer le job.

### 12.3 Collection `RouteAnchor`

UID proposé : `api::route-anchor.route-anchor`\
Option : `draftAndPublish=false`

| Champ | Type | Règle |
|---|---|---|
| `anchorKey` | string unique | route, commune et occurrence stable |
| `routeCity` | relation | commune candidate concernée |
| `occurrenceIndex` | integer | ordre des occurrences de cette commune |
| `chapter` | relation | chapitre contenant la projection |
| `sourceSegmentIndex` | integer | séquence continue du parcours |
| `sourcePointIndex` | integer | point précédent dans la source |
| `sourceFraction` | decimal | fraction sur le segment |
| `chainageMetres` | decimal | distance cumulée depuis l’origine Hirson |
| `projectedLatitude`, `projectedLongitude` | decimal | coordonnée exacte sur la trace |
| `distanceToTraceMetres` | decimal | distance depuis l’ancre communale |
| `sourceHash` | string | route/segment utilisé |
| `algorithmVersion` | string | méthode de projection |
| `validationStatus` | enum | `proposed`, `validated`, `ambiguous`, `stale`, `rejected` |
| `origin` | enum | `computed` ou `prd03_primary` |
| `sourceDirection` | enum | `ab` pour un ancrage primaire importé dans le MVP |
| `calculationReport` | JSON privé | candidats et ambiguïtés |

Contrainte : une seule ancre active pour
`routeCity + occurrenceIndex + sourceHash`. Une nouvelle trace produit une
proposition ; elle n’écrase pas une ancre validée avant application du diff.

Un ancrage `origin=prd03_primary` est recopié avec son empreinte, son chapitre,
sa position et sa provenance de passage. Il doit encore être rapproché d’une
occurrence administrative du catalogue. Cette provenance évite un second
choix manuel contradictoire sans déclarer l’ancrage primaire exhaustif.

## 13. Modèle Strapi des itinéraires

### 13.1 Collection éditoriale `CityItinerary`

UID proposé : `api::city-itinerary.city-itinerary`\
Option : `draftAndPublish=true`

| Champ | Type | Règle |
|---|---|---|
| `businessKey` | string unique | parcours + deux `municipalityKey` triées |
| `route` | relation | parcours de référence |
| `cityA`, `cityB` | relations | paire métier non ordonnée |
| `slug` | UID | stable après première publication Next |
| `activeRevision` | relation | révision calculée approuvée |
| `reviewStatus` | enum | `to_review`, `approved`, `rejected` |
| `publicationNext` | boolean | défaut `false` |
| `seoStatus` | enum | `noindex`, `indexable`, défaut `noindex` |
| `featuredOnCityPages` | boolean | défaut `false` |
| `editorialOrder` | integer | tri facultatif des liens sélectionnés |
| `introduction` | text | texte spécifique optionnel |
| `blocks` | dynamic zone | contenu éditorial vérifié |
| `seo` | `shared.seo` | surcharge existante |

`cityA` et `cityB` sont triées par clé métier pour rendre l’identité
indépendante de la direction calculée. La révision porte le départ et
l’arrivée publics.

Le slug n’est jamais l’identifiant métier. Il est proposé depuis la direction
de la première révision, contrôlé pour collision puis gelé. Un changement de
direction ou de slug public est bloqué tant qu’une redirection n’est pas
créée.

### 13.2 Collection technique `ItineraryRevision`

UID proposé : `api::itinerary-revision.itinerary-revision`\
Option : `draftAndPublish=false`

| Champ | Type | Règle |
|---|---|---|
| `revisionKey` | string unique | business key + hash source + version algo |
| `itinerary` | relation | document éditorial stable |
| `run` | relation | exécution créatrice |
| `departure`, `arrival` | relations `City` | direction AB de l’arc retenu |
| `departureAnchor`, `arrivalAnchor` | relations | occurrences exactes |
| `distanceMetres` | decimal | distance WGS84 sur les séquences |
| `asTheCrowFliesMetres` | decimal | distance WGS84 entre coordonnées City |
| `elevationGainMetres`, `elevationLossMetres` | decimal nullable | méthode versionnée |
| `elevationAvailable` | boolean | aucune valeur inventée |
| `eligibleByRoute`, `eligibleByDirect` | booleans | preuve des seuils |
| `detourRatio` | decimal | qualité, pas nouveau seuil d’éligibilité |
| `usesLoopOrigin` | boolean | arc passant par l’origine |
| `junctionWarnings` | JSON | jonctions et ruptures rencontrées |
| `chaptersOnRoute` | composant répétable | chapitres et ordre de traversée |
| `citiesOnRoute` | composant répétable | occurrences puis villes dédupliquées |
| `generatedGpx` | média | GPX canonique immuable |
| `generatedGpxSha256` | string | empreinte binaire vérifiée du GPX |
| `displayGeometry` | média | géométrie légère distincte |
| `displayGeometrySha256` | string | empreinte binaire vérifiée de l’artefact |
| `sourceHash` | string | dépendances exactes du résultat sélectionné |
| `lastVerifiedEvaluationHash` | string | dernier état complet contre lequel ce résultat a été revérifié |
| `lastVerifiedRun` | relation | run ayant produit cette revérification |
| `algorithmVersion` | string | contrat géométrique et métriques |
| `calculationStatus` | enum | `ready`, `warning`, `error`, `stale`, `archived` |
| `calculationReport` | JSON privé | erreurs et contrôles détaillés |

Les champs calculés d’une révision prête sont immuables. Seuls son statut, ses
notes et les deux champs de revérification peuvent évoluer. Mettre à jour ces
derniers atteste qu’un résultat inchangé a été recalculé contre de nouvelles
sources ; cela ne modifie ni géométrie ni métrique. Un résultat différent crée
une nouvelle révision.

Marquer l’ancienne révision active `stale` ou `archived` suffit à fermer la
page publique sans modifier silencieusement la version éditoriale Strapi.

### 13.3 Collection `CatalogueRun`

UID proposé : `api::catalogue-run.catalogue-run`\
Option : `draftAndPublish=false`

Elle conserve au minimum : identifiant, mode, périmètre, auteur/opérateur,
dates, version de code, hash d’entrée, hash du rapport, statut, curseur de
reprise, compteurs et résumé d’erreurs.

Un dry run strict n’écrit rien dans Strapi. Son rapport JSON est produit dans
la sortie explicitement choisie par l’opérateur. Lors d’une application, le
rapport validé et son hash sont enregistrés avec le `CatalogueRun`.

### 13.4 Redirections

Collection proposée : `api::itinerary-slug-redirect.itinerary-slug-redirect`.

| Champ | Type | Règle |
|---|---|---|
| `oldSlug` | string unique | ancien slug exact |
| `itinerary` | relation | cible canonique publiée |
| `enabled` | boolean | défaut `true` |
| `reason` | text court | décision éditoriale |

Aucune redirection n’est déduite d’un nom alternatif ou de l’ordre inverse.

### 13.5 Coupe-circuit global

Ajouter au single type `Global` un booléen
`publishCityItinerariesToNext`, défaut `false`.

Il est indépendant de `publicationNext`. Une erreur de lecture de ce flag est
traitée comme `false`. Le Draft Mode authentifié peut le contourner pour une
preview, jamais une requête publique ordinaire.

## 14. Clés, immutabilité et empreintes

### 14.1 Clés métier

- `municipalityKey` identifie une commune indépendamment de son nom ;
- `routeCityKey` identifie sa qualification sur un parcours ;
- `anchorKey` identifie une occurrence sémantique ;
- `businessKey` trie les deux communes et interdit le produit inverse ;
- `revisionKey` identifie un résultat calculé exact ;
- le slug ne participe à aucune de ces clés.

Les clés chaîne portent une contrainte `unique` en base afin d’éviter les
composites difficiles à exprimer dans Strapi. Leur format et version sont
centralisés.

### 14.2 Hash du résultat et hash d’évaluation

`sourceHash` décrit le résultat retenu dans une sérialisation canonique :

- `routeKey` et origine ;
- ordre, direction et SHA-256 binaire de chaque GPX réellement traversé ;
- statut et écart de chaque jonction traversée ;
- identifiants, coordonnées et version des deux villes ;
- clés, chaînages, indices et fractions des ancres retenues ;
- seuils bruts ;
- version de l’algorithme géodésique, de découpe et de dénivelé ;
- règles de gestion des temps, metadata et extensions GPX.

`lastVerifiedEvaluationHash` couvre en plus tout ce qui peut faire choisir un
autre arc : manifeste complet du parcours, tous les GPX et jonctions de la
boucle, toutes les occurrences validées des deux communes, seuils et règles de
tie-break. Il est recalculé après tout changement pertinent.

Il est composé au minimum depuis les `currentInputFingerprint` du parcours et
des deux `RouteCity`, plus les versions d’algorithme et seuils. Les empreintes
utilisent les versions publiées de `ReferenceRoute` et `City` pour le public ;
un brouillon non publié ne ferme pas une page fondée sur leur version publiée.

Cette distinction permet de revérifier un résultat inchangé sans dupliquer son
GPX. Une révision publique est néanmoins fermée tant que son hash d’évaluation
ne correspond pas à l’état courant.

Le champ `hash` d’un média Strapi n’est pas une empreinte binaire de confiance.
Le job télécharge les octets et calcule SHA-256.

### 14.3 Invalidation ciblée

Sur une boucle choisissant le plus court des deux arcs, modifier un GPX peut
changer le gagnant même si le segment modifié n’appartenait pas à l’arc
précédemment retenu. Toute modification de GPX, d’ordre ou de jonction impose
donc de réévaluer toutes les paires du `ReferenceRoute` concerné. Une
optimisation plus fine n’est admise que si elle prouve mathématiquement qu’une
paire ne peut pas changer.

Modifier les coordonnées d’une ville ou son ensemble d’ancres réévalue toutes
les paires qui contiennent cette ville. Une modification purement éditoriale
du texte, du SEO ou de l’ordre de mise en avant ne déclenche aucun calcul.

Le rapport distingue `changed`, `stale`, `reverified_unchanged`,
`unchanged` et `unaffected`. Une réévaluation route entière ne crée une
nouvelle révision que si `sourceHash`, direction, éligibilité, métriques ou
artefacts changent. Sinon, elle met uniquement à jour les champs de
revérification.

## 15. Algorithme de génération

### 15.1 Préconditions

Avant de générer des paires :

- parcours publié et `catalogueEnabled=true` ;
- chaque GPX lisible, conforme au contrat et doté d’un SHA-256 ;
- ordre de boucle et origine définis ;
- chaque jonction non exacte relue ;
- villes dotées de `municipalityKey`, pays et coordonnées complètes ;
- `RouteCity.qualificationStatus=validated` ;
- au moins une ancre `validated` par ville ;
- aucune ancre utilisée ne référence un ancien hash source.

Une précondition invalide produit une erreur isolée. Elle ne déclenche aucun
fallback par nom ou point le plus proche global.

### 15.2 Construction de la boucle

Chaque `trkseg` source est une séquence continue. Le chaînage :

- additionne les distances internes aux séquences ;
- ne mesure pas les écarts de jonction ;
- conserve une table d’intervalle par chapitre et séquence ;
- revient à zéro après la longueur totale de boucle ;
- utilise des mètres non arrondis.

Le calcul de distance emploie l’inverse géodésique sur l’ellipsoïde WGS84. La
méthode choisie doit reproduire les valeurs directes du XLSX à un centimètre
et porte une version explicite.

### 15.3 Projection des ancres

Le moteur commence par importer les ancrages AB primaires validés par le
PRD 03 lorsque leur empreinte correspond au média courant. Il les rapproche
d’une occurrence administrative et les classe en divergence si ce
rapprochement n’est pas univoque.

La coordonnée communale est ensuite projetée sur les segments originaux situés
dans la commune concernée pour compléter toutes les occurrences. Le moteur :

1. intersecte la trace et le polygone administratif versionné ;
2. sépare chaque passage continu ;
3. projette l’ancre communale sur le segment approprié de chaque passage ;
4. enregistre point précédent, fraction, coordonnée et chaînage ;
5. compare le nombre obtenu et le premier chaînage au XLSX ;
6. classe tout croisement, lacet ou repassage non déterministe comme
   `ambiguous` ;
7. n’active rien sans validation humaine des divergences.

La projection porte sur les segments, jamais sur le seul `trkpt` le plus
proche. Le rééchantillonnage à 10 m peut servir à la présélection et à la
comparaison historique, pas à l’export.

Le nombre d’ancrages PRD 03 peut être inférieur au nombre d’occurrences du
catalogue. Il ne modifie donc jamais `expectedOccurrences` et n’autorise pas
à ignorer les passages restants.

### 15.4 Paires non ordonnées et occurrences

Pour `N` communes validées, générer `N × (N - 1) / 2` paires métier. Pour
chaque paire :

1. évaluer toutes les combinaisons d’occurrences validées ;
2. calculer les deux arcs circulaires de chaque combinaison ;
3. ignorer un arc qui traverse une jonction bloquée ;
4. choisir la plus petite distance brute ;
5. en cas d’égalité à la précision numérique, préférer successivement :
   - le moins de jonctions `accepted_gap` ;
   - le moins de séquences ;
   - la plus petite clé d’ancre de départ ;
   - la plus petite clé d’ancre d’arrivée ;
6. fixer le départ et l’arrivée selon le sens AB de l’arc retenu.

Ce tie-break est déterministe. Une modification impose une nouvelle version
d’algorithme.

### 15.5 Distance directe et éligibilité

La distance directe utilise exclusivement les coordonnées éditoriales
complètes de `City`. Le MVP n’emploie pas la coordonnée projetée comme
fallback, car cela changerait silencieusement la règle historique.

Avant tout arrondi :

```text
eligibleByRoute  = distanceMetres < 60000
eligibleByDirect = asTheCrowFliesMetres < 40000
eligible         = eligibleByRoute || eligibleByDirect
```

Une égalité exacte à 60 000 ou 40 000 mètres est exclue. Les deux booléens,
distances et marges sont conservés dans le rapport.

Un candidat non éligible n’est pas créé s’il n’existait pas. S’il possède
déjà un itinéraire ou une révision active, celle-ci devient `archived` et la
stratégie d’URL est appliquée.

### 15.6 Contrôles de qualité non excluants

Le rapport signale au minimum :

- ±250 m de chaque seuil ;
- distance de trace inférieure à 500 m ;
- distance de trace supérieure à 100 km ;
- rapport détour supérieur à 2, 3 et 5 ;
- critère direct seul ;
- passage par l’origine ;
- plusieurs occurrences concurrentes ;
- jonction `accepted_gap` ;
- commerce historique à plus de 2 km ;
- changement de direction ou de slug proposé ;
- différence avec le produit de référence XLSX.

Ces catégories n’ajoutent pas de nouveau seuil d’éligibilité. Elles empêchent
seulement toute validation automatisée.

## 16. Découpe, métriques et contenu dérivé

### 16.1 Géométrie de la portion

La portion est extraite depuis les points originaux et les fractions d’ancres.

- ordre source préservé ;
- point d’ancre original cloné lorsqu’il existe ;
- sinon, latitude et longitude interpolées sur le segment ;
- altitude interpolée seulement entre deux altitudes valides ;
- aucune ligne créée entre deux séquences ou chapitres disjoints ;
- une portion passant par l’origine concatène fin puis début de boucle ;
- les coupures ne portent jamais sur la géométrie simplifiée.

Le noyau et les fixtures de point synthétique, découpe cyclique, jonction et
sérialisation du PRD 03 constituent le contrat de référence. Le partage de code
entre dépôts reste optionnel ; le partage des résultats de test ne l’est pas.

### 16.2 Temps et extensions

Les horodatages actuels proviennent de dix tours Komoot distincts. Les
concaténer donnerait un profil temporel non monotone et trompeur. Les GPX du
catalogue omettent donc tous les éléments `time` et documentent cette règle
dans la version d’algorithme.

Les coordonnées et altitudes sont conservées. Toute future extension GPX est
inventoriée :

- extension qualifiée et pertinente : clonée ;
- extension inconnue : candidat en avertissement ou erreur selon l’emplacement ;
- aucune extension supprimée sans trace dans le rapport.

Cette règle est désormais identique au PRD 03 : les deux lots dérivent des
portions officielles à partir d’enregistrements distincts et omettent leurs
horodatages.

### 16.3 Distance et dénivelé

- distance : somme WGS84 des paires consécutives dans chaque séquence ;
- aucun saut de jonction ajouté ;
- valeurs stockées en mètres non arrondis ;
- affichage à 0,1 km ;
- D+ et D− : méthode du PRD 03, avec couverture d’altitude d’au moins 95 %,
  rééchantillonnage métrique et lissage documenté ;
- aucune valeur de dénivelé si la couverture est insuffisante ;
- aucune durée estimée.

Les dix GPX actuels ont une altitude complète, mais cette observation ne
remplace pas la validation de chaque révision.

### 16.4 Chapitres et villes traversés

`chaptersOnRoute` contient chaque chapitre dont une partie est incluse, dans
l’ordre de l’arc, avec distance interne et sens.

`citiesOnRoute` est calculé depuis les ancres validées dont le chaînage se
trouve sur l’arc :

- départ et arrivée inclus ;
- occurrences conservées pour le calcul ;
- une ville répétée est affichée une seule fois, à sa première occurrence sur
  la portion ;
- ordre relatif à la portion, pas ordre alphabétique ;
- aucun nom déduit d’un GPX ou d’un polygone sans document `City`.

La page peut mettre en avant un sous-ensemble éditorial, mais ne doit pas
transformer la liste complète en accumulation artificielle de mots-clés.

## 17. GPX généré et géométrie d’affichage

### 17.1 GPX canonique

Chaque révision prête possède un GPX 1.1 autonome :

- un `trk` nommé d’après les deux villes et le GTHF ;
- un `trkseg` par séquence continue ;
- metadata GTHF, hash et version d’algorithme non trompeurs ;
- premier et dernier points correspondant aux ancres ;
- coordonnées et altitudes valides ;
- aucun horodatage concaténé ;
- MIME `application/gpx+xml` ;
- nom sûr et ordonné, par exemple `calais-boulogne-sur-mer-gthf.gpx` ;
- relecture avec le parseur de référence avant stockage.

La page inverse n’existe pas et le MVP ne fabrique pas un GPX inverse à partir
de BA. Le cycliste peut utiliser un outil compatible pour inverser la trace ;
un export officiel BA sera une évolution qualifiée séparément.

### 17.2 Géométrie légère

Le job génère un artefact d’affichage distinct :

- séquences et ruptures préservées ;
- extrémités et villes mises en avant conservées ;
- simplification avec erreur maximale documentée ;
- profil d’altitude échantillonné si disponible ;
- aucun temps ou extension ;
- hash lié à la même révision.

Cet artefact ne peut jamais être téléchargé sous le libellé GPX officiel ni
servir à un recalcul.

### 17.3 Stockage immuable

Le provider S3/Cellar existant est réutilisé. Les objets générés portent une
empreinte de contenu et ne sont jamais écrasés en place.

Séquence d’application :

1. générer et valider les octets ;
2. calculer SHA-256 ;
3. réutiliser un média possédant la même empreinte métier ;
4. sinon téléverser le nouvel objet ;
5. créer la révision puis sa relation au média ;
6. conserver l’ancien média pour rollback ;
7. lancer ultérieurement un garbage collector en dry run puis explicitement.

S3 et PostgreSQL ne partagent pas une transaction. Un upload orphelin est
rapporté et récupérable ; il n’entraîne jamais la suppression immédiate d’un
ancien objet référencé.

Le run estime avant application le nombre d’objets et le volume total à
téléverser.

## 18. Architecture du job

### 18.1 Choix d’exécution

Le dépôt ne possède ni queue, ni worker, ni cron activé. Le MVP fournit une
commande TypeScript/Node qui charge Strapi selon le modèle du seed existant.
Elle est exécutée comme tâche serveur authentifiée par son accès à
l’environnement, jamais exposée comme route publique.

Commandes conceptuelles :

```text
catalogue import --source <manifest> --dry-run
catalogue anchors --route gthf-main-loop --dry-run
catalogue calculate --route gthf-main-loop --dry-run --output <report>
catalogue apply --report <report> --confirm-hash <sha256>
catalogue resume --run <run-id>
```

Les noms finaux suivent le CLI du dépôt. Aucun endpoint HTTP long n’est requis
dans le MVP. Une interface admin de déclenchement est une évolution distincte.

### 18.2 Modes

- **import ciblé :** villes, qualifications ou ancres du manifeste ;
- **recalcul ciblé :** parcours, chapitre, ville, ancre ou business keys ;
- **recalcul complet :** explicite sur tous les candidats ;
- **dry run :** zéro écriture DB/S3, rapport complet ;
- **apply :** applique exactement un rapport dont les sources n’ont pas
  changé ;
- **resume :** reprend le curseur d’un run interrompu ;
- **archive check :** liste les produits devenus non éligibles ;
- **media GC :** toujours dry run par défaut, séparé du calcul.

Une modification CMS peut marquer des dépendances `stale` rapidement, mais ne
lance jamais le recalcul complet dans la même requête.

Cette invalidation légère met uniquement à jour les empreintes système. Elle
fait partie de la transaction courte de la mutation ; elle n’effectue ni
lecture GPX complète, ni génération de paire, ni upload.

### 18.3 Rapport de dry run

Le JSON versionné contient :

- identité, code commit et versions d’algorithme ;
- empreintes du manifeste, parcours, GPX, villes et ancres ;
- périmètre et options ;
- totaux bruts, éligibles et exclus ;
- créations, nouvelles révisions, revérifiés inchangés, inchangés, stale,
  archives et erreurs ;
- différences de direction, métriques et hash ;
- paires limites et avertissements de qualité ;
- volume média estimé ;
- liste déterministe des opérations proposées ;
- hash du rapport entier.

L’application refuse si un octet de source, un statut de jonction, une ancre,
une coordonnée ou une version d’algorithme a changé depuis le dry run.

### 18.4 Verrouillage et reprise

- une seule application du catalogue peut être active ;
- acquisition atomique d’un verrou avec `runId`, expiration et heartbeat ;
- refus lisible si un autre run sain possède le verrou ;
- récupération explicite d’un verrou expiré ;
- ordre stable par `businessKey` ;
- transaction courte par produit/révision ou petit lot ;
- curseur enregistré après chaque unité validée ;
- un échec n’annule pas les produits déjà cohérents ;
- reprendre le même rapport ne crée aucun doublon ;
- aucune transaction ne couvre les 3 891 produits.

L’usage éventuel de `strapi.db.transaction` est isolé derrière un adapter et
testé avec Strapi `5.51.1`, son statut officiel étant expérimental.

### 18.5 Idempotence

Deux dry runs sur les mêmes octets produisent le même rapport hors timestamps
explicitement exclus du hash. Deux applications du même rapport produisent :

- zéro nouveau produit ;
- zéro nouvelle révision ;
- zéro nouvel upload ;
- tous les éléments classés `unchanged` ;
- un run d’audit distinct seulement si l’opérateur demande de l’enregistrer.

## 19. Workflow éditorial

### 19.1 Création initiale

Le job peut créer un `CityItinerary` en brouillon lorsqu’une paire devient
éligible. Valeurs obligatoires :

- `reviewStatus=to_review` ;
- `publicationNext=false` ;
- `seoStatus=noindex` ;
- aucune publication Strapi ;
- slug proposé mais modifiable avant première publication ;
- révision calculée liée comme proposition, pas comme publication implicite.

### 19.2 Validation d’une révision

L’éditeur contrôle :

- direction et villes ;
- carte et GPX ;
- distance et dénivelé ;
- jonctions et avertissements ;
- chapitres et villes traversés ;
- différence avec la révision active ;
- titre, introduction et métadonnées.

Il associe ensuite explicitement la révision à `activeRevision`, passe
`reviewStatus=approved`, publie le document Strapi, puis choisit
`publicationNext` et `seoStatus`.

Une révision `warning` peut être activée seulement après confirmation
éditoriale. Une révision `error`, `stale` ou `archived` ne le peut pas.

### 19.3 Source modifiée

Une divergence entre le hash d’évaluation courant et celui de la révision
active ferme immédiatement la page via la garde, avant même un changement de
statut persistant.

Le job :

1. réévalue le périmètre sûr défini en section 14.3 ;
2. fournit le diff ;
3. si le résultat sélectionné est identique, met à jour
   `lastVerifiedEvaluationHash` et `lastVerifiedRun`, puis la page peut
   rouvrir sans nouvelle revue de géométrie ;
4. si le résultat change, crée une nouvelle révision, marque l’ancienne
   `stale` et maintient la page fermée ;
5. réouvre une page changée seulement après activation et publication de la
   nouvelle révision.

Ce comportement privilégie une interruption visible à une géométrie devenue
fausse.

### 19.4 Archivage

Une paire devenue non éligible ou impossible :

- conserve son document, contenu, rapports et anciennes révisions ;
- voit sa révision active passer `archived` ;
- disparaît immédiatement des routes, téléchargements, sitemap et maillages ;
- répond 404 sauf redirection éditoriale explicite ;
- n’est jamais supprimée par le job.

Le choix 404 est le fallback MVP. Une redirection permanente est créée
seulement vers une portion réellement équivalente, jamais vers une page
générique par réflexe SEO.

## 20. Contrat de publication Next

### 20.1 Garde cumulative

Une page publique existe seulement si :

1. `publishCityItinerariesToNext=true` ;
2. `ReferenceRoute` est publié et `catalogueEnabled=true` ;
3. les deux `City` sont publiées ;
4. `CityItinerary` est publié ;
5. `publicationNext=true` ;
6. `reviewStatus=approved` ;
7. `activeRevision` existe ;
8. sa paire et son parcours correspondent au document ;
9. `calculationStatus` vaut `ready` ou `warning` explicitement approuvé ;
10. son `sourceHash` est cohérent avec ses artefacts et son
    `lastVerifiedEvaluationHash` correspond à l’état courant complet ;
11. ses deux critères d’éligibilité ne sont pas simultanément faux ;
12. son GPX et sa géométrie d’affichage existent et ont le bon hash.

La même fonction serveur de garde est utilisée par la page, les metadata, le
téléchargement, la géométrie, le sitemap et les liens internes. Aucun de ces
consommateurs ne réimplémente partiellement la règle.

Le CMS fournit les empreintes courantes ; Next ne tente pas de les reconstruire
depuis des `updatedAt` ou des URLs média. Un objet S3 source est immuable :
remplacer un GPX crée un nouveau média et une nouvelle empreinte, jamais un
écrasement hors Strapi.

`hasPublicPage` du PRD 01 ne bloque pas l’itinéraire. Il décide seulement si le
nom de la ville peut être lié à `/villes/[slug]`.

### 20.2 API Strapi

- aucun droit `find` public n’est accordé aux itinéraires, révisions, ancres,
  runs ou rapports ;
- Next utilise un token `STRAPI_API_TOKEN` disponible seulement côté serveur ;
- les requêtes sélectionnent les champs et relations utiles ;
- les listes paginent par lots compatibles avec la limite Strapi de 100 ;
- les erreurs réseau sont distinguées d’une absence réelle ;
- aucun rapport admin ou preuve OSM n’entre dans le DTO public.

### 20.3 DTO public minimal

- slug, titre et contenu éditorial ;
- villes de départ/arrivée et possibilité de lien hub ;
- métriques brutes nécessaires à l’affichage ;
- disponibilité du dénivelé ;
- avertissements publics de jonction ;
- chapitres et villes publiques traversés ;
- URLs same-origin de géométrie et téléchargement ;
- SEO ;
- date de mise à jour de la révision.

Les URLs Cellar internes ne sont pas exposées directement dans le HTML si une
route same-origin les protège.

Les empreintes nécessaires à la garde restent dans le fetch serveur et ne sont
pas transmises aux Client Components.

## 21. Routes et cache Next

### 21.1 Page canonique

```text
/itineraires-velo/[slug]
```

`generateStaticParams()` retourne uniquement les slugs qui passent la garde
publique au moment du build. `dynamicParams` reste activé afin qu’une nouvelle
page puisse être générée après publication sur une plateforme ISR compatible.

Valeurs initiales recommandées :

- données éditoriales du DTO : revalidation 300 secondes ;
- page, garde et coupe-circuit : revalidation effective maximale 60 secondes ;
- sitemap : revalidation maximale 60 secondes ;
- objets internes immuables : cache long fondé sur le hash ;
- réponses publiques gardées : jamais mises en cache au-delà de 60 secondes.

Un cache de DTO à 300 secondes ne doit pas encapsuler le résultat de la garde.
Le cache de route ou de CDN doit donc réexécuter cette garde dans les
60 secondes, afin qu’un coupe-circuit ferme réellement pages et artefacts dans
ce délai.

La plateforme de déploiement doit confirmer qu’elle persiste et partage le
cache entre instances. Sinon, un rebuild explicite ou une stratégie adaptée
remplace l’ISR avant mise en production.

### 21.2 Téléchargement

```text
/itineraires-velo/[slug]/gpx
```

Une Route Handler applique la garde, récupère l’objet immuable et sert :

- `Content-Type: application/gpx+xml` ;
- `Content-Disposition: attachment` avec nom sûr ;
- ETag ou hash de révision ;
- cache public nul ou inférieur à 60 secondes, même si l’objet interne est
  immuable ;
- 404 pour toute page fermée.

Elle peut rediriger vers une URL objet contrôlée seulement si les headers de
téléchargement, la non-exposition des brouillons et une expiration maximale de
60 secondes sont garantis. Une URL Cellar publique et permanente est refusée :
elle contournerait le coupe-circuit.

### 21.3 Géométrie

```text
/itineraires-velo/[slug]/geometry
```

La route sert uniquement l’artefact léger après la même garde. Elle ne
recalcule rien et ne renvoie jamais le rapport ou les ancres administratives.
Sa politique de cache respecte le même plafond public de 60 secondes.

### 21.4 Sitemap et panne Strapi

Le sitemap ajoute uniquement `seoStatus=indexable`. Une page publique
`noindex` n’y figure pas.

Une panne Strapi ne doit pas produire puis mettre en cache un sitemap vide.
Le code distingue :

- coupe-circuit volontairement fermé : retrait attendu ;
- réponse valide vide : catalogue réellement vide ;
- erreur réseau/serveur : propagation de l’erreur afin de conserver la
  dernière réponse ISR valide lorsque la plateforme le permet.

### 21.5 Preview

Avant d’ajouter `CityItinerary` à `config/admin.ts` :

- signer ou protéger `/api/preview` avec un secret serveur ;
- valider le chemin interne et le type de contenu ;
- employer `status=draft` avec un token serveur autorisé ;
- envoyer `X-Robots-Tag: noindex, nofollow` ;
- ne jamais rendre un draft accessible hors session Draft Mode valide.

## 22. Expérience publique

### 22.1 HTML initial

Avant toute carte interactive :

1. retour vers le GTHF ou le chapitre pertinent ;
2. H1 `De {départ} à {arrivée} à vélo sur le GTHF` ;
3. distance sur le parcours, D+ et D− disponibles ;
4. mention explicite que la distance suit le GTHF ;
5. avertissement de jonction le cas échéant ;
6. bouton de téléchargement GPX ;
7. introduction éditoriale ou contexte factuel ;
8. chapitres concernés ;
9. principales villes traversées dans l’ordre.

La page reste utile si JavaScript ou la carte échoue.

### 22.2 Carte et profil

- carte en Client Component chargé après le contenu essentiel ;
- le PRD 03 n’introduit pas de carte : le présent lot choisit et qualifie sa
  propre dépendance cartographique ;
- artefact simplifié seulement ;
- aucune ligne au-dessus d’une rupture ;
- numéro, texte et motif en plus de la couleur ;
- fond distant non nécessaire pour voir la trace ;
- fournisseur de tuiles et confidentialité documentés avant chargement ;
- profil d’altitude affiché uniquement si disponible et relié au survol/focus
  de façon accessible ;
- carte et profil ne bloquent pas le LCP.

### 22.3 Liens

- villes liées seulement si leur page hub est publique ;
- chapitres toujours liés lorsqu’ils sont publiés ;
- quelques itinéraires connexes seulement si
  `featuredOnCityPages=true`, publics et indexables ;
- aucun maillage complet des 3 891 paires ;
- aucune page de résultat par query string.

Le PRD 04 complète les pages `/villes/[slug]` avec une section serveur
`Itinéraires à vélo` limitée aux itinéraires explicitement mis en avant. Le
tri utilise `editorialOrder`, puis distance et titre comme fallback stable.

## 23. SEO et URL canonique

### 23.1 Slug et direction

Pour une première révision, le slug suit son départ et son arrivée dans le
sens canonique. Les slugs du XLSX sont des suggestions et peuvent différer
pour une portion passant par l’origine ou une occurrence multiple.

Une seule URL existe. Aucun slug inverse automatique, aucune canonicalisation
par query string et aucune redirection construite depuis
`alternativeNames`.

Si une nouvelle source inverse la direction optimale :

- la révision est signalée `direction_changed` ;
- elle ne peut pas être activée silencieusement ;
- l’éditeur décide du nouveau slug ;
- l’ancien slug reçoit une redirection permanente explicite si la page reste
  publiée.

### 23.2 Metadata

Fallbacks factuels :

- title : `{Départ} – {Arrivée} à vélo : GPX du GTHF` ;
- description : distance sur le parcours, chapitres et téléchargement, sans
  promettre gare, commerce ou hébergement ;
- canonical : URL publique unique ;
- Open Graph : image SEO si présente, sans fabriquer une carte distante.

Une surcharge `shared.seo` reste possible. Les metadata n’énumèrent pas toutes
les villes traversées.

### 23.3 Indexation

- `seoStatus=indexable` : robots `index, follow`, sitemap et maillage autorisés ;
- `seoStatus=noindex` : robots `noindex, follow`, absent du sitemap et des
  listes automatiques ;
- `publicationNext=false` ou garde invalide : 404, pas une page noindex vide ;
- archive : 404 sauf redirection explicite ;
- aucun schéma de données structurées de route inventé dans ce lot ;
- un `BreadcrumbList` n’est ajouté que si un socle cohérent existe lors de
  l’implémentation.

Une page indexable contient au minimum géométrie réelle, métriques,
téléchargement, contexte GTHF, chapitres et villes utiles. Deux noms et un
chiffre ne suffisent pas.

## 24. Accessibilité, responsive et performance

### Accessibilité

- un seul H1 descriptif ;
- métriques dans du texte, pas seulement des pictogrammes ;
- téléchargement nommé avec sa direction ;
- carte non indispensable ;
- profil accompagné d’un résumé textuel ;
- liens de villes et chapitres explicites ;
- avertissements annoncés ;
- focus visible et cibles tactiles de 44 × 44 pixels CSS ;
- aucune distinction uniquement colorée ;
- navigation à 320 px sans défilement horizontal.

### Performance

- payload HTML initial sans GPX brut ;
- requête Strapi avec sélection stricte des champs ;
- carte et profil chargés en différé ;
- géométrie simplifiée plafonnée et mesurée ;
- images optimisées selon le socle existant ;
- aucun préchargement des 3 891 géométries ;
- téléchargement en streaming ;
- liste de ville hub limitée ;
- pagination du sitemap et des appels Strapi ;
- budgets LCP/INP/CLS mesurés sur une page courte et une portion de plus de
  200 km avant publication.

Le plan de production fixe les budgets numériques après mesure du déploiement
réel ; il ne peut pas accepter une régression manifeste du LCP des pages
existantes.

## 25. Sécurité, confidentialité et licences

- job sans route publique ;
- secrets uniquement dans l’environnement serveur ;
- aucun token `NEXT_PUBLIC_*` pour le catalogue ;
- RBAC admin minimal pour villes, ancres, runs et révisions ;
- collections techniques absentes du rôle public Strapi ;
- chemins, slugs et noms de fichiers neutralisés ;
- taille et XML des GPX validés, `DOCTYPE` refusé ;
- aucune URL contenue dans un GPX n’est appelée ;
- rapports privés exempts de secrets et de dumps de configuration ;
- aucun fichier ou position visiteur ;
- aucune dépendance aux sélections ou à la disponibilité du Builder
  interactif ;
- OSM reste une source datée avec attribution dans le manifeste ;
- commerces et identifiants OSM non rendus publiquement dans ce lot ;
- licences des géométries administratives et dépendances conservées avec leur
  snapshot ;
- objets S3 non publiés dans les DTO avant validation de la page.

Aucun analytics n’est détecté dans le frontend. Le MVP n’en ajoute pas. Un
futur socle consenti pourra mesurer page vue, téléchargement et code d’erreur
générique sans coordonnées ni contenu GPX utilisateur.

## 26. États d’erreur et cas limites

- **XLSX au mauvais hash :** import refusé ;
- **en-tête ou type inattendu :** ligne et colonne dans le rapport ;
- **ville déjà éditée :** conflit, aucune écriture automatique ;
- **commune homonyme :** rapprochement par clé, jamais par nom seul ;
- **94 ancres absentes du XLSX :** recalcul par polygone, statut proposé ;
- **nombre d’occurrences divergent :** validation humaine obligatoire ;
- **croisement/lacet :** tous les candidats conservés dans le rapport ;
- **deux arcs égaux :** tie-break déterministe ;
- **paire via origine :** fin puis début de boucle, direction publique exacte ;
- **jonction non validée :** révision en erreur ;
- **jonction acceptée :** plusieurs `trkseg` et avertissement ;
- **distance exactement au seuil :** exclue ;
- **distance de 8 m entre communes :** éligible mais avertissement de qualité ;
- **route de 218 km pour moins de 40 km directs :** éligible mais jamais
  auto-validée ;
- **altitude partielle :** dénivelé indisponible ;
- **temps non monotones entre chapitres :** temps omis selon le contrat ;
- **extension GPX nouvelle :** avertissement ou blocage, jamais perte muette ;
- **média inaccessible :** portion en erreur, ancienne révision inchangée ;
- **upload réussi puis DB échouée :** objet orphelin rapporté, pas de suppression ;
- **DB réussie puis processus interrompu :** reprise par curseur et hash ;
- **run concurrent :** second apply refusé ;
- **source modifiée après dry run :** apply refusé ;
- **slug en collision :** suffixe administratif proposé puis revue ;
- **direction modifiée :** activation bloquée avant décision URL ;
- **ville publiée sans hub :** texte public sans lien ville ;
- **Strapi indisponible :** erreur serveur ou cache précédent, pas faux 404 ;
- **flag global indisponible :** fermeture du catalogue ;
- **révision stale :** page et téléchargement 404 ;
- **archive avec redirect :** redirection permanente ; sinon 404.

## 27. Migration et mise en production

### 27.1 Préparation CMS

1. sauvegarder PostgreSQL et inventorier les médias ;
2. déployer les extensions `City` du PRD 01 ;
3. déployer les collections et contraintes uniques ;
4. ajouter le noyau pur et ses tests ;
5. ajouter la commande et son verrou ;
6. garder `catalogueEnabled=false` et le coupe-circuit global à `false`.

### 27.2 Import et qualification

1. convertir le XLSX vérifié en manifeste ;
2. lancer le dry run des 223 villes ;
3. résoudre les conflits avec les villes du PRD 01 ;
4. appliquer les villes en brouillon ;
5. figer les snapshots administratifs ;
6. importer les ancrages AB primaires validés du PRD 03 avec leur provenance ;
7. calculer les autres ancres nécessaires pour atteindre les 449 occurrences
   proposées ;
8. comparer occurrences et chaînages au XLSX ;
9. valider les ancres et les cinq jonctions non exactes ;
10. publier le `ReferenceRoute` seulement après revue.

### 27.3 Catalogue

1. dry run complet des 24 753 paires brutes ;
2. comparer totaux, 3 891 références et 70 lignes QA ;
3. expliquer toute différence au lieu de forcer le compteur ;
4. appliquer avec toutes les pages en brouillon, `publicationNext=false` et
   `seoStatus=noindex` ;
5. réimporter un échantillon de GPX générés ;
6. choisir un premier lot sans avertissement majeur ;
7. compléter et relire ses pages ;
8. déployer le frontend ;
9. activer le parcours, puis le coupe-circuit ;
10. publier d’abord les pages en noindex ;
11. vérifier HTML, GPX, carte, sitemap et logs ;
12. passer individuellement les pages prêtes à `indexable`.

### 27.4 Retour arrière

- fermer le coupe-circuit global ;
- conserver les documents, révisions et médias ;
- restaurer l’ancienne révision active si ses sources sont encore autorisées ;
- redéployer l’ancien frontend si nécessaire ;
- ne supprimer aucune collection ni colonne dans le rollback immédiat ;
- exécuter tout nettoyage média ultérieurement et séparément.

## 28. Critères d’acceptation

### Import et données

- le XLSX est reconnu par son SHA-256 et ses en-têtes ;
- les 223 identités sont rapprochées sans doublon par `municipalityKey` ;
- aucune ville, page ou relation de chapitre n’est publiée par l’import ;
- les divergences avec une ville éditée sont rapportées ;
- 449 occurrences sont proposées ou une différence est expliquée ;
- chaque ancre validée désigne segment, fraction, chaînage, source et version ;
- une ville à passages multiples ne perd aucune occurrence validée.

### Parcours et calcul

- les dix GPX AB correspondent aux sources administrées par SHA-256 ;
- l’ordre Hirson → … → Hirson est explicite et distinct de `displayOrder` ;
- aucun écart de jonction n’est ajouté comme segment ;
- une jonction non validée bloque les portions concernées ;
- chaque paire métier est générée une fois ;
- toutes les combinaisons d’occurrences et les deux arcs sont évalués ;
- les seuils `< 60000` et `< 40000` sont stricts et non arrondis ;
- les deux booléens d’éligibilité sont conservés ;
- le calcul direct reproduit les fixtures WGS84 à un centimètre ;
- les paires à ±250 m et les extrêmes sont signalés ;
- le dry run compare le résultat aux 3 891 produits sans traiter ce nombre
  comme constante applicative.

### Job et audit

- le dry run n’écrit ni en base ni dans S3 ;
- son rapport distingue créations, révisions, revérifiés inchangés, inchangés,
  stale, archives, erreurs et non concernés ;
- l’application exige le hash exact du rapport ;
- une source modifiée entre dry run et apply bloque l’application ;
- un second apply identique ne crée aucune donnée ni média ;
- une modification de GPX réévalue la boucle entière ; les résultats
  identiques sont seulement revérifiés et les résultats différents reçoivent
  une nouvelle révision ;
- deux applies concurrents sont impossibles ;
- une interruption est reprise au dernier curseur cohérent ;
- aucune transaction globale longue ;
- les objets orphelins éventuels sont rapportés ;
- aucun recalcul massif n’est déclenché par une sauvegarde éditoriale.

### GPX et métriques

- toute portion est extraite des points originaux ;
- les ancres sont les extrémités exactes du fichier ;
- les portions passant par l’origine sont dans le bon ordre ;
- les ruptures produisent plusieurs `trkseg`, pas une ligne inventée ;
- distance et somme des sous-séquences respectent la tolérance documentée ;
- D+/D− suivent la méthode versionnée ou sont indisponibles ;
- les horodatages sont omis conformément au contrat ;
- le GPX est reparsé avec succès ;
- le MIME et le nom de téléchargement sont corrects ;
- la géométrie simplifiée n’est jamais proposée comme GPX officiel.

### Publication et SEO

- une page échoue si une seule condition de la garde cumulative manque ;
- couper le flag global ferme pages, téléchargements, géométries, sitemap et
  maillages en 60 secondes au maximum ;
- une empreinte d’entrée absente ou divergente ferme les pages concernées ;
- modifier seulement un brouillon `City` ou `ReferenceRoute` ne ferme pas une
  page encore fondée sur la version publiée inchangée ;
- `publicationNext=false` donne 404 ;
- `noindex` reste hors sitemap et des listes automatiques ;
- `indexable` possède canonical, HTML utile et GPX ;
- une paire inverse ne crée aucune seconde URL ;
- changer un slug public exige une redirection explicite ;
- une révision stale ferme la page jusqu’à activation d’une révision valide ;
- une archive répond 404 ou redirige selon une décision enregistrée ;
- une panne Strapi ne transforme pas une page connue en faux 404 ni le
  sitemap en catalogue vide mis en cache ;
- aucune collection technique n’est lisible par le rôle public Strapi ;
- aucun secret Strapi n’entre dans le bundle client.

### Page publique

- titre, métriques, contexte, téléchargement et liens sont présents avant la
  carte ;
- la carte affiche la vraie forme simplifiée et les ruptures ;
- le profil n’existe que si l’altitude est qualifiée ;
- villes et chapitres sont dans l’ordre ;
- une ville sans hub n’est pas liée vers une 404 ;
- la page reste utile sans JavaScript ;
- mobile 320 px, toucher, clavier et lecteur d’écran sont testés ;
- aucune requête n’embarque les 3 891 géométries ;
- lint, build et tests passent sur les deux dépôts de production.

## 29. Plan de validation pour les agents de production

### 29.1 Tests unitaires du noyau

- inverse WGS84 sur valeurs du XLSX ;
- distance de polyligne et absence de saut de segment ;
- chaînage circulaire ;
- paire non ordonnée ;
- sélection multi-occurrences ;
- arc via origine ;
- tie-break ;
- seuils stricts à `-1 mm`, égalité et `+1 mm` ;
- projection point-segment ;
- intersection commune/trace ;
- interpolation d’ancre ;
- découpe multi-chapitre ;
- jonction exacte, acceptée et bloquée ;
- altitude complète, partielle et absente ;
- sérialisation puis relecture GPX ;
- sérialisation canonique des hashes.

### 29.2 Fixtures de référence

- les dix empreintes de l’onglet `Chapitres` ;
- quelques lignes par classification ;
- les 70 lignes QA ;
- au moins une des 60 portions via origine ;
- ville à 12 passages ;
- portion de moins de 100 m ;
- portion de plus de 200 km ;
- cinq jonctions non exactes ;
- GPX synthétique multi-segment, croisé et sans altitude ;
- changement d’un seul GPX vérifiant la réévaluation route entière et la
  distinction entre résultats revérifiés et réellement modifiés.

Le XLSX complet peut rester un artefact d’intégration ; les tests unitaires
emploient des fixtures textuelles minimales et lisibles.

### 29.3 Tests d’intégration CMS

- import dry run/apply/reprise ;
- contraintes de clés uniques ;
- version brouillon/publiée des villes et itinéraires ;
- création d’une révision sans écrasement ;
- invalidation sûre par route, ville ou ancre et revérification sans nouvel
  artefact lorsque le résultat reste identique ;
- mise à jour atomique des empreintes lors d’une mutation publiée et absence
  d’invalidation lors d’une simple édition de brouillon ;
- verrou concurrent ;
- upload, déduplication et échec S3 ;
- absence de permission publique ;
- archivage sans suppression ;
- seconde application inchangée ;
- pool PostgreSQL sous charge contrôlée.

### 29.4 Tests Next

- garde partagée sur page, metadata et handlers ;
- public, noindex, non publié, stale, archive et coupe-circuit ;
- preview authentifiée ;
- canonical et redirection permanente ;
- sitemap et panne Strapi ;
- téléchargement avec MIME/nom ;
- carte différée et erreur de géométrie ;
- page sans JavaScript ;
- liens de hubs limités ;
- absence de token dans le bundle ;
- cache et délai de fermeture mesurés sur la plateforme cible.

### 29.5 Recette manuelle

- comparer plusieurs distances avec le XLSX ;
- ouvrir et réimporter les GPX dans deux applications de navigation ;
- contrôler une portion mono-chapitre, multi-chapitre et via origine ;
- contrôler visuellement chaque jonction acceptée ;
- relire une page des trois classifications ;
- vérifier une route de plus de 200 km et une de moins de 500 m ;
- publier en noindex puis indexable ;
- couper le flag global ;
- modifier un GPX sur environnement de test et contrôler le diff ciblé ;
- simuler une panne Strapi pendant une revalidation ;
- tester Safari iOS, Chrome Android, clavier et lecteur d’écran.

## 30. Zones de code probablement concernées

### `gthdf-cms`

- extensions de `src/api/city/` issues du PRD 01 ;
- nouveaux content types sous `src/api/reference-route/`, `route-city/`,
  `route-anchor/`, `city-itinerary/`, `itinerary-revision/`, `catalogue-run/`
  et `itinerary-slug-redirect/` ;
- composants d’ordre de route, chapitres et villes traversés ;
- extension du single type `global` ;
- validations dans des services dédiés, pas uniquement `src/index.ts` ;
- noyau pur sous un dossier de service/lib cohérent avec le dépôt ;
- commande sous `scripts/` et script npm explicite ;
- manifeste d’import et fixtures ;
- migrations de clés/contraintes ;
- configuration MIME éventuelle pour la géométrie JSON ;
- tests et runbook opérateur.

### `gthdf-frontend`

- client Strapi serveur dédié ;
- `app/itineraires-velo/[slug]/page.tsx` et styles ;
- handlers `gpx` et `geometry` ;
- composants carte, profil, métriques, villes et chapitres ;
- extension des pages `app/villes/[slug]` du PRD 01 ;
- `app/sitemap.ts` ;
- registre/lookup de redirections ;
- extension éventuelle de la preview sécurisée aux routes du catalogue ;
- metadata et garde de publication partagée ;
- dépendances de carte et de profil propres au catalogue ;
- tests.

## 31. Dépendances avec les autres PRD

### PRD 01 — Référentiel des villes

Dépendance bloquante pour `City`, slug, publication et identité. La revue
croisée ajoute `municipalityKey`, pays, code national et provenance de
coordonnées. Le XLSX peut aider la saisie sélective du PRD 01 ; son import
complet reste dans le PRD 04.

Les hubs villes reçoivent dans ce lot une liste limitée d’itinéraires mis en
avant.

### PRD 02 — Retrouver son chapitre

Pas de dépendance d’exécution. `displayOrder` commence à Lille, alors que le
chaînage du catalogue commence à Hirson. La recherche du PRD 02 continue à
utiliser uniquement `cityPassages`, jamais les 223 communes importées sans
relation éditoriale.

Le PRD 02 est livré en production : le contrat `displayOrder` et les dix
chapitres ordonnés sont disponibles pour l’implémentation du catalogue.

L’index simplifié de proximité ne sert ni aux ancres, ni aux métriques, ni aux
exports.

### PRD 03 — GPX Builder v2

Le PRD 03 remplace le fusionneur par un sélecteur interactif ville à ville. Il
qualifie un ancrage primaire AB et BA par `cityPassage`, puis génère une
portion officielle à la demande sans la persister.

Le présent lot dépend de son contrat de parsing, empreinte, point synthétique,
découpe cyclique, jonction, distance, dénivelé et sérialisation. Les deux
dépôts ne disposent pas d’un mécanisme de package commun : le MVP n’introduit
pas une publication de package uniquement pour ce partage.

Différences intentionnelles :

- le Builder sert une paire ordonnée dans le sens AB ou BA choisi ;
- le catalogue conserve une paire métier non ordonnée et un arc AB canonique ;
- le Builder retient un arrêt primaire éditorial par passage ;
- le catalogue qualifie toutes les occurrences nécessaires à son choix
  d’arc ;
- le Builder calcule à la demande sans persistance ;
- le catalogue crée des révisions et médias immuables ;
- les deux lots utilisent uniquement des sources officielles et omettent les
  horodatages dérivés.

Les ancrages AB primaires peuvent être importés comme
`RouteAnchor.origin=prd03_primary` s’ils correspondent au média et à
l’occurrence courants. Ils ne remplacent pas les 449 occurrences attendues.
Les jonctions AB qualifiées sont reprises avec leur lieu et leur note de revue
sans fusionner les données directionnelles du PRD 03.
Le job ne doit pas appeler l’endpoint public du Builder : fermer le Builder ne
ferme pas le catalogue.

### Synchronisations cartographiques

Google My Maps, KML et conflits de synchronisation restent dans un PRD
transverse ultérieur. Ils ne conditionnent ni le calcul, ni la publication.

## 32. Décisions prises et validations restantes

### Décisions prises

- dix GPX AB et origine Hirson ;
- paire métier non ordonnée ;
- arc le plus court en sens canonique ;
- clé métier indépendante du slug ;
- distance WGS84 ellipsoïdale ;
- seuils stricts avec `OU` ;
- tous les extrêmes restent candidats mais exigent une revue ;
- XLSX comme baseline vérifiée, pas comme base directement publiée ;
- snapshots administratifs nécessaires pour les 449 ancres ;
- ancrages AB primaires du PRD 03 réutilisés avec provenance, sans réduire le
  nombre d’occurrences attendu ;
- jonctions explicites, aucune ligne inventée ;
- lieux de jonction PRD 03 réutilisés sans seconde décision éditoriale ;
- séparation itinéraire/révision ;
- commande serveur, pas de cron ou route longue ;
- dry run strict puis apply par hash ;
- verrou, curseur et transactions courtes ;
- médias immuables et nettoyage séparé ;
- temps omis des GPX catalogue ;
- aucun export BA dans le MVP ;
- coupe-circuit Strapi fail-closed ;
- API privée consommée avec token serveur ;
- 404 pour archive sans redirection ;
- liens de hubs éditorialement limités ;
- aucun analytics ajouté.

### Validations réellement restantes

- appliquer puis publier les cinq qualifications de jonction préparées dans
  le PRD 03 ; le catalogue doit vérifier leurs empreintes avant import ;
- choisir où versionner le XLSX original, son manifeste normalisé et les
  snapshots de limites administratives ;
- confirmer la forme finale de la tâche serveur one-shot du catalogue sur
  Clever Cloud ; les migrations PRD 01/02 ont déjà validé l’accès ponctuel à
  PostgreSQL via la CLI Clever depuis une commande npm locale ;
- qualifier le comportement exact du provider Strapi pour les clés d’objet,
  MIME, Content-Disposition et déduplication ;
- sélectionner l’implémentation WGS84 compatible Node et navigateur ;
- valider la méthode D+/D− sur des références connues ;
- mesurer temps, mémoire et volume S3 d’un run complet ;
- qualifier le cache ISR partagé en cas d’autoscaling sur Clever Cloud ;
- décider du premier lot éditorial et si les candidats `direct seulement` de
  plus de 100 km doivent rester durablement non indexables ;
- définir l’opérateur habilité à appliquer un run et à valider une jonction.

Ces validations ne permettent pas d’affaiblir le `OU`, de publier en masse ou
d’inventer une continuité. Toute adaptation est reportée dans la PR de
production avec ses mesures et effets sur l’inventaire.

## 33. Définition de terminé

Le lot est terminé lorsqu’un opérateur peut partir des sources officielles,
produire un rapport reproductible, appliquer seulement ce rapport et obtenir
des révisions GPX auditables sans doublon. Un éditeur peut comparer, enrichir
et publier progressivement une portion ; Next ne sert que les révisions
actuelles qui passent toutes les gardes.

Un cyclotouriste arrive alors sur une URL canonique unique, comprend la vraie
distance sur le GTHF, consulte une géométrie fidèle, voit les chapitres et
villes utiles et télécharge un GPX valide. Aucun produit inverse, brouillon,
fichier visiteur ou combinaison SEO vide n’apparaît par accident.
