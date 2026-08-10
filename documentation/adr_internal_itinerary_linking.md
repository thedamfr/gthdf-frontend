# ADR — Maillage interne borné des itinéraires

**Date :** 10 août 2026
**Statut :** accepté et implémenté
**Décisions liées :**
[`prd_04_catalogue_itineraires_ville_a_ville.md`](prd_04_catalogue_itineraires_ville_a_ville.md),
[`adr_itinerary_catalogue_index.md`](adr_itinerary_catalogue_index.md)

## Contexte

L’index HTML `/itineraires-velo` fournit un point d’entrée exhaustif vers les
fiches canoniques. Les pages individuelles restent toutefois peu reliées entre
elles. La section d’itinéraires des hubs villes dépendait exclusivement du flag
`featuredOnCityPages`, ce qui la laissait vide tant qu’aucune sélection
éditoriale n’était renseignée. Les fiches itinéraire ne proposaient aucun lien
vers une autre portion.

L’objectif est d’ajouter des chemins de navigation contextuels et crawlables,
sans créer un maillage complet, une facette publique ou une dépendance à une
nouvelle saisie CMS.

## Décision

1. Une page `/villes/[slug]` affiche au plus cinq itinéraires publics et
   indexables dont la ville est le départ ou l’arrivée.
2. Les itinéraires `featuredOnCityPages=true` sont classés en premier. Dans
   chaque groupe, `editorialOrder`, la distance, le titre puis le slug assurent
   un ordre stable. Les places restantes sont complétées automatiquement.
3. Une page `/itineraires-velo/[slug]` affiche au plus trois autres itinéraires
   dont `activeRevision.departure.documentId` est strictement identique à celui
   de la fiche courante. La fiche courante est exclue.
4. Les deux sélections réappliquent défensivement les contraintes `indexable`
   et hors preview après la garde publique existante.
5. Les liens canoniques sont rendus dans le HTML serveur initial. Aucun
   JavaScript n’est requis pour les découvrir.
6. Les requêtes Strapi appliquent le même tri et sont elles-mêmes bornées à
   cinq ou trois documents ; la fiche courante est exclue dès la requête de
   rapprochement par ville de départ.
7. Ces lectures restent optionnelles : une indisponibilité du catalogue omet
   la section concernée sans faire échouer la page ville ou itinéraire.
8. Aucun schéma, droit public, contenu ou script de migration CMS n’est ajouté.

Si moins de cinq ou trois candidats sont disponibles, la page affiche la liste
plus courte et ne crée aucun emplacement vide.

## Conséquences

### Positives

- les choix éditoriaux existants restent prioritaires sans bloquer le crawl ;
- chaque document public reçoit un nombre borné de liens contextuels ;
- une ville de départ forme un groupe compréhensible pour le visiteur ;
- le déploiement et le retour arrière concernent uniquement le frontend.

### Coûts et limites

- le fallback automatique est un classement technique, pas une recommandation
  éditoriale ;
- une ville intermédiaire non choisie comme extrémité ne devient pas un critère
  de rapprochement ;
- les sélections nécessitent une lecture serveur filtrée supplémentaire, dont
  la réponse comme le HTML rendu restent limités à cinq ou trois documents.

## Retour arrière

Le retour arrière consiste à retirer les deux sections et leurs sélecteurs du
frontend. Aucune donnée CMS n’a besoin d’être restaurée ou recalculée.

## Réexamen

La décision doit être revue si un besoin éditorial exige un ordre différent
par ville, si la lecture filtrée devient coûteuse sur la plateforme cible ou si
le nombre de liens doit évoluer pour une raison mesurée plutôt que SEO seule.
