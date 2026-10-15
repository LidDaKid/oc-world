// 3d gems (rendered with three.js), rhinestones, pearls, pressed flowers and spills.
// made by the scripts in oc-world-tests/gem-render. each entry is name: [width, height] on the page.

// stones in /gems
export const GEMS = {
  'heart-pink': [74, 65], 'heart-hotpink': [74, 65], 'heart-ruby': [74, 65], 'heart-onyx': [74, 65], 'heart-amethyst': [74, 65],
  'heart-lilac': [74, 65], 'heart-sapphire': [74, 65], 'heart-aqua': [74, 65], 'heart-emerald': [74, 65], 'heart-citrine': [74, 65],
  'heart-diamond': [74, 65], 'heart-holo': [74, 65], 'round-pink': [74, 72], 'round-hotpink': [74, 72], 'round-ruby': [74, 72], 'round-onyx': [74, 72],
  'round-amethyst': [74, 72], 'round-lilac': [74, 72], 'round-sapphire': [74, 72], 'round-aqua': [74, 72], 'round-emerald': [74, 72],
  'round-citrine': [74, 72], 'round-diamond': [74, 72], 'round-holo': [74, 72], 'star-pink': [74, 69], 'star-hotpink': [74, 69], 'star-ruby': [74, 69],
  'star-onyx': [74, 69], 'star-amethyst': [74, 69], 'star-lilac': [74, 69], 'star-sapphire': [74, 69], 'star-aqua': [74, 69], 'star-emerald': [74, 69],
  'star-citrine': [74, 69], 'star-diamond': [74, 69], 'star-holo': [74, 69], 'pear-pink': [36, 74], 'pear-hotpink': [36, 74], 'pear-ruby': [36, 74],
  'pear-onyx': [36, 74], 'pear-amethyst': [36, 74], 'pear-sapphire': [36, 74], 'pear-aqua': [36, 74], 'pear-emerald': [36, 74],
  'pear-diamond': [36, 74], 'pear-holo': [36, 74], 'oval-pink': [55, 74], 'oval-ruby': [55, 74], 'oval-amethyst': [55, 74], 'oval-lilac': [55, 74],
  'oval-sapphire': [55, 74], 'oval-emerald': [55, 74], 'oval-citrine': [55, 74], 'oval-diamond': [55, 74], 'emerald-pink': [55, 74],
  'emerald-hotpink': [55, 74], 'emerald-onyx': [55, 74], 'emerald-amethyst': [55, 74], 'emerald-sapphire': [55, 74], 'emerald-aqua': [55, 74],
  'emerald-emerald': [55, 74], 'emerald-diamond': [55, 74], 'princess-pink': [74, 70], 'princess-hotpink': [74, 70], 'princess-ruby': [74, 70],
  'princess-onyx': [74, 70], 'princess-lilac': [74, 70], 'princess-aqua': [74, 70], 'princess-diamond': [74, 70], 'princess-holo': [74, 70],
  'marquise-pink': [37, 74], 'marquise-hotpink': [37, 74], 'marquise-ruby': [37, 74], 'marquise-amethyst': [37, 74], 'marquise-emerald': [37, 74],
  'marquise-citrine': [37, 74], 'marquise-diamond': [37, 74], 'marquise-holo': [37, 74], 'cushion-pink': [74, 71], 'cushion-ruby': [74, 71],
  'cushion-lilac': [74, 71], 'cushion-aqua': [74, 71], 'cushion-emerald': [74, 71], 'cushion-diamond': [74, 71], 'trillion-hotpink': [74, 65],
  'trillion-onyx': [74, 65], 'trillion-amethyst': [74, 65], 'trillion-aqua': [74, 65], 'trillion-citrine': [74, 65], 'trillion-diamond': [74, 65],
  'asscher-pink': [74, 71], 'asscher-onyx': [74, 71], 'asscher-sapphire': [74, 71], 'asscher-diamond': [74, 71], 'baguette-pink': [32, 84],
  'baguette-hotpink': [32, 84], 'baguette-onyx': [32, 84], 'baguette-lilac': [32, 84], 'baguette-emerald': [32, 84], 'baguette-diamond': [32, 84],
  'hexagon-hotpink': [67, 74], 'hexagon-amethyst': [67, 74], 'hexagon-emerald': [67, 74], 'hexagon-holo': [67, 74], 'cab-ruby': [47, 64],
  'cab-onyx': [64, 63], 'cab-onyx-oval': [47, 64], 'cab-opal': [64, 63], 'cab-opal-oval': [47, 64], 'cab-rose': [47, 64], 'heart-pink-side': [74, 65],
  'round-pink-side': [74, 63], 'heart-hotpink-tilt': [74, 65], 'heart-diamond-side': [74, 65], 'pear-diamond-side': [55, 74],
  'round-diamond-side': [74, 47],
};

// rhinestone chains, pearls and pave shapes, also in /gems
export const BLING = {
  'rs-strip-candy': [200, 22], 'rs-strip-diamond': [200, 22], 'rs-strip-gold': [200, 22], 'rs-strip-holo': [200, 22], 'rs-strip-hotpink': [200, 22],
  'rs-strip-lilac': [200, 22], 'rs-strip-long-diamond': [200, 12], 'rs-strip-long-pink': [200, 12], 'rs-strip-onyx': [200, 22],
  'rs-strip-pink': [200, 22], 'rs-strip-rainbow': [200, 22], 'rs-strip-scene': [200, 22], 'rs-heart-diamond': [150, 137],
  'rs-heart-hotpink': [150, 137], 'rs-heart-onyx': [150, 137], 'rs-heart-pink': [150, 137], 'rs-heart-rainbow': [150, 137],
  'rs-heart-ruby': [150, 137], 'rs-ring-diamond': [150, 150], 'rs-ring-onyx': [150, 150], 'rs-ring-pink': [150, 150], 'rs-ring-scene': [150, 150],
  'rs-arc-diamond': [150, 61], 'rs-arc-holo': [150, 61], 'rs-arc-hotpink': [150, 61], 'rs-arc-pink': [150, 61], 'rs-star-diamond': [146, 150],
  'rs-star-pink': [146, 150], 'rs-wave-diamond': [200, 42], 'rs-wave-pink': [200, 42], 'rs-corner-diamond': [150, 150], 'rs-corner-pink': [150, 150],
  'pearl-black': [50, 50], 'pearl-cream': [50, 50], 'pearl-lilac': [50, 50], 'pearl-pink': [50, 50], 'pearl-white': [50, 50],
  'pearls-black': [200, 20], 'pearls-cream': [200, 20], 'pearls-drape-pink': [150, 52], 'pearls-drape-white': [150, 52], 'pearls-heart': [150, 137],
  'pearls-heart-pink': [150, 137], 'pearls-mixed': [240, 22], 'pearls-mixed-pink': [240, 22], 'pearls-pink': [200, 20], 'pearls-ring': [150, 150],
  'pearls-white': [200, 20], 'pave-heart-diamond': [120, 109], 'pave-heart-hotpink': [120, 109], 'pave-heart-ombre': [120, 109],
  'pave-heart-onyx': [120, 109], 'pave-heart-pink': [120, 109], 'pave-heart-ruby': [120, 109], 'pave-bat-onyx': [120, 46], 'pave-bat-pink': [120, 46],
  'pave-bow-onyx': [120, 97], 'pave-bow-pink': [120, 97], 'pave-cherry': [112, 120], 'pave-crown-gold': [120, 87], 'pave-crown-pink': [120, 87],
  'pave-lips-pink': [120, 60], 'pave-lips-ruby': [120, 60], 'pave-skull-diamond': [100, 120], 'pave-skull-pink': [100, 120],
  'pave-star-citrine': [120, 114], 'pave-star-diamond': [120, 114], 'pave-star-pink': [120, 114],
};

// /flowers
export const FLOWERS = {
  'pansy-black': [110, 120], 'rose': [120, 116], 'rose-pink': [117, 120], 'pansy-purple': [109, 120], 'daisy': [75, 120], 'forgetmenot': [91, 120],
  'sakura': [120, 106], 'lavender': [24, 120], 'cosmos': [80, 120], 'hydrangea': [120, 102], 'hydrangea-pink': [113, 120], 'violets': [85, 120],
  'daisy-pink': [119, 120], 'cosmos-white': [114, 120], 'pansy-yellow': [109, 120], 'buttercup': [71, 120], 'babys-breath': [120, 115],
  'rose-petals': [114, 120], 'heart-petals': [120, 108], 'fern': [55, 120], 'clover': [79, 120], 'maple-leaf': [108, 120], 'ginkgo': [101, 120],
};

// /spills
export const SPILLS = {
  'coffee-ring': [125, 140], 'coffee-drip': [113, 140], 'tea-ring': [138, 140], 'water-ring': [139, 140], 'ink-blot': [135, 140],
  'ink-purple': [130, 140], 'ink-splatter': [140, 139], 'tears': [132, 140], 'mascara-tears': [45, 140], 'kiss-red': [140, 63], 'kiss-pink': [140, 63],
  'kiss-black': [140, 63], 'lipstick-swipe': [140, 73], 'blush-smudge': [140, 79], 'polish-pink': [98, 140], 'polish-red': [96, 140],
  'polish-black': [91, 140], 'polish-lilac': [99, 140], 'glitter-pink': [140, 112], 'glitter-silver': [140, 111], 'glitter-holo': [140, 113],
  'glitter-black': [140, 113],
};

// spills that sit on top of the paper instead of soaking in
export const RAISED_SPILLS = new Set(['glitter-black', 'glitter-holo', 'glitter-pink', 'glitter-silver', 'polish-black', 'polish-lilac', 'polish-pink', 'polish-red']);
