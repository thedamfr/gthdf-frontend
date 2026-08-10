# ADR — Index HTML public des itinéraires

**Date :** 10 août 2026
**Statut :** accepté et implémenté
**Décision liée :**
[`prd_04_catalogue_itineraires_ville_a_ville.md`](prd_04_catalogue_itineraires_ville_a_ville.md)

## Contexte

Le PRD 04 excluait du MVP une route d’index `/itineraires-velo`. Les fiches
ville à ville sont désormais publiées en nombre et présentes dans le sitemap,
mais aucun document HTML unique ne fournit à la fois une liste exhaustive et
des liens internes vers leurs URL canoniques.

La page du GPX Builder constitue un point d’entrée public stable et pertinent
pour conduire les visiteurs comme les robots vers ce catalogue.

## Décision

1. Le frontend expose une page serveur indexable sur `/itineraires-velo`.
2. La page réutilise `getPublicCatalogueEntries` et n’affiche que les fiches
   passées par la garde publique, marquées `indexable` et hors preview.
3. Toutes les URL canoniques sont présentes dans le HTML initial, dans un ordre
   déterministe par ville de départ puis d’arrivée. Aucun JavaScript ni filtre
   n’est nécessaire pour découvrir les liens.
4. Le bloc « À savoir » du GPX Builder contient un lien interne vers cet index.
5. Une panne amont n’est pas transformée en faux catalogue vide mis en cache.
   Aucun modèle, droit public ou schéma CMS supplémentaire n’est introduit.

Cette décision remplace uniquement le non-objectif du PRD 04 qui excluait la
route d’index du MVP. Les filtres, facettes et recherches restent hors périmètre.

## Conséquences

### Positives

- les fiches disposent d’un chemin de liens internes explicite ;
- les visiteurs peuvent parcourir toutes les portions publiées depuis une page
  sobre ;
- le sitemap et l’index HTML appliquent le même critère `indexable` ;
- la publication reste gouvernée par la garde cumulative existante.

### Coûts

- le document HTML grandit avec le nombre de fiches publiées ;
- l’ordre alphabétique sert à la découverte, sans constituer un moteur de
  recherche ni un classement éditorial.

## Réexamen

La décision doit être revue si la taille de la réponse dégrade sensiblement le
temps de transfert ou si un besoin utilisateur explicite justifie une recherche
ou une pagination qui conserve des liens crawlables.
