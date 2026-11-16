import { textGeometry, TIER_ORDER } from './engine.js';

// The Figma badges (Hypernova Internal, "Badges update 1"), rebuilt from scratch as specs.
// Sizes are cleaned up: whole pixels, even widths so everything centres on x = 75,
// dots placed by the engine rule instead of by hand.

// Shape families: plate + gem pairs that every badge in a ladder shares.
export const FAMILIES = {
  oval: {
    label: 'Oval', light: 'center',
    plate: { shape: 'oval', w: 80, h: 94, y: 28 },
    gem: { shape: 'oval', w: 56, h: 66, y: 42 },
  },
  hex: {
    label: 'Hexagon', light: 'high',
    plate: { shape: 'hex', w: 80, h: 92, y: 29, params: { shoulder: 23, r: 24 } },
    gem: { shape: 'hex', w: 58, h: 66, y: 42, params: { shoulder: 16.5, r: 16 } },
  },
  shield: {
    label: 'Shield', light: 'high',
    plate: { shape: 'shield', w: 80, h: 80, y: 35, params: { corner: 10, knee: 0.7125, r: 64 } },
    gem: { shape: 'shield', w: 56, h: 58, y: 45, params: { corner: 4, knee: 0.715, r: 40 } },
  },
  rhombus: {
    label: 'Rhombus', light: 'high',
    plate: { shape: 'rhombus', w: 80, h: 92, y: 29, params: { r: 19.35 } },
    gem: { shape: 'hex', w: 58, h: 66, y: 42, split: false, params: { shoulder: 25, r: 4.8 } },
  },
  crest: {
    label: 'Crest', light: 'center',
    plate: { shape: 'crest', w: 90, h: 88, y: 30, params: { top: 0.411, mid: 0.4985, r: 13 } },
    gem: { shape: 'triangle', w: 70, h: 66, y: 31, params: { r: 4 } },
  },
  star: {
    label: 'Star', light: 'center',
    plate: { shape: 'rhombus', w: 60, h: 60, y: 45, params: { r: 24, tip: 18 } },
    gem: { shape: 'sparkle', w: 64, h: 88, y: 31 },
  },
  lens: {
    label: 'Star lens', light: 'center',
    plate: { shape: 'rhombus', w: 58, h: 84, y: 35, params: { r: 30, mid: 0.44, tip: 12, btip: 0 } },
    gem: { shape: 'sparkle', w: 64, h: 88, y: 31 },
  },
  // K_5: a faceted bezel (five flat facets) around a stone, measured from the 2x bitmap in Figma
  cut: {
    label: 'Gem cut', light: 'center',
    plate: { shape: 'hex', w: 58, h: 75, y: 46, params: { shoulder: 29, r: 12 } },
    gem: { shape: 'gemcut', w: 74, h: 60, y: 45, params: { top: 0.5, shoulder: 0.42 }, bezel: { w: 50, h: 39, y: 53, params: { top: 0.51, shoulder: 0.42 } } },
  },
};

// Base shapes drawn in Figma (Hypernova Internal, node 586:8480), cleaned to whole pixels and
// centred on 75. Plate and gem share one outline except Cushion (cloud plate) and Wavy seal.
// Octagon, U shield and Wavy seal were scaled-up groups in Figma; kept at that size (gem ~68 px).
export const BASE_FAMILIES = {
  pennant: {
    label: 'Pennant', light: 'center',
    plate: { shape: 'pennant', w: 90, h: 92, y: 29 },
    gem: { shape: 'pennant', w: 68, h: 70, y: 40 },
  },
  flower: {
    label: 'Flower', light: 'center',
    plate: { shape: 'flower', w: 90, h: 84, y: 33 },
    gem: { shape: 'flower', w: 68, h: 64, y: 43 },
  },
  cushion: {
    label: 'Cushion', light: 'center',
    plate: { shape: 'cloud', w: 90, h: 92, y: 29 },
    gem: { shape: 'cushion', w: 76, h: 76, y: 37 },
  },
  brilliant: {
    label: 'Brilliant', light: 'center',
    plate: { shape: 'brilliant', w: 106, h: 88, y: 31 },
    gem: { shape: 'brilliant', w: 84, h: 70, y: 40 },
  },
  octagon: {
    label: 'Octagon', light: 'center',
    plate: { shape: 'octagon', w: 96, h: 96, y: 27, params: { r: 12 } },
    gem: { shape: 'octagon', w: 68, h: 68, y: 41, params: { r: 12 } },
  },
  ushield: {
    label: 'U shield', light: 'center',
    plate: { shape: 'shield', w: 86, h: 100, y: 25, params: { corner: 15.6, knee: 0.532, r: 50, tip: 11 } },
    gem: { shape: 'shield', w: 62, h: 72, y: 39, params: { corner: 11.2, knee: 0.532, r: 36, tip: 8 } },
  },
  seal: {
    label: 'Wavy seal', light: 'center',
    plate: { shape: 'wavy', w: 94, h: 104, y: 23 },
    gem: { shape: 'wavyGem', w: 66, h: 74, y: 38 },
  },
};
Object.assign(FAMILIES, BASE_FAMILIES);

// reusable glyph parts
const G = {
  diamond: (w, y) => ({ shape: 'diamond', w, h: w, y, style: 'glass' }),
  chev45: (y, style = 'glass') => ({ shape: 'chevron', w: 26, h: 20, y, style, params: { angle: 45 } }),
  hexRecess: { shape: 'hex', w: 42, h: 50, y: 50, style: 'recess', alpha: 0.21, params: { shoulder: 12.5, r: 8 } },
  slab: (y) => ({ shape: 'hex', w: 26, h: 22, y, style: 'glass', params: { shoulder: 7.5, r: 4 } }),
  smallHex: (y) => ({ shape: 'hex', w: 18, h: 22, y, style: 'glass', params: { shoulder: 7.5, r: 4 } }),
  rivets: { shape: 'oval', w: 4, h: 4, y: 73, x: 16, style: 'glass' },
  rhRecess: { shape: 'hex', w: 36, h: 50, y: 50, style: 'recess', alpha: 0.49, params: { shoulder: 15.4, r: 3 } },
  innerStar: { shape: 'sparkle', w: 40, h: 44, y: 53, style: 'recess', alpha: 0.21, blend: 'overlay' },
  coreStar: { shape: 'sparkle', w: 20, h: 26, y: 62, style: 'glass' },
  crystal: (style = 'glass') => ({ shape: 'hex', w: 18, h: 26, y: 62, style, params: { shoulder: 8, r: 2 } }),
};

// glyphs inherit the family's lighting preset unless they set their own
const B = (id, name, series, family, rarity, level, glyphs, extra = {}) => ({
  id, name, series, family, rarity, level,
  glyphs: glyphs.map((g) => ({ light: FAMILIES[family].light, ...g })),
  plate: FAMILIES[family].plate, gem: FAMILIES[family].gem, ...(FAMILIES[family].spec || {}), ...extra,
});

export const FIGMA_BADGES = [
  B('A_1', 'Welcome', 'A. Onboarding', 'oval', 'silver', 2, [G.diamond(26, 62)]),
  B('A_2', 'Connected', 'A. Onboarding', 'oval', 'silver', 3, [G.diamond(14, 56), G.diamond(14, 80)]),
  B('A_3', 'First Blood', 'A. Onboarding', 'oval', 'silver', 4, [
    { shape: 'teardrop', w: 16, h: 25, y: 55, style: 'glass' }, G.diamond(10, 86)]),
  B('A_4', 'Green Day', 'A. Onboarding', 'oval', 'silver', 5, [G.chev45(62), G.diamond(12, 76)]),
  B('A_5', 'Going Live', 'A. Onboarding', 'oval', 'blue', 6, [G.chev45(57), G.diamond(26, 69)]),

  B('B_1', '$100k', 'B. Volume ladder', 'hex', 'silver', 2, [
    { shape: 'hex', w: 30, h: 34, y: 60, style: 'recess', alpha: 0.49, params: { shoulder: 8.5, r: 4 } }]),
  B('B_2', '$1M', 'B. Volume ladder', 'hex', 'silver', 3, [G.hexRecess,
    { shape: 'hex', w: 26, h: 30, y: 60, style: 'glass', params: { shoulder: 7.5, r: 4 } }]),
  B('B_3', '$10M', 'B. Volume ladder', 'hex', 'silver', 4, [G.hexRecess, G.slab(58), G.slab(69)]),
  B('B_4', '$50M', 'B. Volume ladder', 'hex', 'silver', 5, [G.hexRecess, G.slab(63), G.slab(55), G.slab(71)]),
  B('B_5', '$250M', 'B. Volume ladder', 'hex', 'blue', 6, [G.hexRecess, G.rivets, G.smallHex(64)]),
  B('B_6', '$250M alt', 'B. Volume ladder', 'hex', 'blue', 6, [G.hexRecess, G.rivets, G.smallHex(70), G.smallHex(58)]),
  B('B_7', '$1B', 'B. Volume ladder', 'hex', 'purple', 6, [G.hexRecess,
    { shape: 'sparkle', w: 28, h: 36, y: 57, style: 'glass' }]),

  B('C_1', '$500', 'C. Payout ladder', 'shield', 'silver', 2, [
    { shape: 'chevron', w: 34, h: 20, y: 61, style: 'recess', alpha: 0.49 }]),
  B('C_2', '$2k', 'C. Payout ladder', 'shield', 'silver', 3, [
    { shape: 'chevron', w: 26, h: 14, y: 58, style: 'recess', alpha: 0.49 },
    { shape: 'chevron', w: 26, h: 14, y: 69, style: 'recess', alpha: 0.49 }]),
  B('C_3', '$5k', 'C. Payout ladder', 'shield', 'blue', 4, [
    { shape: 'chevron', w: 24, h: 12, y: 62, style: 'glass', params: { angle: 28 } },
    { shape: 'chevron', w: 24, h: 12, y: 52, style: 'glass', params: { angle: 28 } },
    { shape: 'chevron', w: 24, h: 12, y: 78, style: 'glass', params: { angle: 28, flip: true } }]),
  B('C_4', '$15k', 'C. Payout ladder', 'shield', 'blue', 5, [
    { shape: 'chevron', w: 28, h: 14, y: 53, style: 'glass', params: { angle: 28 } },
    { shape: 'hex', w: 14, h: 10, y: 66, style: 'glass', params: { shoulder: 3.5 } },
    { shape: 'chevron', w: 28, h: 14, y: 75, style: 'glass', params: { angle: 28, flip: true } }]),
  B('C_5', '$40k', 'C. Payout ladder', 'shield', 'purple', 4, [
    { shape: 'shield', w: 38, h: 41, y: 53, style: 'recess', alpha: 0.21, blend: 'overlay', params: { knee: 0.688, r: 24 } }],
    { dotPhase: 'split', ornaments: { topBar: true, bottomChevron: true } }),

  B('H_1', 'Multi-Pair I', 'H. Collection ladder', 'rhombus', 'silver', 2, [G.rhRecess, G.crystal()]),
  B('H_2', 'Multi-Pair II', 'H. Collection ladder', 'rhombus', 'blue', 3, [G.rhRecess, G.crystal('glass-tint')]),
  B('H_3', 'Multi-Pair III', 'H. Collection ladder', 'rhombus', 'purple', 4, [G.rhRecess, G.crystal()]),

  B('I_1', 'Referrer I', 'I. Referral milestones', 'crest', 'silver', 3, [
    { shape: 'triangle', w: 32, h: 33, y: 52, style: 'glass' }]),
  B('I_2', 'Rainmaker', 'I. Referral milestones', 'crest', 'purple', 4, [
    { shape: 'triangle', w: 32, h: 33, y: 52, style: 'glass' }]),
  B('I_3', 'Kingmaker', 'I. Referral milestones', 'crest', 'gold', 5, [
    { shape: 'triangle', w: 32, h: 33, y: 52, style: 'glass' }]),

  B('K_1', 'Top 500', 'K. Competition & leaderboard', 'star', 'blue', 4, [{ shape: 'sparkle', w: 40, h: 44, y: 53, style: 'glass' }], { dotPhase: 'split' }),
  B('K_2', 'Top 100', 'K. Competition & leaderboard', 'star', 'purple', 4, [G.innerStar], { dotPhase: 'split' }),
  B('K_3', 'Top 10', 'K. Competition & leaderboard', 'star', 'purple', 4, [G.innerStar, G.coreStar],
    { dotPhase: 'split', ornaments: { sideArrows: true } }),
  B('K_4', 'Podium', 'K. Competition & leaderboard', 'lens', 'gold', 4, [G.innerStar, G.coreStar],
    { dotPhase: 'split', ornaments: { sideArrows: true } }),
  // gold setting with a purple stone and a glass crystal on top
  B('K_5', 'Champion', 'K. Competition & leaderboard', 'cut', 'gold', 3, [
    { shape: 'gemcut', w: 26, h: 21, y: 62, style: 'glass', fill: 0.5, params: { top: 0.52, shoulder: 0.38 } }],
    { gem: { ...FAMILIES.cut.gem, bezel: { ...FAMILIES.cut.gem.bezel, stone: 'purple' } }, ornaments: { topBar: { w: 9, y: 41.5 } } }),
];

/* ------------------------------------------------------------------ */
/* Families D, E, F, G, J on the base shapes drawn in Figma             */
/* ------------------------------------------------------------------ */
// The badge catalogue (Figma node 418:6334) has families A to K. A, B, C, H, I and K are drawn in
// Figma (above). The other five get one of the base shapes from node 586:8480 each, and levels get
// the brilliant. No two families share a shape; the octagon is spare.
export const FAMILY_SHAPES = { D: 'flower', E: 'seal', F: 'ushield', G: 'cushion', J: 'pennant', L: 'brilliant' };
export const SPARE_SHAPES = ['octagon'];

// Colours follow the Figma badges (A, B, C, H, I, K): a badge takes the colour its catalogue
// rarity has there, common silver, rare blue, epic purple, legendary gold. Colours may repeat
// inside a family, as in Figma (A is silver four times). Every family runs from the lowest rarity
// to the highest, and the rarer the badge, the fuller its icon. Dots: step + 1 on ladders, by rarity
// on sets. Bronze and ruby are the level colours (with silver, gold and purple), not badge rarities.
export const CLIMB = ['bronze', 'silver', 'blue', 'gold', 'ruby', 'purple'];
export const RARITY_COLOUR = { common: 'silver', rare: 'blue', epic: 'purple', legendary: 'gold' };
export const RARITY_DOTS = { common: 2, rare: 3, epic: 4, legendary: 5 };

// The inner glyphs are drawn from the family's own outline: fewer petals, fluffs or scallops than
// the base, the same shield or pennant smaller, rings of it, and the gem's own echo. The rarer the
// badge, the fuller: the top of each family has two layers of its shape.
const cy = (c, g) => ({ ...g, y: Math.round(c - g.h / 2) });
const ECHO = { of: 'gem', d: -8, style: 'recess', alpha: 0.21 };
const ringOf = (outer, inner, style = 'glass') => ({ parts: [outer, inner], evenodd: true, style, shape: outer.shape });
const sz = (shape, w, h, c, params, style = 'glass', more = {}) => cy(c, { shape, w, h, style, ...(params ? { params } : {}), ...more });

// flower: petals around a core, 'petal' = one on the axis, 'gap' = a notch on the axis (like the base)
const PETAL = { 3: [0.55, 0.45, 0.3], 4: [0.56, 0.42, 0.36], 5: [0.58, 0.38, 0.42], 6: [0.6, 0.33, 0.46] };
const bloom = (n, w, c, style = 'glass', top = 'petal', more = {}) => {
  const [ring, size, core] = PETAL[n];
  return sz('petals', w, w, c, { n, top, ring, size, core, k: 0.05 }, style, more);
};
// seal: shallow waves on a big core, a little taller than wide like the base
const rosette = (n, w, c, style = 'glass', more = {}) =>
  sz('petals', w, Math.round(w * 1.12), c, { n, top: 'petal', ring: 0.84, size: 0.2, core: 0.9, k: 0.1 }, style, more);
// U shield: the base gem's proportions at any width
const ush = (w, c, style = 'glass', more = {}) => sz('shield', w, Math.round((w * 72) / 62), c,
  { corner: (11.2 * w) / 62, knee: 0.532, r: (36 * w) / 62, tip: (8 * w) / 62 }, style, more);
// seal: the wavy seal gem itself, smaller (same outline, same waves)
const seal = (w, c, style = 'glass', more = {}) => sz('wavyGem', w, Math.round((w * 75.094) / 66.607), c, null, style, more);
// cushion: the cushion gem itself, any size (stretched for slabs and blades)
const cush = (w, h, c, style = 'glass', more = {}) => sz('cushion', w, h, c, null, style, more);
// cloud: n fluffs on a flat base
const puff = (n, w, h, c, style = 'glass', more = {}) => sz('puff', w, h, c, { n, k: 0.1 }, style, more);
// pennant: the base outline, its notch cut deeper so it still reads small
const flag = (w, c, style = 'glass', more = {}) => sz('banner', w, Math.round(w * 1.08), c, { notch: 0.26, r: w / 8 }, style, more);

// [letter, series, family note, kind, badges]; a badge is [name, catalogue rarity, tag, glyphs, extra]
const NEW_FAMILIES = [
  ['D', 'D. Trading-days ladder', 'counts trading days', 'ladder', [
    ['Days 5', 'common', 'days i', [bloom(3, 30, 74, 'recess', 'gap', { alpha: 0.49 })]],
    ['Days 25', 'common', 'days ii', [bloom(4, 32, 75, 'glass', 'gap')]],
    ['Days 100', 'rare', 'days iii', [ECHO, bloom(5, 34, 75)]],
    ['Days 250', 'epic', 'days iv', [ECHO, bloom(6, 36, 75, 'glass', 'gap'), sz('oval', 8, 8, 75, null, 'recess', { alpha: 0.49 })]],
    ['Veteran 500', 'epic', 'days v', [ECHO, bloom(6, 46, 75, 'recess', 'gap', { alpha: 0.49 }), bloom(6, 28, 75, 'glass', 'petal')],
      { ornaments: { topBar: true } }],
  ]],
  ['E', 'E. Nova milestones', 'score thresholds, first reach', 'ladder', [
    ['Solid Citizen', 'rare', 'nova 55+', [seal(34, 75, 'recess', { alpha: 0.49 })]],
    ['Strong Hand', 'epic', 'nova 70+', [seal(34, 75)]],
    ['Elite', 'legendary', 'nova 85+', [ECHO, seal(38, 75), seal(16, 75, 'recess', { alpha: 0.49 })]],
    ['The Maxer', 'legendary', 'nova 95+', [ECHO, ringOf(seal(44, 75), seal(32, 75)), seal(18, 75)],
      { ornaments: { topBar: true } }],
    ['Comeback', 'rare', 'nova comeback', [ringOf(seal(40, 75), seal(28, 75), 'recess'), seal(14, 70)], { side: true }],
  ]],
  ['F', 'F. Identity / OG', 'time-gated, never retrofitted', 'set', [
    ["Founder's Funded", 'rare', 'launch month', [ush(36, 73)]],
    ["Founder's Funded", 'legendary', 'first 100', [ush(40, 74, 'recess', { alpha: 0.49 }), ush(20, 72)]],
    ['OG', 'legendary', 'closed alpha', [ECHO, ush(34, 73, 'recess', { alpha: 0.49 }), ush(16, 72, 'glass', { x: 9 })],
      { ornaments: { topBar: true } }],
  ]],
  ['G', 'G. Quirky & behavioural', 'hidden until earned', 'set', [
    ['Second Windz', 'common', 'behavioural', [puff(3, 40, 25, 69), sz('oval', 28, 3, 87, null, 'recess', { alpha: 0.49 }), sz('oval', 16, 3, 93, null, 'recess', { alpha: 0.49 })]],
    ['Touch Grass', 'common', 'behavioural', [cush(44, 10, 91, 'recess', { alpha: 0.49 }), cush(6, 22, 76), cush(16, 9, 63, 'glass', { x: 9, rot: -32 })]],
    ['GM', 'common', 'behavioural', [sz('oval', 22, 22, 68, null, 'recess', { alpha: 0.49 }), puff(3, 46, 28, 82)]],
    ['Ser', 'common', 'behavioural', [ringOf(cush(40, 40, 75), cush(26, 26, 75))]],
    ['Sold the Bottom', 'common', 'commiseration', [ringOf(cush(42, 42, 75), cush(30, 30, 75), 'recess'), cush(16, 12, 82)]],
    ['Clean Slate', 'rare', 'behavioural', [ringOf(puff(3, 48, 34, 75), puff(3, 32, 21, 76))]],
    ['Comeback Kid', 'rare', 'behavioural', [puff(3, 30, 20, 88, 'recess', { alpha: 0.49 }), puff(3, 44, 29, 68)]],
    ['Lazarus', 'rare', 'behavioural', [puff(3, 46, 30, 84, 'recess', { alpha: 0.49 }), puff(3, 26, 17, 64)]],
    ['Know When to Stop', 'rare', 'behavioural', [puff(3, 44, 30, 67), sz('oval', 38, 4, 92, null, 'recess', { alpha: 0.49 })]],
    ['Bug Hunter', 'rare', 'per bug fixed', [puff(4, 48, 32, 75), sz('oval', 5, 5, 76, null, 'recess', { alpha: 0.49, x: 7 })]],
    ['Zen Master', 'epic', 'behavioural', [ECHO, cush(38, 14, 88), cush(28, 12, 73), cush(18, 10, 60)]],
    ['Survived [Event]', 'legendary', 'black swan', [ECHO, cush(38, 38, 75), cush(16, 16, 75, 'recess', { alpha: 0.49 })],
      { level: 0, ornaments: { edgeBars: true } }],
  ]],
  ['J', 'J. Repeatables', 'no seasons, no resets', 'set', [
    ['Profitable Week', 'common', 'weekly', [flag(28, 72)]],
    ['Clean-Risk Week', 'common', 'weekly', [ringOf(flag(32, 72), flag(18, 69))]],
    ['Personal Best', 'common', 'monthly', [flag(36, 76, 'recess', { alpha: 0.49 }), flag(20, 75)]],
  ]],
];

// colour by catalogue rarity (as in Figma); dots = step + 1 on ladders, by rarity on sets.
// a side badge (E Comeback) takes its catalogue dots
export const NEW_BADGES = NEW_FAMILIES.flatMap(([L, series, note, kind, list]) => {
  const ladder = list.filter(([, , , , x]) => !(x && x.side));
  return list.map(([name, rar, tag, glyphs, extra = {}], i) => {
    const { side, colour, ...rest } = extra;
    const step = ladder.indexOf(list[i]);
    const ladderStep = kind === 'ladder' && !side;
    const rarity = colour || RARITY_COLOUR[rar];
    const level = ladderStep ? step + 2 : RARITY_DOTS[rar];
    return { ...B(`${L}_${i + 1}`, name, series, FAMILY_SHAPES[L], rarity, level, JSON.parse(JSON.stringify(glyphs)), rest), tag, catalogue: rar, familyNote: note };
  });
});

/* ------------------------------------------------------------------ */
/* Level badges: their own family, one step per colour band             */
/* ------------------------------------------------------------------ */
// Every family has a base shape of its own; levels get the brilliant (the diamond). Each colour band is a step of that ladder and adds a little (gem, inner echo, top bar,
// bottom line, side tips); the dots fill up through the band; the number is PolySans, engraved.
// Bands from the client: 1-19 bronze, 20-49 silver, then gold, ruby, purple.
// The gold / ruby / purple ranges were not given: 50-99, 100-199, 200+ is an assumption.
export const LEVEL_FAMILY = {
  label: 'Brilliant', light: 'center',
  plate: BASE_FAMILIES.brilliant.plate,
  gem: BASE_FAMILIES.brilliant.gem,
  centre: 66, maxW: 40,
};
export const LEVEL_BANDS = [
  { rarity: 'bronze', from: 1, to: 19, label: 'plain gem' },
  { rarity: 'silver', from: 20, to: 49, label: 'inner echo', echo: true },
  { rarity: 'gold', from: 50, to: 99, label: 'echo and top bar', echo: true, ornaments: { topBar: true } },
  { rarity: 'ruby', from: 100, to: 199, label: 'echo, top bar, bottom line, glass number', echo: true, numberStyle: 'glass', ornaments: { topBar: true, bottomChevron: true } },
  { rarity: 'purple', from: 200, to: 999, label: 'two echoes, top bar, bottom line, glass number', echo: true, numberStyle: 'glass',
    echo2: true, ornaments: { topBar: true, bottomChevron: true } },
];

// engraved = recessed like the Figma B and C glyphs, reads on light metals; glass = like A and I glyphs
export const NUMBER_STYLE = {
  engraved: { style: 'recess', alpha: 0.49 },
  glass: { style: 'glass' },
};

export const bandOf = (n) => LEVEL_BANDS.find((b) => n >= b.from && n <= b.to) || LEVEL_BANDS[LEVEL_BANDS.length - 1];

// dots fill up through the band: 1 dot at the start of a band, 5 near the top
export function levelBadge(n, opts = {}) {
  const band = opts.band || bandOf(n);
  const D = LEVEL_FAMILY;
  const span = band.to - band.from + 1;
  const step = Math.min(5, 1 + Math.floor(((n - band.from) / span) * 5));
  const digits = String(n);
  let h = digits.length <= 2 ? 22 : 18;
  const font = digits.length >= 3 ? 'bulky' : 'wide';
  const width = textGeometry({ text: digits, h, font }).box.w;
  if (width > D.maxW) h = Math.floor((h * D.maxW) / width);
  return {
    id: `LV_${n}`, name: `Level ${n}`, series: 'L. Level badges', kind: 'level', family: 'level', rarity: band.rarity, level: opts.dots ?? step,
    plate: D.plate, gem: D.gem, ...(band.ornaments ? { ornaments: band.ornaments } : {}),
    glyphs: [
      ...(band.echo ? [{ ...ECHO, d: -7, light: D.light }] : []),
      ...(band.echo2 ? [{ ...ECHO, d: -13, light: D.light }] : []),
      { text: digits, font, h, y: Math.round(D.centre - h / 2), light: D.light, ...(NUMBER_STYLE[opts.numberStyle || band.numberStyle] || NUMBER_STYLE.engraved) },
    ],
  };
}

export const LEVEL_SHOWCASE = [1, 10, 19, 20, 35, 49, 50, 75, 99, 100, 150, 199, 200, 350, 999].map((n) => levelBadge(n));

const ORDER = 'ABCDEFGHIJK';
export const ALL_BADGES = [...FIGMA_BADGES, ...NEW_BADGES].sort((a, b) => ORDER.indexOf(a.id[0]) - ORDER.indexOf(b.id[0]) || +a.id.slice(2) - +b.id.slice(2)).concat(LEVEL_SHOWCASE);

// Not finished: badges you flagged as wrong, and badges you asked to have sent (you will redo them
// in Figma). Shown as "Open" in the Library. Keyed by current id; "was" = the id when flagged.
const SENT = 'sent to you to redo in Figma';
export const OPEN = {
  I_2: SENT,
  D_1: SENT, D_2: SENT, D_3: SENT, D_4: SENT, D_5: SENT,
  E_1: 'flagged: inner shape did not match the seal (redrawn, not approved)',
  E_2: 'flagged: inner shape did not match the seal (redrawn, not approved)',
  E_3: 'flagged: inner shape did not match the seal (redrawn, not approved)',
  E_4: 'flagged: inner shape did not match the seal (redrawn, not approved)',
  E_5: 'flagged: inner shape did not match the seal (redrawn, not approved)',
  F_1: 'flagged: icon too small (was F_3)',
  F_2: SENT,
  F_3: 'flagged: too many shapes (was F_1)',
  G_1: SENT, G_3: `${SENT} (was G_8)`, G_4: `flagged: make a new one, not a cloud (was G_9); ${SENT}`,
  G_2: `flagged: make a new Touch Grass (was G_7); ${SENT}`,
  G_5: `flagged: make a new one, not a cloud (was G_10); ${SENT}`,
  G_6: SENT, G_7: SENT, G_8: SENT, G_10: SENT,
  G_9: `flagged: more space between cloud and line (was G_6); ${SENT}`,
  G_11: `flagged: bugged (was G_2); ${SENT}`,
  G_12: `flagged: new inner shape, lines instead of dots; ${SENT}`,
  J_3: 'flagged: inner icon misaligned',
  LV_999: SENT,
};
