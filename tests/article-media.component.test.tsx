import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ArticleMedia from '../components/ArticleMedia';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
  }) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;
    delete imageProps.sizes;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={imageProps.alt || ''} {...imageProps} />
    );
  },
}));

describe('ArticleMedia', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  it('keeps the complete image accessible and opens it in a modal dialog', () => {
    const view = render(
      <ArticleMedia
        src="https://media.example/capture.png"
        alt="Recherche d’un chapitre depuis Étaples"
        caption="La recherche retrouve désormais les chapitres par ville."
        width={1280}
        height={900}
      />,
    );

    const trigger = view.getByRole('button', {
      name: 'Agrandir : Recherche d’un chapitre depuis Étaples',
    });
    const inlineImage = view.getAllByRole('img', {
      name: 'Recherche d’un chapitre depuis Étaples',
    })[0];

    expect(inlineImage.getAttribute('width')).toBe('1280');
    expect(inlineImage.getAttribute('height')).toBe('900');
    expect(
      view.getAllByText('La recherche retrouve désormais les chapitres par ville.'),
    ).toHaveLength(2);

    fireEvent.click(trigger);

    const dialog = view.getByRole('dialog', { hidden: true });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes the lightbox and restores page scrolling', () => {
    const view = render(
      <ArticleMedia
        src="https://media.example/capture.png"
        alt="Capture du GPX Builder"
        width={1280}
        height={900}
      />,
    );

    fireEvent.click(view.getByRole('button', { name: 'Agrandir : Capture du GPX Builder' }));
    fireEvent.click(view.getByRole('button', { name: 'Fermer l’image agrandie' }));

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe('');
  });
});
