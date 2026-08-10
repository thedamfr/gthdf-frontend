# ADR — Affichage des médias dans les articles

- Statut : accepté
- Date : 2026-08-10
- Périmètre : `gthdf-frontend`

## Contexte

Les blocs `shared.media` des articles étaient rendus dans un cadre fixe de
800 × 400 pixels avec `object-fit: cover`. Ce traitement convient à une image
décorative, mais coupe les captures d’écran et empêche d’en lire les détails.

Les médias sont insérés entre des sections éditoriales précises. Les déplacer
dans une galerie commune romprait donc le lien entre l’image et le texte.

## Décision

Chaque bloc média d’un article :

- conserve son ratio d’origine dans le flux de lecture ;
- reprend le cadre charbon et l’ombre dure décalée des cartes du blog ;
- s’ouvre dans une lightbox native au clic ou au clavier ;
- reste à son emplacement éditorial ;
- utilise les dimensions et la légende fournies par Strapi lorsqu’elles sont
  disponibles ;
- propose une fermeture explicite, la touche Échap et le clic sur l’arrière-plan.

La lightbox n’ajoute aucune dépendance et utilise l’élément HTML `dialog`.

## Conséquences

Les captures d’écran ne sont plus recadrées. Les photographies très hautes
peuvent occuper davantage de hauteur dans l’article, avec une limite visuelle de
75 % de la hauteur de l’écran ; la lightbox permet de les examiner entièrement.

Le composant `shared.slider` conserve son comportement existant. Une navigation
entre tous les médias d’un article pourra être envisagée uniquement si un besoin
éditorial distinct apparaît.
