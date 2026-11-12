// every app in an oc's "more" tab. each one is its own file in this folder with
//   export const meta = { id, label, icon }   (icon = a sticker code from /stickers)
//   export function render(el, ctx)            (ctx: see kit.js)
// and its own stylesheet in css/ocfun/<id>.css. whatever it saves lives in char.fun[<id>].

import * as phone from './phone.js';
import * as computer from './computer.js';
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
import * as stories from './stories.js';
import * as scenes from './scenes.js';
import * as secrets from './secrets.js';
import * as comics from './comics.js';
import * as album from './album.js';
import * as lyrics from './lyrics.js';
import * as answering from './answering.js';
import * as vlogs from './vlogs.js';
import * as backpack from './backpack.js';
import * as memorybox from './memorybox.js';
import * as sketchbook from './sketchbook.js';
import * as receipts from './receipts.js';
import * as handheld from './handheld.js';
import * as schoolfile from './schoolfile.js';
import * as starchart from './starchart.js';
import * as familytree from './familytree.js';
import * as quiz from './quiz.js';

export const FEATURES = [phone, computer, social, magazine, letters, room, dressup, locker, polaroids, card, ids, yearbook, timeline, mood, mixtape, ships, diaries,
  stories, scenes, secrets, comics, album, lyrics, answering, vlogs, backpack, memorybox, sketchbook, receipts, handheld, schoolfile, starchart, familytree, quiz];
