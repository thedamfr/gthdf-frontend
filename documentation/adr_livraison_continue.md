# ADR — Livraison par images immuables et staging GTHF

- Date : 2026-09-11
- Statut : décision retenue, implémentation et qualification en cours
- Dépôts : `gthdf-frontend`, `gthdf-cms`

## Contexte

La production fonctionne sur MicroK8s, dans le namespace historique
`gthdf-staging`. Ses tags locaux ne permettent pas de prouver le SHA source.
Les domaines staging pointent encore sur cette production. L'audit initial est
conservé dans le [snapshot du 10 septembre](history/deploiement_continu_2026-09-10.md).

## Décision

Chaque dépôt valide ses PR sur les runners GitHub hébergés. Après un push sur
`main`, il construit uniquement les entrées runtime modifiées depuis la dernière
livraison vérifiée, puis publie son image GHCR par SHA. Ansible transmet une
révision exacte du déployeur frontend à `penthouse` par SSH sur Tailscale.
MicroK8s utilise le digest, identique en staging et production, pour tous les
conteneurs d'une application, y compris l'init-container Next.

Le frontend lit ses URLs et son contenu au runtime. Son build ne nécessite ni
CMS ni jeton. Les sondes distinguent la version du processus et la disponibilité
des contenus. Le CMS expose une sonde de version qui vérifie PostgreSQL.

Le staging complet occupe `gthdf-qualification`, avec ses propres applications,
PostgreSQL, PVC, clés Strapi, jetons et compte d'administration de recette.
L'accès HTTPS passe par une passerelle authentifiée à cookie signé ; elle
préserve l'authentification Bearer de Strapi. Ses origines sont fixes.

Les médias staging vont dans `gthf-staging-media-bis`, région `gra` 1-AZ.
La production conserve `gthdf-staging-media`, région `eu-west-par` 3-AZ, afin de
préserver ses URLs. L'utilisateur a choisi un utilisateur S3 `gthf` limité au
produit GTHF et partagé entre ces deux buckets. Cette autorisation remplace la
préférence initiale pour deux identités S3 distinctes. Elle ne fournit pas une
barrière IAM entre staging et production : les scripts de recette doivent
borner explicitement leurs écritures au bucket staging.

La qualification puis la promotion partagent un verrou hôte entre les deux
dépôts. Une réservation temporisée protège les démonstrations sur staging.
Le manifeste de release conserve les deux composants, les empreintes d'entrées,
le SHA traité, le SHA de l'image et celui du déployeur. Un changement CMS
conserve la version frontend actuellement vérifiée.

Les rollouts utilisent `maxUnavailable: 0`, `maxSurge: 1`, des sondes de
disponibilité et un délai de drainage. Les évolutions CMS automatiques sont
limitées aux ajouts compatibles ; suppressions, conversions et contraintes
nouvelles exigent un plan séparé. Strapi ne supprime pas les structures
persistantes au retour arrière (`DATABASE_FORCE_MIGRATION=false`). PostgreSQL
reste hors du cycle de reconstruction applicatif.

Le démarrage CMS sérialise la synchronisation du schéma par un verrou
transactionnel PostgreSQL partagé entre instances. Le pool conserve au moins
trois connexions, dont une réservée au verrou. L'ancien pod continue à servir
durant cette synchronisation additive. La première activation conserve le
schéma courant puisque l'image historique n'a pas encore ce verrou ; la
qualification staging doit vérifier les démarrages concurrents avant promotion.

## Conséquences et retour arrière

Un échec de recette staging bloque la production. Un échec après activation
restaure les spécifications précédentes et vérifie leur version ; il ne restaure
jamais automatiquement une ancienne base par-dessus des écritures récentes.
Une sauvegarde PostgreSQL précède les modifications CMS en production.

L'absence de downtime doit être vérifiée lors de la première promotion : les
sondes seules ne prouvent pas les parcours fonctionnels. Les tags historiques
n'offrent pas les preuves de release nécessaires à l'automatisme ; une première
qualification explicite du couple d'images et l'enregistrement des deux états
initiaux restent indispensables avant son activation.

Les preuves d'exploitation, prérequis et étapes restant à qualifier sont dans
le [runbook de livraison](deploiement_continu.md).
