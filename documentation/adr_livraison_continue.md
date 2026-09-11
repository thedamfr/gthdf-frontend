# ADR — Livraison par images immuables et staging GTHF

- Date : 2026-09-11
- Statut : décision retenue ; transport corrigé vers une réconciliation locale
- Dépôts : `gthdf-frontend`, `gthdf-cms`

## Contexte

La production fonctionne sur MicroK8s, dans le namespace historique
`gthdf-staging`. Ses tags locaux ne permettent pas de prouver le SHA source.
Les domaines staging pointent encore sur cette production. L'audit initial est
conservé dans le [snapshot du 10 septembre](history/deploiement_continu_2026-09-10.md).

## Décision

Chaque dépôt valide ses PR sur les runners GitHub hébergés. Après un push sur
`main`, il construit uniquement les entrées runtime modifiées depuis la dernière
publication validée, puis publie son image GHCR par SHA et son candidat dans
la branche `gthdf-release` du même dépôt. Un service local sur Penthouse lit
ces candidats publics et vérifie la réussite du workflow exact de `main` avant
activation. Les runners ne reçoivent aucun accès SSH ou Tailscale au serveur.

Cette décision corrige le transport initial après clarification du propriétaire.
Le service actif de `site-saletesincere` fournit la référence opérationnelle.
ArgoCD est installé pour Studio, mais son intégration est encore en PR et sa
synchronisation désactivée au relevé du 11 septembre : GTHF reprend le service
local du site. Cette mise en œuvre ne crée pas d’Application ArgoCD GTHF.

Le service partage le verrou GTHF et exécute uniquement le déployeur frontend
exact associé au candidat, après réussite de sa propre CI. Les sources viennent
des deux dépôts publics autorisés ; elles sont vérifiées par empreinte Git et
extraites avec bornes de taille et refus des liens. Le serveur ne construit
pas d’image. Il recalcule les changements cumulés depuis la production vérifiée,
indépendamment du plan de build de GitHub. Une image déjà construite pour A peut
ainsi être livrée après un commit documentaire B si leurs sources runtime sont
équivalentes. Les changements PostgreSQL restent hors de la voie automatique.
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
le SHA traité, le SHA de l'image et celui du déployeur. Chaque candidat est
associé au composant inchangé de la dernière production vérifiée, y compris
lors de sa qualification staging : le couple testé est celui qui sera promu.
Une démonstration staging en cours reste protégée par sa réservation.
Une nouvelle image doit identifier le SHA traité ; une image réutilisée conserve
le SHA et l'empreinte runtime de la production vérifiée. Le serveur contrôle
aussi le label OCI immuable avant d'accepter la preuve de version applicative.

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
