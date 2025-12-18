'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface GpxFile {
  url: string;
  name: string;
}

interface Chapter {
  id: number;
  title: string;
  slug: string;
  startStation: string;
  endStation: string;
  distance: number;
  gpxFileAB?: GpxFile;
  gpxFileBA?: GpxFile;
  nextChapter?: { id: number; slug: string; title: string };
  previousChapter?: { id: number; slug: string; title: string };
}

interface SelectedSegment {
  id: string;
  chapterId: number;
  direction: 'AB' | 'BA';
  title: string;
  stationLabel: string;
  startStation: string;
  endStation: string;
  gpxUrl: string;
}

export default function GpxBuilderPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<SelectedSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainError, setChainError] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
      const response = await fetch(
        `${strapiUrl}/api/chapters?populate[0]=gpxFileAB&populate[1]=gpxFileBA&populate[2]=nextChapter&populate[3]=previousChapter`
      );
      const data = await response.json();
      const chapters = data.data || [];
      
      // Sort chapters following the nextChapter chain
      if (chapters.length > 0) {
        const chapterMap = new Map<number, any>(chapters.map((ch: any) => [ch.id, ch]));
        const referencedIds = new Set(
          chapters
            .filter((ch: any) => ch.nextChapter?.id)
            .map((ch: any) => ch.nextChapter.id)
        );
        
        let firstChapter = chapters.find((ch: any) => !referencedIds.has(ch.id));
        if (!firstChapter) firstChapter = chapters[0];
        
        const orderedChapters: any[] = [];
        let current = firstChapter;
        const visited = new Set<number>();
        
        while (current && !visited.has(current.id)) {
          orderedChapters.push(current);
          visited.add(current.id);
          
          if (current.nextChapter?.id) {
            current = chapterMap.get(current.nextChapter.id);
          } else {
            break;
          }
        }
        
        chapters.forEach((ch: any) => {
          if (!visited.has(ch.id)) {
            orderedChapters.push(ch);
          }
        });
        
        // Validate the chain integrity
        const orphanCount = chapters.length - visited.size;
        const hasBidirectionalErrors = chapters.some((ch: any) => {
          if (ch.nextChapter?.id) {
            const next = chapterMap.get(ch.nextChapter.id);
            if (next && next.previousChapter?.id !== ch.id) {
              return true;
            }
          }
          if (ch.previousChapter?.id) {
            const prev = chapterMap.get(ch.previousChapter.id);
            if (prev && prev.nextChapter?.id !== ch.id) {
              return true;
            }
          }
          return false;
        });
        
        if (orphanCount > 0) {
          setChainError(`⚠️ Configuration incorrecte : ${orphanCount} chapitre(s) non relié(s) à la chaîne principale. Vérifiez les relations nextChapter/previousChapter dans Strapi.`);
        } else if (hasBidirectionalErrors) {
          setChainError(`⚠️ Configuration incorrecte : incohérence bidirectionnelle détectée. Si A.nextChapter = B, alors B.previousChapter doit être A.`);
        } else {
          setChainError(null);
        }
        
        setChapters(orderedChapters);
      } else {
        setChapters(chapters);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSegment = (chapter: Chapter, direction: 'AB' | 'BA') => {
    const gpxFile = direction === 'AB' ? chapter.gpxFileAB : chapter.gpxFileBA;
    if (!gpxFile) return;

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    const gpxUrl = gpxFile.url.startsWith('http') 
      ? gpxFile.url 
      : `${strapiUrl}${gpxFile.url}`;

    const stationLabel = direction === 'AB' 
      ? `${chapter.startStation} → ${chapter.endStation}`
      : `${chapter.endStation} → ${chapter.startStation}`;

    const newSegment: SelectedSegment = {
      id: `${chapter.id}-${direction}-${Date.now()}`,
      chapterId: chapter.id,
      direction,
      title: chapter.title,
      stationLabel,
      startStation: direction === 'AB' ? chapter.startStation : chapter.endStation,
      endStation: direction === 'AB' ? chapter.endStation : chapter.startStation,
      gpxUrl
    };

    setSelectedSegments([...selectedSegments, newSegment]);
  };

  const addAllDirection = (direction: 'AB' | 'BA') => {
    // For BA direction, reverse the chapter order
    const orderedChapters = direction === 'BA' ? [...chapters].reverse() : chapters;
    
    const newSegments = orderedChapters
      .filter(chapter => direction === 'AB' ? chapter.gpxFileAB : chapter.gpxFileBA)
      .map(chapter => {
        const gpxFile = direction === 'AB' ? chapter.gpxFileAB : chapter.gpxFileBA;
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
        const gpxUrl = gpxFile!.url.startsWith('http') 
          ? gpxFile!.url 
          : `${strapiUrl}${gpxFile!.url}`;

        const stationLabel = direction === 'AB' 
          ? `${chapter.startStation} → ${chapter.endStation}`
          : `${chapter.endStation} → ${chapter.startStation}`;

        return {
          id: `${chapter.id}-${direction}-${Date.now()}-${chapter.id}`,
          chapterId: chapter.id,
          direction,
          title: chapter.title,
          stationLabel,
          startStation: direction === 'AB' ? chapter.startStation : chapter.endStation,
          endStation: direction === 'AB' ? chapter.endStation : chapter.startStation,
          gpxUrl
        };
      });

    setSelectedSegments([...selectedSegments, ...newSegments]);
  };

  const removeSegment = (segmentId: string) => {
    setSelectedSegments(selectedSegments.filter(s => s.id !== segmentId));
  };

  const clearAll = () => {
    setSelectedSegments([]);
  };

  const autoOrganize = () => {
    if (selectedSegments.length <= 1) return;

    const organized: SelectedSegment[] = [selectedSegments[0]];
    const remaining = [...selectedSegments.slice(1)];

    while (remaining.length > 0) {
      const lastSegment = organized[organized.length - 1];
      
      // Find a segment that starts where the last one ends
      const nextIndex = remaining.findIndex(
        seg => seg.startStation === lastSegment.endStation
      );

      if (nextIndex !== -1) {
        organized.push(remaining[nextIndex]);
        remaining.splice(nextIndex, 1);
      } else {
        // No contiguous segment found, just add the next one
        organized.push(remaining[0]);
        remaining.shift();
      }
    }

    setSelectedSegments(organized);
  };

  const moveSegmentUp = (index: number) => {
    if (index === 0) return;
    const newSegments = [...selectedSegments];
    [newSegments[index - 1], newSegments[index]] = [newSegments[index], newSegments[index - 1]];
    setSelectedSegments(newSegments);
  };

  const moveSegmentDown = (index: number) => {
    if (index === selectedSegments.length - 1) return;
    const newSegments = [...selectedSegments];
    [newSegments[index], newSegments[index + 1]] = [newSegments[index + 1], newSegments[index]];
    setSelectedSegments(newSegments);
  };

  const mergeAndDownloadGpx = async () => {
    if (selectedSegments.length === 0) return;

    try {
      // Fetch all GPX files
      const gpxContents = await Promise.all(
        selectedSegments.map(async (segment) => {
          const response = await fetch(segment.gpxUrl);
          const text = await response.text();
          return { segment, content: text };
        })
      );

      // Simple string-based merge - concatenate all trackpoints
      let allTrackPoints = '';
      
      const parser = new DOMParser();
      gpxContents.forEach(({ segment, content }, index) => {
        const doc = parser.parseFromString(content, 'text/xml');
        const trkpts = doc.querySelectorAll('trkpt');
        
        if (trkpts.length > 0) {
          allTrackPoints += `    <trkseg>\n`;
          trkpts.forEach(trkpt => {
            const lat = trkpt.getAttribute('lat');
            const lon = trkpt.getAttribute('lon');
            const ele = trkpt.querySelector('ele')?.textContent;
            const time = trkpt.querySelector('time')?.textContent;
            
            allTrackPoints += `      <trkpt lat="${lat}" lon="${lon}">\n`;
            if (ele) allTrackPoints += `        <ele>${ele}</ele>\n`;
            if (time) allTrackPoints += `        <time>${time}</time>\n`;
            allTrackPoints += `      </trkpt>\n`;
          });
          allTrackPoints += `    </trkseg>\n`;
        }
      });

      // Detect direction
      const baCount = selectedSegments.filter(s => s.direction === 'BA').length;
      const abCount = selectedSegments.filter(s => s.direction === 'AB').length;
      const isFullReverse = baCount === selectedSegments.length;
      const isMixed = baCount > 0 && abCount > 0;
      
      let directionLabel = '';
      let filenameSuffix = '';
      if (isFullReverse) {
        directionLabel = ' (sens inverse)';
        filenameSuffix = '-reverse';
      } else if (isMixed) {
        directionLabel = ` (${abCount} segment${abCount > 1 ? 's' : ''} classique, ${baCount} inverse)`;
        filenameSuffix = '-mixed';
      }

      // Build complete GPX
      const mergedGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GTHDF GPX Builder" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>Grand Tour des Hauts-de-France - Parcours personnalisé${directionLabel}</name>
    <desc>Parcours créé avec ${selectedSegments.length} segment${selectedSegments.length > 1 ? 's' : ''}${directionLabel}</desc>
  </metadata>
  <trk>
    <name>GTHDF Custom Route${directionLabel}</name>
${allTrackPoints}  </trk>
</gpx>`;

      // Download
      const blob = new Blob([mergedGpx], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gthdf-custom-route${filenameSuffix}-${new Date().toISOString().split('T')[0]}.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error merging GPX files:', error);
      alert('Erreur lors de la fusion des fichiers GPX. Vérifiez la console pour plus de détails.');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Retour à l'accueil</Link>
        <h1 className={styles.title}>GPX Builder</h1>
        <p className={styles.subtitle}>
          Créez votre itinéraire personnalisé en sélectionnant les segments à parcourir
        </p>
      </header>

      {chainError && (
        <div className={styles.adminAlert}>
          <strong>Erreur de configuration (Admin)</strong>
          <p>{chainError}</p>
        </div>
      )}

      <div className={styles.content}>
        {/* Direction AB (Classic) */}
        <section className={styles.directionColumn}>
          <div className={styles.columnHeader}>
            <h2 className={styles.columnTitle}>Sens classique</h2>
            <button 
              onClick={() => addAllDirection('AB')}
              className={styles.addAllButton}
            >
              Tout ajouter
            </button>
          </div>
          <div className={styles.segmentsList}>
            {chapters.map((chapter) => chapter.gpxFileAB && (
              <div key={`${chapter.id}-AB`} className={styles.segmentCard}>
                <div className={styles.segmentInfo}>
                  <h3 className={styles.segmentTitle}>{chapter.title}</h3>
                  <p className={styles.segmentStations}>
                    {chapter.startStation} → {chapter.endStation}
                  </p>
                  <p className={styles.segmentDistance}>~{chapter.distance} km</p>
                </div>
                <button
                  onClick={() => addSegment(chapter, 'AB')}
                  className={styles.addButton}
                  title="Ajouter au parcours"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Direction BA (Reverse) */}
        <section className={styles.directionColumn}>
          <div className={styles.columnHeader}>
            <h2 className={styles.columnTitle}>Sens inverse</h2>
            <button 
              onClick={() => addAllDirection('BA')}
              className={styles.addAllButton}
            >
              Tout ajouter
            </button>
          </div>
          <div className={styles.segmentsList}>
            {chapters.map((chapter) => chapter.gpxFileBA && (
              <div key={`${chapter.id}-BA`} className={styles.segmentCard}>
                <div className={styles.segmentInfo}>
                  <h3 className={styles.segmentTitle}>{chapter.title}</h3>
                  <p className={styles.segmentStations}>
                    {chapter.endStation} → {chapter.startStation}
                  </p>
                  <p className={styles.segmentDistance}>~{chapter.distance} km</p>
                </div>
                <button
                  onClick={() => addSegment(chapter, 'BA')}
                  className={styles.addButton}
                  title="Ajouter au parcours"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Selected Basket */}
        <aside className={styles.basketColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.titleRow}>
              <h2 className={styles.columnTitle}>Votre parcours</h2>
              {(() => {
                const discontinuityCount = selectedSegments.filter((segment, index) => {
                  if (index === 0) return false;
                  return selectedSegments[index - 1].endStation !== segment.startStation;
                }).length;
                
                return discontinuityCount > 0 && (
                  <span className={styles.discontinuityBadge} title="Nombre de discontinuités">
                    ⚠️ {discontinuityCount}
                  </span>
                );
              })()}
            </div>
            <div className={styles.headerActions}>
              {selectedSegments.length > 1 && (
                <button 
                  onClick={autoOrganize}
                  className={styles.organizeButton}
                  title="Réorganiser automatiquement"
                >
                  Trier
                </button>
              )}
              {selectedSegments.length > 0 && (
                <button 
                  onClick={clearAll}
                  className={styles.clearButton}
                  title="Tout retirer"
                >
                  Vider
                </button>
              )}
            </div>
          </div>
          
          {selectedSegments.length === 0 ? (
            <p className={styles.emptyState}>
              Ajoutez des segments pour créer votre parcours
            </p>
          ) : (
            <>
              {/* Check for discontinuities */}
              {(() => {
                const hasDiscontinuity = selectedSegments.some((segment, index) => {
                  if (index === 0) return false;
                  return selectedSegments[index - 1].endStation !== segment.startStation;
                });
                
                return hasDiscontinuity && (
                  <div className={styles.discontinuityAlert}>
                    ⚠️ Attention : Votre parcours contient des discontinuités. 
                    Il manque des trajets pour relier certains segments.
                  </div>
                );
              })()}
              
              <div className={styles.selectedList}>
                {selectedSegments.map((segment, index) => {
                  const isContiguous = index === 0 || 
                    selectedSegments[index - 1].endStation === segment.startStation;
                  
                  return (
                    <div key={segment.id} className={styles.selectedSegment}>
                      <span className={styles.segmentNumber}>{index + 1}</span>
                      <div className={styles.selectedInfo}>
                        <span className={styles.selectedTitle}>{segment.title}</span>
                        <span className={styles.selectedStations}>{segment.stationLabel}</span>
                        {!isContiguous && (
                          <span className={styles.discontinuityWarning}>
                            ⚠️ Discontinuité
                          </span>
                        )}
                      </div>
                      <div className={styles.segmentActions}>
                        <button
                          onClick={() => moveSegmentUp(index)}
                          disabled={index === 0}
                          className={styles.moveButton}
                          title="Monter"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSegmentDown(index)}
                          disabled={index === selectedSegments.length - 1}
                          className={styles.moveButton}
                          title="Descendre"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeSegment(segment.id)}
                          className={styles.removeButton}
                          title="Retirer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button
                onClick={mergeAndDownloadGpx}
                className={styles.downloadButton}
              >
                Télécharger le GPX ({selectedSegments.length} segment{selectedSegments.length > 1 ? 's' : ''})
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
