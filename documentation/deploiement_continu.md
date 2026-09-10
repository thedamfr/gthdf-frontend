# Livraison continue GTHF sur OVH

Date de l'audit : 10 septembre 2026. Statut : **constat vérifié et évolution à
implémenter**. Ce document ne crée aucun workflow et n'active aucun déploiement.
Il est la référence GTHF commune au frontend et au CMS ; les conventions de
plateforme sont portées par `infra-sincere`.

## Objectif de livraison

Chaque push sur `main`, y compris après fusion d'une PR, doit produire un
résultat observable : validation, sélection des composants, livraison et
vérification de production, ou échec explicite. On doit pouvoir relier le
commit traité, les images effectivement démarrées et la recette applicative.
La recette préalable se déroule sur un **staging complet et isolé** ; des
agents qui travaillent en parallèle peuvent y montrer une version identifiable,
avec une coordination explicite pour ne pas écraser la démonstration d'un
autre travail.
Un changement de documentation seul ne justifie pas une nouvelle image ou un
redémarrage si les entrées runtime sont prouvées inchangées ; son résultat
reste enregistré comme « aucun changement runtime ». Cette frontière doit être
rendue explicite dans les Dockerfile et les filtres, notamment pour le CMS.

La garantie visée est que la dernière version validée de `main` converge vers
la production. Si un build, un contrat CMS ou une recette échoue, conserver la
version précédente et rendre le décalage visible. Ne pas annoncer une version
en ligne sur la seule base d'un push, d'un import ou d'un HTTP 200.

## État actuel vérifié

| Élément | État au 10 septembre 2026 | Conséquence |
|---|---|---|
| Cible | `game-prod-ovh-gra`, contexte `microk8s`, namespace `gthdf-staging` | Le namespace héberge la production ; les domaines staging partagent ses données |
| Frontend | Deployment `gthdf-frontend`, image `gthdf-frontend:production`, prêt | Tag mutable sans preuve directe du SHA Git |
| CMS | Deployment `gthdf-cms`, image `gthdf-cms:staging`, prêt | Le nom staging est historique |
| Base | StatefulSet `gthdf-postgres`, image `gthdf-postgres:staging`, prêt | PostgreSQL n'est pas à reconstruire pour chaque changement applicatif |
| Workflows | Aucun `.github/workflows` dans les deux dépôts audités | Aucune CD OVH versionnée ne relie un push `main` aux images en ligne |
| Ansible | `infrastructure/ansible/playbooks/deploy.yml` applique `kubectl apply -k` sur un overlay déjà présent sur la cible | Ni checkout, ni build, ni import d'image ; les attentes de rollout suivent l'application de l'ensemble |
| Activation | Les conteneurs principaux utilisent `imagePullPolicy: Never` ; le playbook redémarre CMS et frontend quand le Secret ou l'overlay change | Un nouvel import avec le même tag peut laisser les pods existants en place ; une modification limitée peut redémarrer les deux applications |
| Builder frontend historique | `build-staging-frontend.mjs` lit un jeton Clever, utilise `qg-codex` et un contexte distant daté | Il ne synchronise pas le checkout et n'active pas l'image sur OVH |
| Santé frontend | `app/api/health/route.ts` renvoie `{ "status": "ok" }` | Ne prouve ni le SHA, ni la disponibilité du contenu Strapi/PostgreSQL |

L'init-container frontend `seed-next-app-cache` conserve `IfNotPresent` dans
les manifests, alors que l'overlay force `Never` sur le conteneur principal.
L'import doit donc rendre la même image disponible pour les deux ; la future
activation devra vérifier ces deux références et expliciter leur politique.

Les fichiers contrôlés sont les deux `Dockerfile`, les deux `package.json`, le
script de build frontend, le playbook, l'overlay et les manifests applicatifs.
L'état des workloads a été vérifié sur le cluster le 10 septembre. Les têtes
`main` distantes observées à cette date sont
`7f98fd511bb5e9ef07da536ea25faf3514f1a605` pour le frontend et
`ddd62ab5de379bd91007073d39f9d56a0fd6689a` pour le CMS. Ce sont des références
source, **pas des SHA prouvés en production**. Aucun SHA source fiable n'a été
établi à partir des tags actuels. L'absence de workflows
versionnés ne prouve pas l'absence d'un éventuel automatisme externe non audité.

## Staging complet et isolé à construire

Le partage constaté entre les domaines staging et production est un **écart à
corriger**, pas une recette suffisante. Tant que cet écart subsiste, aucune
création, modification, publication, suppression ou migration de test ne doit
cibler `staging.gthf.fr` ou `staging-cms.gthf.fr`. Le namespace historique
`gthdf-staging` reste identifié comme production : le renommer ou repointer
ses domaines ne crée pas une copie indépendante.

Le staging GTHF doit faire fonctionner le produit complet, avec les mêmes
versions de PostgreSQL et de ses extensions, le vrai CMS, le frontend, les
contrats API, les fonctionnalités et les protections nécessaires au parcours
utilisateur. Les données peuvent être un jeu de recette contrôlé ; remplacer
Strapi, la base, l'upload ou une fonction métier par une réponse factice ne
constitue pas un staging complet. Dimensionner moins largement les réplicas
et la rétention est possible si les comportements testés restent identiques.

| Ressource | Isolation attendue pour le staging GTHF |
|---|---|
| Workloads | Frontend et CMS dédiés, avec leur PostgreSQL dédié dans un namespace distinct de la production |
| Données | Base, rôles PostgreSQL, PVC et caches propres ; aucun montage du volume ou connexion à la base de production |
| Médias | Espace objet dédié, de préférence un bucket distinct, avec identité et droits limités à cet espace ; aucun droit d'écriture dans les médias de production |
| Configuration | ConfigMaps, Secrets, clés Strapi, comptes de recette et jetons dédiés ; URL frontend, CMS, média, CORS et preview cohérents dans l'environnement |
| Accès | Routage et accès de recette propres, conservant TLS et authentification ; NetworkPolicies interdisant l'accès non nécessaire aux ressources de production |
| Capacité | Quotas et limites par environnement, budget disque et nombre maximal d'instances pour préserver la production sur le mono-nœud |

La base retenue est **un staging complet par projet**, ici pour l'ensemble
frontend/CMS GTHF. Les agents qui développent en parallèle gardent des checkouts
isolés, puis coordonnent l'utilisation de ce staging partagé : réserver la
séquence déploiement/recette/démonstration, enregistrer l'agent ou la tâche qui
l'utilise et les versions précises du couple frontend/CMS, puis libérer la
réservation. Un autre agent ou workflow attend avant de remplacer une version
en cours de démonstration. Le verrou d'activation empêche les mutations
simultanées ; la réservation couvre aussi le temps de revue du résultat.
Une seule application peut être modifiée, mais le staging contient toujours
le reste du produit. Des instances supplémentaires par branche/PR peuvent
être étudiées ensuite selon les ressources et les besoins ; elles ne font
pas partie du minimum demandé et aucun déploiement automatique par PR n'est
introduit par ce plan.

Le peuplement utilise des seeds relus ou une copie ponctuelle maîtrisée et
éventuellement anonymisée de données et médias autorisés. L'import a pour
cible exclusive le staging, avec URLs média réécrites et vérifiées ; aucun
secret d'accès production ne reste dans les workloads ou les jobs de recette.
La production n'est jamais une base à utiliser en écriture pour compléter un
jeu de test. Les tâches sortantes utilisent des destinations de recette
fonctionnelles si nécessaire. Nettoyer les données de test appartient à
l'environnement qui les a créées ; une suppression d'instance et de volumes
suit une politique explicite, jamais un nettoyage global ou supposé autorisé.

La recette complète couvre connexion à l'administration, création et édition
d'un brouillon, publication, consultation dans Next.js, preview protégée,
upload puis lecture du média et suppression des seuls objets de recette.
Compléter par les parcours GTHF pertinents : chapitre, ville, catalogue et GPX
avec un jeu de données qualifié. Vérifier leur persistance après redémarrage
contrôlé des workloads de staging. Avant ces écritures, prouver l'isolation
des connexions PostgreSQL, des PVC, des identités et des destinations média ;
contrôler que les mêmes références en production n'ont pas été touchées.
`/_health`, `/api/health` et les pods Ready ne remplacent pas cette recette.

Un staging n'est déclaré disponible que lorsque l'URL de démonstration, ses
conditions d'accès, ses versions, les résultats fonctionnels et les limites
éventuelles sont fournis. La parité fonctionnelle doit permettre au
propriétaire de juger le changement réellement utilisable.

## Répartition des responsabilités

Conserver Ansible comme point d'entrée et Kustomize pour les manifests. Helm
n'est requis ni par le déploiement continu, ni par les builds sélectifs.

La sélection des composants, les tests et les builds normaux s'exécutent sur
des **runners hébergés par GitHub Actions**. Chaque dépôt construit sa propre
image au SHA exact de l'événement, la publie sur **GHCR** avec un tag SHA non
réaffecté et conserve son digest. Le workflow utilise cet artefact précis pour
la qualification puis la promotion. Penthouse reçoit et active les images ; il ne construit pas les applications
dans le chemin normal de livraison. Après CI verte sur `main`, le workflow
qualifie d'abord les versions candidates sur un staging complet, puis active
automatiquement les artefacts qualifiés en production et vérifie le résultat.
Une version déployée sur staging pour une démonstration d'agent ne vaut pas
promotion en production. La qualification automatique de `main` respecte la
réservation en cours du staging partagé.

Les manifests GTHF restent pour l'instant dans le frontend, leur emplacement
actuel. `infra-sincere` porte la configuration de l'hôte, de l'accès privé et
les conventions partagées ; une future extraction des playbooks communs doit conserver un seul propriétaire par
ressource. Une livraison CMS doit appeler une révision précise du déployeur
GTHF sans relivrer implicitement le frontend ou PostgreSQL.

Le déploiement devra adapter les politiques `imagePullPolicy: Never` actuelles
pour permettre le téléchargement des références GHCR par digest, y compris
pour l'init-container Next. L'accès au registre reste privé et limité aux
images nécessaires ; sa configuration et la conservation des digests de retour
arrière doivent être versionnées sans identifiants. Les permissions de
publication du workflow et de lecture du cluster sont distinctes, conformément
au [fonctionnement de GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

Le builder Docker local disponible sur OVH via `sudo -n docker` est réservé
à un **secours explicitement autorisé**. Son build GTHF complet reste à valider.
Ce secours doit partir d'un checkout isolé par SHA sous `/home/ubuntu/source`,
transférer explicitement l'image dans le stockage MicroK8s distinct et produire
les mêmes preuves de version et de recette. Il ne constitue pas une seconde
voie automatique concurrente de GitHub Actions.

Le déployeur vérifie `hostname`, le contexte Kubernetes et le namespace avant
toute mutation. Le code provenant d'une PR non fusionnée ne reçoit pas les
secrets de production ni un accès au builder privilégié de l'hôte. Les tests
et builds de PR utilisent des données et services de recette isolés. Si le
build Next de production requiert encore un accès au contenu publié, il reçoit
seulement un jeton de lecture dédié ; les stagings et leurs tests utilisent
exclusivement leurs propres services et jetons.
Les secrets runtime restent hors Git ; le build Next utilise le secret BuildKit
`strapi_api_token`, provenant d'une source privée autorisée indépendante de
Clever. Aucun jeton ne doit apparaître dans les journaux, arguments de build,
images ou rapports de release.

## Sélection des builds

Le plan doit comparer la cible à la **dernière livraison réussie et vérifiée**
de chaque dépôt/composant **dans l'environnement ciblé**, pas seulement à
`HEAD~1` ou au commit précédant le push. Les références de staging et de
production sont distinctes ; un succès de preview ne fait pas avancer l'état
de production. Cela reprend les modifications manquées après un échec, une
annulation ou plusieurs commits groupés. Si la référence manque, si l'historique ne permet
pas la comparaison ou si un chemin est inconnu, reconstruire prudemment les
composants concernés. Conserver un index des empreintes d'entrées et des images
déjà validées pour pouvoir les réutiliser.

| Changement | Travail recommandé |
|---|---|
| Frontend `app/`, `components/`, `lib/`, `public/`, configuration Next/TypeScript/CSS, dépendances, Dockerfile ou `.dockerignore` | Tests appropriés, build et rollout frontend seul |
| CMS `src/`, `config/`, dépendances, Dockerfile, fichiers utilisés par le runtime | Tests CMS, contrôle du contrat, build et rollout CMS seul si compatible avec le frontend actif |
| Contrat public CMS modifié | Vérifier la compatibilité et la dépendance du frontend ; livrer le CMS additif avant le frontend dépendant |
| `infrastructure/docker/postgres/` | Plan séparé de l'image PostgreSQL, compatibilité des extensions et sauvegarde ; aucune montée majeure implicite |
| Manifest, ConfigMap, sonde ou playbook | Rendu/diff et activation des seules ressources concernées ; pas de rebuild d'image sauf entrée de build modifiée |
| Tests ou CI seulement | Validations concernées ; aucune reconstruction runtime si ses entrées sont inchangées |
| Documentation narrative seulement | Contrôles documentaires et résultat sans changement runtime si les entrées runtime sont prouvées inchangées |
| CSV de référence, données de catalogue, script de migration ou fichier ambigu | Classer selon son consommateur et sa portée ; ne pas l'ignorer parce qu'il vit dans `documentation/` ou `docs/` |

Les `Dockerfile` doivent rendre ces frontières explicites : notamment le CMS
copie aujourd'hui tout le contexte dans son image runtime. La réduction du
contexte et les filtres CI devront être revus ensemble, sans exclure un fichier
nécessaire à une migration ou au fonctionnement applicatif.

Le workflow démarre sur chaque push `main` et chaque PR. Une PR valide le code
sans publication ni activation de production ; aucun staging éphémère par PR
n'est imposé. La publication des releases de production sur GHCR et leur
promotion automatique restent réservées au push `main` validé, après qualification sur le staging
complet. Montrer une version candidate sur ce staging relève d'un déploiement
de recette coordonné et traçable avec des artefacts construits par GitHub
Actions, sans donner aux contributions non fiables des secrets ou droits de
production. Un job de sélection produit les décisions ; les jobs inutiles sont sautés. Un statut final stable
s'exécute même quand une dépendance est `skipped`, accepte uniquement les skips
prévus par le plan et échoue si un job nécessaire a échoué ou a été annulé.
Ne pas imposer comme statut de fusion un workflow entièrement absent à cause
d'un filtre de chemins. Les comportements de `paths`, `needs` et `if` sont
décrits dans la [syntaxe GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

## Ordre des versions et changements simultanés

Les validations et builds devenus inutiles peuvent être annulés. La section
qui active les images est sérialisée et ne doit pas être interrompue au milieu
d'un rollout ou d'une migration. Juste avant l'activation, sous le verrou,
vérifier que la cible reste la tête attendue de `main` ; un build ancien arrivé
en retard ne doit pas remplacer une version plus récente. Un échec du dernier
commit est signalé et conserve la dernière production saine.

Une clé `concurrency` GitHub ne coordonne que son dépôt : les dépôts CMS et
frontend doivent partager un verrou côté déployeur **par environnement GTHF**,
en complément de la [concurrence GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
Le verrou de production est distinct du verrou de staging. Les agents
coordonnent la version du staging partagé et sa réservation de démonstration,
en plus du verrou qui protège son activation.
Un changement CMS vérifie la version de frontend effectivement active sous ce
verrou ; il ne doit pas écraser sa référence avec celle d'un overlay ancien.
Si `main` avance pendant une activation, terminer proprement l'opération et
laisser la cible plus récente être réconciliée ensuite.

Utiliser une référence d'image immuable et conserver son digest, le SHA source,
le SHA du déployeur et les versions du couple CMS/frontend. Mettre à jour le
runtime et l'init-container de cache Next avec **la même image**. Un tag réutilisé
ne constitue pas une preuve ; les [références par digest Kubernetes](https://kubernetes.io/docs/concepts/containers/images/)
permettent d'identifier le contenu précisément. Si des tags uniques sont
importés localement, en interdire la réaffectation et vérifier les `imageID`
réellement exécutés.

Le rapport distingue le SHA `main` traité de chaque SHA d'image : après un push
sans modification runtime, l'image précédente reste correctement en ligne.
Ne pas réétiqueter artificiellement chaque composant avec le dernier SHA si son
image n'a pas été reconstruite. Une modification infra conserve également les
versions applicatives approuvées qui ne sont pas concernées.

## Promotion des images qualifiées

La cible est de construire une fois sur GitHub Actions, qualifier l'image dans
le staging puis promouvoir **le même digest** lorsque la configuration est
portable au runtime. Le manifeste de release conserve les digests du CMS et du
frontend, les révisions de configuration par environnement et les migrations
requises. Les secrets, contenus de recette, volumes et bases ne sont jamais
promus avec l'image. Les composants non modifiés réutilisent un digest validé.

Cette portabilité n'est pas démontrée aujourd'hui pour le frontend : son
Dockerfile fournit `NEXT_PUBLIC_STRAPI_URL`, `NEXT_PUBLIC_SITE_URL` et les
origines média au build ; `generateStaticParams` lit aussi du contenu CMS.
Remplacer seulement un Secret ou un ConfigMap après le build peut donc laisser
des URLs ou contenus de recette dans l'artefact. Il faudra rendre la
configuration et les accès aux données indépendants de l'environnement au
build, puis tester réellement le même digest dans les deux contextes.

Tant que cette adaptation n'est pas faite, documenter explicitement des images
staging/production différentes, produites du même SHA par GitHub Actions avec
leurs entrées propres ; qualifier également l'artefact candidat production
dans un environnement isolé et adapté avant son activation. Ne pas présenter
la recette d'une image staging comme la preuve d'un autre digest. Pour le CMS,
les secrets sont déjà fournis au runtime, mais la portabilité de l'administration
Strapi et de ses URLs doit aussi être vérifiée avant de promettre une promotion
identique. Une impossibilité de qualification bloque la promotion et reste
visible dans le rapport.

## Dépendance du frontend au CMS et migrations

Le build Next.js reçoit l'URL CMS et un jeton ; plusieurs pages utilisent
`generateStaticParams`. Une partie des contenus est donc lue au build. Au
runtime, `lib/strapi.ts` et les routes utilisent des durées de revalidation
différentes. Un SHA frontend seul ne décrit pas tous les contenus vus par les
visiteurs, et une publication éditoriale ne produit pas de push Git.

Avant un build frontend, vérifier le CMS attendu et son contrat public. Garder
sa version dans la provenance du build et une référence non sensible du jeu de
données ou de l'instant de recette ; une reproduction byte pour byte ne peut
pas être promise tant que le build lit une base éditoriale mutable. Une
publication ordinaire utilise la revalidation prévue par le code ; mesurer sa
fraîcheur au lieu de reconstruire les deux images pour tout changement CMS.
Une invalidation ciblée authentifiée pourra compléter cette boucle après
validation des besoins éditoriaux ; aucun webhook de ce type n'est affirmé
actif par cet audit.

Privilégier des changements de schéma additifs compatibles avec le frontend en
ligne. Strapi peut synchroniser le schéma au démarrage : les suppressions,
conversions et incompatibilités ne sont pas de simples rollouts. Une migration
métier suit son dry-run, une sauvegarde contrôlée, la revue du plan et les
options d'application du script. Une migration irréversible ou une restauration
écrasante reste soumise à une instruction spécifique. Les commandes CMS
`:remote` basées sur `clever env` ciblent l'ancien hébergement ; elles doivent
être adaptées et vérifiées avant de devenir des procédures OVH.

Le rollback applicatif réactive les digests précédents si le schéma reste
compatible ; il ne supprime pas les champs additifs et ne restaure pas la base
automatiquement. Un rollback DNS vers Clever exige de vérifier l'état de cette
ancienne cible et de réconcilier les données écrites depuis la bascule.

## Validation et boucle de feedback

Une livraison réussie exige d'abord la recette fonctionnelle complète dans un
staging dont l'isolation a été vérifiée, puis les contrôles de production
suivants, limités à la lecture des données réelles :

1. Les validations adaptées au composant (`npm test`, lint frontend, build)
   passent avant activation. Les recettes d'intégration locales existantes
   restent locales : ne pas les rediriger vers la production.
2. Les pods attendus sont prêts, leur rollout terminé et leurs références
   d'image correspondent aux artefacts approuvés ; PostgreSQL est disponible.
3. La santé Next (`/api/health`) et Strapi (`/_health`), TLS et le routage public
   sont contrôlés, puis une page publiée connue, sa lecture CMS et son média
   sont vérifiés par des assertions de contenu en lecture seule. Les hôtes
   staging historiques partagés ne sont pas un terrain de tests d'écriture
   indépendant ; seuls les nouveaux stagings isolés accueillent la recette CRUD.
4. La version du processus effectivement servi est comparée à la release
   attendue, via un marqueur de version à implémenter et une réponse non mise
   en cache. Vérifier les digests des pods ne suffit pas à vérifier ce que sert
   le chemin public et son éventuel cache.
5. Un rapport conserve les SHA traités, les digests réutilisés/construits,
   l'heure UTC, les durées des étapes, les résultats de recette et le rollback
   disponible. Un échec après activation marque la livraison en échec tant
   qu'une version saine n'a pas été validée.

Mesurer séparément attente, build, publication, téléchargement, rollout et
recette. Le premier indicateur est le temps entre fusion et production validée ; le second est le
décalage entre `main` et le dernier état effectivement validé. Les métriques de
supervision complètent ces preuves, elles ne remplacent pas la recette de
livraison. Un envoi d'alerte à un canal tiers nécessite sa configuration
explicitement autorisée.

## Travail à implémenter

1. Versionner le staging complet par environnement : namespace, frontend, CMS,
   PostgreSQL, volumes, médias, configuration, secrets et accès distincts, avec
   peuplement contrôlé et preuve d'isolation. Préserver la production historique.
2. Versionner l'inventaire OVH sans secret et les vérifications d'identité ;
   remplacer les chemins de préparation datés par des releases issues du SHA.
3. Créer les workflows de validation et leur statut final, la sélection basée
   sur la dernière production saine, les builds sur runners GitHub et la
   publication GHCR indépendante de Clever.
4. Adapter l'activation Ansible aux images immuables et aux seuls composants
   touchés, avec téléchargement GHCR par digest, accès privé, verrou commun et
   refus des versions dépassées. Qualifier les candidats dans leur staging,
   puis promouvoir automatiquement `main` après les validations attendues.
5. Ajouter la preuve de version, les recettes de production en lecture seule,
   le journal de release et le rollback compatible avec la base.
6. Valider les scénarios : deux agents se coordonnant sur une version
   identifiable du staging sans s'écraser, CRUD et médias complets isolés de
   la production, documentation seule, frontend seul, CMS seul, contrat
   coordonné, premier déploiement sans baseline, build échoué suivi d'un push
   documentaire, pushes rapprochés, promotion et rollback. Une recette staging
   échouée doit empêcher l'activation en production.

Cette séquence décrit la réalisation recommandée. Aucun build, test applicatif,
import d'image, migration ou activation de production n'a été effectué pour
l'audit documentaire du 10 septembre 2026.
