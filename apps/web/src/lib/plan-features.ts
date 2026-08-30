export const PLAN_SUBTITLE_LANGS = [
  'Español',
  'English',
  'Português',
  '日本語',
  'Français',
  'Italiano',
] as const;

export const PLAN_SUBTITLE_TYPES = [
  'Subtítulos',
  'CC',
  'Forzados',
  'SRT',
  'VTT',
  'ASS/karaoke',
] as const;

export const PLAN_AUDIO_TRACKS = ['Español', 'English', 'Japonés', 'Original'] as const;

export const PLAN_FEATURE_PREFIX = {
  subtitles: 'Subtítulos:',
  types: 'Tipos:',
  audio: 'Pistas de audio:',
} as const;

export const DEFAULT_PLAN_FEATURES_TEXT = [
  'Catálogo completo',
  'Sin anuncios',
  'Calidad HD',
  'Subtítulos: Español, English',
  'Tipos: SRT, VTT, CC',
  'Pistas de audio: Español, Original',
].join('\n');

function startsWithPrefix(line: string, prefix: string): boolean {
  return line.trim().toLowerCase().startsWith(prefix.toLowerCase());
}

export function isPlanMediaFeature(line: string): boolean {
  return Object.values(PLAN_FEATURE_PREFIX).some((prefix) => startsWithPrefix(line, prefix));
}

export function parsePrefixedFeature(text: string, prefix: string): string[] {
  const line = text.split('\n').find((entry) => startsWithPrefix(entry, prefix));
  if (!line) return [];
  return line
    .trim()
    .slice(prefix.length)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function upsertPrefixedFeature(text: string, prefix: string, values: string[]): string {
  const others = text
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry && !startsWithPrefix(entry, prefix));
  if (values.length > 0) {
    others.push(`${prefix} ${values.join(', ')}`);
  }
  return others.join('\n');
}

export interface PlanMediaGroup {
  key: keyof typeof PLAN_FEATURE_PREFIX;
  label: string;
  values: string[];
}

export function parsePlanMediaFeatures(features: string[]): PlanMediaGroup[] {
  const groups: PlanMediaGroup[] = [];
  for (const [key, prefix] of Object.entries(PLAN_FEATURE_PREFIX) as Array<
    [PlanMediaGroup['key'], string]
  >) {
    const values = parsePrefixedFeature(features.join('\n'), prefix);
    if (values.length > 0) {
      groups.push({ key, label: prefix.replace(':', ''), values });
    }
  }
  return groups;
}
