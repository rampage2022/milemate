/**
 * Layout metrics aligned to `designs/approved/1_home_screen_v1.png` (375×812 reference).
 * Horizontal inset matches MileMateTokens.screenPaddingMin (20pt at reference width).
 */
export const HomeLayout = {
  screenPaddingHorizontal: 20,
  sectionGap: 16,
  actionListGap: 14,
  cardRadius: 16,
  cardPadding: 16,
  /** Start / Weather / Navigation summary card (~15% shorter than prior home spec). */
  statusSummaryScale: 0.85,
  statusSummaryPadding: 14,
  statusIconCircleSize: 40,
  statusIconGlyphSize: 20,
  statusColumnGap: 7,
  statusLabelFontSize: 11,
  statusValueFontSize: 13,
  statusValueLineHeight: 17,
  statusSubvalueFontSize: 11,
  statusSubvalueLineHeight: 15,
  weatherValueFontSize: 19,
  weatherValueLineHeight: 22,
  readyRowPaddingTop: 10,
  readyFontSize: 12,
  readyIconSize: 15,
  statusDividerMarginVertical: 3,
  /** Primary home action rows (New / Load / Workday History). */
  actionCardMinHeight: 112,
  actionCardPaddingHorizontal: 20,
  actionCardPaddingVertical: 20,
  actionCardBorderWidth: 1,
  actionCardRowGap: 16,
  actionIconSize: 60,
  actionIconRadius: 14,
  actionIconGlyphSize: 30,
  actionTitleFontSize: 22,
  actionTitleLineHeight: 28,
  actionDescriptionFontSize: 16,
  actionDescriptionLineHeight: 22,
  actionChevronSize: 24,
  actionCopyGap: 6,
  headerRowGap: 12,
  statusGridGap: 0,
  yellow: '#FFD60A',
  yellowSoft: 'rgba(255,214,10,0.18)',
  greetingFontSize: 28,
  greetingLineHeight: 34,
  greetingLetterSpacing: -0.4,
  subGreetingFontSize: 16,
  subGreetingLineHeight: 22,
  avatarSize: 44,
  avatarBorderWidth: 2,
} as const;

export function splitHomeStartAddress(address: string): {
  localityLine: string;
  streetLine: string;
} {
  const trimmed = address.trim();

  if (!trimmed) {
    return { streetLine: 'Not set', localityLine: '' };
  }

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length <= 1) {
    return { streetLine: trimmed, localityLine: '' };
  }

  return {
    streetLine: parts[0] ?? trimmed,
    localityLine: parts.slice(1).join(', '),
  };
}
