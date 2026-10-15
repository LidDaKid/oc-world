// the trading card's choices: types, frames, rarities (the png maker uses the same colors)

export const TYPES = [
  { id: 'fire', label: 'fire', icon: '1f525', color: '#ff6a3d' },
  { id: 'water', label: 'water', icon: '1f4a7', color: '#4fb6ff' },
  { id: 'nature', label: 'nature', icon: '1f33f', color: '#62c95f' },
  { id: 'electric', label: 'electric', icon: '26a1', color: '#ffcf2e' },
  { id: 'psychic', label: 'psychic', icon: '1f52e', color: '#c77dff' },
  { id: 'dark', label: 'dark', icon: '1f319', color: '#6d5a9e' },
  { id: 'spooky', label: 'spooky', icon: '1f987', color: '#9b59ff' },
  { id: 'ghost', label: 'ghost', icon: '1f47b', color: '#cdb8ff' },
  { id: 'skull', label: 'undead', icon: '1f480', color: '#b8b2a8' },
  { id: 'love', label: 'love', icon: '1f496', color: '#ff4fa3' },
  { id: 'music', label: 'music', icon: '1f3b8', color: '#ff8a3d' },
  { id: 'ice', label: 'ice', icon: '2744-fe0f', color: '#8fe3ff' },
  { id: 'star', label: 'star', icon: '2b50', color: '#ffd84d' },
  { id: 'chaos', label: 'chaos', icon: '1f300', color: '#45e0b8' },
];

// b = border colors, p = inside colors, ink = text, font = the name's font, edge = around the art, box = behind moves
export const FRAMES = [
  { id: 'classic', label: 'classic', b: ['#ffe36b', '#e9b51f', '#fff3a8'], p: ['#fff8dc', '#f1dc98'], ink: '#2a1a12', font: 'Fredoka', edge: '#c99a1d', box: 'rgba(255,255,255,.5)', tint: true },
  { id: 'scene', label: 'scene', b: ['#121012', '#ff2fa0', '#121012'], p: ['#1b1119', '#2b0f24'], ink: '#ffe3f3', font: 'Sedgwick Ave Display', edge: '#ff2fa0', box: 'rgba(255,47,160,.13)' },
  { id: 'spooky', label: 'spooky', b: ['#2a1540', '#5d2a85', '#120a1c'], p: ['#1d1228', '#2e1a40'], ink: '#efe3ff', font: 'UnifrakturMaguntia', edge: '#b48cff', box: 'rgba(180,140,255,.12)' },
  { id: 'monster', label: 'monster', b: ['#141014', '#ff5fb8', '#141014'], p: ['#ffe8f4', '#ffc4e3'], ink: '#2a0a1b', font: 'Creepster', edge: '#141014', box: 'rgba(255,255,255,.62)' },
  { id: 'candy', label: 'candy', b: ['#ffb3d9', '#ff86c5', '#ffe0f0'], p: ['#fff3fa', '#ffdcee'], ink: '#5a1d42', font: 'Fredoka', edge: '#ff86c5', box: 'rgba(255,255,255,.72)' },
  { id: 'stardew', label: 'stardew', b: ['#9b5a2b', '#b9763d', '#6b3815'], p: ['#fcebc0', '#f0cf8c'], ink: '#4a2410', font: 'Pixelify Sans', edge: '#6b3a17', box: 'rgba(255,248,220,.55)' },
  { id: 'galaxy', label: 'galaxy', b: ['#1b1446', '#5a3ccf', '#0c0a24'], p: ['#120e30', '#241a5c'], ink: '#eef0ff', font: 'Playfair Display', edge: '#8fd3ff', box: 'rgba(143,211,255,.1)' },
  { id: 'chrome', label: 'y2k chrome', b: ['#ffffff', '#9aa3b5', '#f2f4fa'], p: ['#eef1f7', '#cfd6e4'], ink: '#1f2433', font: 'Nunito', edge: '#7b859a', box: 'rgba(255,255,255,.6)' },
];

export const RARITIES = [
  { id: 'common', label: 'common', sym: '●', w: 30 },
  { id: 'uncommon', label: 'uncommon', sym: '◆', w: 24 },
  { id: 'rare', label: 'rare', sym: '★', w: 18 },
  { id: 'reverse', label: 'reverse holo', sym: '★', w: 12 },
  { id: 'holo', label: 'holo rare', sym: '★', w: 8 },
  { id: 'ultra', label: 'ultra rare', sym: '★★', w: 5 },
  { id: 'secret', label: 'secret rare', sym: '✦', w: 2 },
];

export const typeOf = id => TYPES.find(t => t.id === id) || TYPES[0];
export const frameOf = id => FRAMES.find(f => f.id === id) || FRAMES[0];
export const rarityOf = id => RARITIES.find(r => r.id === id) || RARITIES[0];

export function rollRarity(rand = Math.random) {
  const total = RARITIES.reduce((n, r) => n + r.w, 0);
  let x = rand() * total;
  for (const r of RARITIES) { if ((x -= r.w) < 0) return r.id; }
  return 'common';
}

const GUESS = [
  [/vamp|bat|night|goth|shadow|dark/i, 'dark'], [/ghost|spirit|phantom|poltergeist/i, 'ghost'],
  [/witch|mage|magic|fairy|fae|psychic|oracle/i, 'psychic'], [/mer|sea|water|fish|siren|ocean/i, 'water'],
  [/fire|dragon|demon|phoenix|flame/i, 'fire'], [/zombie|skelet|skull|undead|bone|mummy/i, 'skull'],
  [/wolf|were|beast|plant|elf|nature|dryad|fox/i, 'nature'], [/robot|android|electric|cyborg|tech/i, 'electric'],
  [/ice|snow|frost|yeti|winter/i, 'ice'], [/sing|music|band|rock|guitar|drum/i, 'music'],
  [/love|angel|cupid|heart/i, 'love'], [/star|alien|space|celestial/i, 'star'],
];

export function guessType(char) {
  const text = [...(char.basics || []).map(b => b.value), ...(char.tags || []), char.tagline].join(' ');
  for (const [re, id] of GUESS) if (re.test(text)) return id;
  return 'spooky';
}

export const STAT_NAMES = ['chaos', 'drama', 'cuteness', 'spooky', 'sass', 'loyalty', 'brains', 'rizz', 'luck', 'style'];

export const MOVES = [
  ['dramatic exit', 'flips their hair and walks off. the whole room is shook.'],
  ['eyeliner wing', 'so sharp it counts as a weapon.'],
  ['sad song spiral', 'puts on the saddest playlist known to exist. everyone in range starts crying.'],
  ['death stare', 'the opponent forgets what they were saying.'],
  ['glitter bomb', 'covers the field in sparkles. nobody is ever getting this out.'],
  ['midnight snack', 'heals 30 hp. crumbs everywhere.'],
  ['side eye', 'confuses the opponent for one turn.'],
  ['chaos mode', 'flip a coin. if heads, this attack does 50 more damage.'],
  ['bff assist', 'swap in a friend from your bench. they bring snacks.'],
  ['scream into pillow', 'all stress is gone. raises defense.'],
];
