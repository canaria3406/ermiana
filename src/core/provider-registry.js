const URL_IN_SPAN = /https?:\/\//i;

function suppressedRanges(content) {
  const ranges = [];

  for (let open = content.indexOf('<'); open !== -1;) {
    const close = content.indexOf('>', open + 1);
    if (close === -1) break;
    if (URL_IN_SPAN.test(content.slice(open + 1, close))) ranges.push([open, close + 1]);
    open = content.indexOf('<', close + 1);
  }

  for (let open = content.indexOf('~~'); open !== -1;) {
    const close = content.indexOf('~~', open + 2);
    if (close === -1) break;
    if (URL_IN_SPAN.test(content.slice(open + 2, close))) ranges.push([open, close + 2]);
    open = content.indexOf('~~', close + 2);
  }

  return ranges;
}

function isSuppressed(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

export class ProviderRegistry {
  constructor(providers) {
    this.providers = providers;
    const ids = providers.map((provider) => provider.id);
    if (new Set(ids).size !== ids.length) throw new Error('Provider ids must be unique');
    this.matchers = providers.flatMap((provider) => provider.patterns.map((pattern) => ({
      provider,
      pattern: new RegExp(
        pattern.source,
        pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
      ),
    })));
  }

  match(content) {
    if (!content?.includes('http')) return null;
    const ranges = suppressedRanges(content);
    let earliest = null;
    for (const { provider, pattern } of this.matchers) {
      for (const match of content.matchAll(pattern)) {
        if (earliest && match.index >= earliest.index) break;
        if (isSuppressed(ranges, match.index)) continue;
        earliest = { provider, match, index: match.index };
        break;
      }
      if (earliest?.index === 0) break;
    }
    return earliest;
  }
}
