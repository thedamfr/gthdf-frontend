# PRD 03 — GPX Builder v2 : fusionner et découper ses étapes

**Version :** 0.3\
**Date :** 4 août 2026\
**Statut :** prêt pour revue produit et technique\
**Dépôt concerné par l’implémentation :** `gthdf-frontend`\
**Dépôt explicitement inchangé :** `gthdf-cms`\
**Marque publique :** GTHF

---

## 1. Résumé de la décision

Ce lot fait du GPX Builder un outil à deux modes clairement séparés :

1. **Fusionner les traces du GTHF**, en conservant la sélection actuelle de
   chapitres et de sens depuis Strapi ;
2. **Découper mon GPX**, en important un fichier local, en plaçant des
   coupures et en exportant des étapes indépendantes.

Le mode découpe fonctionne entièrement dans la session du navigateur. Le
fichier brut, son nom, ses coordonnées complètes et les étapes produites ne
sont envoyés ni à Next, ni à Strapi. Un fond de carte distant optionnel peut
émettre des requêtes de tuiles uniquement après une action explicite et avec
l'information prévue en section 12.

Les décisions structurantes sont les suivantes :

- le mode fusion conserve son périmètre actuel : il assemble les GPX officiels
  des chapitres ; l’import de plusieurs fichiers locaux à fusionner n’est pas
  ajouté dans ce lot ;
- les deux modes possèdent des espaces de travail indépendants conservés en
  mémoire lors d’un changement de mode ;
- un noyau GPX client pur remplace la reconstruction XML actuelle et sert à la
  lecture, aux mesures, à la découpe, à la fusion et à la sérialisation ;
- le mode découpe accepte un fichier fondé soit sur des `trk`, soit sur des
  `rte`, avec plusieurs traces et segments ; un fichier mélangeant `trk` et
  `rte` est refusé dans le MVP avec une explication ;
- l’ordre du document et les limites de segments sont conservés ; aucune
  distance ou ligne n’est créée à travers une discontinuité ;
- une coupure est stockée comme une position métrique le long de la géométrie,
  rattachée à un segment et éventuellement interpolée entre deux points ;
- les étapes sont toujours dérivées du fichier source immuable et des
  coupures ; elles ne deviennent pas une seconde géométrie éditable ;
- l’affichage cartographique utilise Leaflet, chargé uniquement dans le mode
  découpe, avec une géométrie simplifiée pour le rendu mais jamais pour les
  mesures ou l’export ;
- le tracé et les coupures fonctionnent sans fond de carte distant. Un fond de
  carte tiers éventuel exige une action explicite et une information sur les
  requêtes de tuiles ;
- une saisie accessible « position le long du parcours » permet d’ajouter ou
  déplacer une coupure sans manipuler la carte ;
- le ZIP est créé localement avec `fflate`, chargé seulement au moment de
  l’export groupé ;
- les limites initiales sont 10 Mio par fichier et 100 000 points de
  géométrie ; elles sont validées sur appareils réels avant publication ;
- une étape mesure au moins 250 mètres et contient au moins deux coordonnées
  distinctes ;
- aucun historique annuler/rétablir n’est ajouté au MVP, car le Builder actuel
  ne possède pas ce modèle ; suppression, déplacement et réinitialisation
  explicites couvrent le besoin.

## 2. Contexte et problème

Le Builder actuel permet de sélectionner des chapitres officiels dans les deux
sens, de les réordonner puis de télécharger une trace combinée. Il ne permet
pas d’importer un fichier personnel et ne montre aucune carte.

Préparer un voyage demande pourtant souvent l’opération inverse : transformer
une trace longue en journées correspondant aux hébergements et aux capacités
du voyageur. Cette opération est aujourd’hui réalisée dans un outil tiers,
alors que les GPX finaux doivent ensuite revenir dans l’écosystème de
navigation du voyageur.

Le besoin n’est pas de modifier le tracé. Il est de choisir des limites le long
de sa progression et de produire plusieurs documents qui, remis dans l’ordre,
reconstituent la géométrie importée.

## 3. Objectifs

- rendre le choix fusion/découpe évident dès l’ouverture ;
- préserver les possibilités actuelles de sélection et d’ordre du mode
  fusion ;
- importer et analyser localement un GPX personnel ;
- permettre l’ajout, le déplacement et la suppression de plusieurs coupures ;
- rendre les mêmes opérations possibles par carte, toucher, souris et saisie
  kilométrique ;
- montrer l’ordre, la distance et, lorsque fiable, le dénivelé de chaque
  étape ;
- préserver la géométrie source, les points originaux et les données GPX
  qualifiées comme supportées ;
- garantir la continuité des étapes à chaque coupure située dans un segment ;
- exporter une étape ou une archive ZIP sans serveur ;
- éviter le gel durable de l’interface sur les traces admises ;
- fournir un noyau testable qui pourra être réutilisé ultérieurement sans
  coupler l’outil public à une publication SEO.

## 4. Non-objectifs

Ce lot ne doit pas :

- importer plusieurs fichiers locaux dans le mode fusion ;
- suggérer une distance journalière, une ville, un hébergement ou un commerce ;
- modifier la forme du tracé ou créer un segment routable ;
- calculer un itinéraire entre deux points ;
- guider ou suivre l’utilisateur en temps réel ;
- importer automatiquement un GPX depuis Strapi dans le mode découpe ;
- écrire un fichier, une étape ou un projet dans Strapi ;
- sauvegarder un projet dans un compte, le navigateur ou le cloud ;
- publier une page d’itinéraire générée, une URL SEO ou une entrée de sitemap ;
- créer les portions officielles ville à ville du PRD 04 ;
- synchroniser Google My Maps, Garmin, Komoot, Strava ou un autre service ;
- fournir un mode hors connexion incluant un fond cartographique ;
- proposer un éditeur de métadonnées GPX généraliste ;
- garantir la sémantique de toutes les extensions propriétaires inconnues ;
- ajouter annuler/rétablir, la découpe automatique ou le chaînage
  fusion–découpe dans le MVP ;
- renommer globalement les identifiants techniques legacy `GTHDF`.

## 5. Utilisateurs et parcours principaux

### Voyageur qui découpe une longue trace

Il choisit « Découper mon GPX », importe un fichier, place deux coupures et
obtient trois étapes. Il contrôle leur longueur, les renomme puis les
télécharge dans un ZIP.

### Voyageur qui connaît sa fin de journée

Il active « Ajouter une coupure », zoome puis touche la trace à proximité du
lieu souhaité. Le repère est accroché à la ligne et indique sa position en
kilomètres. Il peut aussi saisir directement ce kilométrage.

### Voyageur qui utilise les traces officielles

Il choisit « Fusionner les traces du GTHF » et retrouve les chapitres AB/BA,
leur panier, leur ordre et l’export combiné.

### Utilisateur tactile ou clavier

Il peut utiliser les contrôles de la carte avec une cible confortable, mais
n’est pas obligé de réaliser un geste précis : les coupures sont également
créées, déplacées et supprimées depuis une liste structurée.

## 6. État du dépôt confirmé par inspection

### 6.1 Architecture actuelle

- le frontend utilise Next.js `16.0.10` et React `19.2.1` ;
- `/gpx-builder` est un unique Client Component de plus de 500 lignes ;
- il récupère directement les chapitres depuis l’API Strapi publique au
  montage ;
- il sélectionne `gpxFileAB` ou `gpxFileBA` par chapitre ;
- il trie la chaîne avec `nextChapter`, vérifie partiellement sa cohérence avec
  `previousChapter` et permet un ordre manuel ;
- les chapitres publiés forment actuellement une boucle, donc le premier
  élément dépend de l’ordre de retour Strapi lorsque `displayOrder` du PRD 02
  n’est pas encore disponible ;
- le mode fusion télécharge les GPX seulement au moment de l’export ;
- aucune API Next n’est appelée pour fusionner.

### 6.2 Lecture et export GPX actuels

- le code utilise `DOMParser` sans bibliothèque GPX dédiée ;
- il sélectionne tous les `trkpt`, sans distinguer plusieurs `trk` ou
  `trkseg` internes ;
- il recrée chaque fichier sélectionné sous la forme d’un unique `trkseg` ;
- il conserve seulement `lat`, `lon`, `ele` et `time` ;
- il supprime donc silencieusement les métadonnées de piste, waypoints,
  extensions et autres enfants des points ;
- il ne teste ni `response.ok`, ni `parsererror`, ni l’absence de géométrie ;
- il ne calcule ni distance géométrique ni dénivelé ;
- il produit le XML et le nom de fichier directement dans le navigateur ;
- le `creator`, le nom de piste, le nom de fichier et les metadata de la page
  utilisent encore `GTHDF` et doivent devenir `GTHF` pour les nouveaux exports
  et contenus publics.

Le mode fusion n’a donc pas de garanties automatisées actuelles à préserver au
sens strict. Le comportement fonctionnel doit rester, tandis que son pipeline
GPX doit être sécurisé par le noyau introduit pour la découpe.

### 6.3 Carte, ZIP et tests

- aucune bibliothèque de carte, géométrie ou ZIP n’est installée ;
- la carte d’accueil est un iframe différé et ne fournit aucune primitive de
  ligne, de snapping ou de repère déplaçable ;
- cet iframe se précharge actuellement en tâche de fond et ne doit pas être
  réutilisé pour un fichier personnel ;
- aucun test applicatif, fixture GPX ou script `test` n’existe dans le dépôt ;
- la CSS actuelle passe de trois colonnes à une seule sous 1 200 px, mais ne
  contient aucun agencement carte/panneau ;
- les petits boutons actuels font 32 à 40 pixels et devront être agrandis pour
  l’usage tactile.

### 6.4 Traces de référence observées

Les 10 GPX officiels dans un sens représentent environ 3,44 Mo et 25 469
points. Le plus gros fichier officiel observé approche 500 Ko et 3 661 points.
Un fichier contrôlé est un GPX 1.1 Komoot avec un `trk`, un `trkseg`, des
altitudes et des horodatages.

Ce corpus valide le scénario d’un tour complet de quelques mégaoctets, mais ne
couvre pas à lui seul les structures Garmin, les routes `rte`, les extensions
propriétaires ou les fichiers anormalement lourds.

### 6.5 Licences

- le dépôt frontend est publié sous GPLv3 ;
- Leaflet est sous licence BSD 2-Clause ;
- `fflate` est sous licence MIT, de la famille Expat ;
- la FSF classe les licences Expat et BSD 2-Clause comme compatibles avec la
  GNU GPL.

Ces dépendances sont donc recommandées, sous réserve de conserver les notices
requises et de verrouiller les versions dans le lockfile de la PR de
production.

Références vérifiées le 4 août 2026 :

- [licence Leaflet](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) ;
- [licence fflate](https://github.com/101arrowz/fflate/blob/master/LICENSE) ;
- [liste de compatibilité GNU](https://www.gnu.org/licenses/license-list.html).

## 7. Périmètre fonctionnel des deux modes

### 7.1 Écran d’accueil

Après le H1, afficher deux actions de même niveau :

- **Fusionner les traces du GTHF** — `Assembler les chapitres officiels dans
  l’ordre de votre choix` ;
- **Découper mon GPX** — `Créer plusieurs étapes à partir d’un fichier local`.

Cette formulation corrige l’ambiguïté de « Fusionner des GPX » : le mode
existant ne fusionne pas plusieurs fichiers locaux arbitraires.

Le mode actif reste affiché dans un sélecteur ou un fil d’Ariane. Chaque mode
possède un état indépendant dans un composant parent :

- changer de mode ne supprime ni panier de fusion, ni fichier, ni coupure ;
- revenir au mode précédent restaure l’état de la session ;
- `Réinitialiser ce mode` demande confirmation lorsque des données sont
  chargées ;
- recharger ou fermer l’onglet efface la session, avec une information visible
  dès qu’un travail existe ;
- aucune persistance automatique n’est ajoutée.

### 7.2 Chargement conditionnel

- la page et le choix des modes sont rendus sans dépendre de Strapi ;
- les chapitres sont demandés seulement lorsque le mode fusion est ouvert ;
- les modules de carte, de géométrie lourde et de ZIP sont chargés à la
  demande ;
- ouvrir directement le mode découpe ne déclenche aucune requête Strapi ou
  GPX.

## 8. Mode fusion : comportement conservé et durci

### 8.1 Fonctionnalités conservées

- affichage des traces AB et BA disponibles ;
- ajout d’un chapitre ou de tous les chapitres d’un sens ;
- panier ordonné ;
- déplacement manuel d’un élément ;
- suppression et vidage ;
- tentative de tri par continuité ;
- avertissement de discontinuité ;
- export d’un GPX combiné.

Le mode utilise `displayOrder` du PRD 02 lorsqu’il est disponible. En son
absence, il conserve un fallback déterministe documenté, mais ne dépend plus
de l’ordre brut de l’API.

### 8.2 Durcissements inclus

La création du noyau GPX apporte un bénéfice direct et justifie de remplacer
la fusion par concaténation de chaînes :

- vérifier chaque réponse et chaque XML avant export ;
- préserver les limites de `trkseg` ;
- ne pas relier deux segments disjoints ;
- conserver les enfants originaux des points lorsque possible ;
- détecter et annoncer les extensions non qualifiées ;
- produire une erreur inline accessible au lieu d’un simple `alert()` ;
- générer des metadata et noms publics GTHF ;
- réimporter le résultat dans le même parseur comme contrôle de validité.

L’ordre, les choix et les interactions de l’utilisateur ne changent pas. Le
mode fusion de fichiers locaux reste une évolution séparée.

### 8.3 Contrat du document fusionné

La fusion produit toujours un seul fichier GPX, mais ne transforme pas les
discontinuités en segments artificiels :

- tous les fichiers sélectionnés sont analysés avant de commencer l’export ;
- ils doivent partager un genre compatible (`trk` ou `rte`) ainsi qu’une
  version et un namespace GPX compatibles ; un mélange est refusé avec le nom
  des médias concernés plutôt que converti silencieusement ;
- pour des traces, le document de sortie contient un `trk` combiné et un
  `trkseg` distinct pour chaque séquence continue source, dans l’ordre choisi ;
- pour des routes, les `rte` restent distinctes et ordonnées dans la même
  racine GPX, car le format ne possède pas d’équivalent de `trkseg` ;
- les nœuds de points sont clonés avec leurs enfants supportés ;
- les waypoints racine sont copiés sans déduplication implicite ;
- les metadata globales décrivent le fichier dérivé, tandis que les données
  ou extensions source impossibles à représenter suivent la politique
  d’avertissement ou de blocage de la section 17.2 ;
- le document final conserve la version et le namespace communs des sources,
  puis est reparsé avant téléchargement.

La PR de production doit auditer tous les GPX officiels actuellement
sélectionnables contre ce contrat. Un média incompatible devient une anomalie
de contenu explicite ; il ne déclenche pas une conversion destructive cachée.

## 9. Import en mode découpe

### 9.1 Sélection du fichier

L’interface propose :

- un bouton associé à un `<input type="file">` ;
- le glisser-déposer comme amélioration sur les appareils compatibles ;
- `accept=".gpx,application/gpx+xml,application/xml,text/xml"`, sans considérer
  cet attribut comme une validation suffisante.

Après sélection :

1. contrôler la taille avant de lire le contenu ;
2. lire le texte localement ;
3. refuser un `DOCTYPE` ;
4. parser le XML et détecter `parsererror` ;
5. vérifier une racine `gpx` et des coordonnées valides ;
6. construire le modèle géométrique ;
7. afficher le résumé et cadrer la trace.

### 9.2 Limites initiales

| Limite | Valeur MVP | Comportement |
|---|---:|---|
| taille du fichier | 10 Mio | rejet avant lecture avec explication |
| points `trkpt` ou `rtept` | 100 000 | arrêt de l’analyse et rejet |
| géométrie minimale | 2 coordonnées distinctes | export impossible |
| longueur minimale d’une étape | 250 m | coupure refusée |

Les limites sont centralisées et affichées près du contrôle d’import. Elles
doivent couvrir le tour officiel actuel et être validées sur les appareils de
référence. Elles peuvent être réduites ou augmentées seulement avec une mesure
consignée dans la PR de production.

### 9.3 Remplacement du fichier

- sans coupure ni nom personnalisé, un nouveau fichier remplace directement le
  précédent ;
- avec coupures ou noms personnalisés, une confirmation annonce que l’espace
  de découpe sera réinitialisé ;
- annuler conserve intégralement le fichier et les étapes actuels ;
- une erreur sur le nouveau fichier ne détruit pas silencieusement le projet
  valide précédent.

### 9.4 Résumé

Après analyse, afficher :

- nom du fichier, traité comme texte ;
- taille ;
- type `trace` ou `route` ;
- nombre de `trk`, `trkseg` ou `rte` ;
- nombre de points valides ;
- nombre de discontinuités ;
- distance totale ;
- dénivelé positif et négatif, ou `Dénivelé indisponible` ;
- nombre d’étapes, initialement 1 ;
- avertissements de compatibilité avant toute modification.

## 10. Modèle interne immuable

### 10.1 Document source

Le fichier importé est conservé en mémoire comme document source immuable et
comme modèle géométrique normalisé.

Le modèle contient au minimum :

- genre `track` ou `route` ;
- structures originales dans l’ordre du document ;
- séquences continues correspondant à chaque `trkseg` ou `rte` ;
- pour chaque point : latitude, longitude, altitude éventuelle, temps
  éventuel et référence à son nœud source ;
- distance cumulée à l’intérieur de chaque séquence et du parcours logique ;
- absence explicite de distance entre deux séquences disjointes ;
- bounding boxes ;
- namespaces et extensions détectés ;
- avertissements et niveau de compatibilité.

Aucune modification de coupure ou de nom n’altère ce modèle.

### 10.2 Coupure

Une coupure contient :

- identifiant stable de session ;
- distance cumulée depuis le début ;
- index de séquence ;
- index des deux points encadrants ;
- fraction entre ces points ;
- coordonnée accrochée ;
- indication `originalPoint` ou `interpolatedPoint`.

Les coupures sont triées par distance cumulée après chaque mutation. L’ordre de
création ne détermine jamais l’ordre des étapes.

### 10.3 Étape dérivée

Une étape est calculée depuis deux limites : début/fin de source ou coupures.
Elle contient :

- ordre d’affichage ;
- identifiant de session ;
- limites le long du parcours ;
- sous-structures GPX concernées ;
- distance et dénivelé disponibles ;
- nom par défaut et éventuel nom personnalisé ;
- nom de fichier assaini ;
- couleur de présentation et numéro textuel.

La géométrie exportée n’est jamais modifiée directement.

## 11. Structures GPX prises en charge

### 11.1 Matrice MVP

| Structure du fichier | Import | Découpe | Export |
|---|---|---|---|
| un `trk` / un `trkseg` | oui | oui | `trk` |
| un `trk` / plusieurs `trkseg` | oui | oui | segments préservés |
| plusieurs `trk` | oui | oui, ordre du document | traces préservées |
| une ou plusieurs `rte` sans `trk` | oui | oui, ordre du document | `rte` |
| mélange `trk` et `rte` | refus explicite | non | non |
| uniquement des `wpt` | géométrie inexploitable | non | non |
| GPX 1.0 ou 1.1 bien formé | oui après qualification | oui | version source conservée |

Un fichier à plusieurs traces ou segments affiche un avertissement : l’ordre
du document est interprété comme l’ordre de progression. Le Builder ne tente
pas de réordonner des structures personnelles.

### 11.2 Discontinuités

Deux séquences ne sont jamais reliées pour le calcul ou le rendu. Leur distance
de séparation est affichée comme avertissement si leurs extrémités diffèrent.

- une étape peut contenir plusieurs séquences disjointes si la source le fait ;
- la distance d’étape est la somme de leurs longueurs internes ;
- la carte ne dessine aucune ligne dans le vide ;
- une coupure cartographique ne peut pas être placée dans l’espace entre deux
  segments ;
- une saisie kilométrique exactement à une frontière est rattachée de manière
  déterministe à la fin de la séquence précédente ;
- dans ce cas, les deux étapes conservent les extrémités originales de part et
  d’autre : elles ne partagent pas un point artificiel qui masquerait la
  discontinuité déjà présente dans la source.

## 12. Carte et fond cartographique

### 12.1 Moteur

Utiliser Leaflet directement dans un Client Component chargé dynamiquement,
sans ajouter React-Leaflet lorsqu’une couche d’intégration supplémentaire
n’apporte pas de bénéfice.

- renderer Canvas pour les polylignes ;
- cadrage automatique après import ;
- pan et zoom tactiles ;
- polylignes par étape ;
- repères de coupure déplaçables ;
- contrôle explicite du mode placement ;
- aucun appel réseau requis pour afficher la géométrie locale.

Le composant `DeferredMapEmbed` n’est pas réutilisé : un iframe ne permet pas
de manipuler la géométrie et son préchargement transmettrait une zone avant une
action adaptée au contexte privé.

### 12.2 Fond de carte et confidentialité

La première vue est une surface cartographique neutre avec le tracé, son
échelle, ses numéros d’étapes et ses contrôles. Aucune tuile distante n’est
chargée automatiquement.

Une action secondaire `Afficher le fond de carte` peut activer un fournisseur
configuré. Avant le premier chargement tiers, le texte explique que le
fournisseur recevra :

- l’adresse IP du navigateur ;
- les coordonnées des tuiles correspondant à la zone affichée ;
- le référent selon sa politique.

Le fichier, son nom et ses points complets ne sont pas envoyés. Le choix reste
valable seulement pour la session du Builder et peut être désactivé.

Le fournisseur n’est pas codé en dur avant validation opérationnelle. Si les
tuiles standard OpenStreetMap sont retenues, l’implémentation doit respecter
leur [politique officielle](https://operations.osmfoundation.org/policies/tiles/) :
attribution visible, référent valide, cache, absence de préchargement massif et
aucun usage hors connexion. Ce PRD n’autorise pas un proxy ou un téléchargement
de tuiles en masse.

### 12.3 Géométrie d’affichage

La carte reçoit une copie simplifiée de chaque séquence :

- conservation obligatoire des extrémités et coupures ;
- maximum cible de 10 000 sommets rendus pour l’ensemble ;
- tolérance adaptée au zoom ou au budget, avec contrôle visuel ;
- aucune simplification du modèle source ;
- snapping, distance et export calculés sur les points originaux et les
  interpolations exactes.

## 13. Placement et modification des coupures

### 13.1 Activation

Le bouton `Ajouter une coupure` active un état explicite. Le prochain clic ou
toucher sur la trace tente un placement, puis le mode revient à l’état normal.

- déplacer ou zoomer la carte hors de cet état ne crée rien ;
- une zone d’interaction invisible d’au moins 24 pixels CSS entoure la ligne ;
- le repère visible possède une cible d’au moins 44 × 44 pixels CSS ;
- un clic trop éloigné de la trace affiche une instruction et ne crée pas de
  point libre.

### 13.2 Snapping exact

La coordonnée écran est convertie en coordonnée géographique puis comparée aux
segments source candidats. Le résultat est la projection la plus proche sur
un segment, pas simplement le point GPX le plus proche.

Le calcul retourne :

- segment source ;
- fraction entre ses deux points ;
- coordonnée interpolée ;
- distance métrique au clic ;
- position cumulée le long du parcours.

Un index spatial accélère la présélection, mais le dernier calcul porte sur la
géométrie originale.

### 13.3 Croisements et portions superposées

Lorsque plusieurs segments sont visuellement équivalents mais éloignés dans
l’ordre du parcours, le Builder ne choisit pas silencieusement.

Sont considérés candidats ambigus les segments :

- situés dans les 8 pixels CSS du meilleur candidat ;
- dont les positions le long du parcours diffèrent d’au moins 250 mètres.

Une petite liste propose par exemple `km 34,2` et `km 112,8`. L’utilisateur
choisit avant la création. Les candidats sont triés par distance au clic puis
par progression.

### 13.4 Alternative carte et clavier

Le panneau contient un contrôle `Ajouter une coupure au km` :

- champ numérique borné entre 0 et la distance totale ;
- précision de saisie 0,1 km, tout en stockant la valeur interne en mètres ;
- validation de la longueur minimale des étapes ;
- position exacte interpolée sur la géométrie ;
- même résultat et même repère que le placement sur carte.

Chaque coupure possède également un champ `Position sur le parcours` pour la
déplacer au clavier. Il ne s’agit pas d’une coordonnée géographique à saisir.

### 13.5 Règles de validité

- distance minimale de 250 mètres du début, de la fin et des autres coupures ;
- au moins deux coordonnées distinctes par étape ;
- aucune coupure dupliquée à la même position métrique ;
- refus avant mutation, avec message indiquant la distance minimale ;
- tri automatique après déplacement ;
- recalcul unique et atomique de toutes les étapes ;
- suppression depuis le repère ou la liste ;
- réinitialisation de toutes les coupures avec confirmation.

Il n’existe pas d’annuler/rétablir dans le MVP. Cette absence est indiquée par
des actions de suppression claires, sans promettre un historique inexistant.

## 14. Point de coupure partagé

### 14.1 Point original

Si la projection se trouve à moins d’un mètre d’un point source, ce point est
réutilisé. Son nœud complet, y compris ses extensions, est cloné comme dernier
point de l’étape précédente et premier point de la suivante.

### 14.2 Point interpolé

Sinon, un nouveau point est créé :

- latitude et longitude à la fraction calculée ;
- altitude interpolée seulement si les deux points encadrants en possèdent une
  valide ;
- temps interpolé seulement si les deux valeurs sont valides et ordonnées ;
- aucun enfant ou extension propriétaire n’est inventé ;
- le même nœud synthétique est cloné dans les deux étapes.

Les extensions des points originaux encadrants restent intactes. L’absence
d’extension sur un point synthétique n’est pas une suppression de donnée
source et doit être couverte par les tests d’export.

### 14.3 Frontière de segment

Une frontière entre deux segments n’est pas un segment géométrique. Si une
coupure est placée exactement à cette position logique, les deux extrémités
source distinctes sont conservées et un avertissement rappelle que la rupture
existait déjà. Le Builder ne fabrique pas une coordonnée commune trompeuse.

## 15. Aperçu et noms des étapes

### 15.1 Liste

Chaque ligne affiche :

- numéro ;
- champ de nom ;
- début et fin en kilomètres cumulés ;
- distance ;
- dénivelé positif et négatif ou indisponibilité ;
- nombre de segments et avertissement de discontinuité ;
- action de téléchargement individuel.

Le numéro et le texte restent visibles sur la carte et dans la liste. La
couleur n’est jamais l’unique différenciation.

### 15.2 Noms par défaut et personnalisés

Avant renommage :

- libellé visible : `Étape 1`, `Étape 2`, etc. ;
- fichier : `01-<source>-etape-1.gpx` ;
- archive : `<source>-etapes.zip`.

Avec un nom `Hirson – Guise` :

- le GPX conserve le libellé Unicode dans ses metadata ;
- le fichier devient `01-hirson-guise.gpx`.

La normalisation du fichier :

- supprime accents et caractères de contrôle ;
- transforme espaces et séparateurs en tirets ;
- conserve uniquement lettres ASCII, chiffres et tirets ;
- interdit `/`, `\\`, `..` et tout chemin ;
- réduit les tirets et limite la base à 80 caractères ;
- utilise le fallback sûr si le résultat est vide ;
- ajoute un suffixe déterministe en cas de doublon ;
- ajoute elle-même `.gpx` une seule fois.

### 15.3 Mutation des coupures après renommage

- une étape non affectée par une mutation conserve son nom ;
- lorsqu’une étape nommée est scindée, la première partie conserve le nom et
  la seconde reçoit un nom par défaut clairement sélectionné pour édition ;
- supprimer une coupure entre deux étapes personnalisées demande quelle
  appellation conserver, ou propose explicitement celle de la première ;
- aucun nom personnalisé ne disparaît silencieusement.

## 16. Distance et dénivelé

### 16.1 Distance

La distance est la somme des inverses géodésiques sur l’ellipsoïde WGS84 pour
chaque paire de points consécutifs au sein d’une séquence continue. Une
haversine sphérique n’est pas assez précise pour devenir le contrat partagé.

- aucune distance entre deux `trkseg`, `trk` ou `rte` distincts ;
- une coupure interpolée partage la distance de son segment selon sa fraction ;
- les valeurs internes sont en mètres et ne sont arrondies qu’à l’affichage ;
- affichage à 0,1 km ;
- la somme interne des étapes doit égaler la distance interne de la source à
  un mètre ou 0,01 %, la tolérance la plus grande étant retenue.

La méthode doit reproduire à un centimètre les fixtures de distance directe du
XLSX qualifié dans le PRD 04. Le PRD 02 peut réutiliser la même primitive
lorsqu’elle convient à son calcul point–segment, sans créer de dépendance
fonctionnelle entre les pages.

### 16.2 Éligibilité du dénivelé

Le dépôt ne possède aucune méthode existante à réutiliser. Le MVP adopte une
méthode explicite et qualifiée avant affichage :

1. mesurer la couverture d’altitude selon la distance, pas seulement le nombre
   de points ;
2. exiger au moins 95 % de couverture dans l’étape ;
3. ne pas interpoler une lacune supérieure à 250 mètres ni une extrémité
   absente ;
4. rééchantillonner chaque séquence continue tous les 25 mètres ;
5. lisser l’altitude avec une fenêtre métrique centrée de 100 mètres ;
6. cumuler séparément les différences positives et négatives sans franchir les
   limites de séquences ;
7. dériver les valeurs d’étapes depuis le profil cumulatif global afin que
   leur somme reste cohérente avec le total.

Si une étape ne remplit pas ces conditions, afficher `Dénivelé indisponible`
pour cette étape. Les valeurs disponibles sont préfixées par `~` et arrondies à
10 mètres.

Cette méthode doit être comparée à plusieurs références connues avant
publication. Une autre méthode peut être retenue seulement si elle est décrite
avec la même précision et remplace cette section dans la PR de production.

## 17. Intégrité et sérialisation GPX

### 17.1 Stratégie

Conserver `DOMParser` et `XMLSerializer` comme base recommandée afin de cloner
les nœuds inconnus plutôt que de convertir le fichier vers un modèle JSON
perdant.

Le sérialiseur de chaque étape :

1. crée une racine GPX autonome avec les namespaces source ;
2. clone les metadata et extensions globales ;
3. met à jour le nom et recalcule `bounds` lorsqu’il existe ;
4. copie les `wpt` source dans chaque étape avec un avertissement indiquant
   qu’ils sont des données globales ;
5. clone uniquement les `trk`, `trkseg` ou `rte` concernés, dans leur ordre ;
6. omet les structures devenues vides ;
7. insère le point partagé défini en section 14 ;
8. sérialise en XML UTF-8 déclaré ;
9. reparcourt le résultat avec le même parseur avant de proposer le fichier.

Le `creator` devient `GTHF GPX Builder`. Le nom source est conservé dans les
metadata dérivées. Les autres attributs et namespaces sont préservés tant
qu’ils restent valides.

### 17.2 Extensions inconnues

À l’import, inventorier les URI de namespaces et les éléments `extensions`.

Niveaux de message :

- **qualifié :** fixture et aller-retour validés ; export normal ;
- **copié sans interprétation :** nœuds conservés par clonage, avertissement
  avant export ;
- **non préservable :** export bloqué par défaut ou autorisé seulement après
  confirmation explicite listant précisément la perte.

Aucune extension ne disparaît sans message. Les logs console seuls ne
constituent pas un avertissement utilisateur.

### 17.3 Waypoints et metadata

Les `wpt` n’appartiennent pas à l’ordre d’une trace. Les copier dans chaque
étape évite une attribution géographique arbitraire et toute perte silencieuse.
L’interface annonce cette duplication lorsqu’au moins un waypoint existe.

Les metadata dont la valeur devient fausse après découpe sont recalculées ou
explicitement adaptées : au minimum `name`, `bounds` et la date de création du
fichier dérivé. Les liens, auteurs, copyright et extensions sont clonés.

## 18. Export individuel et ZIP

### 18.1 Prévalidation

Avant tout export, afficher :

- nombre d’étapes ;
- liste ordonnée des noms de fichiers ;
- avertissements d’extensions ou waypoints ;
- étapes invalides éventuelles ;
- taille estimée lorsque disponible.

Un export invalide est refusé sans modifier l’état du projet.

### 18.2 Fichier individuel

- MIME `application/gpx+xml` ;
- Blob créé localement ;
- URL objet révoquée après déclenchement sûr du téléchargement ;
- fichier réanalysé avant téléchargement ;
- aucune étape voisine recalculée différemment de l’aperçu.

### 18.3 Archive

Utiliser `fflate` pour générer localement une archive ZIP :

- chargement dynamique au clic ;
- fichiers à la racine de l’archive, sans sous-chemins utilisateur ;
- ordre lexicographique identique à l’ordre des étapes grâce au préfixe ;
- compression exécutée hors du chemin d’interaction principal ;
- progression ou état `Création de l’archive…` ;
- erreur précise sans réinitialisation ;
- MIME `application/zip`.

Le contenu de l’archive est produit depuis exactement les mêmes chaînes GPX
validées que les exports individuels.

## 19. Performance et traitement hors interface

### 19.1 Répartition

- la validation de taille précède toute lecture ;
- le parsing XML est qualifié sur le thread principal avec la limite MVP ;
- les tableaux numériques de géométrie, distances, index spatial,
  simplification et profils altimétriques sont calculés dans un Web Worker ;
- les données transférables utilisent des tableaux typés lorsque cela réduit
  les copies ;
- la compression ZIP utilise la capacité asynchrone/worker de la dépendance ou
  un worker dédié ;
- React ne conserve pas 100 000 objets de points dans son état rendu.

Si `DOMParser` dépasse le budget sur les appareils cibles, la PR de production
doit retenir un parseur XML compatible Worker qui démontre la même préservation
des namespaces et extensions. Elle ne peut pas déplacer le traitement vers un
serveur comme solution de facilité.

### 19.2 Budgets de recette

Pour le tour officiel d’environ 3,44 Mo et 25 469 points, sur le téléphone
Android médian choisi :

- résumé et tracé interactif disponibles en moins de 3 secondes ;
- aucune tâche longue supérieure à 500 ms ;
- retour visuel de l’import en moins de 100 ms ;
- déplacement d’une coupure reflété en moins de 200 ms ;
- pan et zoom utilisables sans gel durable ;
- export de trois étapes et ZIP terminé en moins de 5 secondes hors dialogue
  système de téléchargement.

Pour un fichier proche des limites, l’objectif est une analyse en moins de 8
secondes avec progression visible. Un dépassement exige soit une optimisation,
soit une réduction documentée des limites.

## 20. Responsive et accessibilité

### 20.1 Structure

- H1 et choix du mode disponibles avant la carte ;
- import, instructions, résumé et erreurs rendus même si Leaflet échoue ;
- desktop : carte et panneau peuvent être côte à côte ;
- mobile : carte, actions principales puis liste d’étapes dans le flux ;
- hauteur de carte bornée pour ne pas emprisonner le défilement de page ;
- aucune dépendance à un survol ;
- aucune largeur minimale créant un défilement horizontal à 320 px.

### 20.2 Contrôles

- boutons et repères d’au moins 44 × 44 pixels CSS ;
- focus visible ;
- boutons avec libellés accessibles, pas seulement `+`, `×` ou une icône ;
- statut d’analyse/export exposé avec `aria-live="polite"` ;
- erreur critique exposée avec `role="alert"` sans répéter chaque mutation ;
- liste des étapes sémantique ;
- labels associés aux noms et positions ;
- numéro et nom en plus de la couleur ;
- palette avec contraste suffisant et motif/épaisseur alternée si nécessaire ;
- instructions de carte disponibles sous forme textuelle ;
- toutes les actions essentielles possibles sans glisser-déposer.

### 20.3 Gestes

- le bouton de placement distingue création et navigation ;
- déplacer la carte ne pose pas une coupure ;
- le drag d’un repère se termine par un snapping et un statut textuel ;
- un contrôle de liste permet le même déplacement ;
- le glisser-déposer de fichier n’est jamais l’unique moyen d’importer.

## 21. Confidentialité, sécurité et instrumentation

### 21.1 Données personnelles

- le mode découpe n’appelle pas Strapi ;
- le fichier et le modèle restent en mémoire volatile ;
- aucune sauvegarde dans IndexedDB, stockage web, cookie ou cache applicatif ;
- aucun upload, Server Action ou endpoint de traitement ;
- aucun nom, contenu, coordonnée, distance précise ou metadata utilisateur
  dans les logs ou analytics ;
- aucune réutilisation pour les pages SEO, le référentiel de villes ou un
  entraînement ;
- un fond de carte distant suit le consentement d’action décrit en section 12.

### 21.2 Entrées hostiles ou défectueuses

- taille contrôlée avant lecture ;
- `DOCTYPE` refusé ;
- XML mal formé refusé ;
- latitude hors `[-90, 90]` et longitude hors `[-180, 180]` refusées ;
- valeurs non finies refusées ;
- contenu utilisateur rendu uniquement comme texte ;
- noms de fichiers neutralisant traversée de chemin et caractères de contrôle ;
- aucun fetch d’URL contenue dans le GPX ;
- aucune extension exécutée ou interprétée comme HTML/script ;
- URLs objet révoquées après usage.

### 21.3 Analytics

Aucun analytics n’est présent dans le dépôt : ce PRD n’en ajoute pas.

Si un socle consenti existe ultérieurement, les seuls événements admissibles
sont des catégories sans payload sensible : mode choisi, import valide/invalide,
ajout/suppression de coupure, export individuel/ZIP et code d’erreur générique.

## 22. États et erreurs obligatoires

### Choix et fusion

- chargement des chapitres ;
- Strapi indisponible ;
- aucun chapitre ou GPX publié ;
- incohérence de chaîne ;
- média inaccessible ;
- XML officiel invalide ;
- export en cours, succès ou échec.

### Import et analyse

- aucun fichier ;
- lecture en cours ;
- analyse en cours avec progression ;
- extension inattendue mais contenu vérifiable ;
- taille supérieure à 10 Mio ;
- plus de 100 000 points ;
- XML invalide, `DOCTYPE`, mauvaise racine ;
- aucune géométrie ;
- mélange `trk`/`rte` ;
- coordonnées invalides ;
- extensions ou waypoints détectés ;
- fichier prêt.

### Coupures et export

- placement actif ;
- clic trop loin ;
- choix ambigu à un croisement ;
- étape inférieure à 250 m ;
- étape sans deux coordonnées distinctes ;
- déplacement en cours ;
- noms de fichiers dupliqués puis désambiguïsés ;
- export en cours ;
- sérialisation ou relecture échouée ;
- ZIP échoué ;
- téléchargement prêt.

Chaque erreur est actionnable, conserve le dernier état valide et ne renvoie
pas l’utilisateur à l’écran initial.

## 23. Déploiement et retour arrière

Ce lot ne nécessite aucune migration ou modification Strapi.

Ordre recommandé :

1. extraire et tester le noyau GPX ;
2. migrer le mode fusion vers ce noyau sans changer son parcours ;
3. ajouter le sélecteur de mode ;
4. livrer l’import, les mesures et la liste du mode découpe ;
5. ajouter la carte et le snapping ;
6. ajouter les exports individuel et ZIP ;
7. qualifier extensions, performances, toucher et clavier ;
8. activer le mode découpe publiquement.

Un déploiement progressif peut masquer le mode découpe derrière une constante
de configuration frontend tant que la recette n’est pas terminée. Cette
constante n’envoie aucune donnée et n’est pas un nouveau dispositif CMS.

Le retour arrière masque le nouveau mode et conserve le mode fusion durci. Si
le noyau partagé introduit une régression de fusion, la version précédente du
frontend reste restaurable ; aucun contenu ou fichier utilisateur n’a été
persisté à migrer.

## 24. Cas limites

- **Deux points identiques successifs :** distance nulle, dédupliqués pour les
  calculs sans supprimer le nœud source exporté.
- **Trace qui revient sur elle-même :** choix du kilométrage au croisement.
- **Plusieurs coupures ajoutées dans le désordre :** tri par progression.
- **Déplacement au-delà d’une autre coupure :** nouvel ordre atomique, sous
  réserve des 250 mètres minimum.
- **Coupure à un point source :** nœud complet partagé.
- **Coupure dans un segment :** point synthétique identique dans les deux
  fichiers.
- **Coupure à une discontinuité :** extrémités source conservées, avertissement.
- **Altitude partielle :** calcul seulement pour les étapes éligibles.
- **Temps non monotone :** temps originaux conservés, pas d’interpolation du
  point synthétique concerné.
- **Extension inconnue :** copiée ou perte explicitement confirmée, jamais
  silencieuse.
- **Waypoints :** dupliqués dans chaque étape avec avertissement.
- **Nom vide ou uniquement ponctuation :** fallback déterministe.
- **Fichier nommé `.gpx` :** base de fallback `parcours`.
- **Échec du fond de carte :** trace locale et toutes les opérations restent
  disponibles.
- **Changement de mode :** espaces de travail conservés en mémoire.
- **Rechargement de page :** perte assumée et annoncée de la session.

## 25. Critères d’acceptation

### Navigation et modes

- les deux modes sont compréhensibles dès l’ouverture ;
- la fusion est décrite comme l’assemblage des traces officielles du GTHF ;
- changer de mode ne détruit pas l’état de session ;
- réinitialiser ou remplacer un travail non vide demande confirmation ;
- ouvrir le mode découpe n’appelle ni Strapi, ni un GPX distant.

### Fusion

- toutes les sélections, directions, réordonnancements et suppressions actuels
  restent disponibles ;
- l’ordre est déterministe ;
- une réponse média ou un XML invalide produit une erreur inline ;
- les segments disjoints ne sont plus réunis silencieusement ;
- l’export utilise la marque GTHF et se réimporte comme GPX valide ;
- les limitations d’extensions sont annoncées.

### Import et aperçu

- un GPX mono-segment valide affiche sa trace entière et son résumé ;
- plusieurs `trk`, `trkseg` ou `rte` sont traités selon la matrice ;
- un mélange `trk`/`rte` est refusé explicitement ;
- une trace sans fond distant reste visible et manipulable ;
- aucun segment visuel n’est créé à travers une discontinuité ;
- les limites de taille et de points produisent un message avant gel durable ;
- un remplacement invalide conserve le projet précédent.

### Coupures

- deux coupures produisent trois étapes ordonnées ;
- une coupure peut être ajoutée sur carte ou par kilométrage ;
- elle peut être déplacée sur carte ou depuis sa ligne ;
- elle peut être supprimée sans ambiguïté ;
- un clic de pan/zoom ne crée pas de coupure ;
- un croisement ambigu demande de choisir une position le long de la trace ;
- les seuils de 250 mètres et deux coordonnées sont appliqués ;
- déplacer ou supprimer recalcule immédiatement distances, couleurs et liste ;
- aucun nom personnalisé n’est perdu silencieusement.

### Mesures

- la distance utilise les segments source et non une ligne à vol d’oiseau ;
- la somme interne des étapes respecte la tolérance d’un mètre ou 0,01 % ;
- le dénivelé respecte la méthode et la couverture documentées ;
- une altitude insuffisante affiche `Dénivelé indisponible` ;
- aucune durée estimée n’est affichée.

### Export et intégrité

- le dernier point d’une étape continue est identique au premier de la
  suivante ;
- le premier et le dernier point de la source restent ceux du premier et du
  dernier export ;
- l’ordre des points, traces et segments est conservé ;
- altitudes et temps originaux restent présents ;
- le point synthétique suit les règles d’interpolation ;
- les extensions et waypoints suivent les règles annoncées ;
- chaque GPX exporté est reparsé avec succès par le Builder ;
- un export individuel et un ZIP contiennent les mêmes fichiers ;
- les noms sont ordonnés, sûrs et uniques ;
- une erreur d’export conserve toutes les coupures et noms.

### Mobile, accessibilité, confidentialité et performance

- le flux est utilisable à 320 px sans défilement horizontal ;
- toutes les actions essentielles fonctionnent au clavier sans carte ;
- les cibles tactiles atteignent 44 × 44 pixels CSS ;
- numéros et libellés complètent les couleurs ;
- import, instructions et erreurs existent même sans carte hydratée ;
- aucun octet du GPX, nom de fichier ou coordonnée brute n’apparaît dans une
  requête réseau ; seules les requêtes optionnelles de tuiles décrites en
  section 12 sont admises après action explicite ;
- aucune tuile distante n’est chargée avant l’action explicite ;
- les budgets de la section 19 sont mesurés et respectés ou les limites sont
  ajustées avant publication ;
- `npm run lint` et `npm run build` passent sur la machine de production ;
- les nouveaux tests automatisés passent.

## 26. Plan de validation pour l’agent de production

### 26.1 Harness

Le dépôt ne possédant aucun runner, ajouter un harness minimal pour les modules
purs, recommandé avec Vitest. Les interactions de fichier, Worker et carte
peuvent être couvertes par tests de composants et un protocole navigateur
reproductible.

Les fixtures sont synthétiques ou redistribuables et ne proviennent pas d’un
fichier personnel d’utilisateur.

### 26.2 Fixtures minimales

- GPX 1.1 `trk` mono-segment ;
- `trk` à plusieurs segments avec une discontinuité ;
- plusieurs `trk` ;
- une et plusieurs `rte` ;
- mélange `trk`/`rte` refusé ;
- waypoints ;
- extensions Komoot et Garmin représentatives ;
- altitudes complètes, partielles et absentes ;
- temps complets, invalides et non monotones ;
- points dupliqués ;
- épingle, croisement et lignes presque superposées ;
- XML mal formé, `DOCTYPE`, coordonnées invalides ;
- fichier sans géométrie ;
- limites 10 Mio et 100 000 points.

### 26.3 Tests automatiques

- parsing et matrice de support ;
- conservation de l’ordre et des limites ;
- distance et dénivelé sur valeurs connues ;
- projection point–segment et kilométrage ;
- ambiguïté aux croisements ;
- tri, ajout, déplacement et suppression des coupures ;
- refus des étapes trop courtes ;
- interpolation coordonnée, altitude et temps ;
- clonage des extensions et waypoints ;
- sérialisation puis relecture ;
- équivalence export individuel/ZIP ;
- assainissement et collision des noms ;
- maintien des noms après mutation ;
- fusion de plusieurs sources et discontinuités ;
- absence de fetch dans le mode découpe.

### 26.4 Recette manuelle

- Chrome, Firefox et Safari bureau ;
- Safari iOS et Chrome Android ;
- souris, toucher et clavier seul ;
- téléphone médian avec le tour officiel fusionné ;
- carte sans tuiles, avec tuiles autorisées et fournisseur indisponible ;
- import, deux coupures, renommage, exports, réimport des trois fichiers ;
- multi-segment avec coupure avant/après frontière ;
- croisement avec choix des deux kilométrages ;
- lecteur d’écran sur mode, import, coupures, étapes et erreurs ;
- vérification réseau démontrant l’absence d’upload et de préchargement de
  tuiles ;
- comparaison des fichiers dans au moins deux applications de navigation.

## 27. Zones de code probablement concernées

Cette liste guide l’agent de production sans imposer chaque nom final.

### Route et interface

- `app/gpx-builder/page.tsx` : décomposition du Client Component monolithique ;
- `app/gpx-builder/layout.tsx` : metadata GTHF ;
- `app/gpx-builder/page.module.css` : choix des modes et layout responsive ;
- nouveaux composants sous `components/gpx-builder/` pour fusion, découpe,
  carte, coupures, étapes, import et export.

### Noyau et Worker

- nouveaux modules sous `lib/gpx/` : types, parsing, géométrie, mesures,
  coupures, sérialisation, noms et fusion ;
- worker dédié à la géométrie et aux calculs ;
- fixtures et tests associés ;
- module géodésique partagé avec le PRD 02 seulement si son contrat reste pur.

### Dépendances

- `package.json` et `package-lock.json` : Leaflet, types nécessaires, `fflate`
  et harness de tests retenu ;
- aucun fichier de `gthdf-cms` ;
- aucune migration, route Strapi ou donnée générée.

## 28. Dépendances avec les autres PRD

### PRD 01 — Villes

Aucune dépendance fonctionnelle. La suggestion d’une ville proche d’une trace
reste hors MVP.

### PRD 02 — Retrouver un chapitre

Le calcul géodésique point–segment peut être partagé. Le Builder ne consomme
pas l’index simplifié de proximité pour exporter et le PRD 02 ne devient pas
un prérequis au mode découpe.

`displayOrder` peut stabiliser le mode fusion lorsqu’il existe, avec fallback
tant que le PRD 02 n’est pas déployé.

### PRD 04 — Catalogue d’itinéraires ville à ville

Le pipeline officiel peut réutiliser le noyau pur de lecture et découpe si son
environnement serveur le permet. Il doit fournir ses propres règles de
publication, reproductibilité et stockage.

Le partage de code :

- ne transmet jamais un fichier utilisateur au catalogue ;
- ne donne aucune permission Strapi au Builder ;
- ne fait pas de l’index d’affichage simplifié une source exportable ;
- garantit au minimum des fixtures communes pour WGS84, points interpolés,
  discontinuités, dénivelé et sérialisation, même si aucun package runtime
  commun n’est introduit entre les dépôts ;
- conserve les horodatages du fichier personnel dans le Builder, tandis que le
  catalogue omet ceux de ses dix tours officiels distincts ;
- ne bloque pas la livraison manuelle du présent lot.

## 29. Décisions prises et validations restantes

### Décisions prises

- fusion limitée aux traces officielles existantes ;
- deux espaces de travail conservés en mémoire ;
- noyau GPX local partagé entre fusion et découpe ;
- DOM cloné pour préserver les données inconnues ;
- support de plusieurs traces/segments ou routes, mais pas du mélange
  `trk`/`rte` ;
- document source immuable et étapes dérivées ;
- Leaflet direct, rendu Canvas et chargement dynamique ;
- fond de carte distant désactivé par défaut ;
- snapping sur segment original avec choix aux croisements ;
- alternative accessible par kilomètre ;
- coupures espacées de 250 mètres ;
- calcul WGS84 ellipsoïdal et méthode altimétrique explicite ;
- affichage simplifié, export original ;
- `fflate` pour le ZIP local ;
- limites initiales 10 Mio et 100 000 points ;
- aucun historique, serveur, Strapi ou analytics dans le MVP.

### Validations obligatoires avant mise en production

- qualifier `DOMParser` et `XMLSerializer` avec les fixtures Garmin/Komoot ;
- vérifier les namespaces et extensions réellement conservés ;
- valider la méthode de dénivelé contre des références connues ;
- mesurer les limites et budgets sur les appareils retenus ;
- choisir le fournisseur de tuiles éventuel, ses conditions et le texte
  d’information ;
- vérifier la version de Leaflet et son comportement avec React 19/Next 16 ;
- vérifier la version et le mode asynchrone de `fflate` ;
- confirmer la copie des waypoints dans chaque étape ;
- confirmer les libellés des deux modes ;
- tester les exports dans les applications de navigation retenues pour la
  recette.

Ces validations ne permettent pas d’ajouter un upload serveur ou de réduire
silencieusement les garanties d’intégrité. Toute adaptation est documentée
avec sa mesure, sa fixture ou sa décision produit.

## 30. Définition de terminé

Le lot est terminé lorsqu’un voyageur peut choisir clairement entre assembler
les traces officielles du GTHF et découper un fichier personnel, puis réaliser
l’opération choisie sans second outil.

En découpe, il peut importer une longue trace, poser ou saisir ses fins de
journée, contrôler les étapes et télécharger des GPX continus individuellement
ou dans un ZIP. Le fichier personnel reste dans le navigateur, les structures
et limitations sont explicites, les exports se réimportent correctement et
aucune préparation privée ne devient un contenu public.
