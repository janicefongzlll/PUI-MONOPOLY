# PUI Fortune

PUI Fortune is an original, playable property-trading tabletop game for **2–4 groups**. The goal: finish a two-hour city session with the highest total wealth.

## Run it

This is a vanilla JavaScript webpage with a locally bundled Three.js renderer. Serve the folder with a static-file server, for example `python3 -m http.server 8000 --bind 127.0.0.1`, then open `http://127.0.0.1:8000/`. The 3D modules need HTTP; opening `index.html` directly uses the classic-board fallback.

## Included gameplay

- 36-space board (an 11x9 ring) with 24 individually priced world landmarks, including Taipei 101 and the Petronas Twin Towers
- Animal player tokens placed on their current board space; click the active animal and choose 1–6 steps
- Property buying, rent, one City Upgrade per property, and player-to-player trading
- Four Chance spaces with cash, movement, Jail, and Get Out of Jail effects
- Two Transit Stations, Income Tax, City Maintenance Tax, Free Parking, Jail, and Go to Jail
- Bankruptcy elimination: a group that cannot pay is out, and the last group standing wins
- Call Time at the two-hour limit, equal-turn round finish, and a final wealth scoreboard

## Original house rules

- A City Upgrade costs half a property’s purchase price, doubles its rent, and adds its cost to final wealth.
- Groups may trade any properties and cash when all groups involved agree.
- Cash can never go below zero. Buying, upgrading, a Transit fare, the Jail fee and cash in a trade are simply refused when a group cannot cover them.
- A forced payment a group cannot cover — rent, tax or a Chance penalty — takes every dollar they have left, hands it to whoever they owed, and puts them out of the game. Their landmarks return to the bank unowned and unupgraded, ready for anyone to buy.
- The game ends the moment one group is left standing, and bankrupt groups always place below anyone still in.

The app is intentionally local-first: no account, database, or Supabase table is needed to play around one device.

## Accounts and saved games

The app can also use Supabase Auth to give each account a private game library with multiple resumable games.

1. In the Supabase SQL Editor, run [supabase/schema.sql](supabase/schema.sql). It creates the `monopoly_profiles` and `monopoly_games` tables and their Row Level Security policies.
2. Enable Email authentication in Supabase (and configure your site URL / redirect URLs for deployment).
3. Add your project URL and anon key to [supabase-config.js](supabase-config.js). The anon key is safe to use in a browser when the supplied RLS policies are enabled; never add a service-role key to this app.
4. Reload the page. It will show the sign-in screen, then a saved-games lobby after authentication.

With blank Supabase configuration, the game continues to work as a local, unsaved game.

## 3D board layer

The original `app.js` remains the only game engine. It owns the 36-space ordering, cash, ownership, rules, accounts and final scoring. No React migration or second engine is involved.

- `components/board3d/CityBoard3D.mjs` reads the current game state and composes tiles, tokens, lightweight landmarks, lighting, and landing effects.
- `boardLayout.mjs` makes the board physically square while keeping the engine's ring ordering and corner indices `[0, 10, 18, 28]`. The two shorter runs have slightly wider spaces; saves written under the earlier 10x10 (`board: 1`) and 13x7 (`board: 2`) numberings are remapped on load.
- Spaces are twice as deep as they are wide, the way a real board's are, and carry a square name plate. A bought landmark is washed in its owner's colour on both the 3D and classic boards; ownership itself still lives only in `properties[].owner`.
- `BoardCamera.mjs` owns FOLLOW, LANDING, OVERVIEW, IDLE and FREE, including look-ahead and damped corner rotation. Drag to orbit and wheel or pinch to zoom put it in FREE; View Board / Return to Player and the start of any move take it back. A drag never counts as a tap on the piece or tile underneath. All of this affects the camera only.
- `animation/tokenMovement.mjs` performs hop arcs and landing bounces. The engine commits position only after each hop completes, then calls the existing destination rules after the final landing.
- Movement intent, the next unfinished hop and the Start reward flag are saved as a plain `state.pending` movement record. A saved movement resumes without duplicate cash rewards. Turn handoffs and completed games are also explicit saved states.
- The existing Frog, Monkey, Wolf and Horse identities are represented by simple 3D figurines. Older saved animal identities remain supported.
- The classic HTML board remains available automatically if WebGL or the 3D module cannot load. Reduced-motion preferences keep the step-by-step follow camera but use smaller hops and quicker, less sweeping camera settling.

The scene uses shared geometry/materials, instanced city details, one shadow light, capped pixel density and no post-processing. Three.js r185 is bundled in `vendor/` with its MIT license, so the 3D layer makes no external asset requests.

## Verification

Run `node tests/game-regression.cjs` to check movement, Start awards, every Chance effect, purchase/rent/challenges, taxes, Jail, Transit, upgrades, trading, scoring and save/load. These tests use an isolated state and a mocked Supabase transport; they never write to a real account.

Architecture and browser-renderer reference: [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html).
