import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INTERACTION_LOCALES,
  INTERACTION_MESSAGES,
  localizeInteraction,
} from '../../../src/discord/interaction-i18n.js';

function placeholders(value) {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)]
    .map(([, name]) => name)
    .sort();
}

test('defines every interaction message in all supported locales with matching placeholders', () => {
  for (const [key, messages] of Object.entries(INTERACTION_MESSAGES)) {
    assert.deepEqual(Object.keys(messages), INTERACTION_LOCALES, key);
    const expected = placeholders(messages['en-US']);
    for (const locale of INTERACTION_LOCALES) {
      assert.notEqual(messages[locale].length, 0, `${key}.${locale}`);
      assert.deepEqual(placeholders(messages[locale]), expected, `${key}.${locale}`);
    }
  }
});

test('localizes variables and safely falls back to English', () => {
  assert.equal(
    localizeInteraction('banPreview.disabled', 'zh-TW', { provider: '巴哈姆特' }),
    '已停用此伺服器的 巴哈姆特 預覽。',
  );
  assert.equal(
    localizeInteraction('banPreview.disabled', 'ko', { provider: 'Bahamut' }),
    'Previews for Bahamut have been disabled in this server.',
  );
  assert.throws(() => localizeInteraction('constructor', 'en-US'), /Unknown interaction message/);
});
