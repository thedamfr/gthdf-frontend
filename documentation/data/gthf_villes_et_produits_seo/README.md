# Inventaire GTHF des villes et produits SEO

Ce répertoire conserve la source de calcul remise avec les PRD 01 à 04 et des
exports CSV déterministes, plus faciles à contrôler et à exploiter pendant la
production.

Ce jeu de données est une **source de cadrage et de reprise**, pas un import
Strapi prêt à publier. En particulier, les 223 villes satisfont une règle de
qualification liée au ravitaillement ; elles ne constituent pas une sélection
éditoriale automatique.

## Contenu

| Fichier | Rôle |
|---|---|
| [`source/GTHF_villes_et_produits_SEO.xlsx`](source/GTHF_villes_et_produits_SEO.xlsx) | Classeur original, avec mise en forme, formules et onglets de méthode |
| [`csv/villes.csv`](csv/villes.csv) | 223 villes admissibles et leurs ancres |
| [`csv/produits.csv`](csv/produits.csv) | 3 891 paires ville × ville retenues par le calcul source |
| [`csv/qa_seuils.csv`](csv/qa_seuils.csv) | 70 paires proches des seuils, retenues ou non |
| [`csv/chapitres.csv`](csv/chapitres.csv) | 10 GPX de chapitre et leurs empreintes |
| [`csv/methode.csv`](csv/methode.csv) | Définitions, règles, sources et version du calcul |
| [`csv/synthese.csv`](csv/synthese.csv) | Valeurs matérialisées de l’onglet de synthèse |
| [`manifest.json`](manifest.json) | Contrat d’export, dimensions, comptages et SHA-256 |
| [`export_dataset.py`](export_dataset.py) | Exporteur et vérificateur reproductible, sans dépendance externe |

## Version et intégrité

- date du calcul : `2026-07-19` ;
- instantané OpenStreetMap indiqué par la source :
  `2026-07-19T13:38:10Z` ;
- taille du classeur : `1 015 386` octets ;
- SHA-256 du classeur :
  `dc7c251553907bf98ea444f79840cc52f9b702989353b241eaa083bb24d240a2`.

Le [`manifest.json`](manifest.json) porte également l’empreinte de chaque CSV.
Une modification du classeur ou d’un export doit donc produire un diff de
manifeste explicite.

## Sémantique des exports CSV

Les onglets structurés sont exportés depuis leur table Excel, sans les titres
décoratifs placés au-dessus :

- `Villes`, `Produits`, `QA seuils`, `Chapitres` et `Méthode` contiennent une
  ligne d’en-tête suivie uniquement des enregistrements de la table ;
- `Synthèse`, qui n’a pas de table, est exporté comme une grille de cellules
  matérialisées ;
- l’encodage est UTF-8, le séparateur est la virgule et les fins de ligne sont
  LF ;
- les booléens sont écrits `true` et `false` ;
- les formules ne sont pas recalculées : le CSV reçoit uniquement leur valeur
  mise en cache dans le classeur. Le XLSX reste la source à consulter pour les
  formules et la présentation.

L’export conserve les valeurs textuelles telles que les codes avec zéros en
tête. Il ne transforme pas les noms, les identifiants, les coordonnées ni les
distances.

## Usage dans les PRD

### PRD 01 — Référentiel des villes

`villes.csv` sert à dédupliquer et amorcer la saisie, en commençant par les
départs, arrivées et villes intermédiaires retenues éditorialement.
Correspondances indicatives :

| Source | Cible PRD 01 | Règle |
|---|---|---|
| `ID commune` | identifiant externe de reprise | Conserver pour l’idempotence de l’import, pas comme slug public |
| `Ville` | `ville.nom` | Relire le libellé public |
| `Longitude ancre`, `Latitude ancre` | `ville.longitude`, `ville.latitude` | Ne pas remplacer silencieusement des coordonnées déjà validées |
| `Code commune`, `Code INSEE`, `Pays` | métadonnées de provenance si le schéma les retient | Ne pas les confondre avec l’identité Strapi |
| `Premier chapitre` | aide à la reprise | Ne suffit pas à générer les passages ordonnés |

Le fichier ne fournit pas le contenu éditorial, les noms alternatifs, le slug
stable ni la décision `publicationNext`. Toute ville créée par reprise reste
non publiable jusqu’à sa revue.

`Nombre de passages` peut être supérieur à un. Il ne faut donc pas reconstruire
les `passagesVilles` à partir du seul champ `Premier chapitre`, ni supposer une
ancre unique par ville. Les passages de chapitre restent une relation
éditoriale ordonnée à valider.

Les commerces OSM ont servi à qualifier l’inventaire. Ils ne deviennent ni des
contenus publics vérifiés ni une donnée éditoriale de référence dans le PRD 01.

### PRD 02 — Trouver son chapitre

Le CSV complet ne doit pas être envoyé au navigateur. La recherche publique
consomme uniquement les villes et passages publiables issus de Strapi. Une
ville présente ici mais non créée, non liée ou non autorisée à la publication
ne doit pas apparaître dans les résultats.

### PRD 03 — GPX Builder v2

Le Builder n’importe plus de GPX privé. Il extrait à la demande une portion des
GPX officiels entre deux `cityPassages` validés.

`villes.csv`, les chaînages et le nombre de passages servent à contrôler les
propositions d’ancrages primaires AB et BA. Ils ne sont pas une table runtime
et ne permettent pas de choisir automatiquement une occurrence :

- `Chaînage premier passage` ne décrit pas tous les passages ;
- un passage éditorial peut retenir une autre occurrence qualifiée ;
- AB et BA possèdent des géométries et des ancrages distincts ;
- le Builder consomme les ancrages publiés dans Strapi et liés au SHA-256
  exact de chaque GPX.

Le scénario Boulogne-sur-Mer → Gravelines utilise les valeurs du classeur
comme contrôle de recette, jamais comme constantes applicatives.

### PRD 04 — Itinéraires ville → ville

`produits.csv` constitue un inventaire de contrôle du calcul du 19 juillet
2026, pas une table à publier telle quelle. Les valeurs `223` et `3 891` sont
des résultats attendus pour cette version des sources, jamais des constantes
applicatives.

Le job du PRD 04 doit recalculer depuis les GPX et ancres administrés, produire
son propre rapport de dry run, résoudre les ambiguïtés de passages et créer les
produits avec `publicationNext=false` et `statutSEO=noindex`. Un écart avec cet
inventaire doit être expliqué ; il ne doit pas être masqué pour reproduire
artificiellement les totaux historiques.

Les ancrages AB primaires validés par le PRD 03 peuvent amorcer les occurrences
correspondantes avec une provenance explicite. Ils ne remplacent pas le calcul
des 449 occurrences attendues par le catalogue.

## Régénérer ou vérifier les CSV

Depuis la racine de `gthdf-frontend` :

```bash
python3 documentation/data/gthf_villes_et_produits_seo/export_dataset.py
python3 documentation/data/gthf_villes_et_produits_seo/export_dataset.py --check
```

Le script utilise uniquement la bibliothèque standard de Python. Le mode
`--check` ne réécrit aucun fichier et échoue si un CSV ou le manifeste ne
correspond plus au classeur commité.

Pour mettre le jeu de données à jour :

1. remplacer le XLSX source sans changer son nom canonique ;
2. exécuter l’export ;
3. relire les comptages, plages, colonnes et empreintes dans le manifeste ;
4. inspecter les diffs CSV, notamment les villes, paires limites et GPX ;
5. lancer le mode `--check` avant le commit.

Les URL de provenance et l’attribution OpenStreetMap sont conservées dans les
exports. Toute réutilisation ou redistribution doit préserver les attributions
applicables aux sources.
