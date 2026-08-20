# City Fortune

City Fortune is an original, playable property-trading tabletop game for **2–6 groups**. The goal: finish a two-hour city session with the highest total wealth.

## Run it

This is a dependency-free webpage. Open `index.html` in a modern browser, or serve the folder with any static-file server.

## Included gameplay

- 36-space square board with 24 individually priced world landmarks, including Taipei 101 and the Petronas Twin Towers
- Animal player tokens placed on their current board space; click the active animal and choose 1–6 steps
- Property buying, rent, one City Upgrade per property, and player-to-player trading
- Four Chance spaces with cash, movement, Jail, and Get Out of Jail effects
- Two Transit Stations, Income Tax, City Maintenance Tax, Free Parking, Jail, and Go to Jail
- Two-hour clock, equal-turn round finish, and a final wealth scoreboard

## Original house rules

- A City Upgrade costs half a property’s purchase price, doubles its rent, and adds its cost to final wealth.
- Groups may trade any properties and cash when all groups involved agree.
- Cash can become negative, representing debt; it counts against final wealth. This keeps the city moving without player elimination.

The app is intentionally local-first: no account, database, or Supabase table is needed to play around one device.

## Accounts and saved games

The app can also use Supabase Auth to give each account a private game library with multiple resumable games.

1. In the Supabase SQL Editor, run [supabase/schema.sql](supabase/schema.sql). It creates the `monopoly_profiles` and `monopoly_games` tables and their Row Level Security policies.
2. Enable Email authentication in Supabase (and configure your site URL / redirect URLs for deployment).
3. Add your project URL and anon key to [supabase-config.js](supabase-config.js). The anon key is safe to use in a browser when the supplied RLS policies are enabled; never add a service-role key to this app.
4. Reload the page. It will show the sign-in screen, then a saved-games lobby after authentication.

With blank Supabase configuration, the game continues to work as a local, unsaved game.
