# Livraison continue GTHF sur OVH

Version 0.2 — 11 septembre 2026. Statut : **implémentation en cours de revue,
automatisation non activée**. Le constat initial est conservé dans son
[snapshot intégral](history/deploiement_continu_2026-09-10.md) ; les décisions nouvelles sont précisées dans
l'[ADR de livraison](adr_livraison_continue.md).
Il est la référence GTHF commune au frontend et au CMS ; les conventions de
plateforme sont portées par `infra-sincere`.

## Avancement vérifié le 11 septembre 2026

Les deux worktrees de livraison contiennent un workflow GitHub Actions : qualité
sur PR, publication GHCR sur `main`, puis qualification et promotion uniquement
si `GTHDF_DELIVERY_ENABLED=true`. Leur publication est suivie dans les PR
[frontend #33](https://github.com/thedamfr/gthdf-frontend/pull/33) et
[CMS #23](https://github.com/thedamfr/gthdf-cms/pull/23).
Aucun run GHCR/CD ni déploiement de ces images n'a encore été validé.
Les tests et builds applicatifs locaux ont réussi. Le build Next réussit sans
CMS et sans secret ; la portabilité du même digest doit encore être recettée.

Sur `penthouse`, le namespace `gthdf-qualification` et son PostgreSQL sont
créés. Une copie éditoriale a été restaurée en excluant les comptes, sessions,
jetons, webhooks, paramètres privés et tâches sortantes de production. Les
références aux anciens administrateurs ont été vidées ; les tables privées
sont vérifiées vides. Les 2 720 objets média sont copiés ; les 2 209 références de fichiers et leurs
variantes pointent vers le bucket staging. Un administrateur et un jeton de
lecture dédiés sont créés ; les deux jetons d’exemple générés par Strapi ont
été supprimés. Les webhooks sont absents. Les preuves sont conservées dans
`staging-data.json` et `staging-media.json` sous le dossier privé de livraison. Les deux bases exécutent la même image PostgreSQL ; les PVC sont
physiquement distincts. Le playbook `prepare-staging.yml` a réussi puis a été
relancé sans changement. La preuve privée est conservée dans
`/home/ubuntu/gthdf-delivery/staging-foundation.json`. Les applications, les
routes et les pods de production n'ont pas été modifiés par cette préparation.
Les domaines staging restent des alias de production : aucun test d'écriture
ne doit encore les utiliser.

Le bucket staging retenu par l'utilisateur est `gthf-staging-media-bis`, région
`gra`, endpoint `https://s3.gra.io.cloud.ovh.net`. Son origine publique prévue
est `https://gthf-staging-media-bis.s3.gra.io.cloud.ovh.net`. Le bucket historique
`gthdf-staging-media` reste celui de production en région Paris 3-AZ. Il n'est
pas renommé ni migré par cette livraison. L'utilisateur S3 `gthf` doit servir
les deux buckets GTHF ; les clés ne sont donc pas une barrière d'isolation
entre ces deux environnements. Les clés Strapi, jetons et comptes restent
propres à chaque environnement.

### Commandes et accès

Depuis ce dépôt :

```bash
npm run infra:ansible:install
npm run infra:staging:prepare
npm run infra:staging:storage
npm run infra:staging:data
npm run infra:staging:media -- --extra-vars '{"gthdf_cms_checkout":"/chemin/gthdf-cms"}'
npm run test:delivery
npm run infra:credentials:upload -- /chemin/prive/identifiants-gthf.txt
```

La dernière commande transmet le fichier par SSH stdin vers
`penthouse:/home/ubuntu/gthdf-delivery/credentials/ovh-gthf.txt` (dossier 700,
fichier 600). Le fichier reste hors Git et hors des journaux. La commande
remplace atomiquement ce fichier, conserve la source locale et ne modifie
aucun Secret Kubernetes. L'installation staging a réussi. Le contrôle réel création/lecture publique/
suppression d'un objet temporaire dans le nouveau bucket a réussi. Le contrôle
`HeadBucket` de production avec ces clés réussit après correction des droits
le 11 septembre. Ce contrôle n'écrit pas dans le bucket de production ; ses
anciennes clés restent actives jusqu'au rollout préparé du CMS.

La CI attend les secrets GitHub `TS_OAUTH_CLIENT_ID`, `TS_AUDIENCE`,
`GTHDF_SSH_PRIVATE_KEY` et `GTHDF_SSH_KNOWN_HOSTS` dans chacun des deux dépôts.
L'accès Tailscale OIDC doit autoriser les identités GitHub de ces dépôts et
`tag:github-deploy`. La connexion SSH cible
`ubuntu@penthouse.taild95457.ts.net` ; aucun port public supplémentaire n'est
ouvert. La publication GHCR utilise `GITHUB_TOKEN` avec `packages: write`.
Le cluster utilise un Secret `gthdf-ghcr` réservé à la lecture du registre.

Au contrôle du 11 septembre, le runbook `infra-sincere` renvoie au mécanisme
Studio mais ne fournit pas encore l'identité OIDC utilisable pour GTHF. Sa
documentation complémentaire est demandée avant l'activation automatique.
Aucune URL Tailscale de recette GTHF n'est encore opérationnelle. Les accès
effectivement vérifiés seront ajoutés aux deux PR ; les domaines staging
historiques ne constituent pas encore une cible de recette isolée.

Le déployeur s'exécute par `npm run infra:delivery -- ...` dans un checkout
installé sur le serveur attendu. `status` lit les références vérifiées ;
`reserve --owner <identifiant> --minutes 60` réserve le staging (maximum 240
minutes) et `release --owner <identifiant>` le libère. `deliver --candidate
<manifest.json>` qualifie puis promeut un candidat de `main` et exige deux
références initiales complètes. L'absence d'état initial provoque un échec,
jamais une activation présumée correcte.

### Contrôles restant avant activation

1. Remplacer les anciennes clés S3 de production lors du rollout CMS préparé ;
   le contrôle d'accès des nouvelles clés a réussi.
2. Publier et valider les workflows et les deux premières images GitHub Actions.
   Installer l'accès privé Tailscale/SSH et la lecture GHCR côté cluster.
3. Démarrer le couple d'images dans `gthdf-qualification`, activer ses routes
   authentifiées et vérifier les parcours réels : administration, brouillon,
   preview, publication, upload, chapitre, ville, catalogue et GPX.
4. Vérifier la persistance après redémarrage de staging, puis qualifier la
   première promotion et son retour arrière sans interruption de la production.
5. Enregistrer les digests réellement exécutés dans les deux manifestes initiaux,
   activer `GTHDF_DELIVERY_ENABLED=true` et vérifier un cycle `main` complet,
   y compris un changement documentaire sans redémarrage.

Ces étapes restent ouvertes ; les données et médias préparés ne constituent
pas encore un staging applicatif livré. Les rapports de release ne doivent contenir aucun secret.

### Bascule initiale des routes de staging

Cette opération d'amorçage reste à effectuer après qualification des images.
La livraison courante refuse toute règle Ingress des deux domaines staging
qui viserait un autre namespace ou un service autre que la passerelle.
Elle ne supprime pas implicitement les alias historiques de production.

1. Vérifier l'hôte, le contexte, les digests et les rollouts des trois Deployments
   `gthdf-cms`, `gthdf-frontend` et `gthdf-staging-gateway` dans
   `gthdf-qualification`, puis leurs sondes internes. Attendre le certificat
   `gthdf-qualification-tls` prêt. À cette étape, n'exposer encore aucune route
   applicative de qualification sur les domaines historiques.
2. Inventorier les Ingress de tous les namespaces pour les hosts
   `staging.gthf.fr` et `staging-cms.gthf.fr`, ainsi que les IngressRoute
   Traefik (HTTP/TCP/UDP) et les HTTPRoute/GRPCRoute Gateway API. Le contrôle
   exige les deux hosts derrière la passerelle et refuse les routes alternatives
   qui pourraient les atteindre ; un host littéral étranger tel que
   `dashboard.localhost` est accepté. Sauvegarder les deux objets
   historiques `gthdf-staging/gthdf-frontend` et `gthdf-staging/gthdf-cms` dans
   le dossier privé de livraison. Refuser la bascule si leurs noms, hosts ou
   services ne correspondent plus à cet inventaire.
3. Retirer ces deux seuls Ingress historiques, puis appliquer
   `infrastructure/kubernetes/overlays/qualification/ingress.yaml` avec le
   namespace explicite `gthdf-qualification`. Les Ingress
   `gthdf-production-frontend` et `gthdf-production-cms` continuent de servir
   les domaines de production ; seule la recette peut connaître une brève
   indisponibilité pendant la bascule de ses alias.
4. Vérifier l'absence de règle concurrente, TLS, le refus 401 sans accès de
   recette, les SHA derrière la passerelle, puis la recette CRUD complète.
   En cas d'échec, retirer les deux Ingress créés dans `gthdf-qualification`
   et restaurer les spécifications sauvegardées dans `gthdf-staging`. Les
   domaines redeviennent alors des alias de production : interdire les tests
   d'écriture jusqu'à une nouvelle qualification.

Enregistrer la référence initiale staging seulement après cette bascule
vérifiée. Une référence créée artificiellement pour contourner le bootstrap
ne valide ni les routes, ni les versions, ni l'isolation.

## Fonctionnement du déployeur

Le [plan initial](history/deploiement_continu_2026-09-10.md) conserve les critères
d'acceptation complets. L'implémentation locale sépare les responsabilités :

| Fichier | Responsabilité |
|---|---|
| `.github/workflows/delivery.yml` dans chaque dépôt | Qualité, publication, connexion privée, résultat stable `delivery-result` et conservation des preuves |
| `infrastructure/delivery/plan.mjs` | Empreintes Git comparées à la dernière production vérifiée, reprise des changements après un échec |
| `infrastructure/delivery/ci.mjs` | Checkout exact, réutilisation ou build GHCR, manifeste candidat et invocation Ansible |
| `infrastructure/ansible/playbooks/delivery.yml` | Installation d'une révision exacte du déployeur dans un dossier privé par candidat |
| `infrastructure/delivery/release.py` | Verrous communs, compatibilité CMS, rollouts séquentiels, preuve des digests et du SHA servi, rollback et journal de releases |
| `infrastructure/delivery/recipe.mjs` | Recette CRUD/média uniquement en staging ; lecture des parcours publics en production |
| `infrastructure/delivery/staging-gateway.mjs` | Authentification du staging par cookie signé, relais sur deux origines internes fixes |
| `infrastructure/kubernetes/overlays/qualification/` | Manifests du staging isolé |
| `infrastructure/kubernetes/overlays/production/` | Manifests de la production dans son namespace historique |

Le workflow compare les entrées runtime, infrastructure et PostgreSQL. Les
Markdown narratifs, tests et workflows ne provoquent pas une nouvelle image
lorsque les entrées runtime sont identiques. Les CSV, scripts de migration et
chemins inconnus sont conservés dans le calcul runtime. Une évolution de
l'image PostgreSQL est refusée par la livraison automatique et exige un plan
séparé. Les validations de qualité s'exécutent même sans nouvelle image.
Un tag SHA existant n'est réutilisé qu'après lecture de sa configuration OCI
par digest et comparaison de `org.opencontainers.image.revision` au commit
attendu ; une révision absente ou différente bloque la livraison.

La réservation staging et les verrous d'activation s'appliquent côté serveur
aux deux dépôts. Avant chaque activation, le candidat doit toujours correspondre
au `main` courant de son dépôt. Le manifeste distingue `processedRevision`
(commit traité), `revision` (source de l'image), `image` (digest GHCR),
`fingerprints` et `deployerRevision`. Un push documentaire conserve le SHA de
l'image précédente. Les états `staging.json` et `production.json` avancent
uniquement après réussite de leur recette ; l'historique contient aussi les
échecs et retours arrière.

## Configuration portable et sondes

Le frontend reçoit `STRAPI_URL` pour les appels internes, `PUBLIC_STRAPI_URL`
pour les liens destinés au navigateur et `SITE_URL` pour ses URLs publiques.
Les anciennes variables `NEXT_PUBLIC_STRAPI_URL` et `NEXT_PUBLIC_SITE_URL`
restent un fallback serveur. Les pages lisent le CMS au runtime ; les données
ne sont pas intégrées à l'image par `generateStaticParams`. Les règles de
revalidation des fetchs existants restent en place. La liste des origines
acceptées par l'optimiseur Next reste une configuration de build explicite.

`/api/health` donne la version frontend et interdit le cache ; `/api/ready`
exige un jeton et un contenu global publié accessible dans Strapi. Le CMS
répond sur `/api/release` avec son SHA et vérifie une requête PostgreSQL avant
de renvoyer 200. Les échecs de dépendances produisent 503.

## Sauvegarde et retour arrière

Une modification d'image CMS en production commence par `pg_dump -Fc` et la
lecture de son index avec `pg_restore --list`. Le fichier privé est conservé
sur l'hôte ; la vérification de l'index n'est pas une preuve de restauration.
Le schéma automatique accepte les ajouts optionnels compatibles ; les
suppressions, changements de type et contraintes nouvelles sont refusés.
`DATABASE_FORCE_MIGRATION=false` conserve les tables et colonnes lors d'un
retour à un ancien CMS.

Le CMS sérialise `db.schema.sync()` par un verrou transactionnel PostgreSQL
commun à ses instances. Les anciens pods continuent à servir durant le
démarrage du nouveau ; le pool conserve au moins trois connexions, dont une
pour le verrou. La première activation garde le schéma courant, car l'image
historique ne possède pas ce verrou. La concurrence des démarrages et le
rollout sans interruption restent à qualifier avec les nouvelles images.

L'API interne `http://gthdf-cms:1337` est autorisée explicitement par les
NetworkPolicy : sortie des pods frontend et entrée des pods CMS du même
namespace, uniquement sur TCP 1337. Les URLs publiques restent distinctes.

Une recette échouée restaure les spécifications précédentes des ressources
concernées et revérifie les versions en service. Les namespaces, volumes et
StatefulSets ne sont pas réconciliés par une livraison applicative. Le retour
arrière ne réimporte pas une ancienne base et ne supprime pas les médias.
La première activation des tags historiques vers des digests vérifiés demande
une procédure de bootstrap spécifique ; le déployeur courant la refuse tant
que les références initiales manquent.

## Résultats locaux et incidents de préparation

Les suites complètes locales ont été exécutées sur Node 24 : tests frontend,
composants, tests CMS, lint frontend et builds Next/Strapi réussis. Les tests
ciblés couvrent aussi l’ordre qualification/promotion et le déclenchement du retour arrière,
les empreintes de build, le cookie de staging, le cache privé et les garde-fous
de peuplement. La syntaxe Python/YAML/Ansible, les liens locaux et
`git diff --check` sont contrôlés. Aucun test GitHub Actions, image GHCR ou
rollout applicatif de ces changements n'est encore déclaré réussi.

La première restauration partielle par stdin a laissé `kubectl` attendre après
la création du schéma vide. Le transfert a été arrêté, toutes les tables ont
été vérifiées vides, puis l'archive a été copiée dans un fichier avant la
restauration. `infra:staging:data` refuse de remplacer une base contenant des
lignes ; `gthdf_resume_empty_schema=true` autorise seulement la reprise d'un
schéma vide, après vérification. La copie utilise un fichier privé et une
limite temporaire de 100 Mio ; les archives de taille supérieure exigent un
espace de travail adapté.

Le premier chargement du script de peuplement a demandé l'entrée CommonJS de
Strapi. Le transfert média séquentiel a ensuite atteint la limite de 20 minutes.
La reprise utilise les checksums déposés avec les objets déjà copiés, quatre
workers et un compteur de progression ; elle a terminé les 29 objets restants.
La réécriture des URLs exclut les vues PostGIS. Ces opérations sont consignées
dans `/home/ubuntu/ops-journal.md`. La production a été vérifiée en HTTP 200/204,
avec les mêmes pods et compteurs de redémarrage qu'avant la préparation.

Les contrôles HTTP du déployeur utilisent le User-Agent `gthdf-delivery`. Un
contrôle avec le User-Agent Python par défaut a reçu 403 de Cloudflare alors
que les mêmes endpoints répondaient correctement avec le client du déployeur
et depuis le Mac.
