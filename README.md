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

## Getting Started

Le projet requiert Node.js 22.12 ou une version plus récente de Node 22 à 24.
Cette contrainte est également utilisée par Clever Cloud lors du déploiement.

Create `.env.local` from `.env.example`. `PREVIEW_SECRET` must contain the
same long random value in the frontend and CMS environments. Keep it
server-only: do not prefix it with `NEXT_PUBLIC_`.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Déploiement

L'application est déployée sur Clever Cloud depuis sa branche de production.
Pour le PRD 01, déployer d'abord le schéma CMS, exécuter et contrôler la
migration manuelle des données, puis déployer le frontend. La migration n'est
jamais ajoutée au démarrage automatique de l'application.
