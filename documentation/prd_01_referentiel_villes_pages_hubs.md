# PRD 01 — Référentiel des villes et pages hubs

**Version :** 0.6\
**Date :** 5 août 2026\
**Statut :** implémenté — référentiel et relations chargés en brouillon\
**Dépôts concernés par l’implémentation :** `gthdf-cms`, `gthdf-frontend`\
**Marque publique :** GTHF

---

## 1. Résumé de la décision

Ce lot crée un référentiel éditorial normalisé des villes dans Strapi, relie
ces villes aux chapitres dans leur ordre de passage et publie des pages hubs
sélectives sous `/villes/[slug]`.

Il fournit la donnée de référence aux futurs lots de recherche mobile,
géolocalisation, itinéraires ville à ville et exploitation avancée des traces
GPX. Il ne réalise aucune de ces fonctionnalités dans ce lot.

Les décisions structurantes sont les suivantes :

1. une ville devient un document Strapi réutilisable et doté d’un slug stable ;
2. les passages sont saisis dans un composant répétable du chapitre ;
3. l’ordre natif du composant répétable est la seule source de vérité de
   l’ordre de parcours ; aucun entier `order` redondant n’est ajouté ;
4. les rôles `start`, `intermediate` et `end` sont définis relativement au sens
   canonique existant `startStation → endStation` ;
5. une page ville publique exige à la fois une version Strapi publiée et le
   booléen métier `hasPublicPage=true` ;
6. le champ JSON legacy `cities` est conservé pendant une transition
   réversible ; sa suppression fera l’objet d’un nettoyage ultérieur ;
7. aucune page `/villes` générale et aucune page ville à ville ne sont créées
   dans ce lot ;
8. la reprise initiale charge les 223 villes uniques du parcours et leurs 233
   passages ordonnés dans les brouillons Strapi, sans publier de ville ni de
   nouvelle version de chapitre.

## 2. Contexte et problème

Les noms de villes sont aujourd’hui répartis entre :

- `startStation` et `endStation` dans les chapitres ;
- un tableau JSON `cities` utilisé comme enrichissement SEO ;
- les métadonnées et points des fichiers GPX.

Ces représentations ne constituent pas un référentiel stable. Une même ville
peut être orthographiée différemment, n’a pas d’identifiant éditorial partagé
et ne peut pas être reliée proprement à plusieurs chapitres ou à de futures
fonctionnalités.

Le GPX reste une source géographique, mais ne devient pas une source de vérité
pour les noms, slugs ou contenus éditoriaux.

## 3. Objectifs

- disposer dans Strapi d’une ville unique et réutilisable ;
- préserver un slug public stable indépendamment des évolutions du libellé ;
- ordonner les villes traversées par chaque chapitre ;
- distinguer les extrémités et passages intermédiaires dans les données ;
- afficher un résumé naturel et indexable dans chaque page de chapitre ;
- publier uniquement les pages villes apportant une navigation ou un contenu
  utile ;
- fournir un contrat stable aux PRD suivants ;
- charger en brouillon les 223 villes uniques et les 233 passages nécessaires
  à la recherche complète du PRD 02 ;
- préparer le PRD 04 sans importer ses commerces, produits ville à ville ni
  ancres de route dans le présent lot.

## 4. Non-objectifs

Ce lot ne doit pas :

- publier automatiquement les villes ou les nouvelles versions des chapitres
  issues de la reprise ;
- considérer les commerces OSM comme une donnée éditoriale de référence ;
- générer une page publique pour chaque entrée du référentiel ;
- créer une page d’index `/villes` ;
- générer des itinéraires ou des paires ville à ville ;
- découper, transformer ou publier des GPX ;
- synchroniser Google My Maps ;
- ajouter une carte aux pages villes ;
- renommer globalement les identifiants techniques legacy `GTHDF` ;
- introduire une nouvelle bibliothèque de données structurées ;
- mettre en place un mécanisme générique de redirection de slugs.

## 5. Utilisateurs

### Voyageur

Il veut comprendre où une ville se situe sur le Grand Tour des
Hauts-de-France et accéder aux chapitres qui commencent, se terminent ou
passent par cette ville.

### Éditeur Strapi

Il veut saisir une ville une seule fois, la rattacher à plusieurs chapitres,
ordonner les passages et décider explicitement si cette ville mérite une page
publique.

### Moteur de recherche

Il doit recevoir un HTML initial contenant un texte factuel, des liens
cohérents et une page dont l’existence ne dépend pas d’un rendu client.

### Futurs consommateurs internes

Les lots de recherche mobile, de géolocalisation, de catalogue ville à ville
et de Builder doivent pouvoir consommer la même identité, le même slug et les
mêmes passages ordonnés.

## 6. État initial du dépôt confirmé par inspection

Cette section conserve le point de départ observé avant l’implémentation. Le
bilan post-déploiement figure en section 13.4.

### CMS

- le CMS utilise Strapi `5.43.0` ;
- `Chapter` est une collection avec `draftAndPublish=true` ;
- `Chapter` contient déjà `startStation`, `endStation`, `gpxFileAB`,
  `gpxFileBA` et le champ JSON `cities` ;
- le composant `shared.seo` existe et contient `metaTitle`,
  `metaDescription` et `shareImage` ;
- la taille des images SEO est validée centralement pour certains types dans
  `src/index.ts` ;
- la preview Strapi est configurée dans `config/admin.ts` pour les routes
  dynamiques existantes ;
- `database/migrations/` existe, mais ne contient aucune migration métier ;
- aucun booléen équivalent à `hasPublicPage` n’existe actuellement.

### Frontend

- le frontend utilise Next.js `16.0.10`, React `19.2.1` et App Router ;
- les pages de chapitres sont des Server Components sous
  `app/chapitres/[slug]` ;
- les données de chapitres sont récupérées avec une revalidation de 300
  secondes ;
- `app/sitemap.ts` construit un sitemap dynamique, revalidé toutes les heures ;
- le Draft Mode Next est déjà relié à la preview Strapi ;
- la route Next `/api/preview` active actuellement le Draft Mode sans secret
  partagé ; limiter son CORS ne constitue pas une authentification ;
- le champ JSON `cities` alimente actuellement le fallback de meta description
  d’un chapitre, mais aucun bloc de villes n’est rendu dans le corps HTML ;
- le helper Strapi utilise encore le paramètre legacy `publicationState` pour
  la preview, alors que Strapi 5 utilise `status=draft` ou
  `status=published` ; ce point doit être corrigé et testé dans
  l’implémentation afin de préserver la preview existante.

### Conséquence sur la livraison

L’implémentation nécessitera deux PR de production coordonnées :

1. une PR `gthdf-cms` pour les modèles, validations, preview et migration de
   données ;
2. une PR `gthdf-frontend` pour les requêtes, pages, composants, métadonnées et
   sitemap.

Le CMS doit être déployé avant le frontend qui consomme les nouveaux champs.

## 7. Modèle Strapi cible

Les noms techniques suivent les conventions anglaises déjà majoritaires dans
le dépôt. Les libellés de l’administration et tous les textes publics restent
en français.

### 7.1 Collection `City`

UID proposé : `api::city.city`\
Nom de collection proposé : `cities`\
Option : `draftAndPublish=true`

| Champ technique | Type | Requis | Règle |
|---|---|---:|---|
| `name` | string | oui | Libellé public, par exemple `Saint-Omer` |
| `slug` | UID basé initialement sur `name` | oui | Unique et stable après première publication publique |
| `alternativeNames` | JSON | non | Tableau de variantes réelles, sans créer d’URL |
| `municipalityKey` | string | oui à la publication | Identité technique unique et immuable, par exemple `FR-02381` |
| `countryCode` | string | oui à la publication | Code ISO 3166-1 alpha-2, par exemple `FR` ou `BE` |
| `municipalityCode` | string | oui à la publication | Code national conservé comme texte ; code INSEE pour la France |
| `administrativeArea` | string | non | Département, province ou autre zone utile à la désambiguïsation |
| `latitude` | decimal | non | Latitude éditoriale, comprise entre -90 et 90 |
| `longitude` | decimal | non | Longitude éditoriale, comprise entre -180 et 180 |
| `coordinateSource` | JSON | non | Provenance privée de la paire de coordonnées : source, date et méthode |
| `shortDescription` | text | non | Introduction propre à la ville, sans texte générique automatique |
| `blocks` | dynamic zone existante | non | Réutilise uniquement les composants éditoriaux partagés nécessaires |
| `hasPublicPage` | boolean | oui | Défaut `false` ; active l’éligibilité de la route Next |
| `seo` | `shared.seo` | non | Surcharge des métadonnées par défaut |

`municipalityKey` est la clé de rapprochement entre les lots. Elle est formée
une fois depuis le pays et le code administratif, porte une contrainte
`unique`, puis ne change plus lorsque le nom ou le slug évolue.
`municipalityCode` remplace un champ exclusivement français `inseeCode` : sa
valeur seule n’est pas unique entre pays. Le nom n’est pas déclaré unique. Si
deux communes homonymes doivent être publiées, le slug est désambiguïsé de
façon éditoriale avant sa première publication.

`alternativeNames` respecte le contrat suivant :

- valeur absente ou tableau JSON de chaînes ;
- chaînes nettoyées des espaces de début et de fin ;
- aucune chaîne vide ;
- aucune valeur dupliquée après normalisation casse/accents ;
- aucune URL ou redirection générée à partir de ces valeurs.

Les coordonnées sont soit toutes les deux absentes, soit toutes les deux
valides. Lorsqu’elles sont renseignées depuis une source externe,
`coordinateSource` est obligatoire et n’entre pas dans le DTO public. Elles ne
sont ni calculées ni affichées par ce lot.

Le composant SEO existant est réutilisé. `City` doit rejoindre la validation
centrale de l’image de partage déjà appliquée aux autres contenus SEO.

### 7.2 Composant `City passage`

Composant proposé : `chapter.city-passage`

| Champ technique | Type | Requis | Règle |
|---|---|---:|---|
| `city` | relation vers `api::city.city` | oui | Une ville normalisée |
| `role` | enum | oui | `start`, `intermediate` ou `end` |
| `featured` | boolean | oui | Défaut `false` ; sélectionne un intermédiaire pour le résumé et la liste compacte |
| `note` | string ou text court | non | Information éditoriale factuelle, jamais générée automatiquement |

Le type `Chapter` reçoit un composant répétable `cityPassages`.

L’ordre du tableau `cityPassages` renvoyé par Strapi est l’ordre du parcours.
Aucun champ numérique `order` n’est ajouté : il créerait une seconde source de
vérité et une possibilité de divergence avec l’ordre natif du composant.

### 7.3 Invariants de publication d’un chapitre

Les validations métier suivantes s’appliquent au moment de publier un
chapitre. Un brouillon incomplet doit rester enregistrable pour ne pas bloquer
le travail progressif d’un éditeur.

- au moins deux passages sont présents ;
- exactement un passage possède le rôle `start` ;
- exactement un passage possède le rôle `end` ;
- le premier passage est `start` ;
- le dernier passage est `end` ;
- tous les passages entre les deux sont `intermediate` ;
- `featured` n’a d’effet public que pour un passage `intermediate` ;
- au maximum six passages `intermediate` possèdent `featured=true` ;
- le sens des rôles correspond à `startStation → endStation` ;
- une même ville peut appartenir à plusieurs chapitres ;
- aucune contrainte d’unicité de ville dans un chapitre n’est imposée afin de
  ne pas exclure un futur itinéraire repassant par la même commune.

Les contraintes qui ne peuvent pas être exprimées par le schéma Strapi doivent
être validées par la mécanique de validation déjà employée par le CMS, avec un
message exploitable par l’éditeur.

### 7.4 Champs legacy conservés

`startStation` et `endStation` restent inchangés dans ce lot. Ils continuent
d’alimenter les interfaces existantes. Les passages `start` et `end` leur sont
associés pendant la migration, mais aucune égalité stricte de libellé n’est
imposée : une station et une commune peuvent légitimement utiliser des textes
différents.

Le champ JSON `cities` est marqué comme legacy, mais n’est pas supprimé dans la
première livraison. Après migration :

- les éditeurs ne doivent plus le modifier ;
- `cityPassages` devient la source de vérité des nouvelles fonctionnalités ;
- le frontend peut conserver un fallback transitoire vers `cities` ;
- la suppression du champ et du fallback intervient seulement après contrôle
  des données de production.

## 8. Règles de publication d’une page ville

Une ville est publiquement accessible uniquement si les trois conditions sont
réunies :

1. le document `City` possède une version Strapi publiée ;
2. `hasPublicPage=true` sur la version publiée ;
3. au moins un chapitre publié la référence dans `cityPassages`.

En mode public, l’absence d’une de ces conditions entraîne une réponse 404 et
l’exclusion du sitemap et des liens internes.

En Draft Mode authentifié, un éditeur peut prévisualiser un brouillon ou une
ville dont `hasPublicPage=false`. La preview reste protégée par le mécanisme
existant et porte `noindex, nofollow`.

La configuration de preview Strapi doit ajouter `api::city.city` avec la route
`/villes/[slug]`. Le chemin reçu par l’API de preview reste limité à une URL
interne.

Changer `name` ne doit jamais régénérer automatiquement un slug déjà public.
En l’absence d’un registre de redirections dans le projet, une modification du
slug après première publication publique est refusée. Une correction
exceptionnelle nécessite une redirection permanente livrée avec le changement
et sort du flux éditorial normal.

## 9. Expérience publique

### 9.1 Bloc dans une page chapitre

Un bloc serveur compact est regroupé avec la section des checkpoints, après la
navigation du chapitre. Lorsque la largeur le permet, les villes et les
checkpoints forment deux colonnes adjacentes dans une même zone de repères du
parcours. Sur écran étroit, ces deux colonnes sont empilées.

Le bloc conserve un résumé naturel et indexable :

> **Villes traversées**\
> Ce chapitre relie Hirson à Soissons en passant notamment par Guise,
> Saint-Quentin et Chauny.

Le bloc respecte les règles suivantes :

- il ne forme plus une carte pleine largeur entre l’introduction et la
  navigation ;
- son poids visuel est comparable à celui de la liste des checkpoints : titre
  de section, phrase courte puis cartes bordées compactes ;
- les cartes de villes sont statiques et ne reprennent pas le bouton ou le
  comportement dépliant d’un checkpoint ;
- la liste visible utilise la ville `start`, jusqu’à six intermédiaires
  `featured=true`, puis la ville `end` ;
- les villes visibles conservent leur ordre relatif dans `cityPassages` ;
- les extrémités sont affichées même si `featured=false` ;
- les passages non mis en avant restent dans `cityPassages` pour les usages de
  données, notamment la recherche du PRD 02, mais ne sont pas rendus dans ce
  bloc ;
- une ville ne devient un lien que si sa page publique remplit les conditions
  de la section 8 ;
- une ville sans page publique reste du texte, elle n’est pas masquée ;
- le texte est rendu dans le HTML initial ;
- aucune distance ou information absente de Strapi n’est inventée.

Formulations minimales :

- aucun intermédiaire mis en avant : `Ce chapitre relie X à Y.` ;
- un intermédiaire : `Ce chapitre relie X à Y en passant notamment par A.` ;
- plusieurs intermédiaires : liste française avec virgules et `et` avant le
  dernier élément.

Si les passages sont absents pendant la transition, le nouveau bloc n’est pas
rendu avec des données partielles. Le contenu existant du chapitre reste
fonctionnel.

### 9.2 Route `/villes/[slug]`

La page est un Server Component et comprend, dans cet ordre :

1. un lien de retour vers les chapitres ;
2. un H1 explicite : `<Ville> à vélo sur le Grand Tour des Hauts-de-France` ;
3. `shortDescription` lorsqu’elle existe ;
4. la liste des chapitres publiés concernés ;
5. les blocs éditoriaux lorsqu’ils existent.

Chaque chapitre est affiché une seule fois avec :

- son titre ;
- ses extrémités existantes ;
- sa distance existante ;
- le rôle de la ville dans ce chapitre, formulé en français ;
- un lien vers `/chapitres/[slug]`.

Lorsque le PRD 02 est déployé, les chapitres sont triés par `displayOrder`.
Avant ce déploiement, un fallback déterministe par titre puis slug est accepté :
la chaîne `nextChapter` forme une boucle et ne fournit pas seule une origine
stable. L’ordre de retour de l’API n’est jamais utilisé.

Une ville sans blocs éditoriaux peut avoir une page publique si elle dessert au
moins un chapitre : la page constitue alors un hub de navigation factuel. Le
frontend ne génère aucun paragraphe de remplissage.

Aucun emplacement vide « itinéraires à venir » n’est affiché. Le PRD 04 ajoute
cette zone uniquement lorsque le catalogue dispose de données publiées et
explicitement mises en avant.

## 10. Contrat API et architecture frontend

### 10.1 Données minimales d’une ville

- `documentId` ;
- `name` ;
- `slug` ;
- `alternativeNames` pour les futurs consommateurs, sans les rendre
  nécessairement dans la page ;
- coordonnées lorsqu’elles existent ;
- `shortDescription` ;
- `blocks` et leurs seuls médias utilisés ;
- `hasPublicPage` ;
- `seo` et `seo.shareImage` ;
- `updatedAt` pour le sitemap.

### 10.2 Données minimales d’un chapitre

- identifiant stable, slug et titre ;
- `startStation`, `endStation` et `distance` ;
- relations nécessaires au tri canonique ;
- `cityPassages` dans leur ordre natif ;
- pour chaque passage : `role`, `featured`, `note` si utilisée et
  `city.name`, `city.slug`, `city.hasPublicPage` ainsi que son état publié.

### 10.3 Requêtes

- aucune requête `populate=*` n’est introduite ;
- les champs et populations sont explicites ;
- une page ville utilise un nombre fixe de requêtes : une pour la ville et une
  pour ses chapitres au maximum ;
- aucun fetch n’est lancé chapitre par chapitre ;
- la récupération utilisée par `generateMetadata` et celle de la page sont
  dédupliquées avec la convention de cache serveur existante ;
- le sitemap récupère uniquement les champs nécessaires à ses URL ;
- la page chapitre étend sa requête existante avec
  `cityPassages.city`, sans second parcours N+1.

Le frontend peut créer un module `lib/cities.ts` ou intégrer ces fonctions au
client Strapi existant. Le choix doit préserver la séparation actuelle entre
les fonctions propres aux chapitres et le client générique.

### 10.4 Rendu et cache

- `generateStaticParams` retourne les slugs publiquement éligibles connus lors
  du build ;
- les paramètres dynamiques restent autorisés afin qu’une nouvelle ville
  puisse être générée à la première requête sans attendre un rebuild complet ;
- les données d’une page ville suivent une revalidation de 300 secondes,
  cohérente avec les chapitres ;
- le sitemap conserve sa revalidation d’une heure ;
- un changement éditorial peut donc mettre jusqu’à ces durées à apparaître en
  l’absence d’invalidation à la demande ; aucun webhook n’est ajouté par ce
  lot ;
- un slug absent ou non éligible appelle `notFound()` ;
- une panne transitoire de Strapi ne doit pas être transformée volontairement
  en 404 si une version ISR valide peut encore être servie.

### 10.5 Preview Strapi 5

Avant d’ajouter `City` à la preview, la route `/api/preview` doit exiger un
secret serveur vérifié en temps constant et n’accepter qu’un chemin interne
construit pour un type autorisé. Le CORS existant reste une protection
navigateur complémentaire, pas le contrôle d’accès.

Le client utilise le contrat Strapi 5 :

- `status=published` en public lorsque le paramètre doit être explicite ;
- `status=draft` en Draft Mode ;
- aucune nouvelle utilisation de `publicationState`.

La correction du helper commun doit être vérifiée sur les previews de ville,
chapitre et article afin de ne pas corriger la nouvelle route en régressant les
routes existantes.

## 11. SEO et indexation

### 11.1 Métadonnées par défaut

Pour une ville nommée `Saint-Omer` :

- H1 : `Saint-Omer à vélo sur le Grand Tour des Hauts-de-France` ;
- title : `Saint-Omer à vélo — Grand Tour des Hauts-de-France` ;
- canonical : URL absolue `/villes/saint-omer` ;
- image sociale : `seo.shareImage` lorsqu’elle existe.

Ordre de choix de la meta description :

1. `seo.metaDescription` ;
2. `shortDescription` si elle constitue une description autonome ;
3. une phrase factuelle fondée sur la ville et le ou les chapitres publiés.

Le fallback ne cite que des relations réellement publiées et ne concatène pas
artificiellement une liste de mots-clés.

### 11.2 Sitemap et liens

- seules les villes remplissant toutes les conditions publiques sont ajoutées
  au sitemap ;
- `lastModified` utilise `updatedAt` plutôt que la date courante ;
- une ville non éligible ne reçoit aucun lien depuis les chapitres ;
- les noms alternatifs ne créent ni URL, ni canonical alternatif, ni page
  dupliquée ;
- aucune page `/villes` n’est ajoutée dans ce lot.

### 11.3 Pages de chapitre

Le contenu visible des villes remplace le rôle SEO du tableau JSON legacy.
Pour le fallback de meta description d’un chapitre :

- une surcharge `seo.metaDescription` reste prioritaire ;
- les extrémités et au plus trois intermédiaires mis en avant peuvent être
  utilisés ;
- toutes les villes du référentiel ne sont jamais concaténées dans la meta
  description.

### 11.4 Données structurées

Ce lot n’introduit aucun nouveau type Schema.org. Une évolution ultérieure
pourra en ajouter après définition d’un contrat pertinent et vérifiable.

## 12. Accessibilité et sécurité de rendu

- la page conserve une hiérarchie de titres logique ;
- le rôle d’une ville dans un chapitre est exprimé par du texte, pas uniquement
  par une couleur ;
- tous les liens sont accessibles au clavier et possèdent un intitulé
  compréhensible hors contexte ;
- l’absence de contenu éditorial ne produit pas de région ou de titre vide ;
- aucun champ de ville n’est interpolé comme HTML brut ;
- les blocs riches suivent le pipeline de rendu de contenu de confiance déjà
  retenu par le projet ;
- si ce pipeline transforme du Markdown en HTML, l’agent de production doit
  vérifier explicitement le risque de HTML non filtré avant de réutiliser
  `dangerouslySetInnerHTML` ;
- les pages de preview conservent `noindex, nofollow`.

## 13. Migration et saisie initiale

### 13.1 Principe

La migration est non destructive, observable et idempotente. Elle ne repose
pas sur une modification SQL manuelle des tables Strapi de documents,
composants ou versions publiées.

Le dépôt ne possédant pas de convention de migration métier existante,
l’implémentation doit fournir un script explicite utilisant les services
Strapi 5, avec :

- un mode `dry-run` par défaut ;
- un mode d’application volontaire ;
- un rapport des créations, correspondances, ambiguïtés et erreurs ;
- aucune republication silencieuse d’un chapitre ;
- un second passage sans création de doublons ni changement supplémentaire.

### 13.2 Sources de reprise

La reprise initiale utilise le
[CSV contrôlé des villes](data/gthf_villes_et_produits_seo/csv/villes.csv)
comme source d’identité pour les 223 documents `City`. Le chaînage documenté,
les bornes des dix chapitres et les champs legacy `startStation` et
`endStation` permettent de construire 233 passages : dix départs, 213
intermédiaires et dix arrivées.

Les champs legacy servent à contrôler les extrémités et à rapprocher les dix
villes déjà présentes. Ils ne remplacent pas la liste exhaustive issue du
jeu de données contrôlé. Les 213 identités absentes sont créées à partir de
leur `municipalityKey` ; aucune correspondance ambiguë n’est acceptée.

Une seconde migration indépendante applique `featured=true` uniquement aux
intermédiaires de la sélection éditoriale ci-dessous. Tous les autres passages
restent dans le modèle et pourront alimenter la recherche du PRD 02.

La sélection initiale est assistée par les données du CSV (population,
commerces, proximité de la trace et répartition le long du parcours), puis
validée éditorialement. Elle ne remplace pas la liste exhaustive des passages.
Un chapitre peut comporter moins de six intermédiaires mis en avant lorsqu’un
sixième choix n’est pas suffisamment pertinent.

| Chapitre | Intermédiaires `featured`, dans l’ordre du parcours |
|---|---|
| Hirson → Soissons | Étréaupont, Guise, La Fère, Laon, Urcel, Crouy |
| Soissons → Beauvais | Ambleny, Pierrefonds, Pont-Sainte-Maxence, Senlis, Creil, Hermes |
| Beauvais → Amiens | Goincourt, Crèvecœur-le-Grand, Ailly-sur-Noye, Villers-Bretonneux, Camon |
| Amiens → Étaples | Ailly-sur-Somme, Abbeville, Friville-Escarbotin, Saint-Valery-sur-Somme, Quend, Berck |
| Étaples → Calais | Camiers, Outreau, Boulogne-sur-Mer, Ambleteuse, Sangatte |
| Calais → Saint-Omer | Oye-Plage, Gravelines, Dunkerque, Coudekerque-Branche, Watten, Saint-Martin-lez-Tatinghem |
| Saint-Omer → Lille | Arques, Steenvoorde, Boeschepe, Bailleul, Armentières, Lambersart |
| Lille → Arras | Villeneuve-d’Ascq, Libercourt, Carvin, Lens, Aix-Noulette, Achicourt |
| Arras → Condé-sur-l’Escaut | Saint-Laurent-Blangy, Arleux, Aniche, Somain, Raismes, Fresnes-sur-Escaut |
| Condé-sur-l’Escaut → Hirson | Quiévrechain, Bavay, Landrecies, Avesnes-sur-Helpe, Eppe-Sauvage, Momignies |

La reprise par nom normalisé peut ignorer casse, accents, espaces et tirets pour
proposer une correspondance. Elle ne fusionne jamais automatiquement deux
homonymes ou deux cas ambigus. Ces cas apparaissent dans le rapport et sont
résolus éditorialement avec `municipalityKey`.

Les villes nécessaires aux chapitres publics peuvent être publiées dans
Strapi avec `hasPublicPage=false`. Elles peuvent alors alimenter le contenu
factuel des chapitres sans créer leur propre route publique.

### 13.3 Workflow éditorial

1. sauvegarder la base avant toute application ;
2. exécuter le dry-run des 223 documents `City` et relire son rapport ;
3. créer les identités absentes sans publier les documents ;
4. exécuter puis appliquer le rapprochement des 233 passages sur les dix
   brouillons de chapitre ;
5. exécuter puis appliquer la sélection des 58 intermédiaires `featured` ;
6. rejouer chaque dry-run et exiger un résultat inchangé ;
7. relire les passages de chaque chapitre ;
8. publier séparément les villes et versions de chapitres nécessaires au
   produit concerné ;
9. activer `hasPublicPage` uniquement pour les pages hubs relues ;
10. contrôler pages, liens et sitemap sur l’environnement cible.

Le
[classeur contrôlé `GTHF_villes_et_produits_SEO.xlsx`](data/gthf_villes_et_produits_seo/source/GTHF_villes_et_produits_SEO.xlsx),
qualifié dans le PRD 04, et ses
[exports CSV documentés](data/gthf_villes_et_produits_seo/) constituent la
source contrôlée de cette reprise. Le PRD 01 n’en importe que les identités et
attributs utiles aux documents `City` et à leurs passages ordonnés.

Les commerces, qualifications OSM, ancres de route et produits ville à ville
restent hors de ce lot et relèvent du PRD 04. La reprise n’active ni publication
Strapi ni `hasPublicPage`, et chaque rapprochement reste visible dans le
dry-run avant application.

### 13.4 Bilan de la migration de production

La reprise exécutée le 5 août 2026 a produit le résultat suivant :

- 223 documents `City` en brouillon : dix déjà présents et 213 créés ;
- 233 passages ordonnés sur les dix brouillons de chapitre : dix `start`, 213
  `intermediate` et dix `end` ;
- 58 passages intermédiaires `featured`, conformément à la sélection de la
  section 13.2 ;
- `hasPublicPage=false` pour toutes les villes reprises ;
- aucune publication automatique de ville ou de chapitre ;
- aucun conflit et aucune erreur dans les rapports d’application ;
- dry-runs de contrôle sans changement après application, confirmant
  l’idempotence des deux migrations.

Ces brouillons constituent le socle de données du PRD 02. Ils ne deviennent
publics et cherchables qu’après publication éditoriale des documents `City` et
des versions de chapitre qui portent leurs `cityPassages`.

## 14. Déploiement et retour arrière

Ordre de déploiement recommandé :

1. déployer le schéma et les validations CMS compatibles avec l’ancien
   frontend ;
2. exécuter et contrôler la migration de données ;
3. déployer le frontend capable de lire `cityPassages` ;
4. publier les chapitres migrés ;
5. activer progressivement les pages villes relues.

Le retour arrière repose sur les propriétés suivantes :

- `cities`, `startStation` et `endStation` ne sont pas supprimés ;
- les nouvelles pages peuvent être désactivées avec `hasPublicPage=false` ;
- l’ancien frontend ignore les nouveaux champs ;
- le nouveau frontend conserve temporairement le fallback legacy défini lors
  de l’implémentation ;
- aucune migration destructive n’est exécutée dans ce lot.

## 15. Cas limites

- **Ville partagée par deux chapitres :** la page liste les deux chapitres une
  seule fois chacun avec leur rôle respectif.
- **Ville publiée sans chapitre publié :** aucune page publique ni entrée de
  sitemap.
- **Ville liée mais sans page publique :** nom en texte simple dans le résumé
  du chapitre.
- **Chapitre sans intermédiaire mis en avant :** phrase `Ce chapitre relie X à
  Y.`.
- **Ville sans contenu éditorial :** page permise uniquement si elle constitue
  un hub vers au moins un chapitre publié.
- **Homonymes :** pas de fusion par nom ; désambiguïsation avec slug et données
  administratives.
- **Modification du nom :** slug public inchangé.
- **Tentative de modification du slug public :** opération refusée hors flux
  de redirection explicite.
- **Coordonnée partielle ou invalide :** sauvegarde refusée avec un message
  précis.
- **Passages invalides dans un brouillon :** sauvegarde permise, publication
  refusée.
- **Strapi indisponible pendant la génération :** le sitemap peut omettre
  temporairement les villes selon son comportement de secours existant, mais
  le build ne doit pas fabriquer de pages à partir de données incomplètes.

## 16. Critères d’acceptation

### Administration et données

- un éditeur peut créer une ville et la réutiliser dans plusieurs chapitres ;
- toute ville publiée possède un `municipalityKey` unique et immuable, un pays
  et un code national ;
- le slug est unique et ne change pas lorsqu’un nom public est corrigé ;
- les variantes sont stockées sans produire de routes supplémentaires ;
- les coordonnées sont absentes par paire ou valides par paire ;
- l’ordre d’un composant répétable est l’ordre renvoyé au frontend ;
- un chapitre invalide peut être sauvegardé en brouillon, mais pas publié ;
- un chapitre comportant plus de six intermédiaires `featured` ne peut pas être
  publié ;
- les messages de validation identifient la règle et le chapitre concernés ;
- le composant SEO et sa validation d’image sont réutilisés pour `City`.

### Pages de chapitre

- une page chapitre affiche son résumé de villes dans le HTML initial ;
- le résumé et la liste compacte sont placés dans la zone des checkpoints, et
  non dans une carte pleine largeur en haut de page ;
- villes et checkpoints sont adjacents sur écran large et empilés sans
  débordement sur écran étroit ;
- les extrémités et au maximum six intermédiaires mis en avant suivent l’ordre
  Strapi ;
- les passages non mis en avant ne sont pas affichés mais restent disponibles
  pour la recherche du PRD 02 ;
- les formulations avec zéro, un ou plusieurs intermédiaires sont
  grammaticales ;
- une ville éligible est liée, une ville non éligible reste du texte ;
- les URL existantes `/chapitres/[slug]` restent inchangées ;
- le fallback de metadata n’accumule pas toutes les villes.

### Pages villes

- une ville éligible répond sur `/villes/[slug]` ;
- la page contient un H1, ses chapitres et les liens correspondants ;
- chaque rôle est lisible en français ;
- une ville liée à plusieurs chapitres les présente par `displayOrder` lorsque
  disponible, sinon selon le fallback déterministe documenté ;
- une ville éligible sans blocs mais avec un chapitre publié reste utile et
  accessible ;
- un slug absent, un document non publié, `hasPublicPage=false` ou l’absence de
  chapitre publié produisent une 404 publique ;
- la preview authentifiée permet de relire un brouillon sans l’indexer ; une
  requête sans secret valide ne peut pas activer le Draft Mode.

### SEO et sitemap

- title, description, canonical et image sociale suivent les règles définies ;
- seules les villes éligibles figurent dans le sitemap ;
- `lastModified` provient de Strapi ;
- les noms alternatifs ne créent aucun doublon d’URL ;
- aucune donnée structurée non validée n’est ajoutée.

### Migration

- le dry-run ne modifie aucune donnée ;
- le rapport identifie les cas ambigus ;
- la reprise exhaustive des 223 identités est faite par `municipalityKey` et
  n’importe ni commerce ni publication ;
- les dix chapitres totalisent exactement 233 passages ordonnés ;
- la sélection éditoriale totalise exactement 58 intermédiaires `featured` ;
- deux exécutions appliquées ne créent pas de doublons ;
- aucune publication de page ville n’est activée automatiquement ;
- aucun chapitre n’est republié silencieusement ;
- le champ JSON legacy reste disponible jusqu’au nettoyage ultérieur.

### Qualité de l’implémentation

- aucune requête N+1 ni `populate=*` n’est introduite ;
- les previews existantes de chapitre et d’article ne régressent pas ;
- `npm run build` passe dans `gthdf-cms` sur la machine de production ;
- `npm run lint` et `npm run build` passent dans `gthdf-frontend` ;
- les tests existants passent ;
- en l’absence de harness adapté, les validations métier et scénarios de route
  font au minimum l’objet d’un protocole manuel reproductible joint aux PR de
  production.

## 17. Plan de validation pour l’agent de production

L’agent qui implémentera ce PRD sur une machine complète devra vérifier au
minimum les scénarios suivants :

1. création et publication d’une ville sans page publique ;
2. liaison de cette ville à un chapitre et rendu en texte simple ;
3. activation de `hasPublicPage` et apparition du lien, de la route et du
   sitemap après revalidation ;
4. désactivation et retour à une 404 publique ;
5. preview d’une ville en brouillon ou non éligible ;
6. ville servant de fin à un chapitre et de début au suivant ;
7. chapitre sans intermédiaire mis en avant ;
8. chapitre avec un puis plusieurs intermédiaires ;
9. rejet d’un chapitre ayant deux rôles `start`, aucun rôle `end` ou un rôle
   incohérent avec la position ;
10. dry-run puis double exécution de la migration ;
11. absence de requêtes répétées par chapitre sur une page ville ;
12. vérification du HTML initial sans dépendre de l’hydratation JavaScript ;
13. navigation clavier et lecture compréhensible sans information de couleur.

## 18. Zones de code probablement concernées

Cette liste guide l’agent de production sans imposer son découpage final.

### `gthdf-cms`

- `src/api/city/` : schéma, route, contrôleur et service ;
- `src/components/chapter/city-passage.json` ;
- `src/api/chapter/content-types/chapter/schema.json` ;
- `src/components/shared/seo.json` : réutilisé, non dupliqué ;
- `src/index.ts` : validations métier et image SEO ;
- `config/admin.ts` : preview de `City` ;
- `scripts/` : migration de données idempotente ;
- `types/generated/` : types régénérés par l’outillage Strapi.

### `gthdf-frontend`

- `lib/chapters.ts` : population des passages et abandon progressif de
  `cities` ;
- `lib/strapi.ts` : contrat de statut Strapi 5 et cache ;
- `lib/cities.ts` : fonctions dédiées si ce découpage est retenu ;
- `app/chapitres/[slug]/page.tsx` et son module CSS ;
- `app/villes/[slug]/page.tsx` et son module CSS ;
- `app/sitemap.ts` ;
- `app/api/preview/route.ts` : authentification serveur et allow-list des
  routes de preview.

## 19. Dépendances avec les lots suivants

Le contrat stable fourni aux lots suivants est :

- identités `documentId`, `municipalityKey` et `slug` d’une ville ;
- `name` et `alternativeNames` pour la recherche ;
- pays, code national, coordonnées éditoriales facultatives et provenance ;
- passages ordonnés par chapitre ;
- rôle et mise en avant de chaque passage ;
- distinction entre existence dans le référentiel et existence d’une page
  publique.

Les lots suivants ne doivent pas recréer leur propre tableau de villes ni
dériver les slugs depuis les GPX.

Le PRD 02 ajoute `Chapter.displayOrder`. Les hubs l’emploient dès qu’il est
disponible, sans rendre le présent lot dépendant de la recherche mobile.

Le PRD 04 réutilise les 223 documents `City` déjà rapprochés par
`municipalityKey`. Il reste seul responsable des qualifications, des ancres de
route, des passages multiples propres au catalogue et des produits ville à
ville.

## 20. Décisions prises et donnée éditoriale restante

### Décisions prises

- type technique `City` cohérent avec les conventions du dépôt ;
- composant répétable ordonné sans champ numérique redondant ;
- rôles relatifs au sens canonique existant ;
- double verrou Strapi publié + `hasPublicPage` ;
- identité multinationale par `municipalityKey`, pays et code national ;
- reprise exhaustive en brouillon des 223 identités du CSV, sans les données
  commerciales et produits réservés au PRD 04 ;
- conservation non destructive du JSON legacy ;
- absence de page d’index `/villes` ;
- absence de redirections automatiques et de données structurées dans ce lot ;
- preview des villes intégrée seulement après authentification de la route et
  correction du contrat Strapi 5.

### Donnée éditoriale restant à publier ou enrichir

- la publication contrôlée des villes et versions de chapitres nécessaires au
  PRD 02 ;
- les villes autorisées à recevoir `hasPublicPage=true` ;
- les descriptions et surcharges SEO relues.

## 21. Définition de terminé

Le lot est terminé lorsqu’un éditeur peut gérer une ville une seule fois,
l’insérer dans plusieurs chapitres selon un ordre fiable et publier
sélectivement une page hub, tandis que les chapitres rendent un résumé naturel
des villes dans leur HTML initial.

La migration est réversible, les anciens liens de chapitres fonctionnent, une
ville non éligible ne laisse aucune URL indexable et le contrat peut être
consommé par les PRD suivants sans recréer un référentiel parallèle.
