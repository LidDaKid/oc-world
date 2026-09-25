# oc world 🪐

make ocs, connect them to each other, and build the worlds they live in. everything is 2d and runs right in the browser.

- **ocs** – they exist on their own, no world needed. each one has a page with tabs:
  - **about** – pfp, the basics (age, pronouns, birthday… add/rename/remove any of them), tags, as many writing sections as you want
  - **relationships** – connect them to another oc (pick one) or to anyone (type a name), pick what they are to each other or type your own. it can be different from each side (mentor / student). shows up on both ocs' pages, as a list or as a little web
  - **gallery** – extra pictures with captions, any of them can become the pfp
  - **page style** – their own background color or picture, writing color, border color
- **worlds** – optional. a world has a cast (any of your ocs, an oc can be in a few worlds) plus:
  - **connections** – boards where you drop ocs. relationships draw themselves; drag from one oc to another to make a new one. text bubbles for stuff that isn't a person. a line can be hidden on one board without deleting it
  - **maps** – upload a map picture or start blank and draw it. pins with notes + who's there
  - **lore** – pages for places, groups, history, magic, creatures, items

## collab worlds

build one world with other people, live. no accounts, no server: it works like a stardew farm.

- in a world, hit 👥 → **share this world**. you get a 6 letter code + an invite link
- the other person opens the link (or **join a world** on the home page and types the code)
- they have to be on the same site as you (the online one), and **you (the host) need the site open** for them to get in. the world lives on the host's device; everyone else keeps a copy they can look at any time, but can only change while the host is on
- everyone can add their own ocs to the cast, move stuff on boards, draw on maps, write lore, and make relationships between anyone's ocs. changes show up on everyone's screen right away, pictures included
- an oc's own page can only be changed by whoever made them. everyone else sees it read-only, with the owner's name on it
- 👥 also shows who's here right now, **new code** (kicks everyone + kills the old code), **stop sharing**, and for guests **leave this world**

how it works is written at the top of `js/collab.js` (the connection + who-may-change-what) and `js/sync.js` (how a change gets sent as tiny pieces, so two people moving two different ocs never undo each other).

## saving

everything saves by itself in the browser (IndexedDB), on the device you're using. there are no accounts yet, so a thing made on the laptop won't show up on a phone.

- **⬇ back up everything** (bottom of the home page) downloads one `.ocworld.json` file with every oc, world and picture in it
- world settings (tap the world's name) has a backup for just that world
- **⬆ load a backup** brings a file back in on any device. it always lands as new copies, it never overwrites anything

all the saving goes through one spot (`js/store.js`), which is where accounts + cloud saves plug in later.

## running it on this pc

double-click `start.bat`. it opens http://127.0.0.1:4173 in brave. (just opening `index.html` won't work, browsers block scripts on files opened straight off the disk.)

needs [node](https://nodejs.org) installed. nothing else to install, there's no build step.

## putting it online

it's plain html/css/js, so any static host works.

**netlify:** from this folder run `npx netlify deploy --prod --dir=. --no-build`, or connect the github repo on netlify.com (no build command, publish directory `.`). `netlify.toml` already says all that.

**github pages:** push this folder to a repo, then repo settings → pages → deploy from branch → `main` / root.

## what's where

```
index.html
css/style.css          all the looks. the 3 color themes are just variable sets at the top
js/app.js              routing (every page is a #/ link) + the top bar
js/model.js            the shape of a world / oc / relationship, and upgrading old saves
js/store.js            saving, pictures, backups
js/rels.js             relationship presets + the relationship editor
js/collab.js           collab worlds: hosting, joining, sending + receiving changes
js/collab-ui.js        the share / join / who's-here boxes
js/sync.js             works out what changed in a record + replays it on someone else's copy
js/me.js               who's using this browser (random id + the name you typed)
js/ui.js               tiny helpers: make elements, modals, toasts, color pickers
js/panzoom.js          drag/zoom/pinch for the boards + maps
js/parts.js            bits more than one page uses (pfps, oc cards…)
js/views/home.js       all your worlds + all your ocs
js/views/profile.js    an oc's page
js/views/ocs.js        a world's cast
js/views/graph.js      connections boards
js/views/maps.js       map list + editor
js/views/lore.js       lore pages
tools/dev-server.js    the little local server start.bat runs
```
