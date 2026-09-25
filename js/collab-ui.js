// the screens for collab worlds: share a world, join one, see who's here

import { h, fill, toast, openModal, confirmDialog, field } from './ui.js';
import { me } from './me.js';
import { collab } from './collab.js';

const STATUS = { connecting: 'connecting…', online: 'online', offline: 'offline', taken: 'open in another tab' };

// collab needs something to call you. resolves with the name, or null if they backed out
export function askName() {
  if (me.name) return Promise.resolve(me.name);
  return new Promise(resolve => {
    let name = '';
    openModal({
      title: 'your name',
      body: field('what should people see you as?', h('input', { type: 'text', maxLength: 30, 'data-autofocus': true, oninput: e => name = e.target.value })),
      actions: [
        { label: 'cancel', onClick: close => close() },
        { label: 'ok', kind: 'primary', onClick: close => { if (name.trim()) { me.setName(name); close(); } } },
      ],
      onClose: () => resolve(me.name || null),
    });
  });
}

function copy(text, what) {
  navigator.clipboard?.writeText(text).then(() => toast(`${what} copied`), () => toast(text));
}

const peopleRow = session => h('div', { class: 'chip-row' },
  (session?.people || []).map(p => h('span', { class: 'chip person' }, p.host ? '👑 ' : '', p.name || 'someone', p.id === me.id ? ' (you)' : '')));

// the 👥 button in a world's top bar
export function openCollabModal(world, go) {
  const body = h('div', {});
  let modal = null;

  function draw() {
    const session = collab.session(world.id);
    const role = world.collab?.role;
    if (!role) {
      fill(body, h('button', {
        type: 'button', class: 'btn primary', onclick: async () => {
          if (!await askName()) return;
          collab.share(world);
          draw();
        },
      }, '👥 share this world'));
    } else if (role === 'host') {
      fill(body,
        h('div', { class: 'collab-code' }, world.collab.code),
        h('div', { class: 'modal-extra' },
          h('button', { type: 'button', class: 'btn sm', onclick: () => copy(world.collab.code, 'code') }, 'copy code'),
          h('button', { type: 'button', class: 'btn sm', onclick: () => copy(collab.link(world.collab.code), 'link') }, 'copy invite link')),
        h('div', { class: 'field-label' }, `here now · ${STATUS[session?.status] || 'offline'}`),
        peopleRow(session),
        h('div', { class: 'modal-extra' },
          h('button', {
            type: 'button', class: 'link-btn', onclick: async () => {
              if (!await confirmDialog('make a new code? the old one stops working and everyone has to join again.', { okLabel: 'new code' })) return;
              collab.renew(world);
              draw();
            },
          }, 'new code'),
          h('button', {
            type: 'button', class: 'link-btn danger', onclick: async () => {
              if (!await confirmDialog('stop sharing this world? it stays yours, nobody else can get in any more.', { okLabel: 'stop sharing', danger: true })) return;
              collab.stop(world);
              draw();
            },
          }, 'stop sharing')));
    } else {
      fill(body,
        h('div', { class: 'field-label' }, `${world.collab.hostName || 'the host'}'s world · ${STATUS[session?.status] || 'offline'}`),
        peopleRow(session),
        h('div', { class: 'modal-extra' },
          h('button', {
            type: 'button', class: 'link-btn danger', onclick: async () => {
              if (!await confirmDialog(`leave "${world.name}"? it comes off this device. your own ocs stay.`, { okLabel: 'leave', danger: true })) return;
              await collab.leave(world);
              modal.close();
              go('');
            },
          }, 'leave this world')));
    }
  }

  draw();
  const stop = collab.onStatus(draw);
  modal = openModal({ title: 'collab', body, actions: [{ label: 'done', kind: 'primary', onClick: close => close() }], onClose: stop });
}

// "join a world" on the home page, and what an invite link opens
export function openJoinModal(go, startCode = '') {
  let code = startCode;
  let busy = false;
  const button = { label: 'join', kind: 'primary', onClick: join };

  async function join(close) {
    if (busy || !collab.cleanCode(code)) return;
    if (!await askName()) return;
    busy = true;
    toast('looking for that world…');
    try {
      const world = await collab.join(code);
      close();
      go(`w/${world.id}`);
    } catch (err) {
      toast(err.message === 'already here' ? 'that world is already on this device' : "couldn't find it. the host has to have the site open", 'bad');
    }
    busy = false;
  }

  openModal({
    title: 'join a world',
    body: field('code', h('input', { type: 'text', class: 'code-input', value: code, maxLength: 80, placeholder: 'K7M2QX', 'data-autofocus': true, oninput: e => code = e.target.value })),
    actions: [{ label: 'cancel', onClick: close => close() }, button],
  });
}
