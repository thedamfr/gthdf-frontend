import Link from 'next/link';
import styles from './page.module.css';
import CheckpointCard, { type CheckpointData } from '@/components/CheckpointCard';

// Données hardcodées — à remplacer par Strapi
const CHECKPOINTS: CheckpointData[] = [
  {
    id: 1,
    number: 1,
    title: 'Le passeur immobile',
    enigma: "Je veille sur les voyageurs depuis des siècles, ni vivant ni inerte. On me traverse sans me voir, on s'appuie sur moi sans s'en souvenir. Trouve-moi entre deux rives, là où la pierre a remplacé le bois.",
    hint: 'Cherche un pont de pierre ancien sur la rivière Loue, entre Ornans et Vuillafans.',
    what3words: 'rivières.pierre.reflets',
    chapterName: 'Chapitre 1 — Besançon → Ornans',
  },
  {
    id: 2,
    number: 2,
    title: 'La vigile de basalte',
    enigma: "Debout depuis que les glaciers ont fondu, je suis la sentinelle qu'on ne remarque pas. Ni arbre ni animal, je suis la mémoire minérale du paysage. Face au soleil couchant, mon ombre dessine un chiffre.",
    hint: 'Un rocher caractéristique sur la falaise dominant la vallée, visible depuis le sentier après le col.',
    what3words: 'falaise.ombre.calcaire',
    chapterName: 'Chapitre 1 — Besançon → Ornans',
  },
  {
    id: 3,
    number: 3,
    title: "L’encre et le silence",
    enigma: "Courbet y a puisé sa lumière, moi j'y cherche le reflet. L'eau est verte comme une idée ancienne, le fond ne se laisse pas deviner. Approche-toi sans bruit — ce que tu cherches est à la surface.",
    hint: 'La source bleue de Reculée, point de départ du Lison. Cherche la plaque commémorative sur la berge nord.',
    what3words: 'source.lison.mousse',
    chapterName: 'Chapitre 2 — Ornans → Pontarlier',
  },
  {
    id: 4,
    number: 4,
    enigma: "On m'a construit pour cacher le temps. Derrière mes murs épais, les saisons passent sans qu'on les sente. Je ne suis pas une maison, pas une église — je suis l'endroit où l'on range ce qui ne doit pas changer.",
    hint: "Une cave à fromage ou une fromagerie traditionnelle dans le village, repérable à l'odeur et au toit bas.",
    what3words: 'comté.cave.affinage',
    chapterName: 'Chapitre 2 — Ornans → Pontarlier',
  },
  {
    id: 5,
    number: 5,
    title: 'Le dos de la forêt',
    enigma: "La forêt a une colonne vertébrale, et je suis l'une de ses vertèbres. On ne me voit bien qu'en hiver, quand les feuilles ont rendu leur âme. En été, je disparais dans le vert. Cherche où le sentier hésite.",
    hint: 'Une borne forestière ou un jalon de pierre à une intersection de piste, dans la forêt de Levier.',
    what3words: 'hêtre.brume.borne',
    chapterName: 'Chapitre 3 — Pontarlier → Levier',
  },
];

export default function CheckpointsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <Link href="/" className={styles.backLink}>← Retour</Link>
        <h1 className={styles.pageTitle}>Les checkpoints</h1>

        <div className={styles.heroLayout}>
          <div className={styles.heroText}>
            <p className={styles.heroLead}>
              Le GTHDF n&rsquo;est pas qu&rsquo;un sentier. C&rsquo;est une enquête qui se déroule dans le paysage franc-comtois.
            </p>
            <p className={styles.heroPara}>
              Tout au long du tracé, 24 checkpoints sont dissimulés — dans l&rsquo;architecture, la géologie, la mémoire des lieux. Chacun est une énigme à résoudre sur le terrain, sans aide extérieure. Un pont, un rocher, une borne oubliée, une cave à fromage : les réponses sont toujours visibles à condition de ralentir et de regarder autrement.
            </p>
            <p className={styles.heroPara}>
              Le principe est simple : trouver le lieu décrit par l&rsquo;énigme, puis valider avec l&rsquo;adresse <strong>what3words</strong> sur votre téléphone. Si vous bloquez, l&rsquo;indice est là — mais il coûte un peu d&rsquo;orgueil.
            </p>
            <ul className={styles.rulesList}>
              <li>24 checkpoints répartis sur l&rsquo;ensemble du tracé</li>
              <li>Validation par what3words (précision 3 m²)</li>
              <li>L&rsquo;indice se déverrouille à la demande</li>
              <li>Pas de classement, pas de chrono — juste l&rsquo;attention</li>
            </ul>

            {/* TODO: remplacer # par le vrai lien d'invitation WhatsApp */}
            <a
              href="#"
              className={styles.whatsappCta}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className={styles.whatsappIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.532 5.858L.057 23.57a.75.75 0 0 0 .93.927l5.845-1.474A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.655-.51-5.17-1.4l-.37-.22-3.827.965.984-3.717-.242-.383A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Rejoindre le groupe WhatsApp
              <span className={styles.whatsappSub}>entraide checkpoints &amp; sorties</span>
            </a>
          </div>

          {/* TODO: remplacer par une vraie photo */}
          <div className={styles.heroImage} aria-hidden="true">
            <div className={styles.heroImagePlaceholder}>
              <span>Photo — randonneur cherchant un checkpoint</span>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.mapsSection}>
        <h2 className={styles.mapsSectionTitle}>Cartes du parcours</h2>
        <div className={styles.mapsGrid}>
          <a
            href="#"
            className={styles.mapCard}
            aria-label="Télécharger la carte A3"
          >
            <div className={styles.mapIcon}>A3</div>
            <div className={styles.mapInfo}>
              <span className={styles.mapLabel}>Carte de randonnée</span>
              <span className={styles.mapFormat}>Format A3 — PDF</span>
            </div>
            <span className={styles.mapDownload}>↓</span>
          </a>
          <a
            href="#"
            className={styles.mapCard}
            aria-label="Télécharger la carte A1"
          >
            <div className={styles.mapIcon}>A1</div>
            <div className={styles.mapInfo}>
              <span className={styles.mapLabel}>Carte grand format</span>
              <span className={styles.mapFormat}>Format A1 — PDF</span>
            </div>
            <span className={styles.mapDownload}>↓</span>
          </a>
        </div>
      </section>

      <section className={styles.grid}>
        {CHECKPOINTS.map((cp) => (
          <CheckpointCard key={cp.id} checkpoint={cp} />
        ))}
      </section>
    </div>
  );
}
