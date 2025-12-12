import { getAbout } from '@/lib/strapi';

interface Block {
  __component: string;
  id: number;
  [key: string]: any;
}

export default async function Home() {
  try {
    const about: any = await getAbout();
    
    if (!about || !about.title) {
      return (
        <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <h1>Page non disponible</h1>
          <p>Le contenu de la page n&apos;est pas encore configuré dans Strapi.</p>
        </main>
      );
    }

    const { title, blocks } = about;

    return (
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {title && (
          <h1 style={{ 
            marginBottom: '3rem', 
            fontSize: '3rem',
            color: 'var(--color-charbon)',
            borderBottom: '3px solid var(--color-rouge)',
            paddingBottom: '1rem'
          }}>
            {title}
          </h1>
        )}
        
        {blocks && blocks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {blocks.map((block: Block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        ) : (
          <p>Aucun contenu disponible.</p>
        )}
      </main>
    );
  } catch (error) {
    console.error('Error loading page:', error);
    return (
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Erreur</h1>
        <p>Impossible de charger le contenu. Assurez-vous que Strapi est démarré.</p>
      </main>
    );
  }
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.__component) {
    case 'shared.rich-text':
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: block.body }}
          style={{ lineHeight: '1.6' }}
        />
      );

    case 'shared.media':
      if (!block.file?.url) return null;
      const mediaUrl = block.file.url.startsWith('http') 
        ? block.file.url 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${block.file.url}`;
      return (
        <div>
          <img 
            src={mediaUrl} 
            alt={block.file.alternativeText || ''}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
          />
        </div>
      );

    case 'shared.quote':
      return (
        <blockquote 
          style={{ 
            borderLeft: '4px solid var(--color-rouge)',
            paddingLeft: '1.5rem',
            fontStyle: 'italic',
            margin: '2rem 0'
          }}
        >
          <p>{block.body}</p>
          {block.title && (
            <footer style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
              — {block.title}
            </footer>
          )}
        </blockquote>
      );

    case 'shared.slider':
      return (
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-charbon)' }}>
            {block.title || 'Galerie'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {block.files?.map((file: any, index: number) => {
              const imageUrl = file.url.startsWith('http') 
                ? file.url 
                : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${file.url}`;
              return (
                <img 
                  key={index}
                  src={imageUrl} 
                  alt={file.alternativeText || ''}
                  style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                />
              );
            })}
          </div>
        </div>
      );

    default:
      return null;
  }
}
