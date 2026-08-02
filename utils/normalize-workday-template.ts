import {
  getWorkdayMapColorKeyAtPaletteIndex,
  isWorkdayMapColorKey,
  WORKDAY_MAP_COLOR_KEYS,
  type WorkdayMapColorKey,
} from '@/utils/workday-map-colors';
import {
  normalizeWorkdayTemplateName,
  type WorkdayTemplate,
} from '@/types/workday-template';

export type NormalizeWorkdayTemplatesCatalogResult = {
  changed: boolean;
  templates: WorkdayTemplate[];
};

function compareTemplatesForCatalogOrder(left: WorkdayTemplate, right: WorkdayTemplate): number {
  const createdCompare = left.createdAt.localeCompare(right.createdAt);

  if (createdCompare !== 0) {
    return createdCompare;
  }

  return left.id.localeCompare(right.id);
}

/** Base pin label (1–2 chars) from a free-form Workday name. */
export function deriveWorkdayPinAbbreviationBase(name: string): string {
  const normalized = normalizeWorkdayTemplateName(name);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0]!.slice(0, 1).toUpperCase();
  }

  const lastWord = words[words.length - 1]!;

  if (words.length === 2 && /^[A-Za-z0-9]{1,2}$/.test(lastWord)) {
    const firstInitial = words[0]!.slice(0, 1).toUpperCase();
    const lastInitial = lastWord.slice(0, 1).toUpperCase();

    return `${firstInitial}${lastInitial}`.slice(0, 2);
  }

  return words
    .map((word) => word.slice(0, 1).toUpperCase())
    .join('')
    .slice(0, 2);
}

function resolveAbbreviationCollisions(
  templates: WorkdayTemplate[],
): Map<string, string> {
  const sorted = [...templates].sort(compareTemplatesForCatalogOrder);
  const assigned = new Map<string, string>();
  const usedAbbreviations = new Map<string, string>();

  for (const template of sorted) {
    const base = deriveWorkdayPinAbbreviationBase(template.name);
    let candidate = base.slice(0, 2);

    if (usedAbbreviations.has(candidate) && usedAbbreviations.get(candidate) !== template.id) {
      const compactName = normalizeWorkdayTemplateName(template.name)
        .replace(/\s+/g, '')
        .toUpperCase();
      const third = compactName.charAt(2);
      candidate = third
        ? `${candidate.slice(0, 1)}${third}`.slice(0, 2)
        : `${candidate}${template.id.slice(-1).toUpperCase()}`.slice(0, 2);
    }

    if (usedAbbreviations.has(candidate) && usedAbbreviations.get(candidate) !== template.id) {
      candidate = `${base.slice(0, 1)}${template.id.replace(/\D/g, '').slice(-1) || '0'}`.slice(
        0,
        2,
      );
    }

    if (usedAbbreviations.has(candidate) && usedAbbreviations.get(candidate) !== template.id) {
      candidate = template.id.slice(-2).toUpperCase();
    }

    usedAbbreviations.set(candidate, template.id);
    assigned.set(template.id, candidate);
  }

  return assigned;
}

function assignMapColorKeys(templates: WorkdayTemplate[]): Map<string, WorkdayMapColorKey> {
  const sorted = [...templates].sort(compareTemplatesForCatalogOrder);
  const assigned = new Map<string, WorkdayMapColorKey>();
  const usedKeys = new Set<WorkdayMapColorKey>();

  for (const template of sorted) {
    if (
      template.mapColorKey &&
      isWorkdayMapColorKey(template.mapColorKey) &&
      !usedKeys.has(template.mapColorKey)
    ) {
      assigned.set(template.id, template.mapColorKey);
      usedKeys.add(template.mapColorKey);
    }
  }

  let nextPaletteIndex = 0;

  for (const template of sorted) {
    if (assigned.has(template.id)) {
      continue;
    }

    let picked: WorkdayMapColorKey | null = null;

    for (let scan = 0; scan < WORKDAY_MAP_COLOR_KEYS.length; scan += 1) {
      const candidate = getWorkdayMapColorKeyAtPaletteIndex(nextPaletteIndex + scan);

      if (!usedKeys.has(candidate)) {
        picked = candidate;
        nextPaletteIndex += scan + 1;
        break;
      }
    }

    if (!picked) {
      picked = getWorkdayMapColorKeyAtPaletteIndex(
        sorted.findIndex((entry) => entry.id === template.id),
      );
    }

    assigned.set(template.id, picked);
    usedKeys.add(picked);
  }

  return assigned;
}

function templateNeedsNormalization(
  template: WorkdayTemplate,
  nextColor: WorkdayMapColorKey,
  nextAbbreviation: string,
): boolean {
  const colorValid =
    template.mapColorKey !== undefined &&
    isWorkdayMapColorKey(template.mapColorKey) &&
    template.mapColorKey === nextColor;
  const abbreviationValid =
    template.pinAbbreviation !== undefined &&
    template.pinAbbreviation.trim().length > 0 &&
    template.pinAbbreviation === nextAbbreviation;

  return !(colorValid && abbreviationValid);
}

/** Assign stable map metadata across the full template catalog. */
export function normalizeWorkdayTemplatesCatalog(
  templates: WorkdayTemplate[],
): NormalizeWorkdayTemplatesCatalogResult {
  if (templates.length === 0) {
    return { changed: false, templates: [] };
  }

  const colorById = assignMapColorKeys(templates);
  const abbreviationById = resolveAbbreviationCollisions(templates);
  let changed = false;

  const normalized = templates.map((template) => {
    const mapColorKey = colorById.get(template.id)!;
    const pinAbbreviation = abbreviationById.get(template.id)!;

    if (!templateNeedsNormalization(template, mapColorKey, pinAbbreviation)) {
      return template;
    }

    changed = true;

    return {
      ...template,
      mapColorKey,
      pinAbbreviation,
    };
  });

  return { changed, templates: normalized };
}

export function normalizeSingleWorkdayTemplateInCatalog(
  templates: WorkdayTemplate[],
): WorkdayTemplate[] {
  return normalizeWorkdayTemplatesCatalog(templates).templates;
}
