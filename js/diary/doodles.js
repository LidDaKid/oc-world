// hand-drawn looking doodles, drawn in whatever color the sticker id says ('d:heart:#ff3d8b').
// each one is the inside of a 100 x 100 svg, drawn with currentColor.

const line = d => `<path d='${d}' fill='none' stroke='currentColor' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/>`;
const solid = d => `<path d='${d}' fill='currentColor'/>`;

export const DOODLES = {
  heart: line('M50 84 C22 64 8 46 17 29 C26 13 45 17 50 33 C55 17 74 13 83 29 C92 46 78 64 50 84Z'),
  'double heart': line('M50 84 C22 64 8 46 17 29 C26 13 45 17 50 33 C55 17 74 13 83 29 C92 46 78 64 50 84Z') + line('M50 72 C31 58 22 46 27 36 C32 27 44 29 50 40 C56 29 68 27 73 36 C78 46 69 58 50 72Z'),
  'filled heart': solid('M50 86 C20 65 6 46 15 28 C25 11 45 15 50 31 C55 15 75 11 85 28 C94 46 80 65 50 86Z'),
  star: line('M50 8 L61 38 L93 39 L67 58 L77 90 L50 71 L23 90 L33 58 L7 39 L39 38Z'),
  'filled star': solid('M50 8 L61 38 L93 39 L67 58 L77 90 L50 71 L23 90 L33 58 L7 39 L39 38Z'),
  sparkle: solid('M50 6 Q55 45 94 50 Q55 55 50 94 Q45 55 6 50 Q45 45 50 6Z'),
  sparkles: solid('M38 10 Q42 40 70 44 Q42 48 38 78 Q34 48 6 44 Q34 40 38 10Z') + solid('M76 54 Q78 70 92 72 Q78 74 76 90 Q74 74 60 72 Q74 70 76 54Z'),
  crown: line('M14 76 L18 30 L36 52 L50 20 L64 52 L82 30 L86 76Z') + line('M14 86 H86'),
  arrow: line('M10 74 Q34 22 82 36') + line('M82 36 L64 28') + line('M82 36 L70 52'),
  'loop arrow': line('M8 70 C30 70 40 30 26 30 C12 30 22 62 50 62 C70 62 80 50 88 38') + line('M88 38 L72 38') + line('M88 38 L86 54'),
  swirl: line('M52 50 C52 44 60 44 60 50 C60 58 46 60 44 50 C42 38 62 34 68 48 C74 62 58 74 44 70 C28 66 26 44 36 34 C48 22 72 24 80 40'),
  lightning: line('M58 6 L26 54 H50 L40 94 L76 40 H54 L66 6Z'),
  flower: line('M50 50 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0') + line('M50 40 C38 14 62 14 50 40 M60 50 C86 38 86 62 60 50 M50 60 C62 86 38 86 50 60 M40 50 C14 62 14 38 40 50'),
  smiley: line('M50 50 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0') + solid('M36 36 m-5 0 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0 M64 36 m-5 0 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0') + line('M30 58 Q50 78 70 58'),
  'x eyes': line('M50 50 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0') + line('M28 30 L42 44 M42 30 L28 44 M58 30 L72 44 M72 30 L58 44') + line('M34 66 Q42 60 50 66 Q58 72 66 66'),
  bow: line('M50 50 C30 30 10 32 12 48 C14 64 32 62 50 50 C68 38 86 36 88 52 C90 68 70 70 50 50Z') + line('M50 50 L36 86 M50 50 L64 86') + solid('M50 50 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0'),
  cloud: line('M24 70 C8 70 8 48 24 48 C24 30 46 26 54 40 C62 26 86 32 82 52 C96 54 94 72 80 72Z'),
  moon: line('M64 10 C34 14 20 46 34 70 C46 90 76 92 90 76 C64 80 46 60 50 38 C52 26 58 16 64 10Z'),
  skull: line('M50 10 C24 10 14 30 18 52 C20 62 26 64 28 70 V84 H72 V70 C74 64 80 62 82 52 C86 30 76 10 50 10Z') + solid('M37 46 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M63 46 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0') + line('M42 84 V74 M50 84 V74 M58 84 V74'),
  bat: line('M50 40 L44 30 L42 42 C30 32 16 34 6 44 C16 44 22 50 22 58 C32 54 42 58 50 70 C58 58 68 54 78 58 C78 50 84 44 94 44 C84 34 70 32 58 42 L56 30Z'),
  note: line('M38 76 V22 L80 14 V66') + solid('M28 78 m-12 0 a12 9 -20 1 0 24 0 a12 9 -20 1 0 -24 0 M70 68 m-12 0 a12 9 -20 1 0 24 0 a12 9 -20 1 0 -24 0'),
  cross: line('M50 8 V92 M26 32 H74'),
  web: line('M8 8 L92 92 M8 8 L92 40 M8 8 L40 92 M8 8 V92 M8 8 H92') + line('M8 30 Q20 24 30 8 M8 52 Q32 40 52 8 M8 74 Q44 58 74 8') + line('M20 92 Q40 70 92 20 M40 92 Q56 78 92 62'),
  squiggle: line('M6 50 Q16 30 26 50 T46 50 T66 50 T86 50 T96 46'),
  circle: line('M54 14 C20 10 4 36 12 60 C20 84 72 92 88 64 C100 42 80 16 46 18 C30 20 22 30 20 36'),
  underline: line('M6 40 Q50 30 94 38') + line('M10 60 Q50 52 90 58'),
  'heart eyes': line('M50 50 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0') + solid('M36 44 C26 36 26 26 32 26 C35 26 36 29 36 31 C36 29 37 26 40 26 C46 26 46 36 36 44Z M64 44 C54 36 54 26 60 26 C63 26 64 29 64 31 C64 29 65 26 68 26 C74 26 74 36 64 44Z') + line('M30 60 Q50 80 70 60'),
  cherry: line('M34 66 Q44 30 62 16 M66 66 Q62 40 62 16') + line('M62 16 Q78 12 82 24 Q68 28 62 16Z') + solid('M34 72 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M66 72 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0'),
  'safety pin': line('M18 76 L74 20 C82 12 94 24 86 32 L42 76') + line('M18 76 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0') + line('M26 84 L78 32'),
  exclaim: line('M38 12 L34 64 M66 12 L62 64') + solid('M34 82 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M62 82 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0'),
  burst: line('M50 6 L58 34 L86 22 L70 46 L96 58 L66 62 L74 92 L50 72 L26 92 L34 62 L4 58 L30 46 L14 22 L42 34Z'),
};

export const DOODLE_COLORS = ['#141114', '#ff3d8b', '#ffffff', '#8a3ffc'];
