// every app in an oc's "more" tab. each one is its own file in this folder with
//   export const meta = { id, label, icon }   (icon = a sticker code from /stickers)
//   export function render(el, ctx)            (ctx: see kit.js)
// and its own stylesheet in css/ocfun/<id>.css. whatever it saves lives in char.fun[<id>].

import * as phone from './phone.js';
import * as social from './social.js';
import * as magazine from './magazine.js';
import * as letters from './letters.js';
import * as room from './room.js';
import * as dressup from './dressup.js';
import * as locker from './locker.js';
import * as polaroids from './polaroids.js';
import * as card from './card.js';
import * as ids from './ids.js';
import * as yearbook from './yearbook.js';
import * as timeline from './timeline.js';
import * as mood from './mood.js';
import * as mixtape from './mixtape.js';
import * as ships from './ships.js';
import * as diaries from './diaries.js';

export const FEATURES = [phone, social, magazine, letters, room, dressup, locker, polaroids, card, ids, yearbook, timeline, mood, mixtape, ships, diaries];
