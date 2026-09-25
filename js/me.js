// who's using this browser. there are no accounts yet, so "you" is a random id kept on this device plus
// whatever name you typed. collab worlds use it to know whose oc is whose.

import { uid } from './ui.js';

const KEY = 'ocw-me';

let data = {};
try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}

function keep() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

if (!data.id) {
  data.id = 'u_' + uid();
  keep();
}

export const me = {
  get id() { return data.id; },
  get name() { return data.name || ''; },
  setName(name) {
    data.name = String(name).trim().slice(0, 30);
    keep();
  },
};
