# ADR — Ancrages directionnels pour les portions GPX officielles

**Date :** 6 août 2026\
**Statut :** accepté et implémenté\
**Décision liée :**
[`prd_03_gpx_builder_ville_a_ville.md`](prd_03_gpx_builder_ville_a_ville.md)

## Contexte

Le GPX Builder v2 doit extraire une portion du GTHF entre deux villes
référencées dans les `cityPassages`.

Un passage fournit une ville et un ordre éditorial, mais pas le point exact de
la trace où commence ou se termine la portion. La coordonnée de `City` est
une ancre communale, pas une coordonnée GPX qualifiée. Une commune peut être
traversée plusieurs fois.

Les médias AB et BA sont administrés séparément. Les vingt fichiers actuels
ont des nombres de points différents et présentent des divergences locales :
inverser AB ne reproduit pas BA et pourrait réintroduire une voirie ou une
pente que le sens officiel évite.

Le PRD 04 prévoit par ailleurs un catalogue fondé sur toutes les occurrences
géographiques d’une commune. Il ne faut ni dupliquer sans provenance le même
calcul, ni réduire ce modèle exhaustif aux seuls arrêts du Builder.

## Décision

1. `chapter.city-passage` porte un ancrage primaire optionnel pour chacun des
   médias `gpxFileAB` et `gpxFileBA`.
2. Un ancrage validé référence une empreinte binaire exacte et une position
   reproductible : trace, segment, point précédent, fraction, coordonnée et
   chaînage dans le chapitre.
3. Les ancrages sont proposés par une commande versionnée, relus puis écrits
   dans les brouillons. Ils ne sont ni calculés à la volée dans une requête
   publique, ni publiés automatiquement.
4. Remplacer un média rend les ancrages liés à son ancienne empreinte
   inutilisables jusqu’à une nouvelle validation.
5. Le frontend génère les portions à la demande depuis les seuls médias
   officiels autorisés. Il ne reçoit aucune URL ou géométrie fournie par
   l’utilisateur.
6. Le PRD 04 peut reprendre un ancrage AB primaire comme occurrence
   `RouteAnchor` avec sa provenance, mais il conserve le calcul et la
   validation de toutes les autres occurrences.
7. Le noyau de découpe et ses fixtures constituent le contrat partagé. Le job
   du PRD 04 ne dépend pas de la disponibilité de la route HTTP du Builder.
8. Chaque chapitre porte aussi une jonction qualifiée par sens, liée aux
   empreintes des deux médias adjacents. Une jonction exacte est réunie ; un
   écart accepté reste deux séquences ; une jonction bloquée ferme la portion.
9. Une frontière de chapitre possède un seul lieu de jonction éditorial,
   commun à AB et BA : la gare SNCF voyageurs par défaut, ou un repère stable
   et nommé en exception. La décision est saisie une fois puis développée en
   deux qualifications directionnelles, sans partager leurs empreintes,
   géométries ni métriques.
10. Un coupe-circuit CMS désactivé par défaut ne peut être activé que si toute
   la boucle publiée satisfait ces invariants.
11. L’interface publique ne demande pas le sens. Les identifiants d’arrêt sont
    communs à AB et BA ; le serveur compare les deux chaînages officiels et
    retient la portion la plus courte. Une égalité exacte est départagée en
    faveur de AB afin de garder un résultat déterministe.
12. Pour chaque passage intermédiaire, l’arrêt primaire utilise le premier
    chaînage AB du jeu contrôlé lorsque son empreinte correspond au média. Le
    point est interpolé sur le segment original ; sa coordonnée AB sert ensuite
    à rapprocher l’occurrence du média BA sous contrainte d’ordre. Les passages
    de frontière reprennent les extrémités exactes des médias.

## Conséquences

### Positives

- chaque sens respecte sa géométrie et son profil propres ;
- le téléchargement échoue de façon sûre si une source change ;
- les cas multi-chapitres restent déterministes ;
- la sélection publique reste simple ;
- aucun opérateur ne ressaisit les coordonnées des 466 ancrages ;
- la complexité AB/BA reste côté serveur tout en étant visible dans le résumé ;
- une frontière ne demande qu’une décision éditoriale, même si sa validité
  technique reste contrôlée séparément dans chaque sens ;
- PRD 03 amorce une partie du travail d’ancrage de PRD 04 sans remplacer son
  modèle exhaustif ;
- aucune paire de villes n’est pré-générée ou stockée pour le Builder.

### Coûts

- le CMS et le frontend sont tous deux modifiés ;
- les 233 passages doivent être qualifiés dans deux sens ;
- les cas ambigus demandent une revue humaine ;
- l’arrêt primaire ne qualifie pas les autres occurrences d’une
  commune attendues par le PRD 04 ;
- une modification de GPX impose de recalculer les ancrages concernés ;
- les contrats partagés doivent être validés dans deux dépôts qui ne publient
  pas encore de package commun.

## Alternatives écartées

### Importer puis découper un GPX utilisateur

Cette solution répond à un autre besoin. Le produit porte sur les traces
officielles et les villes du GTHF.

### Projeter la ville au moment du téléchargement

Le point le plus proche peut choisir la mauvaise occurrence et changer
silencieusement après une mise à jour de données.

### Utiliser un seul ancrage puis inverser la trace

AB et BA ne sont pas équivalents. Cette solution peut produire une portion
différente du parcours officiel prévu pour le sens choisi.

### Pré-calculer toutes les paires

Le Builder n’a besoin ni de pages, ni de médias persistés par paire. Cette
responsabilité appartient au PRD 04.

### Demander le sens avant les villes

Le sens est une propriété technique des traces officielles, pas une décision
que le voyageur doit traduire en AB ou BA. Les villes suffisent à déterminer
la portion la plus courte ; le résumé conserve l’information du sens retenu
pour rendre le résultat explicable.

### Implémenter immédiatement tout le modèle `RouteAnchor` du PRD 04

Le Builder a besoin d’un arrêt éditorial primaire par passage et par sens. Le
catalogue doit qualifier toutes les occurrences d’une commune et conserve donc
son modèle distinct.

## Réexamen

La décision doit être revue si :

- les GPX AB et BA deviennent officiellement une seule géométrie réversible ;
- les `cityPassages` sont remplacés par un modèle de parcours global ;
- un package géographique commun aux deux dépôts est introduit ;
- le Builder doit proposer plusieurs occurrences d’une même ville au-delà des
  passages éditorialement retenus.
