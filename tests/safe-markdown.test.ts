import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSafeMarkdown } from '../lib/safe-markdown.ts';

test('renderSafeMarkdown preserves editorial formatting and removes active content', () => {
  const html = renderSafeMarkdown(
    '## Une ville\n\n**Texte important**\n\n<script>alert(1)</script>\n\n[Piège](javascript:alert(1))'
  );

  assert.match(html, /<h2>Une ville<\/h2>/);
  assert.match(html, /<strong>Texte important<\/strong>/);
  assert.doesNotMatch(html, /<script|javascript:/i);
});
