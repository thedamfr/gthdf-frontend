This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Architecture GTHF et documentation transverse

Le produit GTHF est réparti entre deux dépôts :

- `gthdf-frontend` : application publique Next.js ;
- [`gthdf-cms`](https://github.com/thedamfr/gthdf-cms) : CMS Strapi et
  schémas éditoriaux.

Le schéma exécutable appartient au CMS ; son contrat public est consommé par
le frontend. Les PRD qui décrivent ce contrat ou une fonctionnalité concernant
les deux applications sont conservés une seule fois dans
[`documentation/`](documentation/). Chaque PRD nomme les dépôts concernés,
l’ordre de déploiement et les contraintes de compatibilité.

Cet emplacement est la source canonique de la documentation d’architecture, pas
un couplage de déploiement. Chaque dépôt conserve ses branches, ses pull
requests et son cycle de livraison. Ne pas dupliquer les PRD dans le CMS :
ajouter un lien vers la source canonique.

Le classeur de cadrage des villes et itinéraires, ses exports CSV et leur
manifeste sont décrits dans
[`documentation/data/gthf_villes_et_produits_seo/`](documentation/data/gthf_villes_et_produits_seo/).

## Livraison continue OVH

La livraison par GitHub Actions/GHCR et le staging isolé sont en préparation.
Le [runbook de livraison](documentation/deploiement_continu.md) distingue le
code local des opérations réellement vérifiées ; l'automatisation n'est pas
encore activée. Le namespace `gthdf-staging` et le bucket
`gthdf-staging-media` hébergent la production malgré leur nom historique.

Le build frontend ne nécessite plus de CMS ni de secret. Au runtime,
`STRAPI_URL` désigne l'API interne, `PUBLIC_STRAPI_URL` son origine publique,
`SITE_URL` celle du site et `STRAPI_API_TOKEN` le jeton serveur. Les variables
legacy `NEXT_PUBLIC_STRAPI_URL` et `NEXT_PUBLIC_SITE_URL` restent acceptées.
`/api/health` expose la version ; `/api/ready` vérifie l'accès au contenu global.

## Getting Started

Le projet requiert Node.js 22.12 ou une version plus récente de Node 22 à 24.
L'image de production utilise la version Node 24 épinglée dans le `Dockerfile`.

Create `.env.local` from `.env.example`. `PREVIEW_SECRET` must contain the
same long random value in the frontend and CMS environments. Keep it
server-only: do not prefix it with `NEXT_PUBLIC_`.

Toutes les lectures authentifiées utilisent `STRAPI_API_TOKEN`, strictement
serveur. La variable legacy `NEXT_PUBLIC_STRAPI_API_TOKEN` n’est pas prise en
charge et ne doit jamais être définie. Les origines objet autorisées se
configurent avec `STRAPI_MEDIA_ORIGINS`.

Le fond cartographique des fiches itinéraires est contrôlé côté serveur par
`ITINERARY_BASEMAP_ENABLED`. La valeur par défaut est `false` : le schéma SVG
autonome reste alors affiché et aucun appel à OpenFreeMap n’est effectué. La
valeur exacte `true` active le fond Positron différé ; remettre la variable à
`false` constitue le retour arrière immédiat en cas d’indisponibilité du
fournisseur ou avant validation de la politique de confidentialité.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Routes principales

- `/` : Homepage CMS (header, intro, carte, principes, horizons, FAQ, rencontres)
- `/chapitres` : Liste des chapitres
- `/chapitres/[slug]` : Détail chapitre
- `/villes/[slug]` : Hub d'une ville publiée et activée dans Strapi
- `/checkpoints` : Page checkpoints CMS + accordéon
- `/gpx-builder` : Générateur d’une portion officielle entre deux villes
- `/itineraires-velo` : Liste HTML des itinéraires publiés et indexables
- `/itineraires-velo/[slug]` : Itinéraire ville à ville publié et vérifié
- `/blog` : Liste des articles avec filtre par catégorie (`?category=slug`)
- `/article/[slug]` : Détail article
- `/a-propos` : Page à propos CMS (title + blocks)
- `/mentions-legales` : Mentions légales CMS

## Validation PRD 01 en local

Avec Strapi sur `http://localhost:1337` et Next sur
`http://localhost:3000`, lancer :

```bash
npm test
npm run lint
npm run test:integration:prd01
```

Le smoke test contrôle une ville publique, les 404 des villes privées, le
résumé serveur d'un chapitre, le sitemap et une preview Draft Mode protégée.
Sur une fiche itinéraire en Draft Mode, le bandeau signale explicitement la
prévisualisation et permet de recharger la même URL hors Draft Mode sans
conserver le cookie de preview.

## Validation PRD 02 et revue sur téléphone

Avec Strapi démarré par `npm run develop` dans `gthdf-cms` et le frontend
démarré par `npm run dev` dans ce dossier, lancer depuis le frontend :

```bash
npm test
npm run lint
npm run test:integration:prd02
npm run test:integration:prd02:geometry
```

La recette PRD 02 appelle uniquement le frontend local sur
`http://localhost:3000`. Elle vérifie le HTML serveur de `/chapitres`, les dix
liens dans l'ordre public, l'absence d'image de galerie dans le HTML initial,
le refus des paramètres par l'endpoint de proximité et le contrat de son JSON.
Elle affiche aussi le poids JSON et gzip de l'index ainsi qu'un benchmark local
du calcul de proximité. La limite compressée est de 500 Ko, avec une cible de
250 Ko ; le benchmark local sert de garde-fou et ne remplace pas la mesure sur
le téléphone Android médian de la recette.

`LOCAL_FRONTEND_URL` peut changer le port, mais le script refuse une URL non
loopback afin d'éviter tout appel involontaire à la production. Le nombre
d'itérations peut être ajusté de 5 à 200 avec
`PRD02_BENCHMARK_ITERATIONS` (20 par défaut). Aucun secret n'est nécessaire ou
affiché par cette recette.

La recette géométrique charge uniquement le Strapi et le frontend locaux. Elle
compare leurs 20 références GPX, servies par Strapi ou par l’origine de
stockage objet explicitement approuvée, avec l’index simplifié. Elle refuse
toute autre origine, impose une tolérance de distance de 25 m, puis vérifie les
gagnants séparés de plus de 50 m et les cas de jonction ambigus. Elle lit les
variables de `.env.local` sans afficher le jeton Strapi.

Le PRD 02 est livré en production depuis le 5 août 2026. Les dix chapitres y
sont ordonnés de `1` à `10`, la migration des vingt versions brouillon et
publiée est terminée et l’index de proximité mesuré par la recette pèse
53,1 Kio gzip. Le document de référence conserve le bilan complet :
[`documentation/prd_02_retrouver_chapitre_mobile.md`](documentation/prd_02_retrouver_chapitre_mobile.md).

Pour la revue depuis un téléphone, conserver les deux commandes npm actives,
contrôler la redirection avec `tailscale serve status`, puis ouvrir l'URL HTTPS
MagicDNS du frontend depuis un appareil du même tailnet. L'HTTPS est nécessaire
pour tester la géolocalisation. Le smoke test reste lancé sur le Mac contre
`localhost` ; il ne faut pas lui transmettre l'URL Tailscale.

## Validation PRD 03 du GPX Builder

Le Builder remplace le fusionneur par deux comboboxes `départ → arrivée`. Le
serveur compare les portions AB et BA et retient automatiquement la plus
courte ; le navigateur n’envoie aucun choix de sens.
Le visuel du parcours complet repris depuis l’accueil précise que le GPX suit
une section de la boucle officielle, et un lien conduit vers les dix chapitres.
Les payloads des endpoints du Builder ne contiennent ni URL de média, ni
coordonnées d’ancrage, ni empreinte de source. Les endpoints serveur sont :

- `POST /api/gpx-builder/preview` pour le résumé ;
- `POST /api/gpx-builder/download` pour le GPX 1.1.

Après une prévisualisation valide, la réponse peut aussi fournir le lien
secondaire `Découvrir cet itinéraire` lorsqu’une fiche catalogue publique
représente exactement le même parcours AB, les mêmes villes ordonnées, les
mêmes ancres, sources et jonctions. Le rapprochement réutilise la garde
publique côté serveur. Une correspondance partielle ou inversée et une panne
du catalogue n’affichent aucun lien. Le lookup est plafonné à une seconde afin
de ne retarder ni la prévisualisation ni le téléchargement du GPX.

Le bloc « À savoir » conduit vers `/itineraires-velo`. Cet index serveur liste
dans son HTML initial toutes les fiches publiques indexables afin de fournir un
chemin de navigation et de crawl indépendant du sitemap XML.

Le maillage interne du catalogue reste volontairement borné et rendu côté
serveur. Une page ville affiche au plus cinq itinéraires qui ont cette ville
pour extrémité : les choix `featuredOnCityPages` et `editorialOrder` passent en
premier, puis les places restantes sont complétées automatiquement dans un
ordre stable. Chaque fiche itinéraire propose au plus trois autres portions
publiques et indexables ayant exactement la même ville de départ. La fiche
courante, les previews et les pages `noindex` sont toujours exclues.

Les fiches `/itineraires-velo/[slug]` publient une seule distance : celle de
la géométrie GPX active. La distance à vol d’oiseau reste un critère interne
d’éligibilité et n’entre ni dans le DTO public, ni dans le HTML, ni dans les
metadata. Le H1, le CTA, les cartes, les pages-ville et les recommandations
utilisent le même formateur de direction française et le même arrondi au
dixième de kilomètre. Les champs CMS optionnels `City.fromLabel` et
`City.toLabel` permettent de traiter une exception éditoriale ; le fallback
gère les articles `Le`/`Les`, les voyelles et les cas ordinaires.

Cette version du frontend doit être déployée après le schéma CMS qui ajoute
ces deux champs. Aucune migration de contenu n’est requise. En rollback,
redéployer l’ancien frontend et conserver les champs CMS additifs.

Avant une recette locale, déployer ou démarrer le schéma CMS, préparer et
publier les ancrages et jonctions relus, puis activer
`Global.gpxBuilderEnabled`. Tant que cette valeur reste à `false`, la page
affiche volontairement un état indisponible.

Depuis le frontend :

```bash
npm test
npm run lint
npm run build
```

La recette manuelle minimale couvre une portion dans un chapitre, le cas
Boulogne-sur-Mer → Gravelines sur deux chapitres, le passage par l’origine et
un cas BA dont le profil diffère d’AB. Réimporter les exports dans deux
applications de navigation et vérifier qu’aucune ligne ne relie une rupture
qualifiée. Le contrat complet et le bilan local sont conservés dans
[`documentation/prd_03_gpx_builder_ville_a_ville.md`](documentation/prd_03_gpx_builder_ville_a_ville.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Déploiement

La production est hébergée sur le serveur OVH Gravelines, dans le namespace
MicroK8s `gthdf-staging` validé avant la bascule DNS. Clever Cloud reste
provisoirement disponible comme voie de retour arrière ; ne pas supprimer ses
applications, sa base ou son bucket tant que les sauvegardes OVH et la période
d'observation post-bascule ne sont pas validées.

Au 10 septembre 2026, les deux dépôts GTHF ne contiennent aucun workflow
GitHub Actions : un push sur `main` ne constitue donc pas une livraison OVH
automatisée et vérifiable depuis ces sources. Les images sont construites puis
importées dans MicroK8s ; Ansible applique les manifests Kustomize déjà présents
sur la cible. Les noms `staging` sont historiques : les domaines de staging et
de production servent les mêmes applications et données, sans environnement
de recette indépendant. Ce partage est un écart à corriger avant toute recette
qui crée, modifie ou supprime des données.

La cible demandée est un **staging complet et isolé pour GTHF** : frontend,
CMS, PostgreSQL, volumes et médias propres, configuration et secrets distincts.
Les agents coordonnent la version du staging partagé pour montrer leurs
changements sans écraser le travail d'un autre. Il doit permettre les vrais parcours
éditoriaux, CRUD et uploads sans écriture dans la production. La qualification
sur staging précède la promotion des artefacts construits par GitHub Actions.

La [cible de livraison automatique](documentation/deploiement_continu.md)
décrit les écarts observés et la direction à implémenter : sélection et builds
sur runners GitHub Actions, publication GHCR par SHA/digest, puis déploiement
automatique sur Penthouse après CI verte sur chaque push `main`. Les images
inchangées sont réutilisées et la recette de production prouve la release
servie. Ansible et Kustomize sont conservés ; Helm n'est pas un prérequis.
Le builder local reste un moyen de secours explicitement autorisé.

Pour les PRD 01 à 03, déployer d'abord le schéma CMS, exécuter et contrôler
les migrations manuelles avec les commandes npm documentées dans le README du
CMS, puis déployer le frontend. Ces migrations ne sont jamais ajoutées au
démarrage automatique de l'application.

La migration a d'abord été recettée sur le VPS Hetzner, puis répétée et promue
sur OVH. Elle utilise deux images indépendantes, un PostgreSQL 17 local et un
bucket S3 OVH Paris dédié. Le choix d'architecture, les commandes
d'exploitation, le rollback DNS et les résultats vérifiés sont documentés dans
[`documentation/adr_hebergement_microk8s_partage.md`](documentation/adr_hebergement_microk8s_partage.md)
et [`infrastructure/README.md`](infrastructure/README.md).
