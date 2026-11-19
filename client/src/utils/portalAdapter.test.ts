import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEATURE_DEFAULTS } from '../engine/features';

test('offline play does not depend on the optional external portal service', () => {
  assert.equal(FEATURE_DEFAULTS.portals, false);
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /PortalAdapter|https?:\/\/[^"']+\.js/);
});
