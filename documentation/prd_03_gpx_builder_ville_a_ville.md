# PRD 03 — GPX Builder v2 : créer une portion officielle ville à ville

**Version :** 1.2\
**Date :** 6 août 2026\
**Statut :** implémenté localement — qualification éditoriale et activation en attente\
**Dépôts concernés par l’implémentation :** `gthdf-cms`, `gthdf-frontend`\
**Dépendances fonctionnelles :** PRD 01 — Référentiel des villes ; PRD 02 —
ordre public des chapitres\
**ADR lié :** [`adr_gpx_anchors.md`](adr_gpx_anchors.md)\
**Marque publique :** GTHF

---

## 1. Résumé de la décision

Le GPX Builder v2 remplace le fusionneur manuel de chapitres par un outil
unique : créer et télécharger une portion du parcours officiel entre deux
villes.

Un cyclotouriste choisit :

1. le sens dans lequel il parcourt le GTHF ;
2. la ville où il rejoint ou reprend la trace ;
3. la ville jusqu’à laquelle il veut avancer.

Le Builder extrait alors les fragments nécessaires depuis les GPX officiels
du sens choisi. Si la portion traverse plusieurs chapitres, il assemble
automatiquement la fin du premier, les éventuels chapitres intermédiaires et
le début du dernier.

Les décisions structurantes sont les suivantes :

- aucun GPX personnel n’est importé ;
- aucun fichier utilisateur n’est envoyé au site ;
- le panier de fusion par chapitres est remplacé par deux sélecteurs de
  villes ;
- les GPX AB et BA restent deux sources officielles distinctes ; le Builder ne
  fabrique jamais un sens en inversant l’autre ;
- une portion peut représenter une journée sportive, plusieurs jours de
  cyclotourisme ou une étape familiale ; aucune durée ni distance journalière
  n’est recommandée ;
- les villes sélectionnables proviennent des `cityPassages` publiés et
  ordonnés des chapitres ;
- chaque passage possède un ancrage précis et validé sur chacun des GPX AB et
  BA du chapitre ;
- chaque frontière de chapitre utilise un seul lieu de jonction éditorial,
  commun aux sens AB et BA, sans rendre leurs géométries interchangeables ;
- la génération utilise seulement les points des GPX officiels, jamais la
  géométrie simplifiée du PRD 02 ;
- les coordonnées et altitudes de la portion sont conservées ;
- les horodatages des tours sources sont omis, car ils décrivent des
  enregistrements distincts et ne constituent pas un horaire de voyage ;
- un seul GPX est téléchargé par sélection ;
- le calcul est fait à la demande côté serveur Next, avec des sources et
  paramètres strictement autorisés ;
- le cœur de découpe, les empreintes de source et les fixtures deviennent un
  socle réutilisable par le PRD 04 sans confondre outil interactif et
  catalogue SEO.

## 2. Contexte et besoin utilisateur

Le Builder actuel demande de connaître les chapitres, leur sens et leur ordre.
Cette représentation correspond à la structure éditoriale du site, pas à la
façon dont un cyclotouriste prépare une étape.

Le besoin réel est plus direct :

> Je dors au Portel. Je rejoins la trace à Boulogne-sur-Mer et je veux avancer
> jusqu’à Gravelines. Je télécharge le GPX correspondant.

Boulogne-sur-Mer appartient au chapitre Étaples → Calais et Gravelines au
chapitre Calais → Saint-Omer. L’utilisateur ne doit pas devoir sélectionner
ces deux chapitres, les ordonner puis modifier le résultat. Le Builder connaît
la boucle, les villes, les frontières de chapitre et le sens choisi.

Le mot « étape » décrit ici une portion choisie par le voyageur. Il ne
présuppose ni performance, ni nombre de jours :

- un sportif peut la parcourir en une journée ;
- un cyclotouriste peut la répartir sur deux jours ;
- une famille avec de jeunes enfants peut la répartir sur quatre jours.

Le produit ne doit donc ni recommander une durée, ni classer l’utilisateur, ni
découper automatiquement sa portion en journées.

Le sens est en revanche un choix de sécurité et de confort, pas un simple
affichage. Une variante officielle peut éviter d’envoyer un cyclotouriste
chargé dans une côte à 15 %. Le Builder doit donc conserver la géométrie et le
dénivelé propres à chaque sens.

## 3. Objectifs

- rendre le parcours « sens, départ, arrivée, téléchargement » évident ;
- proposer toutes les villes éditorialement ordonnées sur le GTHF ;
- utiliser le GPX officiel correspondant au sens réellement choisi ;
- préserver les variantes de parcours AB et BA, notamment lorsqu’elles
  évitent une pente inadaptée à un vélo chargé ;
- traiter une portion située dans un chapitre ou à cheval sur plusieurs
  chapitres ;
- afficher avant téléchargement la distance, le dénivelé disponible et les
  chapitres traversés ;
- produire un GPX autonome, valide et accepté par les applications de
  navigation retenues pour la recette ;
- détecter un ancrage absent ou périmé plutôt que couper approximativement ;
- garder les sources, calculs et décisions d’ancrage auditables ;
- fournir au PRD 04 un contrat commun de découpe et de métriques.

## 4. Non-objectifs

Ce lot ne doit pas :

- importer, découper ou fusionner un GPX personnel ;
- accepter une URL de GPX fournie par le navigateur ;
- conserver un projet dans un compte, le navigateur ou Strapi ;
- modifier librement la géométrie du GTHF ;
- calculer un itinéraire sur le réseau routier ;
- relier une rupture entre deux GPX par une ligne inventée ;
- suggérer un hébergement, un commerce, une ville d’étape ou une durée ;
- découper automatiquement une portion en journées ;
- comparer le niveau sportif des voyageurs ;
- ajouter une carte interactive, un profil manipulable ou un fond de tuiles
  dans le MVP ;
- créer une archive ZIP ou plusieurs fichiers pour une même sélection ;
- créer les pages indexables et les révisions persistées du PRD 04 ;
- pré-calculer et stocker toutes les paires de villes ;
- publier les occurrences géographiques exhaustives requises par le catalogue
  du PRD 04 ;
- renommer globalement les identifiants techniques legacy `GTHDF`.

## 5. Utilisateurs et parcours principaux

### Cyclotouriste qui reprend le parcours

Il sélectionne le sens de son voyage, Boulogne-sur-Mer comme départ et
Gravelines comme arrivée. Il voit que la portion traverse deux chapitres,
contrôle sa distance et son dénivelé, puis télécharge un GPX unique.

### Voyageur qui prépare une portion courte

Il sélectionne deux villes du même chapitre. Le Builder extrait uniquement les
points compris entre leurs ancrages, sans télécharger le chapitre entier.

### Voyageur qui suit le GTHF dans l’autre sens

Il choisit le sens BA. Les villes sont présentées dans cet ordre et la portion
est extraite des médias `gpxFileBA`. Le Builder n’inverse jamais le GPX AB :
les deux sens peuvent suivre des voiries différentes et présenter des pentes
très différentes.

### Utilisateur au clavier ou sur téléphone

Il réalise l’ensemble du parcours avec des contrôles de formulaire standards,
sans geste cartographique, glisser-déposer ou cible précise.

## 6. État confirmé des données et du code

### 6.1 Données publiées

Le 5 août 2026, l’API locale synchronisée avec la production expose :

- 10 chapitres publiés, ordonnés par `displayOrder` ;
- 233 `cityPassages` ordonnés ;
- un média `gpxFileAB` et un média `gpxFileBA` sur chacun des 10
  chapitres ;
- 15 passages sur Étaples → Calais, dont Le Portel et Boulogne-sur-Mer ;
- 22 passages sur Calais → Saint-Omer, dont Gravelines.

Les `cityPassages` donnent la présence et l’ordre éditorial d’une ville, mais
pas le point exact auquel couper un GPX. Les coordonnées de `City`
représentent une ancre communale ; elles ne sont pas une coordonnée de trace
qualifiée et peuvent être éloignées, ambiguës ou proches de plusieurs passages.

### 6.2 GPX officiels

Les 20 médias observés sont des GPX 1.1 contenant :

- des coordonnées sur tous les points ;
- une altitude sur tous les points ;
- un horodatage sur tous les points ;
- aucun waypoint ;
- aucun élément `extensions`.

Les fichiers AB et BA ont des nombres de points différents sur les dix
chapitres. Une comparaison géométrique échantillonnée montre également des
écarts locaux de plusieurs centaines de mètres. Ils constituent donc deux
parcours administrés distincts et non les deux orientations d’une même liste
de points.

### 6.3 Cas Boulogne-sur-Mer → Gravelines

Le jeu de contrôle du 19 juillet 2026 place :

- Boulogne-sur-Mer à environ 754 162 m sur la boucle de contrôle ;
- la jonction de Calais à environ 802 756 m ;
- Gravelines à environ 833 721 m.

La portion de contrôle mesure donc environ 79,6 km. La jonction observée entre
les GPX AB Étaples → Calais et Calais → Saint-Omer est exacte à la précision
du contrôle. Ces valeurs qualifient le cas de recette ; elles ne deviennent
pas des constantes applicatives.

### 6.4 Builder actuel

`/gpx-builder` est un Client Component monolithique qui :

- charge les chapitres directement depuis Strapi au montage ;
- présente les médias AB et BA par chapitre ;
- maintient un panier manuel ;
- concatène les `trkpt` dans le navigateur ;
- ne connaît ni `cityPassages`, ni ancrages de ville ;
- utilise encore la marque publique legacy dans ses metadata et exports.

Le parcours public et le pipeline de génération sont remplacés. Le panier
n’est pas conservé comme mode secondaire.

## 7. Expérience publique

### 7.1 Structure de la page

La page affiche, dans cet ordre :

1. un retour vers le GTHF ;
2. le H1 `Créer mon GPX sur le GTHF` ;
3. une explication courte : choisir son sens, son départ et son arrivée ;
4. le choix du sens ;
5. la ville de départ ;
6. la ville d’arrivée ;
7. le résumé de la portion ;
8. l’action `Télécharger mon GPX`.

Le formulaire et son résultat restent compréhensibles sans carte.

### 7.2 Choix du sens

Les identifiants techniques `AB` et `BA` ne sont pas les seuls libellés
publics. Chaque option décrit les premières étapes du sens, par exemple :

- `Sens Lille → Arras` ;
- `Sens Lille → Saint-Omer`.

Le texte rappelle que les deux sens peuvent emprunter des routes différentes.
Changer de sens conserve une ville seulement si une occurrence qualifiée
existe dans ce sens ; sinon le champ concerné est réinitialisé avec une
explication.

### 7.3 Choix des villes

- le départ et l’arrivée sont des contrôles recherchables au clavier ;
- la recherche porte sur `name` et `alternativeNames` ;
- l’ordre des résultats suit le sens choisi, pas l’alphabet ;
- une ville n’a pas besoin de `hasPublicPage=true` pour être sélectionnable ;
- elle doit être publiée, référencée par un chapitre publié et disposer d’un
  ancrage validé pour le sens ;
- le départ ne peut pas être identique à l’arrivée ;
- après le départ, l’arrivée affiche la progression dans le sens choisi ;
- lorsque la boucle revient à son origine, le résumé le signale explicitement.

Une ville réellement rencontrée plusieurs fois reste représentée par plusieurs
arrêts désambiguïsés, par exemple avec le chapitre ou la position relative.
Le Builder ne choisit jamais silencieusement une occurrence.

### 7.4 Frontières de chapitre

Une même ville peut être le dernier passage d’un chapitre et le premier du
suivant. Si les deux ancrages décrivent la même jonction validée, l’interface
affiche un seul arrêt public.

Le lieu de jonction éditorial est choisi une seule fois pour les deux sens.
Par défaut, il s’agit de la gare SNCF voyageurs de la ville lorsqu’elle existe
et constitue un repère adapté. Une exception peut utiliser un repère stable et
nommé : à Condé-sur-l’Escaut, le point retenu se situe près des fortifications.
Cette symétrie éditoriale ne permet jamais de dériver une géométrie ou un
dénivelé BA depuis AB.

Le manifeste serveur conserve néanmoins les deux côtés de la frontière afin de
savoir quel fichier terminer ou commencer lors de l’extraction.

### 7.5 Résumé avant téléchargement

Après une sélection valide, afficher :

- `De {départ} à {arrivée}` ;
- le sens choisi ;
- la distance à 0,1 km ;
- le dénivelé positif et négatif disponibles, préfixés par `~` ;
- les chapitres traversés dans l’ordre ;
- le nombre de séquences si une rupture connue impose plusieurs segments ;
- un avertissement de jonction le cas échéant ;
- un rappel : `Cette portion ne constitue pas une estimation de durée.`

Le bouton de téléchargement reste désactivé tant que le serveur n’a pas
confirmé que la configuration et les sources sont cohérentes.

## 8. Ordre du parcours

### 8.1 Boucle AB

Le sens AB utilise les chapitres dans l’ordre cyclique de `displayOrder` et
les médias `gpxFileAB`. L’origine d’affichage peut rester Lille sans devenir
une origine géographique absolue.

### 8.2 Boucle BA

Le sens BA parcourt les chapitres dans l’ordre inverse et utilise
`gpxFileBA` pour chacun. À l’intérieur d’un chapitre, les `cityPassages`
sont lus dans l’ordre inverse.

Le Builder ne retourne pas les points AB pour simuler BA.

### 8.3 Passage par l’origine

Pour un sens donné, la portion va toujours du départ vers l’arrivée dans ce
sens, avec au plus un tour de boucle. Si l’arrivée précède le départ dans la
liste affichée, la portion traverse la fin puis le début de la boucle.

Le résumé affiche alors clairement la longueur et les chapitres afin d’éviter
un téléchargement très long par surprise.

## 9. Ancrages directionnels de passage

### 9.1 Pourquoi un ancrage dédié

Le nom d’une ville, sa position dans `cityPassages` et ses coordonnées
communales ne suffisent pas à couper un GPX :

- la trace peut traverser plusieurs fois la même commune ;
- la mairie ou le centre peut ne pas se trouver sur la trace ;
- plusieurs segments peuvent passer à proximité ;
- AB et BA peuvent emprunter des voiries différentes ;
- remplacer un média GPX rend les anciens indices invalides.

Le Builder ne calcule donc pas un « point le plus proche » au moment du
téléchargement. Il consomme uniquement des ancrages proposés par un outil
versionné puis validés.

### 9.2 Extension de `chapter.city-passage`

Le composant reçoit deux sous-composants optionnels :

- `gpxAnchorAB` ;
- `gpxAnchorBA`.

Contrat implémenté pour `chapter.gpx-anchor` :

| Champ | Type | Règle |
|---|---|---|
| `status` | enum | `proposed`, `validated` ou `stale` |
| `sourceSha256` | string | SHA-256 binaire du média GPX qualifié |
| `trackIndex` | integer | index du `trk` source |
| `segmentIndex` | integer | index du `trkseg` source |
| `pointIndex` | integer | point précédant la projection |
| `fraction` | decimal | fraction comprise entre ce point et le suivant |
| `chainageMetres` | decimal | distance depuis le début du GPX du chapitre |
| `projectedLatitude` | decimal | latitude exacte sur la trace |
| `projectedLongitude` | decimal | longitude exacte sur la trace |
| `distanceToCityMetres` | decimal | métrique de QA depuis l’ancre communale |
| `algorithmVersion` | string | version de proposition et de calcul |
| `reviewNote` | text court | justification d’une ambiguïté résolue |

Le schéma conserve ainsi au plus un ancrage primaire validé par passage et par
direction, lié à une empreinte exacte.

### 9.3 Invariants

- un ancrage AB référence uniquement `gpxFileAB` de son chapitre ;
- un ancrage BA référence uniquement `gpxFileBA` ;
- indices, fraction, coordonnée et chaînage doivent désigner la même position ;
- le point projeté appartient à une séquence source existante ;
- les ancrages suivent strictement l’ordre des `cityPassages` dans leur sens ;
- deux passages distincts ne partagent pas une clé implicite par leur seul nom ;
- un passage `start` ou `end` peut reprendre l’extrémité exacte du GPX ;
- une publication de chapitre reste possible sans ancrage tant que le Builder
  n’est pas activé ;
- le Builder n’expose que les passages entièrement qualifiés pour le sens
  choisi.

### 9.4 Proposition et revue

Une commande npm du CMS :

1. télécharge uniquement les 20 médias officiels autorisés ;
2. valide taille, XML, structure, coordonnées et altitude ;
3. calcule leur SHA-256 binaire ;
4. projette l’ancre communale sur les candidats compatibles avec l’ordre des
   passages ;
5. réutilise les limites administratives et chaînages du classeur comme
   contrôles lorsqu’ils sont disponibles ;
6. classe plusieurs passages possibles, un écart élevé ou un ordre incohérent
   comme ambigu ;
7. produit un rapport avant toute écriture ;
8. écrit seulement dans les brouillons avec `--apply` et une confirmation
   explicite ;
9. ne publie aucun chapitre.

Les villes de frontière et les cas à plusieurs passages sont relus
explicitement. Une proposition ambiguë n’est jamais transformée en ancrage
`validated` par le script.

### 9.5 Péremption

Au chargement de la configuration et avant chaque téléchargement, le serveur
compare `sourceSha256` aux octets du média courant.

Un média remplacé, une structure modifiée ou un ancrage impossible à relire
fait passer la portion à l’état indisponible. Aucun fallback par coordonnées
communales ou ancien index n’est autorisé.

La commande de préparation propose alors de nouveaux ancrages sans écraser la
version validée dans le rapport de dry run.

## 10. Extraction d’une portion

### 10.1 Préconditions

La génération exige :

- deux arrêts distincts présents dans le manifeste du sens ;
- tous les chapitres nécessaires publiés et ordonnés ;
- chaque média source accessible, borné et conforme ;
- ancrages de départ et d’arrivée `validated` ;
- empreintes des ancrages égales à celles des médias courants ;
- chaque jonction traversée qualifiée ;
- aucune séquence vide ou coordonnée invalide.

Une précondition manquante rend seulement la portion concernée indisponible et
produit un diagnostic générique côté public, détaillé côté serveur sans secret.

### 10.2 Même chapitre

Le moteur conserve les points compris entre les deux ancrages dans l’ordre du
GPX du sens choisi.

### 10.3 Plusieurs chapitres

Le moteur concatène dans l’ordre :

1. le fragment entre l’ancrage de départ et la fin de son GPX ;
2. les GPX complets des chapitres intermédiaires ;
3. le fragment entre le début du dernier GPX et l’ancrage d’arrivée.

Une portion passant par l’origine de la boucle suit la même règle avec un
retour cyclique unique.

### 10.4 Points de coupe

Si `fraction` désigne exactement un point source, son nœud est réutilisé.
Sinon, un point est créé avec :

- latitude et longitude interpolées ;
- altitude interpolée si les deux points voisins possèdent une altitude
  valide ;
- aucun horodatage ;
- aucune donnée inventée.

Le même point calculé devient l’extrémité exacte du document généré.

### 10.5 Jonctions

- une décision éditoriale qualifie le même lieu pour AB et BA ;
- le CMS conserve néanmoins deux enregistrements directionnels, car chacun est
  lié aux empreintes et aux extrémités de ses deux médias adjacents ;
- la gare SNCF voyageurs est le repère par défaut ; un repère stable et nommé
  est accepté pour les exceptions, comme les fortifications à
  Condé-sur-l’Escaut ;
- une jonction exacte peut réunir deux séquences en dédupliquant le point
  commun ;
- une rupture connue et acceptée reste représentée par deux `trkseg` ;
- une rupture non relue ou bloquée interdit le téléchargement ;
- aucune distance n’est ajoutée à travers une rupture ;
- aucune ligne droite artificielle n’est sérialisée.

## 11. Contrat du GPX généré

### 11.1 Données conservées et omises

Le corpus officiel actuel ne contient ni waypoint ni extension. Le Builder
conserve :

- latitude et longitude ;
- altitude ;
- ordre des points ;
- limites des séquences continues utiles.

Il omet volontairement :

- les éléments `time` des enregistrements Komoot sources ;
- les metadata devenues fausses après découpe ;
- les noms de tours et créateurs sources.

Une future apparition de waypoint ou d’extension dans un média officiel fait
échouer l’audit de qualification jusqu’à ce que le contrat soit explicitement
mis à jour. Le Builder n’a pas à préserver les structures arbitraires d’un
fichier utilisateur puisqu’il n’en accepte aucun.

### 11.2 Document autonome

Le fichier produit est un GPX 1.1 avec :

- `creator="GTHF GPX Builder"` ;
- des metadata décrivant le départ, l’arrivée, le sens et la date de
  génération ;
- un `trk` nommé `{Départ} → {Arrivée} sur le GTHF` ;
- un `trkseg` par séquence continue ;
- des coordonnées et altitudes valides ;
- MIME `application/gpx+xml` ;
- déclaration XML UTF-8 ;
- relecture réussie par le parseur de référence avant envoi.

### 11.3 Nom du fichier

Format :

`gthf-{depart}-vers-{arrivee}-{sens}.gpx`

Les valeurs sont normalisées en ASCII, bornées et issues des libellés connus du
serveur. Aucun fragment de chemin ou nom fourni librement par le navigateur
n’est utilisé.

## 12. Distance et dénivelé

### 12.1 Distance

- somme géodésique WGS84 des paires successives ;
- aucune distance à travers une rupture ;
- valeurs internes en mètres non arrondis ;
- affichage à 0,1 km ;
- somme des fragments égale à celle de la portion générée à un mètre ou
  0,01 %, selon la tolérance la plus grande.

### 12.2 Dénivelé

Le calcul porte sur le GPX du sens choisi, jamais sur le GPX opposé retourné.
Il adopte le contrat partagé avec le PRD 04 :

1. au moins 95 % de couverture altimétrique par distance ;
2. aucune interpolation d’une lacune supérieure à 250 m ;
3. rééchantillonnage de chaque séquence continue tous les 25 m ;
4. lissage par fenêtre métrique centrée de 100 m ;
5. cumul séparé des différences positives et négatives ;
6. aucun calcul à travers une rupture ;
7. affichage préfixé par `~` et arrondi à 10 m.

Si la couverture est insuffisante, afficher `Dénivelé indisponible`. Aucune
durée, vitesse, difficulté ou recommandation sportive n’est dérivée.

## 13. Architecture

### 13.1 Responsabilités du CMS

`gthdf-cms` :

- étend `chapter.city-passage` avec les deux ancrages directionnels ;
- qualifie sur chaque chapitre les jonctions directionnelles vers le chapitre
  suivant dans le sens parcouru ;
- porte le coupe-circuit global `gpxBuilderEnabled`, désactivé par défaut ;
- valide la cohérence des ancrages au moment de publier un chapitre lorsque le
  Builder est activé ;
- fournit la commande de proposition, dry run et application ;
- conserve les statuts, empreintes et notes de revue ;
- expose au frontend serveur uniquement les données publiées nécessaires ;
- ne génère pas un GPX dans une requête publique longue ;
- ne stocke aucune paire ni aucun téléchargement utilisateur.

### 13.2 Responsabilités du frontend

`gthdf-frontend` :

- rend le formulaire et le résumé ;
- construit un manifeste serveur minimal depuis Strapi ;
- charge les GPX officiels via les URL de médias de confiance ;
- vérifie les empreintes et découpe à la demande ;
- calcule distance et dénivelé ;
- sérialise puis renvoie le fichier ;
- ne transmet ni token Strapi, ni URL de média, ni détails techniques
  d’ancrage au navigateur ;
- ne persiste pas la sélection.

### 13.3 Noyau pur

Le frontend contient un noyau pur et testé pour :

- parsing borné du GPX officiel ;
- empreinte des sources ;
- métriques WGS84 ;
- interpolation d’ancre ;
- extraction cyclique multi-chapitres ;
- gestion des séquences et jonctions ;
- dénivelé ;
- sérialisation et relecture.

Le PRD 04 doit partager ses fixtures et résultats. Une publication de package
entre dépôts n’est pas imposée pour le MVP.

## 14. Contrats serveur

### 14.1 Configuration du Builder

La page est un Server Component qui charge un DTO minimal :

- révision du manifeste ;
- sens disponibles et libellés publics ;
- arrêts ordonnés par sens ;
- identifiant opaque d’arrêt ;
- nom et variantes de recherche ;
- contexte de désambiguïsation ;
- disponibilité.

Le DTO ne contient ni GPX brut, ni URL de média, ni token, ni coordonnées
complètes.

### 14.2 Prévisualisation d’une portion

Une route serveur reçoit uniquement :

- la direction `AB` ou `BA` ;
- l’identifiant opaque du départ ;
- l’identifiant opaque de l’arrivée ;
- la révision du manifeste.

Elle valide ces valeurs contre le manifeste courant puis renvoie le résumé.
Elle n’accepte ni URL, ni XML, ni coordonnées.

### 14.3 Téléchargement

Le téléchargement réutilise exactement la sélection et la révision validées.
Le serveur recalcule les garde-fous avant de répondre avec :

- statut 200 ;
- `Content-Type: application/gpx+xml` ;
- `Content-Disposition: attachment` avec un nom sûr ;
- cache privé ou public seulement après qualification de l’absence de données
  utilisateur et de la stratégie d’invalidation.

Une révision périmée produit une réponse de conflit ou d’indisponibilité et
invite à actualiser la page.

## 15. États et erreurs

### Chargement

- configuration disponible ;
- Strapi indisponible ;
- aucun sens entièrement qualifié ;
- configuration partielle ;
- nouvelle version disponible.

### Sélection

- aucun départ ;
- aucune arrivée ;
- départ et arrivée identiques ;
- occurrence à désambiguïser ;
- passage par l’origine de la boucle ;
- portion temporairement indisponible.

### Génération

- média inaccessible ;
- média trop lourd ;
- XML officiel invalide ;
- empreinte différente ;
- ancrage absent, incohérent ou périmé ;
- jonction bloquée ;
- métrique indisponible ;
- sérialisation ou relecture échouée ;
- téléchargement prêt.

Les erreurs publiques sont actionnables et ne révèlent ni URL interne, ni
token, ni chemin, ni détail de stockage.

## 16. Sécurité et confidentialité

- aucune entrée XML utilisateur ;
- aucune URL arbitraire ;
- paramètres bornés et validés contre le manifeste ;
- médias limités aux origines approuvées par `trusted-media-url` ;
- taille, délai et nombre de points bornés ;
- `DOCTYPE` et entités externes refusés ;
- aucun fetch d’une URL contenue dans un GPX ;
- token Strapi strictement serveur ;
- aucun secret dans `NEXT_PUBLIC_*` pour cette fonctionnalité ;
- noms de fichiers générés depuis des données serveur ;
- pas de cookie, analytics ou journal contenant une sélection détaillée ;
- limitation de fréquence à évaluer sur la route de génération ;
- erreurs serveur sans contenu GPX complet.

Le Builder ne traite aucune donnée privée de trajet. Le choix de deux villes
est transitoire et n’est pas stocké comme projet utilisateur.

## 17. Accessibilité et responsive

- formulaire utilisable à 320 px sans défilement horizontal ;
- labels visibles et associés ;
- contrôles standards utilisables au clavier et au toucher ;
- cibles d’au moins 44 × 44 pixels CSS ;
- ordre des options annoncé sans dépendre de la couleur ;
- états de calcul dans une région `aria-live="polite"` ;
- erreurs critiques avec `role="alert"` ;
- focus déplacé vers le résumé après validation sans piéger le clavier ;
- aucun geste de carte requis ;
- bouton de téléchargement doté d’un libellé complet ;
- chapitres et avertissements rendus comme texte.

## 18. Performance et cache

- aucun GPX brut dans le HTML initial ;
- aucun GPX chargé avant une sélection complète ;
- maximum dix médias lus pour une portion faisant un tour de boucle ;
- téléchargements bornés et parallélisme limité ;
- sources officielles chargées sans cache partagé tant que la stratégie
  d’invalidation par empreinte n’a pas été mesurée sur Clever Cloud ;
- coupe-circuit global relu sans cache et page dynamique afin qu’une activation
  ou désactivation éditoriale soit visible au prochain chargement ;
- chapitres qualifiés revalidés toutes les 60 secondes ;
- manifeste Strapi revalidé sans rendre un ancien ancrage compatible avec un
  nouveau média ;
- résumé visé en moins de 2 s à chaud et 5 s à froid ;
- téléchargement démarré en moins de 5 s à froid pour le tour complet actuel ;
- mémoire compatible avec l’instance Clever Cloud `nano` ou limite ajustée
  après mesure ;
- aucune dépendance Leaflet, ZIP ou parsing de fichier privé ajoutée.

Les budgets sont mesurés sur Clever Cloud et sur un téléphone médian pour le
parcours de formulaire. Le calcul reste serveur.

## 19. Développement piloté par les tests

### 19.1 Fixtures

- GPX AB et BA synthétiques volontairement différents ;
- portion dans un chapitre ;
- portion sur deux chapitres avec jonction exacte ;
- portion sur plusieurs chapitres ;
- portion traversant l’origine de boucle ;
- jonction acceptée avec plusieurs `trkseg` ;
- jonction bloquée ;
- ancre sur un point original ;
- ancre interpolée ;
- ancre périmée par changement de hash ;
- ville frontière dupliquée ;
- ville à plusieurs occurrences ;
- altitude complète et insuffisante ;
- XML invalide, `DOCTYPE`, coordonnées invalides ;
- média sans géométrie ou dépassant les limites.

### 19.2 Tests automatiques

- ordre AB et BA ;
- filtrage et recherche des villes ;
- désambiguïsation des occurrences ;
- calcul cyclique et passage par l’origine ;
- découpe même chapitre et multi-chapitres ;
- aucune inversion d’AB pour produire BA ;
- validation des empreintes ;
- interpolation coordonnée et altitude ;
- absence de temps dans l’export ;
- distance et dénivelé connus ;
- absence de ligne entre séquences ;
- sérialisation puis relecture ;
- nom et en-têtes de téléchargement ;
- refus de paramètres, URL ou ancre inconnus ;
- aucune URL ou coordonnée brute dans le DTO public.

### 19.3 Recette de référence

Le scénario Boulogne-sur-Mer → Gravelines en sens AB doit :

- sélectionner Boulogne-sur-Mer dans Étaples → Calais ;
- traverser la jonction exacte de Calais ;
- terminer sur l’ancrage de Gravelines dans Calais → Saint-Omer ;
- produire environ 79,6 km selon la version qualifiée des sources ;
- inclure les deux chapitres dans le résumé ;
- se réimporter dans les applications de navigation de recette ;
- s’ouvrir correctement dans au moins deux applications de navigation.

La recette BA utilise un cas où les géométries AB et BA divergent afin de
prouver que le média BA est réellement utilisé.

## 20. Migration et déploiement

### 20.1 PR CMS

1. ajouter le composant d’ancrage et les validations ;
2. ajouter la commande de proposition et ses tests ;
3. lancer le dry run sur les 233 passages et les deux directions ;
4. renseigner une seule décision par lieu de jonction et la décliner en AB et
   BA dans le rapport ;
5. résoudre les ambiguïtés d’ancrage ;
6. appliquer uniquement aux brouillons ;
7. relire puis publier les chapitres ;
8. laisser le Builder v2 désactivé.

Le rapport conserve les hashes avant/après, les passages non résolus et les
commandes de retour arrière. Aucune migration ne remplace une valeur validée
sans décision explicite.

Le composant `gpx-junction` existant suffit : le libellé du lieu et la
justification sont conservés dans sa note de revue. La préparation accepte un
tableau `junctionPairs` et crée les deux résolutions directionnelles. Cette
évolution du fichier de données ne nécessite donc pas de migration de schéma
Strapi.

### 20.2 PR frontend

1. ajouter le noyau pur et ses tests ;
2. ajouter le manifeste serveur et les routes bornées ;
3. remplacer l’interface du fusionneur ;
4. valider les deux sens et les portions multi-chapitres ;
5. déployer avec la nouvelle interface désactivée ;
6. activer après recette sur les données publiées.

### 20.3 Ordre de production

1. sauvegarde PostgreSQL ;
2. déploiement CMS compatible avec les anciens chapitres ;
3. préparation et publication des ancrages ;
4. déploiement frontend ;
5. recette AB/BA ;
6. activation du Builder v2.

Les deux PR d’implémentation sont distinctes et liées entre elles.

### 20.4 Retour arrière

- désactiver le Builder v2 ;
- restaurer l’interface précédente seulement si un besoin de téléchargement
  par chapitre persiste pendant l’incident ;
- conserver les ancrages publiés, qui sont additifs ;
- restaurer le snapshot des brouillons si une migration de données doit être
  annulée ;
- ne supprimer ni média, ni champ, ni donnée dans le rollback immédiat.

## 21. Critères d’acceptation

### Produit

- le panier de fusion n’est plus présenté ;
- le parcours public tient en trois choix : sens, départ, arrivée ;
- aucune importation de fichier n’existe ;
- aucune durée ou découpe journalière n’est suggérée ;
- une portion peut représenter librement un à plusieurs jours ;
- le résumé précède le téléchargement.

### Directions

- AB utilise exclusivement les médias AB ;
- BA utilise exclusivement les médias BA ;
- les villes suivent le sens choisi ;
- un cas de divergence AB/BA produit deux géométries et métriques conformes
  aux sources ;
- aucune pente évitée par un sens officiel n’est réintroduite en inversant
  l’autre trace.

### Villes et ancrages

- les 233 passages disposent d’un état explicite par direction ;
- seul un ancrage validé et à jour est sélectionnable ;
- une ville frontière cohérente apparaît une seule fois ;
- plusieurs occurrences réelles sont désambiguïsées ;
- remplacer un GPX invalide ses ancrages ;
- aucun fallback géographique silencieux n’existe.

### Extraction et GPX

- même chapitre, plusieurs chapitres et passage par l’origine fonctionnent ;
- aucun point extérieur à la portion n’est exporté hors points de coupe
  partagés ;
- les coordonnées et altitudes sont conservées ;
- les temps sont absents ;
- les ruptures restent des `trkseg` distincts ;
- aucune ligne n’est créée dans un vide ;
- le fichier se reparcourt avec le parseur de référence ;
- le nom, le MIME et les metadata portent GTHF.

### Qualité

- distance et dénivelé utilisent le sens sélectionné ;
- le cas Boulogne-sur-Mer → Gravelines passe ;
- tous les paramètres non autorisés sont refusés ;
- aucune URL de média ou donnée d’ancrage brute n’est exposée au client ;
- navigation clavier, téléphone et lecteur d’écran validée ;
- `npm test`, `npm run lint` et `npm run build` passent dans le frontend ;
- `npm test` et `npm run build` passent dans le CMS ;
- budgets serveur et navigateur mesurés.

## 22. Zones de code probablement concernées

### `gthdf-cms`

- `src/components/chapter/city-passage.json` ;
- nouveau composant `src/components/chapter/gpx-anchor.json` ;
- validation de publication des chapitres ;
- commande de préparation sous `scripts/` et script npm ;
- rapport et éventuel fichier de résolution ;
- tests unitaires et d’intégration ;
- README et runbook de migration.

### `gthdf-frontend`

- `app/gpx-builder/page.tsx`, metadata et styles ;
- nouveaux composants de formulaire sous `components/gpx-builder/` ;
- noyau sous `lib/gpx/` ;
- client Strapi serveur dédié ;
- routes de résumé et téléchargement ;
- réutilisation de `bounded-response` et `trusted-media-url` ;
- fixtures et tests ;
- README de recette locale.

## 23. Impact sur le PRD 04

PRD 03 et PRD 04 traitent tous deux des portions officielles, mais répondent à
deux besoins différents :

| PRD 03 | PRD 04 |
|---|---|
| outil interactif non indexé | catalogue de pages canoniques |
| paire ordonnée par le sens choisi | paire métier non ordonnée |
| AB et BA disponibles | AB canonique dans le MVP |
| un ancrage primaire par `cityPassage` et direction | toutes les occurrences géographiques qualifiées |
| génération à la demande, sans persistance | révisions et médias immuables persistés |
| aucune décision SEO | publication et indexation éditoriales |

Conséquences :

- le noyau de parsing, découpe, jonction, distance, dénivelé et sérialisation
  défini ici devient le contrat de référence du PRD 04 ;
- les ancrages AB validés de PRD 03 peuvent amorcer les occurrences primaires
  de `RouteAnchor` avec une provenance explicite ;
- ils ne remplacent pas les 449 occurrences attendues par PRD 04 : un
  `cityPassage` choisit un arrêt public, tandis que le catalogue doit évaluer
  tous les passages d’une commune ;
- PRD 04 conserve son `ReferenceRoute`, ses qualifications, runs,
  révisions, seuils et garde-fous SEO ;
- le job PRD 04 ne doit pas appeler la route HTTP publique du Builder : il
  réutilise le noyau pur ou, à défaut, les mêmes fixtures et résultats ;
- PRD 04 ne peut plus supposer que PRD 03 fournit Leaflet ou une carte ;
- les deux lots omettent les temps des GPX dérivés ;
- une modification du contrat commun exige une version et une validation
  croisée des deux PRD.

PRD 03 devient donc une dépendance de socle pour PRD 04, mais pas une
dépendance d’exécution : fermer le Builder ne ferme pas les pages catalogue.

## 24. Décisions prises et validations restantes

### Décisions prises

- remplacement complet du fusionneur par la sélection ville à ville ;
- aucune importation de GPX ;
- prise en charge des deux sens officiels ;
- AB et BA jamais dérivés l’un de l’autre ;
- aucune notion de durée ou de journée recommandée ;
- un seul fichier par sélection ;
- ancrages primaires stockés par passage et direction ;
- un lieu de jonction éditorial partagé par frontière, décliné en deux
  qualifications techniques AB et BA ;
- calcul des ancrages hors requête publique puis validation ;
- génération à la demande côté Next ;
- coordonnées et altitudes conservées, temps omis ;
- pas de carte ou ZIP dans le MVP ;
- socle de découpe partagé avec PRD 04 ;
- modèles exhaustifs et SEO laissés au PRD 04.

### Validations techniques restantes

- qualifier les 233 passages dans les deux sens et recenser les ambiguïtés ;
- appliquer aux brouillons les cinq décisions de jonction partagées déjà
  préparées, après la revue des ancrages ;
- mesurer le coût froid et chaud sur Clever Cloud `nano` ;
- confirmer la stratégie de cache et d’invalidation par hash ;
- tester les GPX générés dans les applications de navigation retenues ;
- confirmer si une limitation de fréquence dédiée est nécessaire.

Ces validations ne permettent pas de remplacer BA par AB inversé, de choisir
une occurrence ambiguë automatiquement ou de réintroduire un fichier
personnel.

## 25. Définition de terminé

Le lot est terminé lorsqu’un voyageur choisit un sens, une ville de départ et
une ville d’arrivée, comprend la portion obtenue puis télécharge un GPX fidèle
aux sources officielles de ce sens.

Le cas peut rester dans un chapitre, en traverser plusieurs ou passer par
l’origine de la boucle. Les ancrages sont validés et liés aux empreintes
exactes, les ruptures ne sont jamais masquées, les métriques correspondent au
sens choisi et aucune hypothèse de durée n’est imposée.

Le même contrat de découpe peut alors alimenter le catalogue du PRD 04 sans
transformer le Builder en générateur de pages SEO ni réduire les occurrences
exhaustives du catalogue à ses seuls arrêts éditoriaux.

## 26. Bilan d’implémentation de la version 1.2

Le 6 août 2026, l’implémentation locale couvre :

- les composants Strapi `gpx-anchor` et `gpx-junction`, les deux ancrages par
  passage, les deux jonctions par chapitre et le coupe-circuit global ;
- la commande CMS `prepare:gpx-anchors`, sûre en dry run, avec rapport,
  résolutions explicites, application limitée aux brouillons et rollback par
  snapshot `before` ;
- le contrôle global qui refuse l’activation tant que les chapitres publiés,
  les deux sens, les ancres et les jonctions ne forment pas une boucle valide ;
- le noyau Frontend de parsing GPX 1.1, empreinte binaire, distance WGS84,
  découpe, interpolation, jonctions, dénivelé, sérialisation et relecture ;
- le manifeste serveur expurgé, les endpoints de prévisualisation et de
  téléchargement, puis le formulaire public ville à ville ;
- les occurrences répétées désambiguïsées et les villes de frontière
  consécutives regroupées sans perdre leurs deux côtés techniques.

Vérifications exécutées sur ce snapshot : 96 tests CMS, build Strapi, 86 tests
unitaires Frontend, 17 tests composants, lint et build Next complets. La
requête Strapi imbriquée du manifeste a également été vérifiée sur l’API
locale : dix chapitres et leurs passages sont retournés sans erreur.

Le dry run local sur la copie synchronisée des données réelles inspecte les
dix chapitres et propose les 466 ancrages attendus sans blocage ni erreur. Il
signale 179 ancrages à revue renforcée : 153 à plus de 1 000 m de l’ancre
communale et 67 avec une occurrence distante concurrente, ces catégories
pouvant se recouvrir. Dix jonctions sont exactes ; dix autres demandent une
décision explicite, avec un écart maximal observé de 225,4 m. Elles
correspondent à cinq lieux physiques : les gares d’Arras, Hirson, Soissons et
Lille-Flandres, ainsi que le point près des fortifications de
Condé-sur-l’Escaut. Un second dry run développe ces cinq décisions partagées
en dix qualifications `accepted_gap`, sans blocage, erreur ni écriture.

Le lot n’est pas activable publiquement à ce stade : les 233 passages × deux
directions doivent encore être relus ; leurs ancrages et les vingt jonctions
doivent ensuite être appliqués aux brouillons puis publiés. La recette réelle
Boulogne-sur-Mer → Gravelines, les deux applications de navigation et les
mesures Clever Cloud restent les conditions de mise en service. Le
coupe-circuit demeure donc à `false`.
