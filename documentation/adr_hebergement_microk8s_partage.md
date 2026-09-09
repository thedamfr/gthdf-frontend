# ADR — Hébergement GTHDF sur un cluster MicroK8s partagé

- Statut : recettes Hetzner et OVH validées ; DNS de production basculés
- Date : 2026-09-09
- Dépôts concernés : `gthdf-frontend`, `gthdf-cms`

## Contexte

Avant cette migration, GTHDF utilisait deux applications Clever Cloud, un
PostgreSQL et un stockage objet Cellar. Le coût devait être réduit en préparant
un hébergement sur le serveur OVH Gravelines partagé avec Podcast Studio. Le
déploiement prioritaire du studio a été achevé avant toute modification OVH
réalisée pour GTHDF.

Le VPS Hetzner accessible par `production@qg` a servi de première recette. Il fournit
déjà MicroK8s, Traefik, cert-manager, une StorageClass hostpath et les
ClusterIssuers Cloudflare. Ces composants sont une fondation partagée et ne
doivent pas être installés une seconde fois par GTHDF.

## Décision

Chaque application possède une image OCI indépendante : une image Strapi et
une image Next.js standalone. PostgreSQL 17 s'exécute dans un StatefulSet avec
un PVC. Les médias restent dans un stockage S3 externe : aucun MinIO n'est
installé sur le serveur.

Le conteneur Next.js conserve une racine en lecture seule. Les artefacts App
Router sont préchargés par un init-container dans un volume éphémère monté sur
leur seul répertoire d'écriture, afin que la régénération ISR reste compatible
avec ce durcissement.

La recette est strictement isolée dans `gthdf-staging` avec son ServiceAccount,
ses secrets, son PVC, ses NetworkPolicies, son ResourceQuota et son
LimitRange. Il réutilise uniquement l'IngressClass `public` et les API
cert-manager existantes ; le certificat est émis par un `Issuer` HTTP-01 limité
au namespace. Les hôtes sont
`staging.gthf.fr` et `staging-cms.gthf.fr`.

Le stockage cible est un bucket dédié `gthdf-staging-media` dans la région OVH
Paris `eu-west-par`. L'utilisateur a explicitement autorisé la réutilisation
temporaire des identifiants S3 du Studio dans le secret GTHDF. La promotion a
conservé ce bucket, ce secret, le namespace et les volumes recettés ; les clés
partagées devront être remplacées par des identifiants limités au seul bucket
GTHDF.

Ansible sépare trois responsabilités : auditer les prérequis partagés sans
mutation, appliquer l'overlay GTHDF déjà rendu, et configurer explicitement
l'observabilité globale sur OVH. Ce troisième playbook refuse les autres hôtes,
applique uniquement le Metrics Server livré avec MicroK8s et une identité
Kubernetes en lecture seule. Il ne gère ni le système, ni Traefik, ni
cert-manager, ni les workloads des autres namespaces. La cible OVH partagée est
identifiée par `game-prod-ovh-gra` dans un inventaire dédié qui ne contient
aucun autre serveur. Le 9 septembre 2026, l'utilisateur a autorisé la répétition
sur OVH après validation complète de Hetzner.

L'accès d'exploitation utilise K9s depuis le Mac avec un kubeconfig dédié. Le
ServiceAccount peut consulter les workloads, les nœuds et leurs métriques, mais
pas les Secrets ni les opérations d'écriture. L'API Kubernetes reste liée à la
boucle locale du serveur et n'est atteinte qu'au travers d'un tunnel SSH. Cette
supervision légère ne conserve pas d'historique ; le déploiement éventuel de
Prometheus et Grafana fera l'objet d'une décision séparée.

## Migration et retour arrière

Clever Cloud reste la source et la voie de retour arrière pendant toute la
recette. Une reprise copie un dump PostgreSQL cohérent et les objets Cellar vers
les ressources dédiées de staging ; elle ne déplace ni ne supprime la source.
Les nombres de lignes, objets et octets sont contrôlés avant les tests d'upload
et de lecture.

La bascule de production a été autorisée après la recette fonctionnelle sur OVH.
Elle promeut la charge de travail existante et conserve le namespace, le PVC et
le bucket déjà recettés. Un rollback remet les deux enregistrements Cloudflare
`gthf.fr` et `cms.gthf.fr` en CNAME proxifiés, TTL automatique, vers
`domain.par.clever-cloud.com` ; les données écrites après la bascule devront
alors être réconciliées explicitement.

La répétition OVH a restauré avec succès le dump logique dans le namespace
`gthdf-staging` et validé directement les trois origins le 9 septembre 2026.
Les DNS de staging ont ensuite été dirigés vers OVH : le certificat est prêt et
la recette publique confirme le frontend, le CMS, la base restaurée et les
médias existants. Les 2 766 objets Cellar ont été copiés sans suppression de la
source et les 2 209 références média de la base pointent désormais vers OVH
Paris. Le 9 septembre 2026, les deux CNAME de production ont été remplacés par
des enregistrements A proxifiés, TTL automatique, vers `141.94.98.109`. Les
Ingress de production n'appliquent pas le middleware `staging-noindex` et leur
certificat Let's Encrypt séparé est prêt. Les hôtes de staging restent actifs
comme voie de recette de la même charge.

## Conséquences

- le loyer du serveur peut remplacer les runtimes, PostgreSQL et build workers
  Clever, mais l'exploitation, les sauvegardes et la supervision deviennent à
  notre charge ;
- le stockage objet externe évite de consommer le disque local et sépare les
  données des deux produits ;
- le serveur Hetzner conserve la première recette reproductible, tandis que la
  charge active s'exécute sur OVH dans `gthdf-staging` ;
- le PVC hostpath est lié au nœud : sa sauvegarde externe est obligatoire avant
  toute production ;
- les identifiants S3 partagés avec le Studio restent une dette post-bascule :
  ils doivent être remplacés par des identifiants limités au bucket GTHDF ;
- Metrics Server ajoute une visibilité immédiate pour un coût observé d'environ
  2 mCPU et 22 Mio de RAM, sans assurer l'historisation ni l'alerting.
