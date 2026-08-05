# PRD 02 — Retrouver son chapitre sur mobile

**Version :** 0.4\
**Date :** 5 août 2026\
**Statut :** amendé après extension du PRD 01\
**Dépôts concernés par l’implémentation :** `gthdf-cms`, `gthdf-frontend`\
**Dépendance bloquante pour la recherche complète :** PRD 01 — Référentiel
des villes et pages hubs\
**Marque publique :** GTHF

---

## 1. Résumé de la décision

Ce lot transforme `/chapitres` en point d’entrée pratique sur mobile. Sur
mobile, la liste compacte remplace entièrement la galerie de grandes cartes.
La galerie éditoriale reste disponible sur tablette et bureau.

Le haut de page contient une interface unique « Trouver un chapitre » qui :

1. rend côté serveur une liste compacte de tous les chapitres publiés ;
2. enrichit cette liste côté client avec une recherche locale sur les titres,
   numéros et villes normalisées du PRD 01 ;
3. demande ponctuellement la position seulement après un clic sur « Autour de
   moi » ;
4. charge alors un index géographique simplifié, compare la position aux
   segments des deux traces officielles de chaque chapitre et affiche jusqu’à
   trois résultats lorsque la réponse est ambiguë.

La position ne quitte jamais le navigateur. Aucun endpoint ne reçoit de
latitude ou de longitude. Le navigateur télécharge un index de tracés sans
donnée utilisateur et effectue le calcul localement.

Les décisions structurantes sont les suivantes :

- la recherche textuelle est locale, car le volume actuel est faible ;
- la liste compacte reste présente dans le HTML initial et utilisable sans
  JavaScript ;
- les GPX bruts ne sont jamais chargés au chargement initial de la page ;
- l’index de proximité est produit côté serveur, mis en cache et demandé
  seulement après obtention d’une position ;
- la distance est calculée jusqu’aux segments, jamais seulement jusqu’aux
  points GPX ;
- les deux sens `gpxFileAB` et `gpxFileBA` sont pris en compte, car ils peuvent
  différer ;
- un entier éditorial `displayOrder` est ajouté aux chapitres pour fournir un
  ordre stable : la chaîne actuelle forme une boucle et ne possède donc pas de
  premier élément intrinsèque ;
- `hasPublicPage=false` sur une ville interdit sa page hub, mais ne l’exclut
  pas de la recherche d’un chapitre si la ville et le chapitre sont publiés ;
- aucun outil d’analytics, de cartographie ou de géocodage n’est ajouté par ce
  lot.

## 2. Contexte et problème

La page actuelle présente les chapitres sous forme de grandes cartes avec un
texte d’ambiance et une illustration. Cette expérience convient à la
découverte, mais une carte occupe une part importante d’un écran mobile.

Un voyageur qui connaît une ville ou qui consulte le site depuis la route doit
faire défiler les cartes et connaître implicitement le découpage éditorial du
GTHF. Il n’existe aujourd’hui ni champ de recherche, ni vue synthétique, ni
calcul de proximité.

Le besoin n’est pas de guider l’utilisateur. Il est de répondre rapidement à
une question limitée : « quelle fiche de chapitre dois-je ouvrir ? »

## 3. Objectifs

- rendre tous les chapitres accessibles avant la première grande carte ;
- retrouver un chapitre par son titre, son numéro, son départ, son arrivée ou
  une ville traversée renseignée ;
- traiter correctement une ville présente dans plusieurs chapitres ;
- fournir un résultat géographique prudent et explicable ;
- préserver la recherche et la liste lorsque la position est refusée ou
  indisponible ;
- préserver le HTML serveur et les URL existantes ;
- préserver la galerie éditoriale sur tablette et bureau sans la rendre sur
  mobile ;
- limiter le poids initial et éviter le téléchargement des GPX bruts sur
  mobile ;
- ne traiter que les chapitres et relations publiés ;
- ne collecter ni position précise ni terme de recherche.

## 4. Non-objectifs

Ce lot ne doit pas :

- indexer une commune absente de `cityPassages` ;
- déduire des noms de villes depuis les GPX ;
- chercher une adresse, un commerce, un hébergement ou un point d’intérêt ;
- appeler un service de géocodage ;
- afficher une carte dans le sélecteur ;
- suivre la position après le résultat initial ;
- calculer un itinéraire pour rejoindre le tracé ;
- fournir un guidage ou une navigation GPS ;
- produire ou télécharger une portion ville à ville ;
- modifier, fusionner ou découper un GPX ;
- créer les pages `/villes/[slug]` du PRD 01 ;
- créer le catalogue ville à ville du PRD 04 ;
- modifier le GPX Builder ;
- synchroniser Google My Maps ;
- ajouter une tolérance générale aux fautes de frappe ;
- introduire un nouvel outil d’analytics ou de consentement ;
- renommer globalement les identifiants techniques legacy `GTHDF`.

## 5. Utilisateurs et parcours principaux

### Voyageur en préparation

Il saisit `Calais`. La page affiche chaque correspondance entre Calais et un
chapitre publié, précise si la ville en est le départ, l’arrivée ou un passage,
et donne un lien direct vers la fiche.

### Voyageur sur le parcours

Il active « Autour de moi ». Après l’autorisation du navigateur, le site
charge l’index géographique, calcule la distance au tracé et propose le
chapitre le plus proche. À une jonction ou près de traces concurrentes, il
affiche plusieurs possibilités au lieu d’en choisir une arbitrairement.

### Visiteur en découverte

Sans saisir de texte et sans partager sa position, il parcourt une liste
compacte ordonnée. Sur tablette et bureau, il peut aussi retrouver les cartes
illustrées actuelles.

### Visiteur sans JavaScript ou sans géolocalisation

Le titre, les extrémités, la distance et le lien de chaque chapitre sont déjà
présents dans le HTML. La géolocalisation et le filtrage instantané ne sont pas
disponibles, mais la navigation essentielle reste fonctionnelle.

## 6. État du dépôt confirmé par inspection

### 6.1 Frontend

- le frontend utilise Next.js `16.0.10`, React `19.2.1` et App Router ;
- `app/chapitres/page.tsx` est un Server Component ;
- la page récupère les chapitres avec `getChaptersInOrder()` et une
  revalidation de 300 secondes ;
- la page rend une seule galerie de cartes, avec titre, `startStation`,
  `endStation`, distance, introduction et image ;
- sous 768 px, la galerie passe à une colonne, mais le contenu de chaque carte
  reste complet ;
- aucune recherche, géolocalisation ou liste compacte n’existe ;
- aucune bibliothèque cartographique ou géospatiale n’est installée ;
- aucun outil d’analytics n’est détecté dans le frontend ;
- le GPX Builder utilise directement `DOMParser` dans un Client Component ;
  il n’existe pas de parseur GPX ou de fonction géographique partagée ;
- les textes de metadata de `/chapitres` emploient encore la marque legacy
  `GTHDF` et devront afficher `GTHF` lors de l’implémentation ;
- les images de la galerie ne sont pas marquées `priority` ; l’implémentation
  devra en plus garantir qu’elles ne sont pas téléchargées sur le viewport
  mobile où les cartes sont absentes.

### 6.2 CMS

- le CMS utilise Strapi `5.43.0` ;
- `Chapter` est une collection avec `draftAndPublish=true` ;
- un chapitre possède actuellement `title`, `slug`, `startStation`,
  `endStation`, `distance`, `nextChapter`, `previousChapter`, `gpxFileAB` et
  `gpxFileBA` ;
- aucun champ de numéro, d’ordre d’affichage ou de dénivelé n’existe ;
- le champ JSON legacy `cities` existe, mais le référentiel et les
  `cityPassages` sont définis par le PRD 01 ;
- les relations `nextChapter` et `previousChapter` forment une boucle complète
  dans les données publiées ;
- `sortChaptersByChain()` choisit le premier élément retourné par l’API
  lorsqu’aucun chapitre n’est sans prédécesseur. L’ordre de départ n’est donc
  pas stable sur une boucle.

### 6.3 Traces publiées observées le 4 août 2026

L’API publique expose actuellement 10 chapitres publiés. Chacun possède les
deux fichiers `gpxFileAB` et `gpxFileBA`.

- les 20 fichiers représentent environ 6,9 Mo selon les tailles Strapi ;
- un fichier pèse environ 216 à 499 Ko ;
- les 10 traces AB représentent environ 3,44 Mo et 25 469 `trkpt` ;
- les fichiers inspectés sont des GPX 1.1 contenant des traces segmentées ;
- les sens AB et BA ont des tailles proches, mais ils sont des fichiers
  officiels distincts et ne doivent pas être présumés identiques.

Ces valeurs justifient une représentation simplifiée : télécharger et parser
6,9 Mo de XML sur chaque chargement mobile est disproportionné pour répondre à
une question de proximité.

### 6.4 Conséquence sur la livraison

L’implémentation complète nécessite deux PR de production coordonnées :

1. `gthdf-cms` ajoute et renseigne l’ordre d’affichage stable ;
2. `gthdf-frontend` étend les requêtes, ajoute l’interface interactive et
   produit l’index géographique.

Le référentiel du PRD 01 doit être disponible pour livrer la recherche sur les
villes intermédiaires. La liste compacte et la recherche sur les champs legacy
peuvent être développées avant, mais ne satisfont pas seules ce PRD.

## 7. Modèle et contrat de données

### 7.1 Ordre public des chapitres

Ajouter à `Chapter` :

| Champ | Type | Requis | Règle |
|---|---|---:|---|
| `displayOrder` | integer | oui à la publication | Entier positif, unique parmi les chapitres publiés |

Pour l’ensemble publié :

- les valeurs sont contiguës de `1` à `N` ;
- exactement un chapitre porte la valeur `1` ;
- la liste publique est toujours triée par `displayOrder` croissant ;
- les relations `nextChapter` et `previousChapter` restent la source de la
  navigation entre fiches, mais ne choisissent plus le premier élément d’une
  liste ;
- un brouillon peut temporairement avoir un ordre absent ou dupliqué ; sa
  publication est refusée tant que l’ensemble publié deviendrait invalide ;
- un message de validation identifie la valeur conflictuelle et les chapitres
  concernés.

L’ordre initial reprend la numérotation des parties portée par les GPX de
référence :

| Ordre | Chapitre actuel |
|---:|---|
| 1 | Lille → Arras |
| 2 | Arras → Condé-sur-l’Escaut |
| 3 | Condé-sur-l’Escaut → Hirson |
| 4 | Hirson → Soissons |
| 5 | Soissons → Beauvais |
| 6 | Beauvais → Amiens |
| 7 | Amiens → Étaples |
| 8 | Étaples → Calais |
| 9 | Calais → Saint-Omer |
| 10 | Saint-Omer → Lille |

Les noms canoniques affichés proviennent des villes `start` et `end` du PRD 01
lorsqu’elles existent. `startStation` et `endStation` restent le fallback
pendant la transition. La migration de l’ordre ne modifie aucun slug.

`displayOrder` est exclusivement un ordre de présentation, ancré à Lille. Il
ne définit ni le chaînage géographique, ni l’origine de boucle, ni le sens des
portions du PRD 04, dont la baseline XLSX démarre à Hirson.

### 7.2 DTO du sélecteur

Le Server Component construit un objet minimal par chapitre publié :

- `documentId` ;
- `slug` ;
- `displayOrder` ;
- `title` ;
- nom public du départ et de l’arrivée ;
- `distance` existante ;
- `cityPassages` dans leur ordre natif, limités à :
  - `role` ;
  - `city.documentId` ;
  - `city.name` ;
  - `city.alternativeNames` lorsqu’il s’agit d’un tableau valide.

Le DTO client ne contient ni introduction, ni image, ni contenu riche, ni SEO,
ni URL de GPX. La vue éditoriale tablette/bureau peut continuer à consommer les
champs nécessaires à ses cartes.

Le dénivelé n’est pas affiché dans ce lot : aucun champ correspondant n’existe
et aucune valeur actuellement rendue ne peut être considérée comme fiable.

### 7.3 Publication des villes dans le sélecteur

Une correspondance ville est disponible lorsque :

1. le chapitre est publié ;
2. le document `City` relié est publié ;
3. le passage appartient à la version publiée du chapitre.

Le booléen `hasPublicPage` du PRD 01 ne filtre pas la recherche. Il contrôle la
route `/villes/[slug]`, pas la visibilité factuelle d’une ville dans un
chapitre. Le résultat de ce lot ouvre toujours `/chapitres/[slug]` et ne crée
pas de lien vers une page ville non éligible.

Le booléen `cityPassages.featured` ne filtre pas davantage la recherche. Il
borne uniquement la liste de villes visible sur une page chapitre au titre du
PRD 01. Le DTO de recherche consomme tous les passages publiés, y compris les
intermédiaires `featured=false`.

Une relation brouillon, manquante ou non peuplée est ignorée. Aucun libellé
n’est reconstruit depuis un identifiant ou un GPX.

L’existence d’une ville dans le référentiel ou parmi les 223 communes importées
par le PRD 04 ne suffit pas. Seules les villes publiées reliées à la version
publiée d’un chapitre par `cityPassages` entrent dans le DTO et le bundle de
recherche.

## 8. Architecture frontend cible

### 8.1 Séparation serveur et client

`app/chapitres/page.tsx` reste un Server Component. Il :

1. récupère en une requête les chapitres publiés, leurs passages et les seules
   villes nécessaires ;
2. trie les données par `displayOrder` ;
3. rend le titre, l’introduction, la liste compacte et les liens dans le HTML
   initial ;
4. transmet le DTO minimal à un Client Component dédié à l’amélioration
   interactive ;
5. rend ensuite la galerie éditoriale uniquement pour la présentation
   tablette/bureau, sans téléchargement de ses images sur mobile.

Le Client Component gère uniquement :

- la valeur du champ de recherche ;
- le calcul des correspondances locales ;
- les états de géolocalisation ;
- le chargement différé de l’index ;
- le calcul et l’affichage des résultats de proximité.

Il ne refait pas la requête Strapi de la page. Il ne doit pas exister deux
listes concurrentes : la liste serveur devient la liste interactive après
hydratation.

### 8.2 Requête Strapi

La requête publique :

- utilise le contrat Strapi 5 `status=published` lorsque le statut est
  explicite ;
- sélectionne des champs et populations explicites ;
- ne contient aucun `populate=*` ;
- peuple `cityPassages.city` dans la même requête ;
- évite tout fetch ville par ville ou chapitre par chapitre ;
- conserve la revalidation actuelle de 300 secondes pour les données de page ;
- ne transforme pas une panne Strapi en une liste vide présentée comme un état
  éditorial normal.

Si Strapi est indisponible et qu’aucune version ISR n’est servable, la page
affiche un message d’indisponibilité et un moyen de réessayer. Elle n’affiche
pas « aucun chapitre » comme si le catalogue était réellement vide.

## 9. Expérience publique sur `/chapitres`

### 9.1 Ordre de la page

Le contenu apparaît dans cet ordre :

1. lien de retour existant ;
2. H1 et introduction existants ;
3. section H2 `Trouver un chapitre` ;
4. champ `Ville ou chapitre` ;
5. bouton `Autour de moi` ;
6. zone de résultats contextuelle ;
7. liste compacte des chapitres ;
8. galerie éditoriale actuelle sur tablette et bureau uniquement.

Le champ et le bouton sont visibles sans être cachés derrière une icône ou un
menu. Aucun carrousel horizontal n’est introduit.

### 9.2 Liste compacte

La liste est visible par défaut sur tous les viewports. Chaque ligne entière
est un lien vers `/chapitres/[slug]` et affiche :

- `Chapitre <displayOrder>` ;
- le titre actuel si celui-ci apporte une information distincte ;
- `<départ> → <arrivée>` ;
- `~<distance> km`, conformément au caractère approximatif déjà affiché.

La liste n’affiche pas de dénivelé dans ce MVP. Elle n’affiche ni image, ni
phrase d’introduction.

Une ligne possède une cible tactile d’au moins 44 × 44 pixels CSS et un
intitulé compréhensible hors contexte. Le lien englobe la ligne sans imbriquer
de second contrôle interactif.

### 9.3 Remplacement des cartes sur mobile

Sur un viewport mobile, la liste compacte est l’unique présentation de
l’ensemble des chapitres. Les grandes cartes ne sont ni visibles, ni
atteignables par les technologies d’assistance, ni téléchargées.

Sur tablette et bureau, les cartes illustrées restent sous le finder et
conservent leur fonction de découverte ainsi que leurs URL actuelles.

- aucune image de carte n’est préchargée ;
- masquer les cartes uniquement avec une technique qui continuerait à
  télécharger toutes leurs images sur mobile ne satisfait pas ce PRD ;
- le breakpoint initial reprend la convention existante de 768 px et doit être
  vérifié visuellement avant livraison ;
- la liste compacte reste la source des résultats de recherche ; la galerie
  ne reçoit pas un second filtre ou état interactif ;
- une refonte visuelle de la galerie tablette/bureau sort de ce lot.

## 10. Recherche textuelle

### 10.1 Stratégie retenue

La recherche s’exécute dans le navigateur sur le DTO déjà rendu. Avec 10
chapitres et un objectif de 5 à 15 villes par chapitre, une API de recherche à
chaque frappe ajouterait latence, états réseau et journalisation sans bénéfice.

Il n’existe donc :

- aucun appel réseau par saisie ;
- aucun état de chargement de recherche ;
- aucun journal serveur contenant la requête ;
- aucune page indexable ou URL créée depuis le terme saisi.

### 10.2 Champs recherchés

- `title` ;
- `displayOrder`, notamment sous la forme `Chapitre 4` ;
- départ et arrivée canoniques ;
- fallback `startStation` et `endStation` pendant la migration ;
- chaque `cityPassages.city.name` publié ;
- chaque valeur valide de `city.alternativeNames`.

La valeur de `cityPassages.featured` est sans effet sur l’indexation de ces
champs.

Un nom alternatif sert uniquement à la correspondance. Le résultat affiche
toujours le nom canonique de la ville.

### 10.3 Normalisation

La même fonction pure normalise les données indexées et la requête :

1. conversion Unicode en forme de compatibilité décomposée ;
2. suppression des signes diacritiques ;
3. passage en minuscules ;
4. conversion des apostrophes droites ou typographiques, tirets et autres
   séparateurs en espaces ;
5. suppression des caractères non alphanumériques restants ;
6. réduction des espaces multiples et nettoyage des extrémités.

Ainsi, `Saint-Omer`, `saint omer` et `SAINT OMER` sont équivalents. `St Omer`
correspond seulement si cette forme est un nom canonique ou un
`alternativeNames` ; le frontend n’invente pas de règles d’abréviation.

La recherche est mise à jour dès que la requête normalisée n’est pas vide. Un
champ vidé revient à la liste initiale complète.

### 10.4 Résultats et classement

Deux types de correspondances sont affichés :

- **chapitre** : titre, numéro, départ ou arrivée legacy correspondant ;
- **ville** : nom canonique, rôle dans le passage et chapitre associé.

Une ville liée à deux chapitres produit deux résultats distincts. Plusieurs
passages de la même ville dans un même chapitre produisent un seul résultat
pour cette paire ville–chapitre, avec les rôles pertinents regroupés.

Le classement est déterministe :

1. égalité exacte après normalisation ;
2. libellé commençant par la requête ;
3. libellé contenant la requête ;
4. `displayOrder` croissant ;
5. ordre du passage dans le chapitre.

Une correspondance obtenue par nom alternatif possède le score du nom
alternatif, mais affiche le nom canonique.

### 10.5 États

- **initial :** aucune annonce parasite ; liste complète visible ;
- **résultats :** compteur textuel, puis résultats cliquables ;
- **aucun résultat :** `Aucun chapitre ne correspond à cette recherche.` et
  action `Effacer la recherche` ;
- **données indisponibles :** message serveur distinct, sans présenter un
  catalogue vide.

Les résultats remplacent temporairement les lignes non correspondantes dans la
liste compacte. Sur tablette et bureau, la galerie éditoriale n’est pas
filtrée : elle reste une zone de découverte indépendante.

## 11. Index géographique de proximité

### 11.1 Endpoint sans position utilisateur

Créer dans le frontend un endpoint GET même origine, par exemple :

`/api/chapters/proximity-index`

Cet endpoint :

- n’accepte ni query de position, ni corps de requête ;
- récupère uniquement les chapitres publiés et leurs médias GPX ;
- parse et simplifie les traces côté serveur ;
- retourne un JSON public de géométries et d’identifiants minimaux ;
- est explicitement mis en cache pendant une heure ;
- peut servir une version périmée valide lors d’une erreur temporaire de la
  source, selon les capacités de cache du déploiement ;
- ne journalise évidemment aucune position, puisqu’il n’en reçoit aucune.

Le navigateur n’appelle cet endpoint qu’après une position obtenue. Aucun GPX
ni index n’est demandé au chargement initial de `/chapitres`.

Le choix exact de primitive de cache compatible avec Next 16 doit être vérifié
par l’agent de production. L’invariant est un résultat partagé et cacheable,
jamais une génération complète par utilisateur.

### 11.2 Contrat de l’index

Le JSON est versionné et contient au minimum :

- `schemaVersion` ;
- une révision dérivée des `updatedAt` ou identifiants des médias sources ;
- pour chaque chapitre :
  - `documentId` ;
  - `slug` ;
  - `displayOrder` ;
  - une bounding box globale ;
  - zéro, une ou deux traces identifiées `AB` et `BA` ;
- pour chaque trace :
  - ses segments séparés ;
  - les coordonnées simplifiées sous forme `[longitude, latitude]` ;
  - sa bounding box.

Le titre et les villes restent dans le DTO de page et ne sont pas dupliqués
dans l’index. La jointure client utilise `documentId`, jamais le titre.

### 11.3 Parsing et intégrité

- tous les `trk` et `trkseg` valides sont lus ;
- les limites de segments sont préservées ; aucune ligne droite n’est créée
  entre deux segments disjoints ;
- une `rte` peut être convertie en segment si un fichier de référence en
  contient une ;
- les coordonnées absentes, non numériques ou hors domaine sont rejetées ;
- un segment réduit à un point reste comparable comme point ;
- l’altitude, l’heure et les extensions ne sont pas envoyées dans cet index ;
  les GPX originaux restent inchangés ;
- si une direction est invalide ou absente, l’autre direction reste
  exploitable ;
- si les deux directions sont inexploitables, le chapitre reste dans la
  recherche et la liste, mais est absent des résultats géographiques.

Les URL de fichiers proviennent uniquement des relations médias Strapi. La
route n’accepte jamais une URL fournie par l’appelant.

### 11.4 Simplification et budget

La simplification conserve le premier et le dernier point de chaque segment et
respecte une erreur latérale maximale cible de 20 mètres dans une projection
locale adaptée.

Elle doit être validée contre les GPX bruts avant livraison :

- erreur absolue de distance au tracé inférieure ou égale à 25 mètres sur le
  corpus de contrôle ;
- même chapitre gagnant lorsque l’écart brut entre les deux premiers dépasse
  50 mètres ;
- lorsque cet écart est inférieur, les deux chapitres sont traités comme
  potentiellement ambigus ;
- aucune coupure de segment ni inversion de coordonnées.

Budgets pour les 10 chapitres actuels :

- objectif de réponse inférieur ou égal à 250 Ko compressés ;
- maximum accepté de 500 Ko compressés avant nouvelle optimisation ;
- calcul client inférieur à 500 ms sur le téléphone Android médian retenu pour
  la recette, une fois l’index disponible.

Si le budget et la précision entrent en conflit, la précision gagne. Il faut
alors améliorer le format ou le chargement, pas augmenter silencieusement
l’erreur de simplification.

## 12. Calcul de proximité

### 12.1 Acquisition de la position

Le bouton utilise une seule fois `navigator.geolocation.getCurrentPosition`.
Il n’utilise jamais `watchPosition`.

Options initiales recommandées pour la recette :

- `enableHighAccuracy: true` ;
- `timeout: 12 000 ms` ;
- `maximumAge: 60 000 ms`.

Ces valeurs sont des constantes documentées et testables. Elles peuvent être
ajustées après les essais sur appareils réels sans modifier les règles de
classification ci-dessous.

### 12.2 Distance aux segments

Pour chaque segment de chaque direction :

1. calculer la distance minimale entre la position et la ligne ;
2. conserver la plus petite distance de chaque chapitre, toutes directions
   confondues ;
3. trier les chapitres par distance croissante, puis par `displayOrder` en cas
   d’égalité numérique.

Le calcul emploie une méthode géodésique ou une projection locale en mètres
dont l’erreur est couverte par les tests. Chercher uniquement le `trkpt` le
plus proche est interdit.

La `accuracy` fournie par le navigateur est conservée seulement en mémoire le
temps d’interpréter le résultat. Elle n’est pas soustraite de la distance
affichée.

### 12.3 Seuils initiaux

Les constantes initiales suivantes sont retenues et doivent être contrôlées
sur le terrain avant activation générale :

| Constante | Valeur | Usage |
|---|---:|---|
| proximité | 1 000 m | autorise la formulation `près de ce chapitre` |
| résultat maximal | 50 000 m | au-delà, aucun chapitre n’est présenté comme proche |
| ambiguïté minimale | 250 m | absorbe jonctions et écarts de calcul |
| précision maximale exploitable | 5 000 m | au-delà, demander une nouvelle position |
| alternatives | 3 | nombre maximal de chapitres affichés |

La formulation `Vous êtes près de ce chapitre` est autorisée seulement si :

- `distance + accuracy <= 1 000 m` ;
- `accuracy <= 1 000 m`.

Une position exploitable produit plusieurs résultats lorsque leur distance est
inférieure ou égale à :

`distance minimale + max(250 m, min(accuracy, 1 000 m))`

Le résultat est limité aux trois premiers. Cette règle couvre notamment les
extrémités partagées et les sections proches sans exposer une longue liste.

Si la précision annoncée dépasse 5 km, aucun chapitre n’est affirmé :
`Votre position est trop imprécise pour identifier un chapitre. Réessayez ou
cherchez une ville.`

Si la distance minimale dépasse 50 km :
`Aucun chapitre n’a été trouvé à proximité. Recherchez une ville ou consultez
la liste complète.`

Ces seuils sont des décisions initiales, pas du texte codé en dur à plusieurs
endroits. Ils sont centralisés, couverts par des tests et consignés dans la PR
de production s’ils sont modifiés après recette.

### 12.4 Arrondi et formulation

La distance affichée reste approximative :

- sous 1 km : arrondi aux 50 m les plus proches ;
- de 1 à moins de 10 km : une décimale ;
- à partir de 10 km : kilomètre entier.

Exemples de sorties :

> Vous êtes près de ce chapitre.\
> **Chapitre 8 — Étaples → Calais**\
> À environ 350 m du parcours.\
> **Ouvrir le chapitre**

> Chapitres les plus proches de votre position :\
> **Chapitre 8 — Étaples → Calais · 200 m**\
> **Chapitre 9 — Calais → Saint-Omer · 250 m**

> Chapitre le plus proche : **Hirson → Soissons**, à environ 12 km du
> parcours.

Si `accuracy >= 250 m`, une mention distincte indique que la position est
imprécise. Le texte ne dit jamais « vous êtes sur le parcours » dans ce MVP.

## 13. États de géolocalisation

Le contrôle possède une machine d’états explicite :

| État | Comportement |
|---|---|
| non initialisé | bouton disponible ; aucune permission demandée |
| non pris en charge | bouton masqué ou désactivé et explication accessible |
| contexte non sécurisé | même comportement, sans tentative d’appel |
| demande en cours | bouton désactivé, libellé `Localisation en cours…` |
| chargement de l’index | statut `Comparaison avec le parcours…` |
| succès unique | résultat, distance et lien chapitre |
| succès ambigu | deux ou trois résultats ordonnés |
| permission refusée | explication brève et focus conservé près de la recherche |
| délai expiré | action `Réessayer` et recherche manuelle visible |
| position indisponible | action `Réessayer` et recherche manuelle visible |
| précision insuffisante | aucun chapitre affirmé ; proposer de réessayer |
| index indisponible | message non bloquant ; liste et recherche inchangées |
| hors zone | aucun chapitre présenté comme proche ; liste inchangée |

Les clics répétés pendant une demande ne lancent pas plusieurs acquisitions.
Une nouvelle tentative remplace le résultat géographique précédent.

Le bouton est rendu désactivé dans le HTML initial puis activé après détection
client de `isSecureContext` et de l’API. Un bloc `<noscript>` explique que la
localisation et le filtrage instantané nécessitent JavaScript, tout en pointant
vers la liste immédiatement disponible.

## 14. Accessibilité et responsive

- le champ utilise un `<label>` visible, pas uniquement un placeholder ;
- le champ peut utiliser `type="search"`, sans autocomplétion d’adresse ;
- le statut du nombre de résultats est annoncé avec une région live polie ;
- la liste elle-même reste une liste sémantique et n’est pas répétée en entier
  dans la région live ;
- les résultats sont atteignables dans l’ordre du document sans gestion de
  focus intrusive ;
- `Échap` peut vider la recherche lorsque le champ a le focus, sans détourner
  ce raccourci ailleurs ;
- l’état de chargement du bouton est textuel et expose `aria-busy` ;
- aucun résultat ou rôle ne dépend uniquement d’une icône ou d’une couleur ;
- les cibles tactiles mesurent au moins 44 × 44 pixels CSS ;
- aucun défilement horizontal n’apparaît à 320 px de largeur ;
- le zoom navigateur n’est pas désactivé ;
- la page est vérifiée à 200 % de zoom ;
- la liste remplace la galerie sur mobile, sans casser cette dernière sur
  tablette ou bureau.

## 15. Rendu, cache et performance

### HTML et hydratation

- H1, introduction, H2 du finder, lignes de chapitres et liens sont présents
  avant hydratation ;
- une désactivation de JavaScript laisse tous les chapitres navigables ;
- seules la recherche instantanée et la géolocalisation nécessitent le client ;
- le composant géographique et ses fonctions peuvent être chargés
  dynamiquement après le clic afin de ne pas alourdir le chemin initial.

### Réseau

Au chargement initial :

- aucune requête vers un fichier `.gpx` ;
- aucune requête vers l’index de proximité ;
- aucune requête de recherche ;
- seules les données serveur nécessaires et les ressources normales de la
  page sont transférées.

Après clic et position obtenue :

- une requête GET même origine récupère l’index cacheable ;
- aucune coordonnée ne figure dans l’URL, le corps ou les en-têtes applicatifs
  ajoutés par le frontend ;
- aucun GPX brut n’est téléchargé par le navigateur.

### Cache

- données éditoriales de `/chapitres` : revalidation de 300 secondes ;
- index de proximité : revalidation cible d’une heure ;
- une modification de GPX peut donc mettre jusqu’à une heure à affecter la
  géolocalisation en l’absence d’invalidation à la demande ;
- aucun webhook ou système générique d’invalidation n’est ajouté dans ce lot.

## 16. Confidentialité et sécurité

- la permission est demandée uniquement après une action explicite ;
- une seule position ponctuelle est demandée ;
- latitude, longitude et précision ne sont placées ni dans Strapi, ni dans un
  cookie, ni dans `localStorage`, ni dans `sessionStorage` ;
- elles ne sont envoyées ni au serveur GTHF, ni à Strapi, ni à un tiers ;
- elles sont libérées avec l’état du composant ou lors d’une nouvelle demande ;
- aucun terme de recherche n’est envoyé au serveur ;
- aucune URL GPX arbitraire n’est acceptée par l’endpoint d’index ;
- les erreurs publiques ne révèlent ni chemin serveur, ni détail du parseur ;
- les logs de génération peuvent nommer un chapitre ou un média invalide, mais
  ne contiennent aucune donnée de position utilisateur.

Le site ne possède actuellement aucun analytics. Ce PRD n’en installe pas. Si
un socle conforme est ajouté ultérieurement, seuls des résultats catégoriels
peuvent être mesurés (`success`, `denied`, `unavailable`, `out_of_area`,
`search_result`, `search_empty`) ; jamais les coordonnées, la distance exacte
ou le texte saisi.

## 17. Migration et reprise des données

### 17.1 Ordre des chapitres

La migration `displayOrder` est explicite, idempotente et non destructive.

1. ajouter le champ sans supprimer les relations existantes ;
2. exécuter un dry-run qui affiche le mapping proposé ;
3. contrôler les 10 associations avec les slugs existants ;
4. appliquer les valeurs 1 à 10 ;
5. activer la validation de publication ;
6. vérifier la cohérence avec la boucle `nextChapter` / `previousChapter`.

Le script cible les `documentId` ou slugs explicites, jamais l’ordre de retour
de l’API. Une seconde exécution ne change rien. Aucun chapitre n’est republié
silencieusement.

### 17.2 Villes

La reprise des villes appartient au PRD 01. Ce lot :

- lit `cityPassages` lorsqu’ils sont disponibles ;
- conserve temporairement les recherches sur `startStation` et `endStation` ;
- ne migre pas le JSON legacy `cities` ;
- ne crée aucune ville ;
- ne complète aucun nom alternatif automatiquement.

Une livraison intermédiaire peut afficher la liste compacte avant la fin de la
saisie des villes. La définition de terminé exige néanmoins la recherche sur
les passages normalisés.

## 18. Déploiement et retour arrière

Ordre recommandé :

1. déployer le PRD 01 et valider ses données publiques ;
2. déployer le schéma CMS contenant `displayOrder` ;
3. exécuter le dry-run puis la migration d’ordre ;
4. contrôler la boucle et les 10 valeurs publiées ;
5. déployer le frontend avec la liste et la recherche locale ;
6. générer et valider l’index de proximité sur l’environnement cible ;
7. effectuer la recette géographique et responsive ;
8. activer publiquement le bouton de localisation.

Le retour arrière du frontend peut rétablir la galerie mobile actuelle. Le champ
`displayOrder` est additif et peut rester dans Strapi sans effet sur l’ancien
frontend. Les GPX et relations historiques ne sont ni modifiés ni supprimés.

Si l’index devient indisponible après déploiement, la page dégrade uniquement
la fonction « Autour de moi » ; la recherche et la liste restent utilisables.

## 19. Cas limites et règles de repli

- **Ville dans deux chapitres :** deux résultats, triés par `displayOrder`.
- **Même ville répétée dans un chapitre :** une ligne ville–chapitre, rôles
  regroupés.
- **Nom alternatif identique pour deux villes :** toutes les correspondances
  sont affichées ; aucune fusion automatique.
- **`hasPublicPage=false` :** la ville reste cherchable dans un chapitre
  publié, sans lien vers `/villes/[slug]`.
- **Ville brouillon :** aucun nom ou variante exposé publiquement.
- **Passages non encore migrés :** recherche limitée aux titres et stations ;
  aucune déduction depuis `cities` ou le GPX.
- **Ordre absent ou dupliqué après déploiement partiel :** éléments valides
  d’abord, puis fallback déterministe titre/slug ; une alerte technique est
  journalisée. L’état final doit être corrigé, pas accepté durablement.
- **Boucle de chapitres :** `displayOrder` fixe l’ancre ; aucune dépendance à
  l’ordre Strapi.
- **Trace AB invalide :** utiliser BA si elle est valide.
- **Traces AB et BA divergentes :** distance minimale aux deux.
- **Segments disjoints :** ne jamais les relier artificiellement.
- **Point près d’une jonction :** afficher les chapitres dans la fenêtre
  d’ambiguïté.
- **Point près d’un croisement non connecté :** même règle ; ne pas inventer
  la direction de voyage.
- **Position au-delà de 50 km :** aucun chapitre affirmé comme proche.
- **Précision supérieure à 5 km :** demander une nouvelle position.
- **Index partiel :** rechercher parmi les chapitres valides et signaler
  sobrement que la comparaison est incomplète si cette situation est connue du
  client.
- **Strapi indisponible :** servir l’ISR valide si possible ; sinon afficher
  une indisponibilité distincte d’une recherche vide.

## 20. Critères d’acceptation

### Données et publication

- chaque chapitre publié possède un `displayOrder` positif et unique ;
- les 10 chapitres apparaissent dans le même ordre quelle que soit la réponse
  initiale de Strapi ;
- seuls les chapitres publiés sont présents dans le HTML et le DTO client ;
- seuls les documents City publiés reliés à ces chapitres alimentent la
  recherche ;
- une ville seulement importée ou qualifiée par le PRD 04, sans
  `cityPassages` publié, n’est ni exposée ni cherchable ;
- une ville publiée avec `hasPublicPage=false` reste cherchable et ouvre le
  chapitre, jamais une page ville inexistante ;
- une ville reliée par un passage publié reste cherchable lorsque
  `featured=false` ;
- aucun dénivelé n’est inventé ou affiché.

### Page et absence de JavaScript

- à 320 × 568 et 390 × 844, le finder et la liste remplacent entièrement les
  grandes cartes, sans défilement horizontal ;
- le champ possède un libellé visible et le bouton une cible tactile adaptée ;
- sans JavaScript, les 10 liens de chapitres restent présents et utilisables ;
- les URL actuelles restent accessibles depuis chaque ligne compacte ;
- aucune carte ou image de carte n’est rendue ou téléchargée sur mobile ;
- sur tablette et bureau, les cartes restent accessibles sous le finder.

### Recherche

- une saisie sur un titre, un numéro, un départ, une arrivée ou une ville
  intermédiaire renvoie le bon chapitre ;
- `Saint-Omer`, `saint omer` et une variante explicitement enregistrée
  produisent les mêmes correspondances canoniques ;
- une ville absente de `cityPassages` ne produit aucun faux résultat ;
- une ville partagée affiche tous ses chapitres ;
- un nom alternatif affiche le nom canonique ;
- les résultats suivent le classement défini et sont annoncés sans répéter
  toute la liste au lecteur d’écran ;
- une recherche vide restaure immédiatement la liste ;
- aucune frappe ne déclenche de requête réseau.

### Géolocalisation

- aucun appel de permission et aucune requête d’index ne se produisent avant
  le clic ;
- le site utilise une acquisition ponctuelle et jamais un suivi ;
- un refus, un timeout ou une indisponibilité laisse la recherche et la liste
  intactes ;
- la requête d’index ne contient aucune coordonnée ;
- le navigateur ne télécharge aucun GPX brut ;
- le calcul utilise les segments et réussit un cas où le waypoint le plus
  proche donnerait une distance manifestement supérieure ;
- AB et BA sont tous deux pris en compte ;
- la distance et le chapitre concordent avec le calcul sur GPX brut dans les
  tolérances définies ;
- une jonction ou deux traces dans la fenêtre d’ambiguïté affiche deux ou trois
  options ;
- une précision supérieure à 5 km n’affirme aucun chapitre ;
- une distance supérieure à 50 km affiche l’état hors zone ;
- aucun texte ne prétend que l’utilisateur est « sur le parcours ».

### Performance, confidentialité et qualité

- la page initiale ne demande ni `.gpx`, ni index de proximité ;
- l’index respecte le budget compressé ou documente une optimisation avant
  mise en production ;
- le calcul respecte le budget de 500 ms sur l’appareil de référence ;
- aucune coordonnée ou recherche n’est stockée ou envoyée ;
- aucun analytics ou SDK cartographique n’est ajouté ;
- `npm run build` passe dans `gthdf-cms` sur la machine de production ;
- `npm run lint` et `npm run build` passent dans `gthdf-frontend` ;
- les tests existants et les nouveaux tests ciblés passent ;
- la PR de production documente la stratégie de cache réellement employée et
  toute modification des seuils.

## 21. Plan de validation pour l’agent de production

### 21.1 Tests automatisés

Ajouter au minimum :

- tests unitaires de normalisation pour accents, apostrophes, tirets, espaces
  et casse ;
- tests du classement exact, préfixe et inclusion ;
- test d’une ville dans plusieurs chapitres ;
- test d’une ville répétée dans un chapitre ;
- test du filtrage public et de `hasPublicPage=false` ;
- tests de tri d’une boucle avec réponses API mélangées ;
- tests du parseur sur plusieurs `trk`, `trkseg`, `rte`, segment vide et
  coordonnées invalides ;
- tests de distance point–segment et de non-raccordement entre segments ;
- tests des seuils à leurs bornes exactes ;
- tests d’ambiguïté et de limite à trois résultats ;
- test d’équivalence entre géométrie brute et simplifiée sur le corpus ;
- tests de composant avec géolocalisation accordée, refusée, expirée et
  indisponible ;
- test confirmant zéro appel à `getCurrentPosition` avant le clic ;
- test confirmant l’absence de coordonnées dans la requête d’index.

### 21.2 Recette géographique

Constituer un corpus reproductible comprenant :

- au moins un point central par chapitre ;
- chaque jonction entre deux chapitres ;
- les sections qui se croisent, se superposent ou se rapprochent ;
- des points artificiellement décalés de 500 m, 1 km, 5 km, 49 km et 51 km ;
- des précisions simulées de 20 m, 500 m, 2 km et 6 km.

Comparer pour chaque cas :

1. résultat sur GPX brut ;
2. résultat sur index simplifié ;
3. classement et ambiguïté ;
4. distance affichée après arrondi ;
5. formulation publique.

### 21.3 Recette appareils et accessibilité

- iPhone Safari récent ;
- Android Chrome sur appareil médian ;
- refus puis réactivation de la permission au niveau du navigateur ;
- localisation système désactivée ;
- connexion lente avec index non mis en cache ;
- navigation complète au clavier ;
- lecteur d’écran sur le champ, le statut et les résultats ;
- JavaScript désactivé ;
- viewports 320, 390, 768 et 1440 px ;
- zoom à 200 % ;
- vérification du réseau initial et du poids compressé de l’index.

## 22. Zones de code probablement concernées

Cette liste guide l’agent de production sans imposer son découpage final.

### `gthdf-cms`

- `src/api/chapter/content-types/chapter/schema.json` : `displayOrder` ;
- `src/index.ts` ou mécanisme de validation adopté par le PRD 01 : invariants
  de publication ;
- `scripts/` : migration idempotente de l’ordre ;
- `types/generated/` : types régénérés par Strapi.

### `gthdf-frontend`

- `lib/chapters.ts` : DTO, population des passages, statut public et tri ;
- nouveau module pur de normalisation et recherche ;
- nouveau module pur de calcul géographique ;
- nouveau module serveur de parsing et simplification des GPX ;
- `app/chapitres/page.tsx` : composition serveur et marque GTHF ;
- `app/chapitres/page.module.css` : bloc prioritaire et responsive ;
- nouveau Client Component du finder et son module CSS ;
- nouvelle Route Handler d’index, par exemple
  `app/api/chapters/proximity-index/route.ts` ;
- tests unitaires et tests de composants selon l’outillage retenu par l’agent
  de production.

Le dossier `app/gpx-builder/` n’est pas modifié par ce lot. Une extraction
future de fonctions GPX partagées est possible, mais ne doit pas coupler la
livraison du finder au PRD de découpage.

## 23. Dépendances avec les autres PRD

### PRD 01 — Référentiel des villes et pages hubs

Dépendance requise pour :

- `City.name` et `alternativeNames` ;
- `cityPassages` ordonnés ;
- rôles `start`, `intermediate`, `end` ;
- filtrage des documents publiés.

Le présent PRD précise que `hasPublicPage` ne filtre pas la recherche d’un
chapitre.

La revue croisée du PRD 01 est intégrée : ses pages hubs trient par
`displayOrder` dès que ce champ est déployé et emploient avant cela un
fallback déterministe qui ne prétend pas donner une origine à la boucle.

### PRD 04 — Catalogue d’itinéraires ville à ville

Il réutilise les identités de villes, mais ne doit pas utiliser
`displayOrder` comme origine géographique ni l’index simplifié comme source
d’ancres, de métriques ou d’un GPX exportable.

La divergence des directions est intentionnelle : le finder compare AB et BA
pour localiser le chapitre le plus proche ; le catalogue MVP qualifie sa boucle
officielle avec les dix GPX AB seulement.

### PRD 03 — GPX Builder v2

Il peut réutiliser des fonctions de parsing testées si leurs contrats sont
compatibles. Le fichier simplifié du présent lot ne conserve ni altitude, ni
temps, ni extensions et ne convient jamais à l’export.

## 24. Décisions prises et validations restantes

### Décisions prises

- liste compacte remplaçant la galerie sur mobile ;
- recherche locale et sans appel réseau ;
- ordre explicite `displayOrder` ancré à Lille → Arras ;
- recherche limitée aux `cityPassages` publiés, indépendamment de l’import
  exhaustif du PRD 04 ;
- recherche portant sur tous ces passages, indépendamment de leur valeur
  `featured` ;
- ordre d’interface distinct du chaînage géographique du PRD 04 ;
- villes non dotées d’une page hub néanmoins cherchables ;
- absence de dénivelé dans le MVP ;
- index même origine, partagé, cacheable et sans coordonnées ;
- calcul de position intégralement côté navigateur ;
- chargement de l’index uniquement après une position obtenue ;
- prise en compte des deux directions officielles ;
- erreur de simplification cible de 20 m ;
- seuils initiaux de 1 km, 50 km et 250 m ;
- trois alternatives au maximum ;
- aucune carte, analytics ou nouvelle collecte.

### Validations obligatoires avant mise en production

- confirmer éditorialement l’ancre et la numérotation 1 à 10 ;
- mesurer le poids réel de l’index produit ;
- vérifier le mécanisme de cache dans l’hébergement Next cible ;
- comparer l’index simplifié aux 20 GPX de production ;
- identifier les croisements ou chevauchements nécessitant plusieurs
  résultats ;
- valider les seuils et formulations avec des positions terrain ;
- choisir les appareils médians de référence pour les budgets ;
- achever et publier les passages de villes requis par le PRD 01.

Une modification issue de cette recette est consignée dans la PR de production
avec sa mesure ou son cas de test. Elle ne doit pas rester une constante
inexpliquée.

## 25. Définition de terminé

Le lot est terminé lorsqu’un voyageur peut ouvrir `/chapitres` sur mobile et
accéder au bon chapitre depuis une liste compacte, une ville enregistrée ou
une position ponctuelle. Sur mobile, aucune galerie illustrée ne suit la
liste.

Le HTML reste utile sans JavaScript, la recherche ne dépend d’aucun service
externe, les GPX bruts ne sont pas transférés au navigateur et la position ne
quitte jamais l’appareil. Les résultats lointains ou ambigus sont formulés avec
prudence, les contenus non publiés restent privés et les pages de chapitres
existantes conservent leurs URL.
