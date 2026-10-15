// id cards: realistic laminated ids for the oc. school id, driver's license, backstage pass on a swinging lanyard,
// library card, passport page, gym membership + a monster high student id. fills itself in from their basics.

import { h, fill, uid, toast, openModal, confirmDialog, segmented, swatches, s, initials } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, sticker, nameOf } from './kit.js';
import { holoTilt, basic, seeded, picNow } from './card-holo.js';

export const meta = { id: 'ids', label: 'id cards', icon: '1faaa' };

const SIG_FONTS = [
  { id: 'apple', label: 'fancy', font: "'Homemade Apple', cursive" },
  { id: 'reenie', label: 'messy', font: "'Reenie Beanie', cursive" },
  { id: 'shadows', label: 'neat', font: "'Shadows Into Light', cursive" },
  { id: 'marker', label: 'marker', font: "'Permanent Marker', cursive" },
];
const INKS = ['#1d2f8f', '#111111', '#d6177a', '#6b2bd1'];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const p2 = n => String(n).padStart(2, '0');
const us = d => `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()}`;
const intl = d => `${p2(d.getDate())} ${MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
const plusYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };

// ---- things worked out from the oc ----
function born(char) {
  const raw = basic(char, 'birthday', 'bday', 'birth date', 'date of birth');
  const age = parseInt(basic(char, 'age'), 10);
  const yr = 2026 - (Number.isFinite(age) ? age : 16);
  if (raw) {
    const y = /\b(1[0-9]\d\d|2\d\d\d)\b/.exec(raw);
    const t = Date.parse(y ? raw : `${raw} 2000`);
    if (!Number.isNaN(t)) { const d = new Date(t); if (!y) d.setFullYear(yr); return d; }
  }
  const r = seeded(char.id + 'bday');
  return new Date(yr, Math.floor(r() * 12), 1 + Math.floor(r() * 28));
}
const splitName = char => {
  const words = nameOf(char).trim().split(/\s+/);
  return words.length > 1 ? { first: words.slice(0, -1).join(' '), last: words.at(-1) } : { first: words[0], last: words[0] };
};
const sexOf = char => {
  const p = basic(char, 'pronouns', 'gender').toLowerCase();
  return /she|her|girl|female|woman/.test(p) ? 'F' : /\bhe\b|him|boy|male|man/.test(p) ? 'M' : 'X';
};
const worldName = char => store.worldsOf(char.id)[0]?.name || '';
const digits = (seed, n) => { const r = seeded(seed); return Array.from({ length: n }, () => Math.floor(r() * 10)).join(''); };
const pickOf = (seed, list) => list[Math.floor(seeded(seed)() * list.length)];
const schoolOf = char => { const w = worldName(char); return w ? (/high|academy|school|college|institute/i.test(w) ? w : `${w} high`) : 'moonlight high'; };
const gradeOf = char => { const a = parseInt(basic(char, 'age'), 10); if (!Number.isFinite(a)) return 'junior'; const g = a - 5; return g < 9 ? `${g}th grade` : ['freshman', 'sophomore', 'junior', 'senior'][Math.min(3, g - 9)]; };

// [key, label, auto value]
const KINDS = [
  {
    id: 'school', label: 'school id', icon: '1f3eb', color: '#ff4fa3',
    fields: [
      ['school', 'school', c => schoolOf(c)],
      ['name', 'name', c => nameOf(c)],
      ['grade', 'grade', c => gradeOf(c)],
      ['no', 'student id', (c, it) => digits(it.id + 'sid', 7)],
      ['year', 'year', () => '2026–2027'],
      ['mascot', 'mascot', () => 'bats'],
    ],
  },
  {
    id: 'license', label: "driver's license", icon: '1f697', color: '#3d7bd9',
    fields: [
      ['state', 'state', c => worldName(c) || 'moonlight'],
      ['last', 'last name', c => splitName(c).last],
      ['first', 'first name', c => splitName(c).first],
      ['dl', 'license no.', (c, it) => 'D' + digits(it.id + 'dl', 3) + '-' + digits(it.id + 'dl2', 4) + '-' + digits(it.id + 'dl3', 4)],
      ['address', 'address', (c, it) => `${1 + (seeded(it.id + 'a')() * 999 | 0)} ${(worldName(c) || 'moonlight').split(/\s+/)[0]} ln`],
      ['dob', 'date of birth', c => us(born(c))],
      ['iss', 'issued', (c, it) => us(new Date(it.createdAt))],
      ['exp', 'expires', (c, it) => us(plusYears(new Date(it.createdAt), 4))],
      ['sex', 'sex', c => sexOf(c)],
      ['hgt', 'height', c => basic(c, 'height') || `5'${4 + (seeded(c.id)() * 6 | 0)}"`],
      ['eyes', 'eyes', c => (basic(c, 'eyes', 'eye color') || pickOf(c.id + 'e', ['BRN', 'BLU', 'GRN', 'HAZ', 'GRY'])).toUpperCase().slice(0, 4)],
      ['hair', 'hair', c => (basic(c, 'hair', 'hair color') || pickOf(c.id + 'h', ['BLK', 'BRN', 'RED', 'BLN', 'PNK'])).toUpperCase().slice(0, 4)],
      ['class', 'class', () => 'D'],
    ],
  },
  {
    id: 'pass', label: 'backstage pass', icon: '1f3ab', color: '#ff2fa0',
    fields: [
      ['access', 'access', () => 'all access'],
      ['tour', 'tour', c => `${(nameOf(c).split(/\s+/)[0] || 'the')} world tour`],
      ['band', 'band', c => basic(c, 'band') || 'the midnight bats'],
      ['name', 'name', c => nameOf(c)],
      ['role', 'role', c => basic(c, 'role') || 'artist'],
      ['date', 'date', (c, it) => intl(new Date(it.createdAt))],
      ['venue', 'venue', c => (worldName(c) ? `${worldName(c)} arena` : 'the coffin club')],
    ],
  },
  {
    id: 'library', label: 'library card', icon: '1f4da', color: '#8a5a2b',
    fields: [
      ['library', 'library', c => `${(worldName(c) || 'moonlight').split(/\s+/)[0]} public library`],
      ['name', 'name', c => nameOf(c)],
      ['no', 'card no.', (c, it) => '2 ' + digits(it.id + 'lib', 4) + ' ' + digits(it.id + 'lib2', 5) + ' ' + digits(it.id + 'lib3', 4)],
      ['exp', 'expires', (c, it) => us(plusYears(new Date(it.createdAt), 3))],
    ],
  },
  {
    id: 'passport', label: 'passport', icon: '1f30d', color: '#8a1538',
    fields: [
      ['country', 'country', c => worldName(c) || 'oc world'],
      ['code', 'code', c => ((worldName(c) || 'ocw').replace(/[^a-z]/gi, '').toUpperCase() + 'XXX').slice(0, 3)],
      ['no', 'passport no.', (c, it) => digits(it.id + 'pp', 9)],
      ['last', 'surname', c => splitName(c).last],
      ['first', 'given names', c => splitName(c).first],
      ['nation', 'nationality', c => basic(c, 'species') || worldName(c) || 'oc'],
      ['dob', 'date of birth', c => intl(born(c))],
      ['sex', 'sex', c => sexOf(c)],
      ['pob', 'place of birth', c => basic(c, 'hometown', 'birthplace', 'from') || worldName(c) || 'the void'],
      ['iss', 'date of issue', (c, it) => intl(new Date(it.createdAt))],
      ['exp', 'date of expiry', (c, it) => intl(plusYears(new Date(it.createdAt), 10))],
      ['auth', 'authority', () => 'oc world dept.'],
    ],
  },
  {
    id: 'gym', label: 'gym membership', icon: '1f3cb-fe0f', color: '#7df9d0',
    fields: [
      ['gym', 'gym', () => 'iron heart fitness'],
      ['name', 'name', c => nameOf(c)],
      ['tier', 'tier', (c, it) => pickOf(it.id + 't', ['platinum', 'gold', 'vip', 'black card'])],
      ['no', 'member no.', (c, it) => digits(it.id + 'gym', 10)],
      ['since', 'member since', (c, it) => String(new Date(it.createdAt).getFullYear() - (seeded(it.id)() * 3 | 0))],
    ],
  },
  {
    id: 'monster', label: 'monster high id', icon: '1f480', color: '#ff5fb8',
    fields: [
      ['school', 'school', () => 'monster high'],
      ['name', 'ghoul name', c => nameOf(c)],
      ['scaritage', 'scaritage', c => basic(c, 'species') || 'vampire'],
      ['age', 'age', c => basic(c, 'age') || '1,600'],
      ['style', 'killer style', c => (c.tags.slice(0, 2).join(' + ') || 'goth glam')],
      ['flaw', 'freaky flaw', c => c.tagline || 'cries at sad songs'],
      ['pet', 'pet', (c, it) => pickOf(it.id + 'pet', ['a bat', 'a black cat', 'a ghost goldfish', 'a tiny spider', 'a pet rock', 'a crow'])],
      ['locker', 'locker', (c, it) => String(100 + (seeded(it.id + 'lk')() * 566 | 0))],
      ['class', 'class of', () => '2027'],
    ],
  },
];
const kindOf = id => KINDS.find(k => k.id === id) || KINDS[0];

function newId(kind) {
  return { id: 'id_' + uid(), kind, f: {}, photo: { from: 'pfp', imageId: null }, color: kindOf(kind).color, sig: 'apple', ink: INKS[0], createdAt: Date.now() };
}
function fixId(it) {
  it.f ||= {};
  it.photo = { from: 'pfp', imageId: null, ...it.photo };
  it.color ||= kindOf(it.kind).color;
  it.sig ||= 'apple';
  it.ink ||= INKS[0];
  it.createdAt ||= Date.now();
  return it;
}

// ---- little pieces ----
function photo(it, char, cls = '') {
  const id = it.photo.from === 'upload' && it.photo.imageId ? it.photo.imageId : char.imageId;
  return h('div', { class: 'id-photo ' + cls, style: { '--c': char.color } }, id ? picNow(store, id) : h('span', {}, initials(nameOf(char))));
}

function barcode(seed, cls = '') {
  const r = seeded(seed);
  const bars = [];
  let x = 0;
  for (let i = 0; i < 52; i++) {
    const w = 1 + Math.floor(r() * 3);
    if (i % 2 === 0) bars.push(s('rect', { x, y: 0, width: w, height: 40 }));
    x += w + (r() < 0.3 ? 1 : 0);
  }
  return s('svg', { class: 'id-barcode ' + cls, viewBox: `0 0 ${x} 40`, preserveAspectRatio: 'none' }, bars);
}

const sig = (it, name, cls = '') => {
  const el = h('div', { class: 'id-sig ' + cls, style: { fontFamily: (SIG_FONTS.find(f => f.id === it.sig) || SIG_FONTS[0]).font, color: it.ink } }, name);
  if (name.length > 13) el.style.fontSize = `calc(${cls.includes('school') ? 4.8 : 4.4}cqw * ${Math.max(0.6, 13 / name.length).toFixed(2)})`;
  return el;
};
const fld = (label, value, cls = '') => h('div', { class: 'id-f ' + cls }, h('i', {}, label), h('b', {}, value));
const shine = () => [h('div', { class: 'id-lam' }), h('div', { class: 'id-glare' })];

// mrz check digit (the real passport math)
function check(str) {
  const w = [7, 3, 1];
  let sum = 0;
  [...str].forEach((ch, i) => {
    const v = ch === '<' ? 0 : /\d/.test(ch) ? +ch : ch.charCodeAt(0) - 55;
    sum += v * w[i % 3];
  });
  return String(sum % 10);
}
const mrzText = t => t.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]+/g, '<');
function mrzDate(str) {
  const d = new Date(Date.parse(str));
  return Number.isNaN(+d) ? '000000' : String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate());
}

// ---- each kind's card ----
const CARDS = {
  school(it, char, v) {
    return h('div', { class: 'id-card kind-school' },
      h('div', { class: 'id-band' },
        sticker('1f987', 'id-mascot'),
        h('div', { class: 'id-band-text' }, h('div', { class: 'id-school' }, v.school), h('div', { class: 'id-sub' }, `home of the ${v.mascot}`)),
        h('div', { class: 'id-year' }, v.year)),
      h('div', { class: 'id-body' },
        photo(it, char, 'id-photo-school'),
        h('div', { class: 'id-fields' },
          h('div', { class: 'id-kicker' }, 'student'),
          h('div', { class: 'id-bigname' }, v.name),
          fld('grade', v.grade),
          fld('student id', v.no),
          sig(it, v.name, 'id-sig-school'))),
      h('div', { class: 'id-bottom' }, barcode(it.id), h('span', { class: 'id-mono' }, v.no)),
      h('div', { class: 'id-holo id-holo-seal' }, h('span', {}, '★')),
      shine());
  },

  license(it, char, v) {
    return h('div', { class: 'id-card kind-license' },
      h('div', { class: 'id-guilloche' }),
      h('div', { class: 'id-lic-head' },
        h('div', { class: 'id-state' }, v.state),
        h('div', { class: 'id-lic-kind' }, "driver's license")),
      h('div', { class: 'id-lic-body' },
        h('div', { class: 'id-lic-left' }, photo(it, char, 'id-photo-lic'), sig(it, nameOf(char), 'id-sig-lic')),
        h('div', { class: 'id-lic-fields' },
          h('div', { class: 'id-dl' }, h('i', {}, 'dl'), v.dl),
          fld('exp', v.exp, 'red'),
          h('div', { class: 'id-lic-name' }, h('i', {}, '1'), v.last.toUpperCase()),
          h('div', { class: 'id-lic-name sm' }, h('i', {}, '2'), v.first.toUpperCase()),
          h('div', { class: 'id-lic-addr' }, h('i', {}, '8'), v.address.toUpperCase()),
          h('div', { class: 'id-lic-grid' },
            fld('dob', v.dob, 'red'), fld('iss', v.iss),
            fld('sex', v.sex), fld('hgt', v.hgt), fld('eyes', v.eyes), fld('hair', v.hair), fld('class', v.class)),
          h('div', { class: 'id-donor' }, '♥ donor'))),
      photo(it, char, 'id-ghost'),
      h('div', { class: 'id-holo id-holo-state' }, h('span', {}, '✦')),
      shine());
  },

  pass(it, char, v) {
    return h('div', { class: 'id-card kind-pass' },
      h('div', { class: 'id-slot' }),
      h('div', { class: 'id-pass-tour' }, v.tour),
      h('div', { class: 'id-pass-band' }, v.band),
      h('div', { class: 'id-pass-access' }, v.access),
      photo(it, char, 'id-photo-pass'),
      h('div', { class: 'id-pass-name' }, v.name),
      h('div', { class: 'id-pass-role' }, v.role),
      h('div', { class: 'id-pass-meta' }, h('span', {}, v.date), h('span', {}, v.venue)),
      h('div', { class: 'id-pass-foot' }, barcode(it.id, 'id-pass-bar'), h('div', { class: 'id-holo id-holo-pass' }, h('span', {}, '★'))),
      shine());
  },

  library(it, char, v) {
    const r = seeded(it.id + 'stamps');
    const stamps = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(it.createdAt - (5 - i) * (12 + r() * 30) * 864e5);
      return `${MONTHS[d.getMonth()].toUpperCase()} ${p2(d.getDate())} ${String(d.getFullYear()).slice(2)}`;
    });
    return h('div', { class: 'id-card kind-library' },
      h('div', { class: 'id-lib-head' }, sticker('1f4da', 'id-lib-logo'), h('div', {}, h('div', { class: 'id-lib-name' }, v.library), h('div', { class: 'id-lib-sub' }, 'borrower\'s card'))),
      h('div', { class: 'id-lib-body' },
        h('div', { class: 'id-lib-left' },
          h('div', { class: 'id-lib-line' }, h('i', {}, 'name'), h('span', { class: 'id-lib-hand', style: { color: it.ink } }, v.name)),
          h('div', { class: 'id-lib-line' }, h('i', {}, 'expires'), h('span', { class: 'id-lib-type' }, v.exp)),
          h('div', { class: 'id-lib-line' }, h('i', {}, 'signature'), sig(it, nameOf(char), 'id-sig-lib')),
          h('div', { class: 'id-lib-barlabel' }, barcode(it.id), h('span', { class: 'id-mono' }, v.no))),
        h('div', { class: 'id-lib-due' },
          h('div', { class: 'id-lib-due-head' }, 'date due'),
          stamps.map((d, i) => h('div', { class: 'id-stamp', style: { '--r': ((r() - 0.5) * 10).toFixed(1) + 'deg', '--x': ((r() - 0.5) * 8).toFixed(0) + 'px', '--a': (0.55 + r() * 0.4).toFixed(2) } }, d)))),
      shine());
  },

  passport(it, char, v) {
    const no = (v.no.replace(/\s/g, '').toUpperCase() + '<<<<<<<<<').slice(0, 9);
    const code = mrzText(v.code).padEnd(3, '<').slice(0, 3);
    const dob = mrzDate(v.dob), exp = mrzDate(v.exp), sex = /^[MF]$/i.test(v.sex) ? v.sex.toUpperCase() : '<';
    const line1 = (`P<${code}${mrzText(v.last)}<<${mrzText(v.first)}`).padEnd(44, '<').slice(0, 44);
    const opt = '<'.repeat(14);
    const body = `${no}${check(no)}${code}${dob}${check(dob)}${sex}${exp}${check(exp)}${opt}${check(opt)}`;
    const line2 = (body + check(`${no}${check(no)}${dob}${check(dob)}${exp}${check(exp)}${opt}${check(opt)}`)).slice(0, 44);
    return h('div', { class: 'id-card kind-passport' },
      h('div', { class: 'id-guilloche' }),
      h('div', { class: 'id-pp-head' },
        h('span', { class: 'id-pp-word' }, 'passport'), h('span', { class: 'id-pp-word fr' }, 'passeport'),
        h('span', { class: 'id-pp-country' }, v.country)),
      h('div', { class: 'id-pp-body' },
        h('div', { class: 'id-pp-left' }, photo(it, char, 'id-photo-pp'), sig(it, nameOf(char), 'id-sig-pp')),
        h('div', { class: 'id-pp-fields' },
          h('div', { class: 'id-pp-row' }, fld('type', 'P'), fld('code', code.replace(/</g, '')), fld('passport no.', v.no)),
          fld('surname', v.last.toUpperCase(), 'big'),
          fld('given names', v.first.toUpperCase(), 'big'),
          fld('nationality', v.nation.toUpperCase()),
          h('div', { class: 'id-pp-row' }, fld('date of birth', v.dob), fld('sex', v.sex)),
          fld('place of birth', v.pob.toUpperCase()),
          h('div', { class: 'id-pp-row' }, fld('date of issue', v.iss), fld('authority', v.auth.toUpperCase())),
          fld('date of expiry', v.exp)),
        photo(it, char, 'id-ghost id-ghost-pp')),
      h('div', { class: 'id-mrz' }, h('div', {}, line1), h('div', {}, line2)),
      h('div', { class: 'id-holo id-holo-pp' }, h('span', {}, '✦')),
      shine());
  },

  gym(it, char, v) {
    return h('div', { class: 'id-card kind-gym' },
      h('div', { class: 'id-gym-hole' }),
      h('div', { class: 'id-gym-head' }, h('div', { class: 'id-gym-name' }, v.gym), h('div', { class: 'id-gym-tier' }, v.tier)),
      h('div', { class: 'id-gym-body' },
        photo(it, char, 'id-photo-gym'),
        h('div', { class: 'id-gym-fields' },
          h('div', { class: 'id-gym-member' }, 'member'),
          h('div', { class: 'id-bigname' }, v.name),
          fld('member no.', v.no),
          fld('since', v.since))),
      h('div', { class: 'id-gym-bar' }, barcode(it.id), h('span', { class: 'id-mono' }, v.no)),
      shine());
  },

  monster(it, char, v) {
    return h('div', { class: 'id-card kind-monster' },
      h('div', { class: 'id-mh-stitch' }),
      h('div', { class: 'id-mh-head' },
        sticker('1f480', 'id-mh-skull'),
        h('div', { class: 'id-mh-school' }, v.school),
        h('div', { class: 'id-mh-kind' }, 'student id')),
      h('div', { class: 'id-mh-body' },
        h('div', { class: 'id-mh-photo' }, photo(it, char, 'id-photo-mh'), h('i', { class: 'bolt l' }), h('i', { class: 'bolt r' })),
        h('div', { class: 'id-mh-fields' },
          fld('ghoul name', v.name, 'big'),
          h('div', { class: 'id-mh-grid' }, fld('scaritage', v.scaritage), fld('age', v.age), fld('locker', v.locker), fld('class of', v.class)),
          fld('killer style', v.style),
          fld('freaky flaw', v.flaw),
          fld('pet', v.pet))),
      sig(it, nameOf(char), 'id-sig-mh'),
      h('div', { class: 'id-holo id-holo-mh' }, sticker('1f987', 'id-holo-bat')),
      shine());
  },
};

function values(it, char) {
  const k = kindOf(it.kind), v = {};
  for (const [key, , auto] of k.fields) v[key] = (it.f[key] ?? '').trim() || auto(char, it);
  return v;
}

// a scene: the card, tilting (or swinging on its lanyard)
function idScene(it, char, { mini = false } = {}) {
  const k = kindOf(it.kind);
  const card = CARDS[k.id](it, char, values(it, char));
  card.style.setProperty('--k', it.color);
  card.style.setProperty('--c', char.color);
  let stops = [];
  let scene;
  if (k.id === 'pass' && !mini) {
    const words = Array(6).fill(values(it, char).band).join(' ✦ ');
    const swing = h('div', { class: 'id-swing', style: { '--k': it.color } },
      h('div', { class: 'id-strap l' }, h('span', {}, words)),
      h('div', { class: 'id-strap r' }, h('span', {}, words)),
      h('div', { class: 'id-clip' }, h('i')), card);
    scene = h('div', { class: 'id-scene id-scene-pass' }, swing);
    stops.push(swinger(scene, swing), holoTilt(scene, { max: 0 }));
  } else {
    scene = h('div', { class: `id-scene${mini ? ' mini' : ''} shape-${k.id}` }, h('div', { class: 'id-tilt' }, card));
    if (!mini) stops.push(holoTilt(scene, { max: 9 }));
  }
  scene.stop = () => stops.forEach(fn => fn());
  return scene;
}

// the lanyard swing: a little pendulum you can push with the mouse
function swinger(el, target) {
  let a = 8, v = 0, raf = 0, lastX = null, visible = true;
  const t0 = performance.now();
  const step = now => {
    raf = 0;
    v += -a * 0.01 - v * 0.03 + Math.sin((now - t0) / 1500) * 0.006;
    v = Math.max(-4, Math.min(4, v));
    a += v;
    target.style.setProperty('--swing', a.toFixed(2) + 'deg');
    if (visible) raf = requestAnimationFrame(step);
  };
  const move = e => { if (lastX != null) v += (e.clientX - lastX) * 0.012; lastX = e.clientX; };
  const leave = () => { lastX = null; };
  const push = () => { v += (Math.random() < 0.5 ? -1 : 1) * 2.2; };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('click', push);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(step); });
  io.observe(el);
  raf = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(raf); visible = false; io.disconnect(); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('click', push); };
}

export function render(el, ctx) {
  const { char, mine } = ctx;
  const data = ctx.data;
  data.ids ||= [];
  data.ids.forEach(fixId);
  if (mine && !data.ids.length) { data.ids.push(newId('school')); ctx.save(); }
  let cur = data.ids.find(x => x.id === data.cur) || data.ids[0];
  let scene = null;
  const save = () => { data.cur = cur?.id; ctx.save(); };

  const list = h('div', { class: 'id-list' });
  const stage = h('div', { class: 'id-stage' });
  const editor = h('div', { class: 'id-editor' });

  function drawList() {
    fill(list,
      data.ids.map(it => h('button', { class: 'id-tab' + (it === cur ? ' on' : ''), onclick: () => { cur = it; save(); drawAll(); } },
        sticker(kindOf(it.kind).icon, 'id-tab-icon'), kindOf(it.kind).label)),
      mine ? h('button', { class: 'id-tab id-tab-new', onclick: pickKind }, '+ new') : null);
  }

  function pickKind() {
    const m = openModal({
      title: 'new id',
      wide: true,
      body: h('div', { class: 'id-kinds' }, KINDS.map(k => {
        const it = newId(k.id);
        return h('button', { type: 'button', class: 'id-kind', onclick: () => {
          cur = it; data.ids.push(it); save(); drawAll(); m.close();
        } }, idScene(it, char, { mini: true }), h('span', {}, sticker(k.icon, 'id-tab-icon'), k.label));
      })),
    });
  }

  function drawStage() {
    scene?.stop();
    if (!cur) { fill(stage, h('div', { class: 'fun-soon' }, 'no ids yet')); return; }
    scene = idScene(cur, char);
    fill(stage,
      h('div', { class: 'id-desk' }, scene),
      mine ? h('div', { class: 'id-actions' },
        h('button', { class: 'btn sm ghost', onclick: () => {
          const copy = structuredClone(cur);
          copy.id = 'id_' + uid();
          copy.createdAt = Date.now();
          if (copy.photo.from === 'upload') copy.photo = { from: 'pfp', imageId: null };
          data.ids.splice(data.ids.indexOf(cur) + 1, 0, copy);
          cur = copy; save(); drawAll(); toast('copied');
        } }, '⧉ copy'),
        h('button', { class: 'btn sm ghost danger-text', onclick: async () => {
          if (!await confirmDialog(`shred this ${kindOf(cur.kind).label}?`, { okLabel: 'shred', danger: true })) return;
          if (cur.photo.imageId) store.deleteImage(cur.photo.imageId);
          const i = data.ids.indexOf(cur);
          data.ids.splice(i, 1);
          cur = data.ids[Math.max(0, i - 1)] || null;
          save(); drawAll();
        } }, '✕ shred')) : null);
  }

  let redrawTimer = 0;
  const changed = () => {
    save();
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(drawStage, 120);
  };

  function drawEditor() {
    if (!mine || !cur) { editor.hidden = true; fill(editor); return; }
    editor.hidden = false;
    const it = cur, k = kindOf(it.kind);
    const photoBox = h('div');
    const drawPhoto = () => fill(photoBox,
      segmented([{ value: 'pfp', label: 'pfp' }, { value: 'upload', label: 'upload' }], it.photo.from, async v => {
        if (v === 'upload') {
          const up = await uploadPic(900);
          if (!up) { drawPhoto(); return; }
          if (it.photo.imageId) store.deleteImage(it.photo.imageId);
          it.photo.imageId = up.imageId;
        }
        it.photo.from = v; changed(); drawPhoto();
      }),
      it.photo.from === 'upload' ? h('button', { class: 'btn sm ghost', onclick: async () => {
        const up = await uploadPic(900);
        if (!up) return;
        if (it.photo.imageId) store.deleteImage(it.photo.imageId);
        it.photo.imageId = up.imageId; changed();
      } }, 'change picture') : null);
    drawPhoto();

    fill(editor,
      h('section', { class: 'id-group' }, h('h3', { class: 'id-group-label' }, 'photo'), photoBox),
      h('section', { class: 'id-group' }, h('h3', { class: 'id-group-label' }, 'details'),
        h('div', { class: 'id-fields-edit' }, k.fields.map(([key, label, auto]) => h('label', { class: 'id-lab' },
          h('span', {}, label),
          h('input', { type: 'text', value: it.f[key] || '', placeholder: auto(char, it), maxLength: 40, oninput: e => { it.f[key] = e.target.value; changed(); } }))))),
      h('section', { class: 'id-group' }, h('h3', { class: 'id-group-label' }, 'signature'),
        h('div', { class: 'id-sig-picks' }, SIG_FONTS.map(f => h('button', {
          class: 'id-sig-pick' + (it.sig === f.id ? ' on' : ''), style: { fontFamily: f.font, color: it.ink },
          onclick: e => { it.sig = f.id; editor.querySelectorAll('.id-sig-pick').forEach(b => b.classList.toggle('on', b === e.currentTarget)); changed(); },
        }, nameOf(char).split(/\s+/)[0]))),
        h('div', { class: 'id-inks' }, INKS.map(c => h('button', {
          class: 'id-ink' + (it.ink === c ? ' on' : ''), style: { background: c }, title: 'ink',
          onclick: e => { it.ink = c; editor.querySelectorAll('.id-ink').forEach(b => b.classList.toggle('on', b === e.currentTarget)); editor.querySelectorAll('.id-sig-pick').forEach(b => { b.style.color = c; }); changed(); },
        })))),
      h('section', { class: 'id-group' }, h('h3', { class: 'id-group-label' }, 'color'),
        swatches(it.color, c => { it.color = c; changed(); }, ['#ff4fa3', '#ff2fa0', '#ff5fb8', '#d6177a', '#8a1538', '#3d7bd9', '#1b2a5c', '#7df9d0', '#9be564', '#ffd84d', '#b18cff', '#141014'])));
  }

  function drawAll() { drawList(); drawStage(); drawEditor(); }

  el.append(appBar(ctx, meta), h('div', { class: 'id-app' + (mine ? '' : ' id-ro') }, list, h('div', { class: 'id-main' }, stage, editor)));
  drawAll();
  return () => { scene?.stop(); clearTimeout(redrawTimer); };
}
