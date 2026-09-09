# Infrastructure GTHDF autohébergée

Ce dossier a servi à déployer GTHDF d'abord sur le VPS Hetzner de recette, puis
sur le serveur OVH Gravelines. Les deux cibles utilisent le même namespace isolé
`gthdf-staging`. Après validation OVH, les DNS de production ont été basculés
vers Gravelines ; Clever reste provisoirement la voie de retour arrière.

## Périmètre

- `ansible/playbooks/audit.yml` vérifie sans mutation le disque, MicroK8s,
  l'IngressClass, les API cert-manager et la StorageClass ;
- `ansible/playbooks/deploy.yml` applique uniquement `gthdf-staging` et masque
  toutes les opérations portant sur les secrets ; il redémarre les runtimes
  uniquement lorsqu'un secret ou l'overlay a réellement changé ;
- `ansible/playbooks/observability.yml` active Metrics Server sur le seul hôte
  OVH et génère un accès K9s techniquement limité à la lecture ;
- `kubernetes/base/` décrit Next.js, Strapi, PostgreSQL 17 avec PostGIS, le PVC,
  les quotas et les politiques réseau ;
- `kubernetes/overlays/staging/` ajoute les DNS, le certificat, Traefik et la
  configuration du bucket OVH Paris dédié.

Le certificat est émis par un `Issuer` Let's Encrypt HTTP-01 limité au namespace
`gthdf-staging`. Il n'utilise ni ne modifie le `ClusterIssuer` Cloudflare de
Podcast Studio. Le minimum CPU du `LimitRange` reste à 10 mCPU afin d'autoriser
les pods solveurs HTTP-01 créés par cert-manager. Une politique réseau dédiée
ouvre uniquement leur port éphémère 8089 pendant la validation ACME.

La plateforme partagée — MicroK8s, ingress et cert-manager — reste administrée
hors de ce dépôt, à l'exception explicite de Metrics Server et du compte
d'observation en lecture seule. Le namespace `podcast-studio` reste hors du
périmètre de déploiement GTHDF.
Le frontend force son port d'écoute à 3000 afin de ne pas hériter du port 1337
de Strapi depuis le `ConfigMap` partagé par les deux applications.
Son système de fichiers racine reste en lecture seule. Un init-container copie
les artefacts App Router dans un `emptyDir` monté uniquement sur
`/app/.next/server/app`, ce qui autorise les écritures du cache ISR sans rendre
le reste de l'image modifiable.

## Prérequis de staging

Lors de la première recette, deux enregistrements DNS ont pointé vers le VPS
Hetzner :

- `staging.gthf.fr` ;
- `staging-cms.gthf.fr`.

Créer aussi le bucket `gthdf-staging-media` dans OVH Object Storage Paris
(`eu-west-par`). Pour la répétition et la promotion du 9 septembre 2026,
l'utilisateur a explicitement autorisé la réutilisation temporaire du couple de
clés S3 du Studio dans le secret GTHDF ; le bucket reste distinct. Ces clés
doivent encore être remplacées par des identifiants limités au seul bucket
GTHDF.

Installer Ansible dans un environnement virtuel local, puis lancer l'audit :

```bash
cd infrastructure/ansible
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/ansible-playbook \
  -i inventories/staging/hosts.yml \
  playbooks/audit.yml
```

Après validation sur Hetzner, auditer OVH avec l'inventaire dédié :

```bash
cd infrastructure/ansible
.venv/bin/ansible-playbook \
  -i inventories/ovh/hosts.yml \
  playbooks/audit.yml
```

Cet inventaire cible uniquement `production@game-prod-ovh-gra`. Le playbook ne
configure pas Ubuntu, MicroK8s, Traefik ou cert-manager et ne peut appliquer que
le namespace `gthdf-staging`.

L'audit exige au moins 6 Gio libres. Un échec sur ce seuil interdit un build ou
un rollout supplémentaire tant qu'un nettoyage explicitement relu n'a pas été
effectué.

## Images

Les images sont construites séparément depuis la racine de chaque dépôt :

```bash
docker build \
  -t gthdf-postgres:staging \
  infrastructure/docker/postgres
docker build -t gthdf-cms:staging .
docker build \
  --secret id=strapi_api_token,env=STRAPI_API_TOKEN \
  --build-arg NEXT_PUBLIC_STRAPI_URL=https://staging-cms.gthf.fr \
  --build-arg NEXT_PUBLIC_SITE_URL=https://staging.gthf.fr \
  --build-arg NEXT_IMAGE_REMOTE_ORIGINS=https://s3.eu-west-par.io.cloud.ovh.net \
  -t gthdf-frontend:staging .
```

Le jeton est lu depuis l'environnement du client Docker et monté uniquement
pendant `next build` avec BuildKit. Ne pas le passer comme `ARG`, car une valeur
de build peut rester dans les métadonnées ou les couches de l'image.

Pour reproduire le build de staging en récupérant le jeton via `clever-cli` et
en le supprimant automatiquement du VPS après usage :

```bash
npm run infra:staging:build-frontend
```

Lors de la promotion de cette charge de travail, construire le frontend avec les
URLs publiques de production et le tag correspondant :

```bash
npm run infra:production:build-frontend
```

L'overlay conserve les deux Ingress de staging avec leur en-tête `noindex`, et
ajoute deux Ingress de production sans cet en-tête. Le certificat de production
est séparé du certificat de staging afin que celui-ci reste valide pendant la
bascule DNS. Le retour arrière consiste à restaurer les anciennes cibles DNS ;
les Ingress de staging continuent alors à servir la même base et le même bucket.

Pour un MicroK8s sans registry, exporter chaque image avec `docker save`, la
copier sur le VPS, puis la charger sur tous les nœuds en passant impérativement
l'archive sur l'entrée standard : `microk8s images import < image.tar`.
Passer le chemin comme argument ne charge pas l'image. L'overlay utilise
volontairement `imagePullPolicy: Never` afin d'éviter un pull implicite d'une
image différente.

## Secrets et rendu

Copier `kubernetes/overlays/staging/secrets.example.env` hors du dépôt sous
`/home/production/gthdf-staging-prep/secrets.env`, renseigner les valeurs sans
les journaliser, puis appliquer le mode `0600`. Le secret Kubernetes reste
propre à GTHDF et le bucket est dédié. Les clés S3 partagées temporairement avec
le Studio sont injectées uniquement dans ce fichier privé ; aucune de leurs
valeurs ne doit apparaître dans le dépôt.

Avant déploiement :

```bash
microk8s kubectl kustomize \
  /home/production/gthdf-staging-prep/frontend/infrastructure/kubernetes/overlays/staging
```

Le rendu ne doit contenir que le namespace `gthdf-staging`. Le déploiement
idempotent est ensuite lancé depuis `infrastructure/ansible` :

```bash
.venv/bin/ansible-playbook \
  -i inventories/staging/hosts.yml \
  playbooks/deploy.yml
```

Sur OVH, remplacer seulement l'inventaire :

```bash
.venv/bin/ansible-playbook \
  -i inventories/ovh/hosts.yml \
  playbooks/deploy.yml
```

## Observabilité légère du VPS OVH

Le playbook global d'observabilité est volontairement séparé du déploiement
`gthdf-staging`. Il refuse tout inventaire autre que
`production@game-prod-ovh-gra`, vérifie le prérequis d'authentification du
kubelet, puis applique le manifeste Metrics Server livré par la version de
MicroK8s installée sur le serveur :

```bash
cd infrastructure/ansible
.venv/bin/ansible-playbook \
  -i inventories/ovh/hosts.yml \
  playbooks/observability.yml
```

Le ServiceAccount `vps-observer`, dans `vps-observability`, peut lire les
workloads, les nœuds et `metrics.k8s.io` sur le cluster. Il ne peut ni lire les
Secrets, ni créer ou modifier un pod. Le kubeconfig produit sur le serveur est
copié sur le Mac en mode `0600` :

```bash
mkdir -p ~/.kube
scp production@game-prod-ovh-gra:/home/production/gthdf-staging-prep/k9s-readonly.kubeconfig \
  ~/.kube/gthdf-ovh-readonly.yaml
chmod 0600 ~/.kube/gthdf-ovh-readonly.yaml
```

K9s se lance depuis le dépôt avec :

```bash
npm run infra:ovh:k9s
```

Le lanceur ouvre tous les namespaces, ajoute `--readonly` et établit
automatiquement un tunnel SSH vers l'API Kubernetes liée à
`127.0.0.1:16443`. Aucun port d'administration n'est exposé publiquement.
`kubectl top` et Metrics Server montrent la
consommation récente ; ils ne conservent pas d'historique. Prometheus, Grafana
et le Dashboard Kubernetes ne sont pas installés à ce stade.

Lors de l'installation du 9 septembre 2026, le nœud consommait environ 150 à
175 mCPU et 3,2 Gio de RAM. GTHDF au repos représentait environ 8 mCPU et
617 Mio ; Metrics Server ajoutait environ 2 mCPU et 22 Mio.

## Recette et reprise de données

L'ordre de recette est : PostgreSQL, Strapi, puis Next.js. Contrôler les trois
rollouts, `/_health`, `/api/health`, le certificat, l'en-tête `X-Robots-Tag`,
l'administration, une lecture de média et enfin un upload de test.

La reprise de production doit rester non destructive : dump PostgreSQL depuis
Clever, restauration dans `gthdf-staging`, puis copie des objets Cellar vers le
bucket OVH dédié. Ne jamais lancer les scripts de migration applicative avant
la comparaison des versions de schéma et une sauvegarde nommée. La mesure de
référence du 9 septembre 2026 est d'environ 53 Mo pour PostgreSQL et 386 Mo pour
2 766 objets ; elle devra être recalculée au moment de la répétition.

Le dump de référence nécessite les extensions PostGIS et pgvector. L'image de
base de données est donc construite sur PostgreSQL 17 + PostGIS 3.6 avec le
commit de pgvector 0.8.6 épinglé.

Le dump complet, compressé au format custom et créé en mode `0600`, se produit
sans afficher les identifiants Clever :

```bash
npm run infra:staging:dump-postgres
```

En cas d'échec après la bascule, restaurer d'abord les deux CNAME Clever décrits
plus bas, puis conserver le PVC et le bucket pour diagnostic et arrêter les
trois workloads GTHDF si nécessaire. Ne supprimer ni namespace, ni volume, ni
objet pendant l'analyse.

### Répétition OVH du 9 septembre 2026

La recette Hetzner a été répétée sur `production@game-prod-ovh-gra` après
autorisation explicite. L'audit a validé Ubuntu 26.04, MicroK8s, l'IngressClass
`public`, cert-manager, la StorageClass et environ 838 Go libres. Les trois
images ont été importées dans MicroK8s sans installer Docker sur le nœud.

Le dump Clever a été restauré avec 117 tables publiques, 2 209 lignes dans
`files`, PostGIS 3.6.4 et pgvector 0.8.6. Les recettes directes de l'origin OVH
retournent 200 pour le frontend et sa route de santé, et 204 pour Strapi. Un
second passage Ansible termine avec `changed=0`.

Les deux DNS de staging ont ensuite été basculés vers l'origin OVH
`141.94.98.109`. Le certificat `gthdf-staging-tls` est `Ready=True` et la
recette publique valide le frontend, Strapi, le contenu restauré, un GPX et une
image. Le cache ISR a été sollicité sur l'origin après ajout de son volume
écrivable dédié, sans nouvelle erreur de système de fichiers en lecture seule.
Aucun DNS de production n'a été modifié dans cette étape.

Le bucket privé `gthdf-staging-media` a été créé dans `eu-west-par`. Les 2 766
objets Cellar, soit 385 707 923 octets, y ont été copiés avec une lecture
publique objet par objet ; la source Clever n'a pas été supprimée. La base de
staging référence désormais l'origine virtual-host OVH dans les 2 209 lignes
`files` et leurs 131 ensembles de formats imbriqués. La recette finale confirme
zéro URL Cellar dans l'API et le HTML public.

### Promotion DNS du 9 septembre 2026

Après la recette utilisateur, `gthf.fr` et `cms.gthf.fr` ont été promus sur
l'origin OVH `141.94.98.109`. Dans Cloudflare, leurs CNAME proxifiés vers
`domain.par.clever-cloud.com` ont été remplacés par des enregistrements A
proxifiés en conservant le TTL automatique. Le certificat
`gthdf-production-tls` est séparé du certificat de staging et est `Ready=True`.
Les Ingress de production ne portent pas le middleware `staging-noindex`.

Le rollback DNS exact consiste à recréer pour ces deux noms les CNAME proxifiés
vers `domain.par.clever-cloud.com`, TTL automatique. Ne modifier ni les
enregistrements MX/TXT, ni `staging.gthf.fr`, ni `staging-cms.gthf.fr`.

Le frontend a été reconstruit à Nuremberg avec
`npm run infra:production:build-frontend`. Le jeton Strapi a été monté comme
secret BuildKit temporaire puis supprimé ; l'image a été transférée directement
vers MicroK8s sans archive sur le Mac. L'image `gthdf-frontend:production` est
exécutée sur OVH. La recette publique confirme les mentions légales OVH, un
`robots.txt` pointant vers `https://gthf.fr/sitemap.xml` et 252 URLs de
production dans le sitemap, tandis que staging conserve son en-tête `noindex`.
