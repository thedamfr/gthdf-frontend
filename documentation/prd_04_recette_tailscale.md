# Recette simple PRD 04 via Tailscale

Cette recette expose uniquement Next à travers Tailscale Serve sur le port
HTTPS `9443`. Strapi reste joignable côté serveur sur
`http://127.0.0.1:1340` et son token ne doit jamais être placé dans l’URL ni
copié dans une commande partagée. Ne pas activer Tailscale Funnel : l’accès
doit rester limité aux appareils du tailnet.

## 1. Préparer et démarrer le CMS local

Depuis le clone CMS PRD 04, démarrer la stack isolée et définir les variables
locales décrites dans `docs/prd04-catalogue-runbook.md`. Préparer ensuite la
page synthétique idempotente, puis démarrer Strapi uniquement sur la boucle
locale :

```sh
docker compose -f docker-compose.catalogue.yml up -d --wait --wait-timeout 120 postgres-catalogue minio-catalogue
docker compose -f docker-compose.catalogue.yml run --rm -T --no-deps minio-init-catalogue
docker compose -f docker-compose.catalogue.yml ps
npm run catalogue:recipe -- --dry-run
npm run catalogue:recipe -- --apply --confirm-local-recipe
HOST=127.0.0.1 PORT=1340 npm run develop
```

Avant le dry-run, PostgreSQL et MinIO doivent apparaître `healthy`, et la
commande d’init MinIO doit avoir terminé avec le code `0`. La dernière commande
reste active : conserver ce terminal pour Strapi et continuer depuis un second
terminal dans le clone frontend.

La commande de recette refuse `NODE_ENV=production`, une base non locale et
les connexions PostgreSQL distantes, y compris via `DATABASE_URL`. Sur une base
vierge, elle crée un seul itinéraire synthétique en `noindex`, sans aucun appel
à la production. Ne pas utiliser `seed:remote` pour cette recette.

Vérifier localement que Strapi répond sur `http://127.0.0.1:1340`. La fixture
reste strictement locale et ne doit jamais être copiée ni publiée vers un
environnement partagé.

## 2. Préparer l’environnement Next

Depuis l’admin Strapi locale, créer un token API **Read-only** réservé à cette
recette. Dans `.env.local`, ajouter ou contrôler les valeurs suivantes :

```dotenv
STRAPI_URL=http://127.0.0.1:1340
STRAPI_API_TOKEN=<token read-only local>
NEXT_PUBLIC_STRAPI_URL=http://127.0.0.1:1340
STRAPI_MEDIA_ORIGINS=http://127.0.0.1:59000
NEXT_PUBLIC_SITE_URL=https://<magicdns-sans-point-final>:9443
NEXT_ALLOWED_DEV_ORIGINS=<magicdns-sans-point-final>
```

Ne jamais préfixer le token par `NEXT_PUBLIC_`.

## 3. Démarrer Next sur le port attendu

Construire puis lancer Next, afin de tester un comportement proche de la
production :

```sh
npm run build
PORT=3001 npm run start -- --hostname 127.0.0.1 --port 3001
```

En cas de diagnostic uniquement, le serveur de développement équivalent est :

```sh
PORT=3001 npm run dev -- --hostname 127.0.0.1 --port 3001
```

Créer ou remplacer la règle dédiée à la recette, puis lire l’URL MagicDNS
exacte affichée par Tailscale :

```sh
tailscale serve --bg --https=9443 http://127.0.0.1:3001
tailscale serve status
tailscale status --json
```

L’URL à partager au téléphone est
`https://<nom-machine>.<tailnet>.ts.net:9443`. Reporter exactement le nom
MagicDNS sans son point terminal dans les deux variables ci-dessus. La règle
transmet uniquement les requêtes reçues sur `9443` vers Next sur `3001`.

Avant la recette, contrôler les services exposés :

```sh
tailscale serve status
```

Auditer **toutes** les règles. Toute cible `localhost:1337`,
`127.0.0.1:1337`, `localhost:1340` ou `127.0.0.1:1340` expose le CMS au tailnet
et doit être désactivée avant de partager l’URL. Les ports historiques observés
sont notamment `8443` et `9444` :

```sh
tailscale serve --https=8443 off
tailscale serve --https=9444 off
```

Relancer `tailscale serve status` et vérifier qu’il ne reste, pour cette
recette, que le proxy Next attendu sur `:9443`, sans aucune cible CMS. Ne pas
activer Tailscale Funnel.

À la fin de la recette, couper cette exposition :

```sh
tailscale serve --https=9443 off
```

## 4. Recette téléphone

Depuis un téléphone connecté au même tailnet :

1. ouvrir `/itineraires-velo/ville-recette-a-a-ville-recette-b` ;
2. vérifier le H1, la distance, le dénivelé, les chapitres, les villes et le
   bouton GPX avant d’atteindre la carte ;
3. télécharger le GPX et contrôler son nom ainsi que son ouverture dans une
   application compatible ;
4. faire défiler jusqu’à la carte : son appel `/geometry` ne doit partir qu’à
   l’approche de la section, et les ruptures doivent rester en segments séparés ;
5. vérifier le profil seulement sur une révision dont l’altitude est qualifiée ;
6. contrôler la page à 320 px, l’orientation paysage et le zoom navigateur à
   200 % ;
7. ouvrir
   `/itineraires-velo/ancienne-ville-recette-a-a-ville-recette-b` : la réponse
   doit être une redirection permanente HTTP `308` et l’adresse finale doit
   devenir `/itineraires-velo/ville-recette-a-a-ville-recette-b` ;
8. vérifier l’itinéraire `noindex` et une page ville qui ne présente que les
   itinéraires explicitement mis en avant.

Enfin, couper temporairement `publishCityItinerariesToNext` dans le single type
`Global` de Strapi local : page, GPX, géométrie, sitemap et liens de ville
doivent disparaître au plus tard après 60 secondes. Une panne du CMS doit
produire une indisponibilité serveur, jamais une fausse 404 ni un sitemap vide
mis en cache.
