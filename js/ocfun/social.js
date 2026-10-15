// socials: the oc's social media profile. two looks: a 2000s scene-era profile (top 8, profile song,
// glitter, friends comments) or a modern feed (grid, highlights, likes). posts + comments written as other ocs.

import { h, fill, uid, openModal, confirmDialog, swatches, segmented, toast, autosize } from '../ui.js';
import { store } from '../store.js';
import { dataFor, pic, sticker, appBar, portrait, nameOf, allOcs, ocById } from './kit.js';
import { who, face, freshRef, pickWho, refOf, ago, bigNum, addPhotos, dropImage, relLabel, hmA, dayLabel } from './phone-bits.js';

export const meta = { id: 'social', label: 'socials', icon: '1f4f2' };

const DEF = {
  style: 'scene',
  handle: '', display: '', bio: '', link: '',
  followers: 1313, following: 213, verified: false,
  mood: '', headline: '', about: '', meet: '',
  interests: { general: '', music: '', movies: '', heroes: '' },
  song: { songId: null, title: '' },
  topFriends: [], pinned: null,
  posts: [], highlights: [], wall: [],
  scene: { bg: 'stars', color: '#ff4fa3', glitter: true, font: 'verdana', sparkles: true },
};
const SCENE_BGS = [['stars', 'stars'], ['leopard', 'leopard'], ['zebra', 'zebra'], ['hearts', 'hearts'], ['skulls', 'skulls'], ['glitter', 'glitter'], ['plaid', 'plaid']];
const SCENE_FONTS = [['verdana', 'verdana'], ['comic', 'bubbly'], ['typewriter', 'typewriter'], ['pixel', 'pixel']];
const SCENE_COLORS = ['#ff4fa3', '#ff2e88', '#d81e5b', '#b18cff', '#7df9d0', '#6ec6ff', '#ffd84d', '#9be564', '#f6eefb', '#ff5d6c'];

const handleOf = (char, d) => (d.handle || nameOf(char).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'oc').slice(0, 30);
const handleFor = ref => {
  const w = who(ref);
  const hd = w.char?.fun?.social?.handle;
  return hd || w.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'someone';
};

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = dataFor(char, 'social', DEF);
  d.scene = { ...DEF.scene, ...d.scene };
  d.interests = { ...DEF.interests, ...d.interests };
  d.song = { songId: null, title: '', ...d.song };
  for (const p of d.posts) { p.comments ||= []; p.likes ??= 0; }
  const save = () => ctx.save();
  const body = h('div', { class: 'so-body' });
  let view = 'grid'; // feed: grid | list
  let cleanups = [];

  const draw = () => {
    cleanups.forEach(f => f());
    cleanups = [];
    fill(body, d.style === 'scene' ? scenePage() : feedPage());
  };

  const sorted = () => {
    const list = [...d.posts].sort((a, b) => b.at - a.at);
    const pin = list.find(p => p.id === d.pinned);
    return pin ? [pin, ...list.filter(p => p !== pin)] : list;
  };

  // ======== modern feed ========
  function feedPage() {
    const posts = sorted();
    const handle = handleOf(char, d);
    const counts = h('div', { class: 'so-counts' },
      h('div', {}, h('b', {}, bigNum(posts.length)), h('span', {}, 'posts')),
      h('div', {}, h('b', {}, bigNum(d.followers)), h('span', {}, 'followers')),
      h('div', {}, h('b', {}, bigNum(d.following)), h('span', {}, 'following')));
    let following = false;
    const followBtn = h('button', { type: 'button', class: 'so-btn blue', onclick: e => { following = !following; e.currentTarget.textContent = following ? 'following' : 'follow'; e.currentTarget.classList.toggle('blue', !following); } }, 'follow');
    const grid = h('div', { class: 'so-grid' }, posts.map(p => h('button', { type: 'button', class: 'so-tile', onclick: () => openPost(p) },
      p.imageId ? pic(p.imageId) : h('div', { class: 'so-text-tile' }, h('span', {}, p.caption)),
      p.id === d.pinned ? h('span', { class: 'so-pin' }, '📌') : null,
      h('div', { class: 'so-tile-hover' }, h('span', {}, '♥ ', bigNum(p.likes)), h('span', {}, '💬 ', p.comments.length)))));
    const list = h('div', { class: 'so-list' }, posts.map(p => feedPost(p)));
    const tabs = h('div', { class: 'so-tabs' },
      h('button', { type: 'button', class: view === 'grid' ? 'on' : '', title: 'grid', onclick: () => { view = 'grid'; draw(); } }, gridIco()),
      h('button', { type: 'button', class: view === 'list' ? 'on' : '', title: 'posts', onclick: () => { view = 'list'; draw(); } }, listIco()));
    return h('div', { class: 'so-feed' },
      h('div', { class: 'so-top' },
        h('b', { class: 'so-handle' }, handle, d.verified ? verified() : null),
        h('div', { class: 'so-top-icons' }, mine ? h('button', { type: 'button', class: 'so-icon-btn', title: 'new post', onclick: newPost }, '⊕') : null)),
      h('div', { class: 'so-head' },
        h('div', { class: 'so-ring' + (d.highlights.length ? ' live' : '') }, portrait(char, 'so-pfp')),
        counts),
      h('div', { class: 'so-bio' },
        h('b', {}, d.display || nameOf(char)),
        relLine(),
        d.bio ? h('p', {}, d.bio) : null,
        d.link ? h('a', { class: 'so-link', href: /^https?:/.test(d.link) ? d.link : null, target: '_blank', rel: 'noopener' }, '🔗 ', d.link.replace(/^https?:\/\//, '')) : null),
      h('div', { class: 'so-actions' },
        mine ? h('button', { type: 'button', class: 'so-btn', onclick: editProfile }, 'edit profile') : followBtn,
        mine ? h('button', { type: 'button', class: 'so-btn', onclick: newPost }, '+ post') : h('button', { type: 'button', class: 'so-btn', onclick: () => ctx.go(`${ctx.base}/fun/phone`) }, 'message')),
      highlightsRow(),
      tabs,
      posts.length ? (view === 'grid' ? grid : list) : h('div', { class: 'so-empty' }, sticker('1f4f8', 'so-empty-stk'), mine ? h('button', { type: 'button', class: 'btn primary sm', onclick: newPost }, 'first post') : null));
  }
  const relLine = () => {
    const tag = char.tagline;
    return tag ? h('span', { class: 'so-cat' }, tag) : null;
  };

  function highlightsRow() {
    if (!d.highlights.length && !mine) return null;
    return h('div', { class: 'so-highlights' },
      d.highlights.map((hl, i) => h('button', { type: 'button', class: 'so-hl', onclick: () => story(i) },
        h('span', { class: 'so-hl-pic' }, hl.imageId ? pic(hl.imageId) : sticker('2728')), h('span', { class: 'so-hl-label' }, hl.label))),
      mine ? h('button', { type: 'button', class: 'so-hl new', onclick: newHighlight }, h('span', { class: 'so-hl-pic' }, '+'), h('span', { class: 'so-hl-label' }, 'new')) : null);
  }
  async function newHighlight() {
    const [p] = await addPhotos(false, 1200);
    if (!p) return;
    const label = h('input', { type: 'text', placeholder: 'name', maxLength: 16, 'data-autofocus': '' });
    let ok = false;
    openModal({
      title: 'new highlight', body: h('div', { class: 'so-form' }, h('div', { class: 'so-hl-prev' }, pic(p.imageId)), label),
      actions: [{ label: 'add', kind: 'primary', onClick: close => { ok = true; d.highlights.push({ id: 'h_' + uid(), label: label.value.trim() || 'xoxo', imageId: p.imageId }); save(); close(); draw(); } }],
      onClose: () => { if (!ok) dropImage(p.imageId); },
    });
  }
  function story(i) {
    const hl = d.highlights[i];
    if (!hl) return;
    let timer = null;
    const close = () => { clearTimeout(timer); wrap.remove(); document.removeEventListener('keydown', key, true); };
    const step = k => { close(); if (d.highlights[i + k]) story(i + k); };
    const key = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', key, true);
    const wrap = h('div', { class: 'so-story-wrap', onclick: e => { if (e.target === wrap) close(); } },
      h('div', { class: 'so-story' },
        h('div', { class: 'so-story-bars' }, d.highlights.map((_, k) => h('i', { class: k < i ? 'done' : k === i ? 'now' : '' }, h('b')))),
        h('div', { class: 'so-story-who' }, portrait(char, 'xs'), h('b', {}, handleOf(char, d)), h('span', {}, hl.label),
          h('button', { type: 'button', class: 'so-story-x', onclick: close }, '✕')),
        hl.imageId ? pic(hl.imageId, 'so-story-img') : null,
        h('button', { type: 'button', class: 'so-story-tap l', onclick: () => step(-1) }),
        h('button', { type: 'button', class: 'so-story-tap r', onclick: () => step(1) }),
        mine ? h('button', { type: 'button', class: 'so-story-del', onclick: async () => { close(); if (await confirmDialog(`delete the "${hl.label}" highlight?`, { danger: true, okLabel: 'delete' })) { d.highlights = d.highlights.filter(x => x !== hl); dropImage(hl.imageId); save(); draw(); } } }, 'delete') : null));
    document.body.append(wrap);
    timer = setTimeout(() => step(1), 5000);
  }

  function feedPost(p) {
    const liker = p.comments.find(c => c.who?.id && ocById(c.who.id));
    const heart = h('button', { type: 'button', class: 'so-act' + (p.liked ? ' liked' : ''), title: 'like', onclick: () => like(p, heart, likes) }, p.liked ? '♥' : '♡');
    const likes = h('b', { class: 'so-likes' });
    const drawLikes = () => fill(likes, liker && p.likes > 1 ? ['liked by ', who(liker.who).name, ` and ${bigNum(p.likes - 1)} others`] : `${bigNum(p.likes)} likes`);
    likes.redraw = drawLikes;
    drawLikes();
    const media = h('div', { class: 'so-media', ondblclick: () => { if (!p.liked) like(p, heart, likes); burst(media); } },
      p.imageId ? pic(p.imageId) : h('div', { class: 'so-text-tile big' }, h('span', {}, p.caption)));
    return h('article', { class: 'so-post' },
      h('div', { class: 'so-post-head' }, portrait(char, 'xs'), h('b', {}, handleOf(char, d)), d.verified ? verified() : null, p.id === d.pinned ? h('span', { class: 'so-pinned' }, '📌') : null,
        h('button', { type: 'button', class: 'so-more', onclick: () => openPost(p) }, '•••')),
      media,
      h('div', { class: 'so-act-row' }, heart, h('button', { type: 'button', class: 'so-act', title: 'comments', onclick: () => openPost(p) }, '💬'), h('span', { class: 'so-act' }, '➤'), h('span', { class: 'so-act save' }, '🔖')),
      likes,
      p.caption && p.imageId ? h('p', { class: 'so-cap' }, h('b', {}, handleOf(char, d)), ' ', p.caption) : null,
      p.comments.length ? h('button', { type: 'button', class: 'so-view-c', onclick: () => openPost(p) }, p.comments.length === 1 ? 'view 1 comment' : `view all ${p.comments.length} comments`) : null,
      p.comments.slice(-2).map(c => h('p', { class: 'so-cap' }, h('b', {}, handleFor(c.who)), ' ', c.text)),
      h('span', { class: 'so-ago' }, timeAgo(p.at)));
  }
  function like(p, heart, likes) {
    if (!mine) { burst(heart); return; }
    p.liked = !p.liked;
    p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
    save();
    heart.textContent = p.liked ? '♥' : '♡';
    heart.classList.toggle('liked', p.liked);
    heart.classList.remove('boing'); void heart.offsetWidth; heart.classList.add('boing');
    likes?.redraw?.();
  }

  // ======== post box (both looks) ========
  function openPost(p) {
    const commentsEl = h('div', { class: 'so-comments' });
    let as = defaultCommenter();
    const asBtn = h('button', { type: 'button', class: 'so-as', title: 'comment as', onclick: async () => { const r = await pickWho({ title: 'comment as', okLabel: 'comment as them' }); if (r) { as = r; drawAs(); } } });
    const drawAs = () => fill(asBtn, face(as, 'xs'), h('span', {}, who(as).name), ' ▾');
    const input = h('input', { type: 'text', class: 'so-c-input', placeholder: 'add a comment', maxLength: 400, onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addComment(); } } });
    const heart = h('button', { type: 'button', class: 'so-act' + (p.liked ? ' liked' : ''), onclick: () => { like(p, heart, likesEl); likesEl.textContent = `${bigNum(p.likes)} likes`; } }, p.liked ? '♥' : '♡');
    const likesEl = h('b', { class: 'so-likes' }, `${bigNum(p.likes)} likes`);
    const media = h('div', { class: 'so-pm-media', ondblclick: () => { if (!p.liked) { like(p, heart, likesEl); likesEl.textContent = `${bigNum(p.likes)} likes`; } burst(media); } },
      p.imageId ? pic(p.imageId) : h('div', { class: 'so-text-tile big' }, h('span', {}, p.caption)));
    function addComment() {
      const text = input.value.trim();
      if (!text) return;
      p.comments.push({ id: 'c_' + uid(), who: freshRef(as), text, at: Date.now() });
      input.value = '';
      save();
      drawComments(true);
      draw();
    }
    function drawComments(anim) {
      fill(commentsEl,
        p.caption && p.imageId ? h('div', { class: 'so-c cap' }, portrait(char, 'sm'), h('div', {}, h('p', {}, h('b', {}, handleOf(char, d)), ' ', p.caption), h('span', { class: 'so-ago' }, timeAgo(p.at)))) : null,
        p.comments.map((c, i) => {
          const w = who(c.who);
          return h('div', { class: 'so-c' + (anim && i === p.comments.length - 1 ? ' new' : '') },
            w.char ? h('a', { href: ctx.ocLink(w.char), class: 'so-c-face' }, face(c.who, 'sm')) : face(c.who, 'sm'),
            h('div', { class: 'so-c-main' }, h('p', {}, h('b', {}, handleFor(c.who)), ' ', c.text), h('span', { class: 'so-ago' }, timeAgo(c.at))),
            mine ? h('button', { type: 'button', class: 'so-c-x', title: 'delete', onclick: () => { p.comments = p.comments.filter(x => x !== c); save(); drawComments(); draw(); } }, '✕') : null);
        }));
      requestAnimationFrame(() => { commentsEl.scrollTop = commentsEl.scrollHeight; });
    }
    drawAs();
    drawComments();
    const m = openModal({
      title: handleOf(char, d), wide: true,
      body: h('div', { class: 'so-pm' + (d.style === 'scene' ? ' scene' : '') },
        media,
        h('div', { class: 'so-pm-side' },
          commentsEl,
          h('div', { class: 'so-act-row' }, heart, h('span', { class: 'so-act' }, '💬'), h('span', { class: 'so-act' }, '➤')),
          likesEl,
          h('span', { class: 'so-ago' }, new Date(p.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase()),
          mine ? h('div', { class: 'so-c-add' }, asBtn, input, h('button', { type: 'button', class: 'so-c-post', onclick: addComment }, 'post')) : null)),
      actions: mine ? [
        { label: 'delete', kind: 'danger', onClick: async close => { if (!(await confirmDialog('delete this post?', { danger: true, okLabel: 'delete' }))) return; d.posts = d.posts.filter(x => x !== p); if (d.pinned === p.id) d.pinned = null; dropImage(p.imageId); save(); close(); draw(); } },
        { label: d.pinned === p.id ? 'unpin' : 'pin', kind: 'ghost', onClick: close => { d.pinned = d.pinned === p.id ? null : p.id; save(); close(); draw(); } },
        { label: 'edit', kind: 'ghost', onClick: close => { close(); postBox(p); } },
      ] : [],
    });
    return m;
  }
  function defaultCommenter() {
    const rel = store.relsOf(char.id).map(r => (r.a === char.id ? r.b : r.a)).find(id => id && ocById(id));
    const o = rel ? ocById(rel) : allOcs(char.id)[0];
    return o ? refOf(o) : { id: char.id, name: nameOf(char) };
  }

  // new post / edit post
  const newPost = () => postBox(null);
  function postBox(post) {
    const draft = post ? { ...post } : { imageId: null, caption: '', likes: Math.floor(80 + Math.random() * 900), at: Date.now() };
    const uploads = [];
    const picBox = h('div', { class: 'so-pb-pic' });
    const drawPic = () => fill(picBox,
      draft.imageId ? pic(draft.imageId) : h('span', { class: 'so-pb-plus' }, '+'),
      h('button', { type: 'button', class: 'btn sm', onclick: async () => { const [p] = await addPhotos(false, 1400); if (!p) return; uploads.push(p.imageId); draft.imageId = p.imageId; drawPic(); } }, draft.imageId ? 'change picture' : 'add picture'));
    drawPic();
    const cap = autosize(h('textarea', { placeholder: 'caption', maxLength: 1000, value: draft.caption, oninput: e => { draft.caption = e.target.value; } }));
    const likes = h('input', { type: 'number', class: 'so-num', min: 0, value: draft.likes, oninput: e => { draft.likes = Math.max(0, Number(e.target.value) || 0); } });
    const day = h('input', { type: 'date', class: 'so-date', value: new Date(draft.at - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10), oninput: e => { if (e.target.value) { const [y, mo, dd] = e.target.value.split('-').map(Number); const t = new Date(draft.at); t.setFullYear(y, mo - 1, dd); draft.at = t.getTime(); } } });
    let saved = false;
    openModal({
      title: post ? 'edit post' : 'new post',
      body: h('div', { class: 'so-form so-pb' }, picBox, cap,
        h('div', { class: 'so-pb-row' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'likes'), likes), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'day'), day))),
      actions: [{
        label: post ? 'save' : 'post', kind: 'primary', onClick: close => {
          if (!draft.imageId && !draft.caption.trim()) { cap.focus(); return; }
          saved = true;
          if (post) {
            if (post.imageId && post.imageId !== draft.imageId) dropImage(post.imageId);
            Object.assign(post, draft);
          } else d.posts.push({ id: 'p_' + uid(), ...draft, liked: false, comments: [] });
          save();
          close();
          draw();
        },
      }],
      onClose: () => uploads.filter(id => !saved || id !== draft.imageId).forEach(dropImage),
    });
  }

  // ======== scene profile ========
  function scenePage() {
    const sc = d.scene;
    const name = d.display || nameOf(char);
    const first = name.split(/\s+/)[0];
    const handle = handleOf(char, d);
    const basics = Object.fromEntries((char.basics || []).filter(b => b.value).map(b => [b.label, b.value]));
    const friends = d.topFriends.map(r => ({ r, w: who(r) })).filter(x => !x.w.gone);
    let added = false, faved = false;
    const friendCount = h('b', {}, bigNum(d.followers));
    const posts = sorted();

    const wrap = h('div', { class: `so-scene bg-${sc.bg} font-${sc.font}`, style: { '--sc': sc.color } },
      h('div', { class: 'so-sc-nav' },
        h('b', { class: 'so-sc-logo' }, 'myscene', h('sup', {}, '™')),
        h('nav', {}, ['home', 'browse', 'search', 'mail', 'blog', 'music'].map(l => h('span', {}, l)))),
      h('div', { class: 'so-sc-cols' },
        h('div', { class: 'so-sc-left' },
          h('h1', { class: 'so-sc-name' + (sc.glitter ? ' glitter' : '') }, name),
          h('div', { class: 'so-sc-card' },
            h('div', { class: 'so-sc-pfp' }, portrait(char, 'so-sc-me')),
            h('div', { class: 'so-sc-info' },
              d.headline ? h('p', { class: 'so-sc-quote' }, `"${d.headline}"`) : null,
              basics.pronouns ? h('p', {}, basics.pronouns) : null,
              basics.age ? h('p', {}, `${basics.age} years old`) : null,
              basics.species ? h('p', {}, basics.species) : null,
              h('p', { class: 'so-sc-online' }, h('i'), 'online now!'),
              h('p', { class: 'so-sc-small' }, 'last login: ', dayLabel(char.updatedAt || Date.now())))),
          h('p', { class: 'so-sc-mood' }, h('b', {}, 'mood: '), d.mood || '—', ' ', sticker('1f5a4', 'so-sc-mood-stk')),
          songPlayer(),
          h('div', { class: 'so-sc-box' },
            h('div', { class: 'so-sc-box-head' }, `contacting ${first}`),
            h('div', { class: 'so-sc-contact' },
              h('button', { type: 'button', onclick: e => { added = !added; friendCount.textContent = bigNum(d.followers + (added ? 1 : 0)); e.currentTarget.classList.toggle('on', added); sparkleAt(e.currentTarget); } }, '💗 add to friends'),
              h('button', { type: 'button', onclick: () => ctx.go(`${ctx.base}/fun/phone`) }, '✉️ send message'),
              h('button', { type: 'button', onclick: e => { faved = !faved; e.currentTarget.classList.toggle('on', faved); sparkleAt(e.currentTarget); } }, '⭐ add to favorites'),
              h('button', { type: 'button', onclick: e => { e.currentTarget.classList.remove('shake'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('shake'); } }, '🚫 block user'))),
          h('div', { class: 'so-sc-url' }, h('b', {}, 'myscene url: '), `myscene.com/${handle}`),
          h('div', { class: 'so-sc-box' },
            h('div', { class: 'so-sc-box-head' }, `${first}'s interests`),
            h('table', { class: 'so-sc-table' }, [['general', 'general'], ['music', 'music'], ['movies', 'movies'], ['heroes', 'heroes']].map(([k, l]) =>
              h('tr', {}, h('th', {}, l), h('td', {}, d.interests[k] || '—')))))),
        h('div', { class: 'so-sc-right' },
          h('div', { class: 'so-sc-network' }, h('b', {}, `${first} is in your extended network`)),
          posts.length ? h('div', { class: 'so-sc-blog' },
            h('div', { class: 'so-sc-h' }, `${first}'s latest blog entry`),
            posts.slice(0, 4).map(p => h('button', { type: 'button', class: 'so-sc-blog-row', onclick: () => openPost(p) }, p.id === d.pinned ? '📌 ' : '', (p.caption || 'untitled').split('\n')[0].slice(0, 60), h('span', {}, ' (view more)')))) : null,
          h('div', { class: 'so-sc-h' }, `${first}'s blurbs`),
          h('div', { class: 'so-sc-blurb' }, h('b', {}, 'about me:'), h('p', {}, d.about || d.bio || '—'), h('b', {}, "who i'd like to meet:"), h('p', {}, d.meet || '—')),
          h('div', { class: 'so-sc-h' }, `${first}'s friend space`),
          h('div', { class: 'so-sc-friends' },
            h('p', { class: 'so-sc-fcount' }, first, ' has ', friendCount, ' friends.'),
            friends.length ? h('div', { class: 'so-sc-top8' }, friends.slice(0, 8).map(({ r, w }, i) =>
              h(w.char ? 'a' : 'div', { class: 'so-sc-friend', href: w.char ? ctx.ocLink(w.char) : null, style: { animationDelay: i * 0.06 + 's' } },
                h('span', { class: 'so-sc-fname' }, w.name.split(/\s+/)[0]), face(r, 'so-sc-fpic')))) : null,
            mine ? h('button', { type: 'button', class: 'so-sc-link', onclick: pickTop8 }, friends.length ? 'edit top 8' : 'pick top 8') : null),
          h('div', { class: 'so-sc-h' }, `${first}'s pics`, mine ? h('button', { type: 'button', class: 'so-sc-link light', onclick: newPost }, '+ add') : null),
          posts.filter(p => p.imageId).length ? h('div', { class: 'so-sc-pics' }, posts.filter(p => p.imageId).map(p =>
            h('button', { type: 'button', class: 'so-sc-pic', onclick: () => openPost(p) }, pic(p.imageId), p.comments.length ? h('span', {}, p.comments.length, ' 💬') : null))) : null,
          wallBox(first))));
    if (sc.sparkles) cleanups.push(sparkleTrail(wrap));
    return wrap;
  }

  function songPlayer() {
    const real = char.playlist.find(s => s.id === d.song.songId);
    const title = real?.title || d.song.title;
    if (!title) return null;
    const btn = h('button', { type: 'button', class: 'so-sc-play', title: 'play' }, '▶');
    const eq = h('span', { class: 'so-sc-eq' }, h('i'), h('i'), h('i'), h('i'), h('i'));
    const state = () => {
      const bar = document.querySelector('.player');
      const playing = real && bar && !bar.hidden && bar.querySelector('.player-title')?.textContent === real.title && bar.querySelector('.player-btn.big')?.title === 'pause';
      btn.textContent = playing ? '❚❚' : '▶';
      eq.classList.toggle('on', !!playing || fake);
    };
    let fake = false;
    btn.onclick = () => {
      if (real) {
        const bar = document.querySelector('.player');
        if (bar?.querySelector('.player-title')?.textContent === real.title) bar.querySelector('.player-btn.big')?.click();
        else document.querySelectorAll('.player .player-song')[char.playlist.indexOf(real)]?.click();
      } else fake = !fake;
      setTimeout(state, 200);
    };
    const iv = setInterval(state, 600);
    cleanups.push(() => clearInterval(iv));
    requestAnimationFrame(state);
    return h('div', { class: 'so-sc-player' },
      btn, eq,
      h('div', { class: 'so-sc-song' }, h('marquee', { scrollamount: 3 }, '♫ ', title, ' ♫')));
  }

  function wallBox(first) {
    const list = [...d.wall].sort((a, b) => b.at - a.at);
    return [
      h('div', { class: 'so-sc-h' }, `${first}'s friends comments`),
      h('div', { class: 'so-sc-wall' },
        h('p', { class: 'so-sc-small' }, `displaying ${list.length} of ${list.length} comments `, mine ? h('button', { type: 'button', class: 'so-sc-link', onclick: addWall }, '( add comment )') : null),
        list.map(c => {
          const w = who(c.who);
          return h('div', { class: 'so-sc-wc' },
            h(w.char ? 'a' : 'div', { class: 'so-sc-wc-who', href: w.char ? ctx.ocLink(w.char) : null }, h('span', {}, w.name), face(c.who, 'so-sc-fpic')),
            h('div', { class: 'so-sc-wc-body' }, h('b', {}, `${dayLabel(c.at)} ${hmA(c.at)}`), h('p', {}, c.text),
              mine ? h('button', { type: 'button', class: 'so-sc-link', onclick: () => { d.wall = d.wall.filter(x => x !== c); save(); draw(); } }, 'delete') : null));
        })),
    ];
  }
  async function addWall() {
    let as = defaultCommenter();
    const asBtn = h('button', { type: 'button', class: 'so-as', onclick: async () => { const r = await pickWho({ title: 'comment as', okLabel: 'comment as them' }); if (r) { as = r; drawAs(); } } });
    const drawAs = () => fill(asBtn, face(as, 'xs'), h('span', {}, who(as).name), ' ▾');
    drawAs();
    const ta = autosize(h('textarea', { maxLength: 600, 'data-autofocus': '' }));
    openModal({
      title: 'add comment', body: h('div', { class: 'so-form' }, asBtn, ta),
      actions: [{ label: 'post', kind: 'primary', onClick: close => { if (!ta.value.trim()) return ta.focus(); d.wall.push({ id: 'w_' + uid(), who: freshRef(as), text: ta.value.trim(), at: Date.now() }); save(); close(); draw(); } }],
    });
  }
  function pickTop8() {
    let picks = d.topFriends.map(r => ({ ...r }));
    const list = h('div', { class: 'so-t8-picks' });
    const drawPicks = () => fill(list,
      picks.map((r, i) => h('div', { class: 'so-t8-pick' }, h('em', {}, i + 1), face(r, 'sm'), h('span', {}, who(r).name),
        i > 0 ? h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', onclick: () => { [picks[i - 1], picks[i]] = [picks[i], picks[i - 1]]; drawPicks(); } }, '↑') : null,
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { picks.splice(i, 1); drawPicks(); } }, '✕'))),
      picks.length < 8 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const r = await pickWho({ title: 'add a friend', not: char.id, okLabel: 'add' }); if (r && !picks.some(p => (p.id && p.id === r.id))) { picks.push(r); drawPicks(); } } }, '+ add a friend') : null);
    drawPicks();
    openModal({
      title: 'top 8', body: list,
      actions: [{ label: 'save', kind: 'primary', onClick: close => { d.topFriends = picks; save(); close(); draw(); } }],
    });
  }

  // ======== edit profile ========
  function editProfile() {
    const t = (key, ph, max = 80) => h('input', { type: 'text', value: d[key], placeholder: ph, maxLength: max, oninput: e => { d[key] = e.target.value; save(); } });
    const area = (obj, key, ph) => autosize(h('textarea', { value: obj[key], placeholder: ph, maxLength: 1200, oninput: e => { obj[key] = e.target.value; save(); } }));
    const num = key => h('input', { type: 'number', class: 'so-num', min: 0, value: d[key], oninput: e => { d[key] = Math.max(0, Number(e.target.value) || 0); save(); } });
    const songSel = h('select', { onchange: e => { d.song.songId = e.target.value || null; save(); songText.hidden = !!d.song.songId; } },
      h('option', { value: '' }, 'type one'),
      char.playlist.map(s => h('option', { value: s.id, selected: s.id === d.song.songId }, s.title || 'untitled')));
    const songText = h('input', { type: 'text', value: d.song.title, maxLength: 80, hidden: !!d.song.songId, oninput: e => { d.song.title = e.target.value; save(); } });
    const field = (label, ...kids) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), ...kids);
    const styleSeg = segmented([{ value: 'scene', label: 'scene' }, { value: 'feed', label: 'feed' }], d.style, v => { d.style = v; save(); draw(); sceneBox.hidden = v !== 'scene'; });
    const sceneBox = h('div', { class: 'so-edit-scene', hidden: d.style !== 'scene' },
      field('background', h('div', { class: 'so-bg-picks' }, SCENE_BGS.map(([v, l]) => h('button', {
        type: 'button', class: `so-bg-pick bg-${v}` + (d.scene.bg === v ? ' on' : ''), style: { '--sc': d.scene.color }, title: l,
        onclick: e => { d.scene.bg = v; save(); draw(); e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); },
      }, h('span', {}, l))))),
      field('color', swatches(d.scene.color, c => { d.scene.color = c; save(); draw(); document.querySelectorAll('.so-bg-pick').forEach(b => b.style.setProperty('--sc', c)); }, SCENE_COLORS)),
      field('font', segmented(SCENE_FONTS.map(([value, label]) => ({ value, label })), d.scene.font, v => { d.scene.font = v; save(); draw(); })),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.scene.glitter, onchange: e => { d.scene.glitter = e.target.checked; save(); draw(); } }), 'glitter name'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.scene.sparkles, onchange: e => { d.scene.sparkles = e.target.checked; save(); draw(); } }), 'sparkle cursor'),
      field('mood', t('mood', '')),
      field('headline', t('headline', '', 120)),
      field('about me', area(d, 'about', '')),
      field("who i'd like to meet", area(d, 'meet', '')),
      ...['general', 'music', 'movies', 'heroes'].map(k => field(k, area(d.interests, k, ''))),
      field('profile song', h('div', { class: 'so-song-pick' }, char.playlist.length ? songSel : null, songText)));
    openModal({
      title: 'edit profile', wide: true,
      body: h('div', { class: 'so-edit' },
        field('look', styleSeg),
        h('div', { class: 'so-edit-grid' },
          field('username', t('handle', handleOf(char, d), 30)),
          field('display name', t('display', nameOf(char), 60))),
        field('bio', area(d, 'bio', '')),
        field('link', t('link', '', 120)),
        h('div', { class: 'so-edit-grid three' },
          field('followers', num('followers')),
          field('following', num('following')),
          h('label', { class: 'check so-verified' }, h('input', { type: 'checkbox', checked: d.verified, onchange: e => { d.verified = e.target.checked; save(); } }), 'verified')),
        sceneBox),
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
      onClose: draw,
    });
  }

  draw();
  el.append(
    appBar(ctx, meta,
      h('div', { class: 'so-switch' }, segmented([{ value: 'scene', label: 'scene' }, { value: 'feed', label: 'feed' }], d.style, v => { d.style = v; if (mine) save(); draw(); })),
      mine ? h('button', { type: 'button', class: 'btn sm', onclick: editProfile }, 'edit') : null,
      mine ? h('button', { type: 'button', class: 'btn primary sm', onclick: newPost }, '+ post') : null),
    body);
  return () => cleanups.forEach(f => f());
}

// ---- little bits ----
const verified = () => h('span', { class: 'so-verified-badge', title: 'verified' }, '✓');
const gridIco = () => h('span', { class: 'so-ico-grid' }, h('i'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i'));
const listIco = () => h('span', { class: 'so-ico-list' }, h('i'), h('i'));
function timeAgo(ts) {
  const a = ago(ts);
  if (a === 'now') return 'just now';
  const n = parseInt(a, 10), u = a.replace(/\d+/, '');
  const word = { m: 'minute', h: 'hour', d: 'day', w: 'week' }[u];
  if (u === 'w' && n > 8) return new Date(ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toLowerCase();
  return `${n} ${word}${n === 1 ? '' : 's'} ago`;
}
function burst(target) {
  const b = h('span', { class: 'so-burst' }, '♥');
  target.append(b);
  setTimeout(() => b.remove(), 900);
}
function sparkleAt(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const s = h('span', { class: 'so-spark', style: { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', '--dx': (Math.random() * 120 - 60) + 'px', '--dy': (Math.random() * -90 - 10) + 'px' } }, ['✦', '✧', '★', '♥'][i % 4]);
    document.body.append(s);
    setTimeout(() => s.remove(), 900);
  }
}
// the classic: sparkles trailing the mouse
function sparkleTrail(area) {
  let last = 0;
  const move = e => {
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    const s = h('span', { class: 'so-trail', style: { left: e.clientX + 'px', top: e.clientY + 'px', '--dx': (Math.random() * 30 - 15) + 'px' } }, ['✦', '✧', '⋆', '♥', '★'][Math.floor(Math.random() * 5)]);
    document.body.append(s);
    setTimeout(() => s.remove(), 800);
  };
  area.addEventListener('pointermove', move);
  return () => area.removeEventListener('pointermove', move);
}
