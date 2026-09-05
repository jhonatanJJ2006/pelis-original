import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN_FEATURES_TEXT,
  PLAN_FEATURE_PREFIX,
  isPlanMediaFeature,
  parsePlanMediaFeatures,
  parsePrefixedFeature,
  upsertPrefixedFeature,
} from './plan-features';

describe('plan subtitle feature lines', () => {
  it('parses default helper text into languages, types, and audio', () => {
    expect(parsePrefixedFeature(DEFAULT_PLAN_FEATURES_TEXT, PLAN_FEATURE_PREFIX.subtitles)).toEqual([
      'Español',
      'English',
    ]);
    const groups = parsePlanMediaFeatures(DEFAULT_PLAN_FEATURES_TEXT.split('\n'));
    expect(groups.map((g) => g.key)).toEqual(['subtitles', 'types', 'audio']);
  });

  it('upserts a feature line without dropping other bullets', () => {
    const next = upsertPrefixedFeature(
      'Catálogo completo\nSubtítulos: Español',
      PLAN_FEATURE_PREFIX.subtitles,
      ['Español', 'English'],
    );
    expect(next.split('\n')).toEqual(['Catálogo completo', 'Subtítulos: Español, English']);
  });

  it('detects media feature lines', () => {
    expect(isPlanMediaFeature('Subtítulos: Español, English')).toBe(true);
    expect(isPlanMediaFeature('Calidad HD')).toBe(false);
  });
});
