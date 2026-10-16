// phone app: myspace. the oc's own profile (drawn by myspace.js, same data as the socials app's scene look),
// a logged-in home page (friend requests, bulletins, mail, friends), and worldmates' pages.
// see the plug-in notes at the top of phone.js
//
// bulletins go out to every friend: char.fun.social.ms.bulletins. the board shows worldmates' too.
// commenting on a worldmate's page writes into *their* char.fun.social.wall (only if you made that oc).

import { h, fill, uid, openModal, confirmDialog, autosize, toast } from '../ui.js';
import { store } from '../store.js';
import { pic, portrait, nameOf, worldmates } from './kit.js';
import { refOf, unreadCount, hmA } from './phone-bits.js';
import { renderMyspace, editMyspace, msData, sparkleAt } from './myspace.js';

export const APPS = {
  myspace: { label: 'myspace', icon: '1f46b', bg: 'linear-gradient(160deg,#5b8fd6,#0b2f80)', cat: 'social' },
};
export const DEF = {};

// comments on this oc's page from someone else since the app was last opened
function fresh(char) {
  const sd = char.fun?.social;
  if (!sd?.wall) return [];
  const seen = sd.ms?.seen || 0;
  return sd.wall.filter(c => c.at > seen && c.who?.id !== char.id);
}
export function lockNotifs({ char, show }) {
  return fresh(char).filter(c => c.at > Date.now() - 2 * 864e5).slice(-2).map(c => ({
    app: 'myspace', title: 'myspace', text: `${c.who?.name || 'someone'} left you a comment!`, at: c.at, faceOf: c.who,
    open: () => show('myspace', { tab: 'profile' }, 'unlock'),
  }));
}
export const badges = ({ char }) => ({ myspace: fresh(char).length });

const pfpOf = (c, cls) => {
  const ms = c.fun?.social?.ms;
  const p = ms?.pfps?.find(x => x.id === ms.pfpId);
  return p ? h('div', { class: 'portrait ' + cls }, pic(p.imageId)) : portrait(c, cls);
};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const when = ts => { const t = new Date(ts); return `${MONTHS[t.getMonth()]} ${t.getDate()}, ${t.getFullYear()} ${hmA(ts)}`; };

export function install(api) {
  const { char, mine, SCREENS } = api;
  let tab = 'profile', mateId = null, bulletinOf = null;
  let page = null; // the profile element on screen (for its cleanup)

  SCREENS.myspace = (params = {}) => {
    if (params.tab) { tab = params.tab; mateId = null; params.tab = null; }
    const { d, ms } = msData(char);
    const root = h('div', { class: 'pms' });
    const body = h('div', { class: 'ph-scroll pms-scroll' });
    const lnk = (label, onclick, cls = '') => h('button', { type: 'button', class: 'pms-a ' + cls, onclick }, label);
    const goTab = t => { tab = t; mateId = null; bulletinOf = null; draw(); };
    const mates = () => worldmates(char.id);
    const first = c => (c.fun?.social?.display || nameOf(c)).split(/\s+/)[0];
    api.onLeave(() => page?.cleanup?.());

    function markSeen() {
      if (!mine) return;
      ms.seen = Date.now();
      api.save();
    }

    function draw() {
      page?.cleanup?.();
      page = null;
      const mate = mateId ? store.char(mateId) : null;
      fill(root,
        h('div', { class: 'pms-top' },
          mate || bulletinOf ? h('button', { type: 'button', class: 'pms-back', title: 'back', onclick: () => { if (bulletinOf) bulletinOf = null; else mateId = null; draw(); } }, '‹') : h('button', { type: 'button', class: 'pms-back', title: 'home', onclick: () => api.goHome() }, '‹'),
          h('div', { class: 'pms-logo' }, h('span', { class: 'pms-logo-mark' }, h('i'), h('i'), h('i')), h('b', {}, 'myspace'), h('small', {}, 'mobile')),
          mine && !mate && tab === 'profile' ? h('button', { type: 'button', class: 'pms-edit', onclick: () => editMyspace(char, { save: api.save, onChange: () => page?.redraw?.() }) }, 'edit') : h('span', { class: 'pms-edit-sp' })),
        h('nav', { class: 'pms-tabs' }, [['home', 'home'], ['profile', 'profile'], ['bulletins', 'bulletins'], ['friends', 'friends']].map(([k, l]) =>
          h('button', { type: 'button', class: 'pms-tab' + (tab === k && !mate ? ' on' : ''), 'data-tab': k, onclick: () => goTab(k) }, l))),
        body);
      fill(body, mate ? matePage(mate) : bulletinOf ? bulletinPage(bulletinOf) : tab === 'home' ? home() : tab === 'bulletins' ? bulletins(false) : tab === 'friends' ? friends() : profile());
      body.scrollTop = 0;
    }

    // ---- your own page
    function profile() {
      markSeen();
      page = renderMyspace(char, { mine, save: api.save, header: false, openFriend: openMate });
      return page;
    }
    // ---- someone else's (look, comment if you made them, never edit)
    function matePage(mate) {
      page = renderMyspace(mate, { mine: false, canComment: mine && store.isMine(mate), save: () => { if (store.isMine(mate)) store.save('char', mate); }, viewer: char, header: false, openFriend: openMate });
      return page;
    }
    function openMate(c) {
      if (c.id === char.id) { goTab('profile'); return; }
      if (!mates().some(m => m.id === c.id)) { toast(`${nameOf(c)} isn't in this world`); return; }
      mateId = c.id; bulletinOf = null; draw();
    }

    // ---- home: like the logged-in front page
    function home() {
      markSeen();
      const requests = mates().filter(m => !ms.friends.includes(m.id) && !ms.denied.includes(m.id) && !d.topFriends.some(r => r.id === m.id));
      const mail = (api.d.threads || []).reduce((n, t) => n + unreadCount(t), 0);
      const comments = (d.wall || []).filter(c => c.who?.id !== char.id && c.at > Date.now() - 7 * 864e5).length;
      const alert = (label, n, fn, cls) => n ? h('button', { type: 'button', class: 'pms-alert ' + cls, onclick: fn }, h('span', { class: 'pms-alert-ico' }, '!'), label) : null;
      return h('div', { class: 'pms-home' },
        h('div', { class: 'pms-hello' },
          h('button', { type: 'button', class: 'pms-hello-pic', onclick: () => goTab('profile') }, pfpOf(char, 'pms-pfp')),
          h('div', { class: 'pms-hello-text' },
            h('h2', {}, `hello, ${first(char)}!`),
            h('p', {}, lnk('view my profile', () => goTab('profile'))),
            mine ? h('p', {}, lnk('edit profile', () => { goTab('profile'); editMyspace(char, { save: api.save, onChange: () => page?.redraw?.() }); }, 'pms-edit-link')) : null,
            h('p', {}, lnk('my blog', () => { goTab('profile'); page?.show?.('blog'); }), ' | ', lnk('my pics', () => { goTab('profile'); page?.show?.('pics'); })),
            h('p', { class: 'pms-url' }, `myspace.com/${d.handle || nameOf(char).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'oc'}`))),
        h('div', { class: 'pms-box pms-alerts' },
          h('div', { class: 'pms-box-head' }, 'my mail'),
          h('div', { class: 'pms-alerts-in' },
            alert(`${requests.length} new friend request${requests.length === 1 ? '' : 's'}!`, requests.length, null, 'req'),
            alert(`${mail} new message${mail === 1 ? '' : 's'}!`, mail, () => api.openApp('messages'), 'mail'),
            alert(`${comments} new comment${comments === 1 ? '' : 's'}!`, comments, () => goTab('profile'), 'cmt'),
            !requests.length && !mail && !comments ? h('p', { class: 'pms-none' }, 'inbox (0)') : null)),
        requests.length ? h('div', { class: 'pms-box pms-requests' },
          h('div', { class: 'pms-box-head' }, 'friend requests'),
          requests.map(m => h('div', { class: 'pms-req' },
            pfpOf(m, 'pms-req-pic'),
            h('div', { class: 'pms-req-main' }, lnk(nameOf(m), () => openMate(m), 'pms-req-name'), h('span', {}, 'wants to be your friend!')),
            mine ? h('div', { class: 'pms-req-btns' },
              h('button', { type: 'button', class: 'pms-btn approve', onclick: e => { sparkleAt(e.currentTarget); ms.friends.push(m.id); d.followers = (Number(d.followers) || 0) + 1; api.save(); setTimeout(draw, 250); } }, 'approve'),
              h('button', { type: 'button', class: 'pms-btn deny', onclick: () => { ms.denied.push(m.id); api.save(); draw(); } }, 'deny')) : null))) : null,
        bulletins(true),
        h('div', { class: 'pms-box' },
          h('div', { class: 'pms-box-head' }, `${first(char)}'s friend space`, lnk('view all', () => goTab('friends'), 'pms-head-link')),
          friendGrid(mates().slice(0, 8))));
    }

    // ---- bulletins: yours + worldmates'
    function allBulletins() {
      const out = (ms.bulletins || []).map(b => ({ b, from: char }));
      for (const m of mates()) for (const b of m.fun?.social?.ms?.bulletins || []) out.push({ b, from: m });
      return out.sort((x, y) => y.b.at - x.b.at);
    }
    function bulletins(short) {
      const list = allBulletins();
      const rows = short ? list.slice(0, 5) : list;
      return h('div', { class: 'pms-box pms-bulletins' },
        h('div', { class: 'pms-box-head' }, short ? 'my bulletin space' : 'bulletin board',
          mine ? lnk('post bulletin', postBulletin, 'pms-head-link pms-post-b') : null),
        rows.length ? h('table', { class: 'pms-b-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'from'), h('th', {}, 'date'), h('th', {}, 'bulletin'))),
          h('tbody', {}, rows.map(({ b, from }) => h('tr', { class: 'pms-b-row', onclick: () => { bulletinOf = { id: b.id, from: from.id }; draw(); } },
            h('td', { class: 'pms-b-from' }, pfpOf(from, 'pms-b-pic'), h('span', {}, first(from))),
            h('td', { class: 'pms-b-date' }, when(b.at)),
            h('td', { class: 'pms-b-subj' }, h('span', { class: 'pms-a' }, b.subject || '(no subject)')))))) : h('p', { class: 'pms-none' }, 'no bulletins yet'),
        short && list.length > 5 ? h('p', { class: 'pms-more' }, lnk('view all bulletins', () => goTab('bulletins'))) : null);
    }
    function bulletinPage({ id, from }) {
      const owner = store.char(from);
      const b = owner?.fun?.social?.ms?.bulletins?.find(x => x.id === id);
      if (!b) { bulletinOf = null; return bulletins(false); }
      return h('div', { class: 'pms-box pms-bulletin' },
        h('div', { class: 'pms-box-head' }, 'bulletin'),
        h('div', { class: 'pms-bul-in' },
          h('div', { class: 'pms-bul-from' }, pfpOf(owner, 'pms-b-pic big'),
            h('div', {}, h('p', {}, h('b', {}, 'from: '), owner.id === char.id ? nameOf(owner) : lnk(nameOf(owner), () => openMate(owner))), h('p', {}, h('b', {}, 'date: '), when(b.at)))),
          h('h3', { class: 'pms-bul-subj' }, b.subject || '(no subject)'),
          h('div', { class: 'pms-bul-body' }, b.body),
          mine && owner.id === char.id ? h('p', { class: 'pms-bul-tools' }, lnk('delete', async () => { if (await confirmDialog('delete this bulletin?', { danger: true, okLabel: 'delete' })) { ms.bulletins = ms.bulletins.filter(x => x !== b); api.save(); bulletinOf = null; draw(); } })) : null));
    }
    function postBulletin() {
      const subj = h('input', { type: 'text', maxLength: 100, 'data-autofocus': '' });
      const text = autosize(h('textarea', { maxLength: 3000, rows: 5 }));
      openModal({
        title: 'post bulletin',
        body: h('div', { class: 'ms-form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'subject'), subj), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'body'), text)),
        actions: [{ label: 'post', kind: 'primary', onClick: close => {
          if (!subj.value.trim() && !text.value.trim()) return subj.focus();
          ms.bulletins.push({ id: 'bu_' + uid(), subject: subj.value.trim(), body: text.value.trim(), at: Date.now() });
          api.save(); close(); draw();
          toast('bulletin posted to all friends!');
        } }],
      });
    }

    // ---- friends
    function friendGrid(list) {
      if (!list.length) return h('p', { class: 'pms-none' }, 'no friends in this world yet');
      return h('div', { class: 'pms-fgrid' }, list.map(m => h('button', { type: 'button', class: 'pms-friend', 'data-id': m.id, onclick: () => openMate(m) },
        h('span', { class: 'pms-fname' }, first(m)), pfpOf(m, 'pms-fpic'))));
    }
    function friends() {
      const list = mates();
      return h('div', { class: 'pms-box pms-friends' },
        h('div', { class: 'pms-box-head' }, `${first(char)}'s friends (${list.length})`),
        friendGrid(list));
    }

    draw();
    return root;
  };
}
