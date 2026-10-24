import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applicationCommandLocalizationShape,
  applicationCommandsMatchDefinition,
} from '../../../src/discord/command-verification.js';

test('normalizes omitted Discord localization fields', () => {
  const expected = { name: 'removeMessage', type: 3 };
  const remote = {
    ...expected,
    description: '',
    name_localizations: null,
    description_localizations: null,
  };
  assert.deepEqual(
    applicationCommandLocalizationShape(remote),
    applicationCommandLocalizationShape(expected),
  );
  assert.equal(applicationCommandsMatchDefinition([remote], [expected]), true);
});

test('detects mismatched command choice localization', () => {
  const expected = {
    name: 'banpreview',
    type: 1,
    description: 'Enable or disable previews for a specific website',
    options: [{
      name: 'site',
      type: 3,
      description: 'The website',
      choices: [{
        name: 'Bahamut',
        value: 'bahamut',
        name_localizations: { 'zh-TW': '巴哈姆特' },
      }],
    }],
  };
  const remote = structuredClone(expected);
  remote.options[0].choices[0].name_localizations['zh-TW'] = '錯誤翻譯';
  assert.equal(applicationCommandsMatchDefinition([remote], [expected]), false);
});
