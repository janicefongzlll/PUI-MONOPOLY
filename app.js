// Board geometry. 36 spaces sit on the perimeter of a COLS x ROWS grid, so
// COLS + ROWS must equal 20. 11x9 keeps the four edge runs nearly even.
const BOARD_COLS = 11;
const BOARD_ROWS = 9;
const EDGE_LONG = BOARD_COLS - 2;   // spaces along the top and bottom, between corners
const EDGE_SHORT = BOARD_ROWS - 2;  // spaces up each side, between corners
const EDGE_RUN = [EDGE_LONG, EDGE_SHORT, EDGE_LONG, EDGE_SHORT];
const cornerAt = EDGE_RUN.reduce((acc, run) => [...acc, acc[acc.length - 1] + run + 1], [0]).slice(0, 4);

const properties = [
  ["Taipei 101", 80, 10, "#f4b942"], ["Petronas Twin Towers", 100, 12, "#e68463"],
  ["Marina Bay Sands", 120, 14, "#d57cc8"], ["Burj Khalifa", 140, 16, "#9a86ea"],
  ["Eiffel Tower", 160, 18, "#75bfbe"], ["Sagrada Família", 180, 20, "#5bb486"],
  ["Colosseum", 200, 22, "#62a5e1"], ["Big Ben", 220, 24, "#f0808c"],
  ["Acropolis", 240, 26, "#c3a268"], ["Christ the Redeemer", 260, 28, "#7db664"],
  ["Machu Picchu", 280, 30, "#ca8cdb"], ["Taj Mahal", 300, 32, "#e8b340"],
  ["Angkor Wat", 320, 34, "#76a9da"], ["Sydney Opera House", 340, 36, "#61c4b2"],
  ["Golden Gate Bridge", 360, 38, "#d17698"], ["Statue of Liberty", 380, 40, "#ee9172"],
  ["Moai of Rapa Nui", 400, 42, "#93b957"], ["Chichén Itzá", 420, 44, "#7672d6"],
  ["Pyramids of Giza", 440, 46, "#e57e5b"], ["Neuschwanstein Castle", 460, 48, "#a66e48"],
  ["Mount Fuji", 480, 50, "#5faed2"], ["Great Wall of China", 500, 52, "#8a73d5"],
  ["Hagia Sophia", 520, 54, "#dc9c4d"], ["Grand Canyon", 560, 58, "#ec6671"]
].map(([name, price, rent, color], art) => ({ position: 0, name, price, rent, color, art, owner: null, building: false }));

const cornerSpaces = [
  { type: "start", name: "Start", label: "Collect $200", art: 24 },
  { type: "jail", name: "Jail", label: "Just Visiting", art: 29 },
  { type: "parking", name: "Free Parking", label: "Take a breather", art: 28 },
  { type: "go-jail", name: "Go to Jail", label: "Do not pass Start", art: 30 }
];

let propCursor = 0;
const nextProperty = () => properties[propCursor++];
const chanceSpace = () => ({ type: "chance", name: "Chance", label: "Draw a city card", art: 25 });
const taxSpace = (name, amount) => ({ type: "tax", name, label: `Pay $${amount}`, art: 26, amount });
const stationSpace = () => ({ type: "station", name: "Transit Station", label: "Ride for $40", art: 27 });

// The 32 non-corner spaces, in the order you meet them travelling round the ring.
const ringSpaces = [
  nextProperty(), chanceSpace(), nextProperty(), taxSpace("Income Tax", 100), nextProperty(), stationSpace(), nextProperty(), chanceSpace(),
  nextProperty(), nextProperty(), nextProperty(), taxSpace("City Maintenance", 50), chanceSpace(), nextProperty(), stationSpace(), nextProperty(),
  nextProperty(), chanceSpace(), nextProperty(), nextProperty(), nextProperty(), nextProperty(), nextProperty(), nextProperty(),
  nextProperty(), nextProperty(), nextProperty(), nextProperty(), nextProperty(), nextProperty(), nextProperty(), nextProperty()
];

const spaces = [];
EDGE_RUN.forEach((run, side) => {
  spaces.push(cornerSpaces[side]);
  spaces.push(...ringSpaces.splice(0, run));
});
spaces.forEach((space, index) => { if (space.price !== undefined) space.position = index; });

const propertyAt = Object.fromEntries(properties.map(p => [p.position, p]));
const stationPositions = spaces.map((space, index) => (space.type === "station" ? index : -1)).filter(index => index >= 0);


// Saves carry the numbering of the shape they were written on. The ring order
// never changes, so each historic shape is identified by its corner indices alone.
const SAVE_BOARD_VERSION = 3; // 1: 10x10, 2: 13x7, 3: 11x9
const positionMapFrom = (oldCorners) => {
  const oldRing = Array.from({ length: 36 }, (_, i) => i).filter(i => !oldCorners.includes(i));
  const map = Object.fromEntries(oldCorners.map((old, i) => [old, cornerAt[i]]));
  let cursor = 0;
  spaces.forEach((space, index) => { if (!cornerAt.includes(index)) map[oldRing[cursor++]] = index; });
  return map;
};
const savedPositionMaps = { 1: positionMapFrom([0, 9, 18, 27]), 2: positionMapFrom([0, 12, 18, 30]) };

const posToGrid = (position) => {
  const [bottomRight, bottomLeft, topLeft, topRight] = cornerAt;
  if (position === bottomRight) return [BOARD_ROWS, BOARD_COLS];
  if (position < bottomLeft) return [BOARD_ROWS, BOARD_COLS - (position - bottomRight)];
  if (position === bottomLeft) return [BOARD_ROWS, 1];
  if (position < topLeft) return [BOARD_ROWS - (position - bottomLeft), 1];
  if (position === topLeft) return [1, 1];
  if (position < topRight) return [1, 1 + (position - topLeft)];
  if (position === topRight) return [1, BOARD_COLS];
  return [1 + (position - topRight), BOARD_COLS];
};

const playerColors = ["#ef4a54", "#1769aa", "#8e5ee4", "#e27719"];
const playerAnimals = [
  { icon: "🐸", name: "Frog", art: "frog", pip: "grass" },
  { icon: "🐒", name: "Monkey", art: "monkey", pip: "banana" },
  { icon: "🐺", name: "Wolf", art: "wolf", pip: "cheese" },
  { icon: "🐴", name: "Horse", art: "horse", pip: "hat" }
];

const avatarArt = (animal, extra = "") => `<i class="avatar-art avatar-${animal.art || "snake"} ${extra}" aria-hidden="true"></i>`;
const chanceCards = [
  { title: "Street festival", text: "Your pop-up festival is a hit. Collect $120.", effect: "cash", amount: 120 },
  { title: "Permit review", text: "A permit needs another stamp. Pay $75.", effect: "cash", amount: -75 },
  { title: "Civic grant", text: "The city backs your bright idea. Collect $160.", effect: "cash", amount: 160 },
  { title: "Roadworks", text: "Help repair a busy lane. Pay $50.", effect: "cash", amount: -50 },
  { title: "Start fresh", text: "Advance to Start and collect $200.", effect: "start" },
  { title: "Neighbourhood detour", text: "Move back 3 spaces and resolve where you land.", effect: "move", amount: -3 },
  { title: "Transit pass", text: "Move to the nearest Transit Station. No fee this ride.", effect: "nearestStation" },
  { title: "City security pass", text: "Keep this card. It gets your group out of Jail free.", effect: "jailPass" },
  { title: "Noise complaint", text: "Go directly to Jail. Do not pass Start.", effect: "jail" },
  { title: "World tour", text: "Advance to the Taj Mahal and resolve the space.", effect: "goto", targetName: "Taj Mahal" }
];


let state = null;
let toastTimer = null;
// Rendering only. State and all rule functions below remain the game authority.
let board3D = null;
let board3DReady = null;
let board3DFailed = false;
let movementController = null;
let movementPromise = null;
let turnTimer = null;
let decisionTimer = null;
// Presentation only: effects receive values already settled by the game engine.
const showCashEffect = (amount, label) => window.PUIPresentation?.cash(amount, label);
const showJailEffect = () => window.PUIPresentation?.jail();
const showTransitEffect = () => window.PUIPresentation?.transit();
const sparkleUpgrade = position => { ensureBoard3D().then(view => view?.sparkleUpgrade?.(position)); };

function cancelBoardAnimation() {
  movementController?.abort(); movementController = null; movementPromise = null;
  clearTimeout(turnTimer); turnTimer = null;
  board3D?.cancel();
}

function useBoardFallback(error) {
  console.warn("PUI Fortune 3D unavailable; using the existing board.", error);
  board3DFailed = true;
  board3D?.dispose(); board3D = null;
  $("board-3d-stage").hidden = true;
  $("board-3d-stage").parentElement.classList.remove("is-3d");
  $("board-fallback-message").textContent = "3D is unavailable on this device. You can continue playing on the classic board.";
}

function ensureBoard3D() {
  if (board3DFailed) return Promise.resolve(null);
  if (!board3DReady) board3DReady = import("./components/board3d/CityBoard3D.mjs").then(({ CityBoard3D }) => {
    board3D = new CityBoard3D({ host: $("board-3d-stage"), spaces, corners: cornerAt,
      onToken: id => { if (!state) return; if (id !== player().id) { toast(`It is ${player().name}'s turn.`); return; } openStepChooser(); },
      onTile: showBoardSpace, onError: useBoardFallback });
    $("board-3d-stage").hidden = false;
    $("board-3d-stage").parentElement.classList.add("is-3d");
    if (state) board3D.sync(state);
    board3D.resize(); return board3D;
  }).catch(error => { useBoardFallback(error); return null; });
  return board3DReady;
}

// The board opens on a full-window fly-through of the city, then shrinks back into the page
// and hands the screen over to the game. Any move or drag during the flight ends it early.
async function runBoardIntro() {
  const view = await ensureBoard3D();
  if (!view?.playIntro) return;
  const stage = $("board-3d-stage"), shell = stage.parentElement, skip = $("board-skip-intro");
  const settled = stage.getBoundingClientRect().height;
  window.scrollTo({ top: 0 });
  shell.style.minHeight = `${settled}px`;
  document.body.classList.add("is-cinema"); stage.classList.add("is-cinema"); skip.hidden = false;
  try { await view.playIntro(); }
  catch (error) { console.warn("PUI Fortune opening fly-through failed.", error); }
  finally {
    skip.hidden = true;
    const rect = shell.getBoundingClientRect();
    stage.classList.add("is-settling");
    requestAnimationFrame(() => {
      stage.style.top = `${rect.top}px`; stage.style.left = `${rect.left}px`;
      stage.style.right = `${window.innerWidth - rect.right}px`;
      stage.style.bottom = `${window.innerHeight - rect.top - settled}px`;
      stage.style.borderRadius = "22px";
    });
    await new Promise(done => setTimeout(done, 700));
    stage.classList.remove("is-cinema", "is-settling"); stage.removeAttribute("style");
    shell.style.minHeight = ""; document.body.classList.remove("is-cinema");
    view.resize();
  }
}

function showBoardSpace(position) {
  if (!state) return;
  $("board-3d-info-content").innerHTML = spaceTipHtml(position);
  $("board-3d-info").hidden = false;
  if (board3DFailed) showSpaceTip($("game-board").querySelector(`[data-pos="${position}"]`), position);
}
/* --- sync engine ------------------------------------------------------------ */
const SYNC_LABEL = {
  saved: "All changes saved", saving: "Saving…", pending: "Waiting to sync…",
  offline: "Offline — changes held", error: "Sync problem", local: "Local game — not saved"
};
let saveTimer = null;
let retryTimer = null;
let retryDelay = 0;
let saveDirty = false;
let saveInFlight = false;
let lastSyncedAt = null;
let saveStatus = "active";
let libraryGames = [];
let libraryTab = "active";

function setSync(kind, detail) {
  const el = $("save-status");
  if (!el) return;
  const text = detail || SYNC_LABEL[kind] || "";
  el.className = `save-status sync-${kind}`;
  el.innerHTML = `<i class="sync-dot" aria-hidden="true"></i><span>${escapeHtml(text)}</span>`;
  el.title = kind === "saved" && lastSyncedAt ? `Last synced at ${lastSyncedAt.toLocaleTimeString()}` : text;
}

function canSync() { return Boolean(supabaseClient && authUser && state?.gameId); }

function enterGameFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement || !root.requestFullscreen) return;
  const request = root.requestFullscreen({ navigationUI: "hide" });
  if (request?.catch) request.catch(() => {});
}

function exitGameFullscreen() {
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  const exit = document.exitFullscreen();
  if (exit?.catch) exit.catch(() => {});
}

function resetSync() { clearTimeout(saveTimer); clearTimeout(retryTimer); saveTimer = null; retryTimer = null; retryDelay = 0; saveDirty = false; saveInFlight = false; saveStatus = "active"; }
let supabaseClient = null;
let authUser = null;
let authMode = "signin";

const $ = (id) => document.getElementById(id);
const money = (value) => `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString()}`;
const player = () => state.players[state.currentPlayer];
const isProperty = (space) => Object.prototype.hasOwnProperty.call(space, "price");
const buildingCost = (property) => Math.ceil(property.price / 2 / 10) * 10;
const propertyWorth = (property) => property.price + (property.building ? buildingCost(property) : 0);
const totalWealth = (p) => p.cash + properties.filter(x => x.owner === p.id).reduce((sum, x) => sum + propertyWorth(x), 0);
const activePlayers = () => state.players.filter(p => !p.out);
const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"></use></svg>`;

function init() {
  $("board-view-button").addEventListener("click", () => board3D?.toggleOverview());
  $("board-3d-info-close").addEventListener("click", () => { $("board-3d-info").hidden = true; });
  $("board-skip-intro").addEventListener("click", () => board3D?.skipIntro());
  $("board-space-buttons").innerHTML = spaces.map((space, pos) => `<button type="button" data-board-position="${pos}">${String(pos).padStart(2, "0")} · ${escapeHtml(space.name)}</button>`).join("");
  $("board-space-buttons").addEventListener("click", event => { const button = event.target.closest("[data-board-position]"); if (button) showBoardSpace(Number(button.dataset.boardPosition)); });
  renderNameFields(2);
  document.querySelectorAll('input[name="count"]').forEach(input => input.addEventListener("change", () => renderNameFields(Number(input.value))));
  $("setup-form").addEventListener("submit", startGame);
  $("rules-button").addEventListener("click", () => $("rules-dialog").showModal());
  $("log-button").addEventListener("click", () => $("log-dialog").showModal());
  document.querySelectorAll(".close-log").forEach(button => button.addEventListener("click", () => $("log-dialog").close()));
  document.querySelectorAll(".close-rules").forEach(button => button.addEventListener("click", () => $("rules-dialog").close()));
  document.querySelectorAll(".close-dialog").forEach(button => button.addEventListener("click", () => $("decision-dialog").close()));
  document.querySelectorAll(".close-trade").forEach(button => button.addEventListener("click", () => $("trade-dialog").close()));
  $("reset-button").addEventListener("click", prepareNewGame);
  $("choose-steps-button").addEventListener("click", openStepChooser);
  $("trade-button").addEventListener("click", openTrade);
  $("trade-partner").addEventListener("change", populateTradeProperties);
  $("trade-form").addEventListener("submit", submitTrade);
  $("call-time-button").addEventListener("click", () => { if (state && !state.finishAfterRound) callTime(); });
  $("play-again-button").addEventListener("click", resetGame);
  $("auth-form").addEventListener("submit", submitAuth);
  $("auth-switch").addEventListener("click", toggleAuthMode);
  $("sign-out-button").addEventListener("click", signOut);
  $("new-game-button").addEventListener("click", prepareNewGame);
  $("games-button").addEventListener("click", returnToLobby);
  document.querySelectorAll(".close-results").forEach(button => button.addEventListener("click", () => $("results-dialog").close()));
  $("tab-active").addEventListener("click", () => setLibraryTab("active"));
  $("tab-complete").addEventListener("click", () => setLibraryTab("complete"));
  $("save-game-button").addEventListener("click", () => saveGame(true));
  [$("decision-dialog"), $("rules-dialog"), $("trade-dialog"), $("log-dialog"), $("results-dialog")].forEach(dialog => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  document.addEventListener("fullscreenchange", () => document.body.classList.toggle("is-fullscreen", Boolean(document.fullscreenElement)));
  window.addEventListener("offline", () => { if (canSync()) setSync("offline"); });
  window.addEventListener("online", () => { if (!canSync()) return; retryDelay = 0; if (saveDirty) saveGame(false); else setSync("saved"); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && saveDirty) saveGame(false); });
  window.addEventListener("beforeunload", (event) => { if (!saveDirty || !canSync()) return; event.preventDefault(); event.returnValue = ""; });
  initSpaceTips();
  configureSupabase();
}

function bindAvatarPicker() {
  const groups = [...document.querySelectorAll(".avatar-picker")];
  groups.forEach((group, index) => group.addEventListener("change", (event) => {
    const chosen = Number(event.target.value);
    const picks = groups.map(g => Number(g.querySelector("input:checked").value));
    const clash = picks.findIndex((value, other) => other !== index && value === chosen);
    if (clash === -1) return;
    const taken = new Set(picks.filter((_, other) => other !== clash));
    const free = playerAnimals.findIndex((_, idx) => !taken.has(idx));
    const radio = groups[clash].querySelector(`input[value="${free}"]`);
    if (radio) radio.checked = true;
  }));
}

function renderNameFields(count) {
  const names = [...document.querySelectorAll(".name-input")].map(input => input.value);
  const previous = [...document.querySelectorAll(".avatar-picker")].map(g => Number(g.querySelector("input:checked").value));
  const picks = [];
  for (let i = 0; i < count; i++) {
    const wanted = Number.isInteger(previous[i]) ? previous[i] : i;
    picks.push(picks.includes(wanted) ? playerAnimals.findIndex((_, idx) => !picks.includes(idx)) : wanted);
  }
  $("player-name-fields").innerHTML = Array.from({ length: count }, (_, i) => `<div class="group-setup">
      <label class="name-field"><span>Group ${i + 1}</span><input class="name-input" maxlength="22" value="${escapeHtml(names[i] || `Group ${i + 1}`)}" aria-label="Name for group ${i + 1}" /></label>
      <div class="avatar-picker" role="radiogroup" aria-label="Avatar for group ${i + 1}">${playerAnimals.map((animal, idx) => `<label class="avatar-option"><input type="radio" name="avatar-${i}" value="${idx}" aria-label="${animal.name}"${picks[i] === idx ? " checked" : ""} /><span>${avatarArt(animal)}</span></label>`).join("")}</div>
    </div>`).join("");
  bindAvatarPicker();
}

async function startGame(event) {
  event.preventDefault();
  cancelBoardAnimation();
  enterGameFullscreen();
  const names = [...document.querySelectorAll(".name-input")].map((input, i) => input.value.trim() || `Group ${i + 1}`);
  const chosen = [...document.querySelectorAll(".avatar-picker")].map(g => playerAnimals[Number(g.querySelector("input:checked").value)]);
  const gameName = $("game-name").value.trim() || "My world tour";
  properties.forEach(p => { p.owner = null; p.building = false; });
  state = { gameId: null, gameName, players: names.map((name, id) => ({ id, name, color: playerColors[id], animal: chosen[id] || playerAnimals[id], cash: 1000, position: 0, jailed: false, jailPasses: 0, turns: 0, out: false })), currentPlayer: 0, round: 1, phase: "choose", activity: ["The city is open. Every group begins with $1,000."], finishAfterRound: false, pending: null };
  $("setup-screen").classList.add("hidden");
  $("play-screen").classList.remove("hidden");
  renderAll();
  log(`${player().name} opens the city. Select the ${player().animal.name} to choose a move.`);
  runBoardIntro();
  if (supabaseClient && authUser) await createCloudGame();
}

function resetGame() {
  cancelBoardAnimation();
  resetSync();
  exitGameFullscreen();
  state = null;
  ["decision-dialog", "rules-dialog", "trade-dialog", "log-dialog", "end-dialog", "results-dialog"].forEach(id => { if ($(id).open) $(id).close(); });
  $("play-screen").classList.add("hidden");
  if (supabaseClient && authUser) showLobby(); else showSetup();
}

function showSetup() {
  cancelBoardAnimation();
  resetSync();
  exitGameFullscreen();
  state = null;
  $("auth-screen").classList.add("hidden");
  $("lobby-screen").classList.add("hidden");
  $("play-screen").classList.add("hidden");
  $("setup-screen").classList.remove("hidden");
  $("game-name").value = "My world tour";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function prepareNewGame() {
  if (state?.gameId) await saveGame(false);
  showSetup();
}

async function configureSupabase() {
  const config = window.MONOPOLY_SUPABASE || {};
  const canConnect = config.url && config.anonKey && window.supabase?.createClient;
  if (!canConnect) {
    $("save-game-button").hidden = true;
    setSync("local");
    return;
  }
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const { data: { session } } = await supabaseClient.auth.getSession();
  authUser = session?.user || null;
  supabaseClient.auth.onAuthStateChange((_event, sessionUpdate) => {
    authUser = sessionUpdate?.user || null;
  });
  if (authUser) showLobby(); else showAuth();
}

function showAuth() {
  $("setup-screen").classList.add("hidden");
  $("lobby-screen").classList.add("hidden");
  $("play-screen").classList.add("hidden");
  $("auth-screen").classList.remove("hidden");
  $("games-button").hidden = true;
}

function toggleAuthMode() {
  authMode = authMode === "signin" ? "signup" : "signin";
  $("auth-submit-label").textContent = authMode === "signin" ? "Sign in" : "Create account";
  $("auth-switch").textContent = authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in";
  $("auth-note").textContent = authMode === "signin" ? "Your games are private to your account." : "We’ll create your private game library.";
}

async function submitAuth(event) {
  event.preventDefault();
  if (!supabaseClient) return;
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const submit = $("auth-form").querySelector("button[type=submit]");
  submit.disabled = true;
  const result = authMode === "signin"
    ? await supabaseClient.auth.signInWithPassword({ email, password })
    : await supabaseClient.auth.signUp({ email, password });
  submit.disabled = false;
  if (result.error) { $("auth-note").textContent = result.error.message; return; }
  if (!result.data.session) { $("auth-note").textContent = "Check your email to confirm your account, then sign in."; return; }
  authUser = result.data.user;
  await ensureProfile();
  showLobby();
}

async function ensureProfile() {
  if (!supabaseClient || !authUser) return;
  await supabaseClient.from("monopoly_profiles").upsert({ id: authUser.id, display_name: authUser.email?.split("@")[0] || null }, { onConflict: "id" });
}

async function signOut() {
  if (!supabaseClient) return;
  cancelBoardAnimation();
  await supabaseClient.auth.signOut();
  authUser = null;
  state = null;
  showAuth();
}

async function showLobby() {
  if (!authUser) { showAuth(); return; }
  $("auth-screen").classList.add("hidden");
  $("setup-screen").classList.add("hidden");
  $("play-screen").classList.add("hidden");
  $("lobby-screen").classList.remove("hidden");
  $("games-button").hidden = false;
  $("account-email").textContent = authUser.email || "Signed in";
  await renderGameLibrary();
}

async function returnToLobby() {
  if (!supabaseClient || !authUser) { showSetup(); return; }
  if (state?.gameId && !(await saveGame(false)) && !window.confirm("This game has changes that have not synced yet. Leave anyway?")) return;
  cancelBoardAnimation();
  resetSync();
  exitGameFullscreen();
  state = null;
  showLobby();
}

function setLibraryTab(tab) { libraryTab = tab; paintLibrary(); }

function paintLibrary() {
  const library = $("game-library");
  const done = (game) => game.status === "complete";
  const counts = { active: libraryGames.filter(game => !done(game)).length, complete: libraryGames.filter(done).length };
  [["active", "Active"], ["complete", "Completed"]].forEach(([tab, label]) => {
    const button = $(tab === "active" ? "tab-active" : "tab-complete");
    button.textContent = counts[tab] ? `${label} (${counts[tab]})` : label;
    button.classList.toggle("is-selected", libraryTab === tab);
    button.setAttribute("aria-selected", String(libraryTab === tab));
  });
  const games = libraryGames.filter(game => done(game) === (libraryTab === "complete"));
  if (!games.length) {
    library.innerHTML = libraryTab === "complete"
      ? `<div class="empty-library"><span>🏁</span><h2>No finished games yet</h2><p>Call time, or play down to the last group standing, and the final table is kept here.</p></div>`
      : `<div class="empty-library"><span>🌍</span><h2>No games in progress</h2><p>${counts.complete ? `Every saved game has finished — open the Completed tab to see ${counts.complete === 1 ? "its final table" : "their final tables"}.` : "Create your first world-landmark game to start building a saved collection."}</p></div>`;
    return;
  }
  library.innerHTML = games.map(game => `<article class="saved-game"><div><p class="eyebrow">${done(game) ? "Complete" : "In progress"}</p><h2>${escapeHtml(game.name)}</h2><p>${game.player_count} groups · ${done(game) ? "finished" : "saved"} ${new Date(game.updated_at).toLocaleString()}</p></div><div class="saved-game-actions"><button class="outline-button" type="button" data-delete-id="${game.id}" data-game-name="${escapeHtml(game.name)}">Delete</button><button class="primary-button" type="button" ${done(game) ? `data-results-id="${game.id}"` : `data-game-id="${game.id}"`} data-game-name="${escapeHtml(game.name)}">${done(game) ? "View" : "Resume"}</button></div></article>`).join("");
  library.querySelectorAll("[data-game-id]").forEach(button => button.addEventListener("click", () => { enterGameFullscreen(); loadCloudGame(button.dataset.gameId); }));
  library.querySelectorAll("[data-results-id]").forEach(button => button.addEventListener("click", () => showGameResults(button.dataset.resultsId, button.dataset.gameName)));
  library.querySelectorAll("[data-delete-id]").forEach(button => button.addEventListener("click", () => deleteCloudGame(button.dataset.deleteId, button.dataset.gameName)));
}

async function renderGameLibrary() {
  const library = $("game-library");
  library.innerHTML = `<p class="empty-property">Loading your saved games…</p>`;
  const { data: games, error } = await supabaseClient.from("monopoly_games").select("id, name, player_count, status, updated_at").order("updated_at", { ascending: false });
  if (error) { library.innerHTML = `<p class="empty-property">Couldn’t load your games: ${escapeHtml(error.message)}</p>`; return; }
  libraryGames = games;
  paintLibrary();
}

// Final standings rebuilt from a saved snapshot. Prices come from the live board by name,
// so a game saved under an older board numbering still scores correctly.
function finalStandings(snapshot) {
  const saved = Array.isArray(snapshot?.properties) ? snapshot.properties : [];
  const worthOf = (entry) => {
    const prop = properties.find(item => item.name === entry.name);
    return prop ? prop.price + (entry.building ? buildingCost(prop) : 0) : 0;
  };
  return (snapshot?.state?.players || []).map(entry => {
    const out = Boolean(entry.out) || entry.cash < 0;
    const cash = Math.max(0, entry.cash || 0);
    const propertyValue = saved.filter(item => item.owner === entry.id).reduce((sum, item) => sum + worthOf(item), 0);
    return { name: entry.name, color: entry.color, out, cash, propertyValue, wealth: cash + propertyValue };
  }).sort((a, b) => (a.out === b.out ? b.wealth - a.wealth : a.out ? 1 : -1));
}

// Shared by the end-of-game screen and the saved results view so the two cannot drift.
function standingsHtml(standings) {
  return standings.map((p, i) => `<div class="score-row ${p.out ? "score-out" : ""}"><span class="score-rank">${String(i + 1).padStart(2, "0")}</span><span class="player-color" style="background:${p.color}"></span><div><strong>${escapeHtml(p.name)}</strong><small>${p.out ? "Bankrupt — out of the game" : `Cash ${money(p.cash)} · City value ${money(p.propertyValue)}`}</small></div><strong class="score-wealth">${p.out ? "Out" : money(p.wealth)}</strong></div>`).join("");
}

async function showGameResults(gameId, gameName) {
  const body = $("results-body");
  $("results-title").textContent = gameName || "Results";
  $("results-dialog").showModal();
  body.innerHTML = `<p class="empty-property">Loading the final table…</p>`;
  const { data, error } = await supabaseClient.from("monopoly_games").select("game_state").eq("id", gameId).single();
  if (error) { body.innerHTML = `<p class="empty-property">Couldn’t load that result: ${escapeHtml(error.message)}</p>`; return; }
  const standings = finalStandings(data?.game_state);
  if (!standings.length) { body.innerHTML = `<p class="empty-property">This game has no saved result.</p>`; return; }
  const winner = standings.find(item => !item.out) || standings[0];
  body.innerHTML = `<p class="dialog-copy">${escapeHtml(winner.name)} took the city with ${money(winner.wealth)} in total wealth.</p><div class="scoreboard">${standingsHtml(standings)}</div>`;
}

async function deleteCloudGame(gameId, gameName) {
  if (!window.confirm(`Delete “${gameName}”? This permanently removes the saved game.`)) return;
  const { error } = await supabaseClient.from("monopoly_games").delete().eq("id", gameId);
  if (error) { toast(`Couldn’t delete that game: ${error.message}`); return; }
  toast(`${gameName} was deleted.`);
  renderGameLibrary();
}

function snapshotGame() {
  return {
    board: SAVE_BOARD_VERSION,
    state: JSON.parse(JSON.stringify(state)),
    properties: properties.map(property => ({ position: property.position, name: property.name, owner: property.owner, building: property.building }))
  };
}

async function createCloudGame() {
  const session = state;
  setSync("saving");
  const { data, error } = await supabaseClient.from("monopoly_games").insert({
    owner_id: authUser.id, name: state.gameName, player_count: state.players.length, game_state: snapshotGame()
  }).select("id").single();
  if (state !== session) return;
  if (error) { setSync("error", "Cloud save unavailable"); toast(`Couldn’t create save: ${error.message}`); return; }
  state.gameId = data.id;
  lastSyncedAt = new Date();
  saveDirty = false;
  setSync("saved");
  // The group may already have moved while the initial save was being created.
  queueSave();
}

async function saveGame(showToast = false, status) {
  if (status) saveStatus = status;
  if (!canSync()) return true;
  clearTimeout(saveTimer); clearTimeout(retryTimer);
  if (saveInFlight) { saveDirty = true; return false; }
  if (!navigator.onLine) { saveDirty = true; setSync("offline"); if (showToast) toast("You are offline. Changes are held until the connection returns."); return false; }

  saveInFlight = true;
  const session = state;
  saveDirty = false;
  setSync("saving");
  const { error } = await supabaseClient.from("monopoly_games").update({ name: state.gameName, player_count: state.players.length, status: saveStatus, game_state: snapshotGame() }).eq("id", state.gameId);
  if (state !== session) return false;
  saveInFlight = false;

  if (error) {
    saveDirty = true;
    retryDelay = Math.min(retryDelay ? retryDelay * 2 : 2000, 30000);
    setSync("error", `Sync failed — retrying in ${Math.round(retryDelay / 1000)}s`);
    retryTimer = setTimeout(() => saveGame(false), retryDelay);
    if (showToast) toast(`Couldn’t sync: ${error.message}`);
    return false;
  }

  retryDelay = 0;
  lastSyncedAt = new Date();
  if (saveDirty) { queueSave(); return false; }
  setSync("saved");
  if (showToast) toast("Game synced to your account.");
  return true;
}

function queueSave() {
  if (!canSync()) return;
  saveDirty = true;
  clearTimeout(saveTimer);
  if (!navigator.onLine) { setSync("offline"); return; }
  if (saveInFlight) return;
  setSync("pending");
  saveTimer = setTimeout(() => saveGame(false), 800);
}

async function loadCloudGame(gameId) {
  const { data: game, error } = await supabaseClient.from("monopoly_games").select("id, name, game_state").eq("id", gameId).single();
  if (error) { toast(`Couldn’t open game: ${error.message}`); return; }
  const snapshot = game.game_state;
  if (!snapshot?.state || !Array.isArray(snapshot.properties)) { toast("This saved game is not valid."); return; }
  cancelBoardAnimation();
  resetSync();
  const remap = snapshot.board === SAVE_BOARD_VERSION ? null : (savedPositionMaps[snapshot.board] || savedPositionMaps[1]);
  const remapPos = position => (remap ? remap[position] ?? 0 : position);
  properties.forEach(property => { property.owner = null; property.building = false; });
  snapshot.properties.forEach(saved => {
    const property = properties.find(p => p.name === saved.name) || propertyAt[remapPos(saved.position)];
    if (property) { property.owner = saved.owner; property.building = saved.building; }
  });
  state = { ...snapshot.state, gameId: game.id, gameName: game.name };
  state.players = state.players.map((savedPlayer, id) => ({ ...savedPlayer, animal: savedPlayer.animal || playerAnimals[id % playerAnimals.length], position: remapPos(savedPlayer.position), out: Boolean(savedPlayer.out) || savedPlayer.cash < 0 }));
  if (remap && state.pending) {
    if (Array.isArray(state.pending.route)) state.pending.route = state.pending.route.map(remapPos);
    if (state.pending.pos !== undefined) state.pending.pos = remapPos(state.pending.pos);
    if (state.pending.target !== undefined) state.pending.target = remapPos(state.pending.target);
  }
  $("lobby-screen").classList.add("hidden");
  $("play-screen").classList.remove("hidden");
  lastSyncedAt = new Date(); saveDirty = false; setSync("saved");
  renderAll();
  if (state.phase === "complete") { endGame(); return; }
  runBoardIntro();
  if (state.pending?.kind === "movement") { resumeMovement(); toast(`${state.gameName} resumed — continuing your move.`); return; }
  if (state.pending?.kind === "turn-end") { completeTurn(state); return; }
  if (state.phase === "decision") { resumePending(); toast(`${state.gameName} resumed — finish your open decision.`); return; }
  // Older saves could capture the original engine's short moving timeout.
  if (state.phase === "moving") { state.phase = "choose"; state.pending = null; renderAll(); }
  toast(`${state.gameName} resumed.`);
}

function renderAll() {
  renderBoard(); renderToolbar(); renderTurn(); renderPlayers(); renderActivity();
}

const spaceKindLabel = { start: "Start", chance: "Chance", tax: "Tax", station: "Transit", jail: "Jail", parking: "Rest", "go-jail": "Jail" };

function spaceKind(space) { return isProperty(space) ? "Landmark" : (spaceKindLabel[space.type] || "City"); }

function hideSpaceTip() { const tip = $("space-tip"); if (tip) tip.hidden = true; }

function spaceTipHtml(pos) {
  const space = spaces[pos];
  const here = state.players.filter(p => p.position === pos);
  const standing = here.length
    ? `<p class="tip-here">${here.map(p => `<span class="tip-chip" style="--chip:${p.color}">${avatarArt(p.animal, "avatar-inline")}${escapeHtml(p.name)}</span>`).join("")}</p>`
    : "";
  const head = `<p class="tip-kind">${spaceKind(space)}</p><h4>${escapeHtml(space.name)}</h4>`;
  if (!isProperty(space)) return `${head}<p class="tip-note">${escapeHtml(space.label)}</p>${standing}`;

  const owned = space.owner !== null;
  const owner = owned
    ? `<p class="tip-owner" style="--chip:${state.players[space.owner].color}">${escapeHtml(state.players[space.owner].name)}</p>`
    : `<p class="tip-owner tip-open">Open — no owner yet</p>`;
  const rent = space.rent * (space.building ? 2 : 1);
  return `${head}${owner}<div class="tip-stats"><span>Price<strong>${money(space.price)}</strong></span><span>Rent<strong>${money(rent)}</strong></span></div>${space.building ? `<p class="tip-note">City Upgrade built — rent is doubled.</p>` : ""}${standing}`;
}

function showSpaceTip(cell, pos) {
  const tip = $("space-tip");
  if (!tip || !state) return;
  tip.innerHTML = spaceTipHtml(pos);
  tip.hidden = false;
  const rect = cell.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  const left = Math.max(10, Math.min(rect.left + rect.width / 2 - box.width / 2, window.innerWidth - box.width - 10));
  const above = rect.top - box.height - 12;
  tip.style.left = `${left}px`;
  tip.style.top = `${above < 10 ? rect.bottom + 12 : above}px`;
}

function initSpaceTips() {
  const board = $("game-board");
  board.addEventListener("mouseover", (event) => {
    const host = event.target.closest("[data-pos]");
    if (!host) { hideSpaceTip(); return; }
    const pos = Number(host.dataset.pos);
    if (!Number.isInteger(pos)) { hideSpaceTip(); return; }
    showSpaceTip(board.querySelector(`.space[data-pos="${pos}"]`) || host, pos);
  });
  board.addEventListener("mouseleave", hideSpaceTip);
  window.addEventListener("scroll", hideSpaceTip, { passive: true });
}

function renderBoard() {
  if (board3D) board3D.sync(state); else if (!board3DFailed) ensureBoard3D();
  const board = $("game-board");
  hideSpaceTip();
  const cells = spaces.map((space, pos) => {
    const [row, col] = posToGrid(pos);
    const propertyClass = isProperty(space) ? `space-property ${space.owner !== null ? `owned owner-${space.owner}` : ""} ${space.building ? "has-building" : ""}` : "";
    const roundClass = row === 1 ? (col === 1 ? "corner-tl" : col === BOARD_COLS ? "corner-tr" : "") : row === BOARD_ROWS ? (col === 1 ? "corner-bl" : col === BOARD_COLS ? "corner-br" : "") : "";
    const typeClass = `space ${space.type || "property"} ${propertyClass} ${cornerAt.includes(pos) ? "corner" : ""} ${roundClass}`;
    const kindTag = isProperty(space) ? "" : `<span class="space-kind">${spaceKind(space)}</span>`;
    const propertyBits = isProperty(space) ? `<span>${money(space.price)}</span><span>${money(space.rent)} rent</span>` : `<span>${space.label}</span>`;
    const boardArt = space.type === "chance" ? `<span class="chance-card-icon" aria-hidden="true"></span>` : `<span class="space-art" style="--art-col:${space.art % 6};--art-row:${Math.floor(space.art / 6)}" aria-hidden="true"></span>`;
    return `<article class="${typeClass}" data-pos="${pos}" style="grid-row:${row};grid-column:${col};${isProperty(space) ? `--space-color:${space.color};` : ""}" role="gridcell" aria-label="${escapeHtml(space.name)}${isProperty(space) ? `, price ${money(space.price)}, rent ${money(space.rent)}` : `, ${space.label}`}">
      <div class="space-top"><span class="space-index">${String(pos).padStart(2, "0")}</span>${kindTag}</div>
      ${boardArt}<strong class="space-name">${escapeHtml(space.name)}</strong><div class="space-meta">${propertyBits}</div><i class="building-mini" aria-hidden="true"></i>
    </article>`;
  }).join("");

  // Tokens live in their own grid-positioned layer, not inside .space — a space
  // clips and isolates, which would flatten the pieces back onto the board plane.
  const racks = spaces.map((space, pos) => {
    const here = state.players.filter(p => p.position === pos && !p.out);
    if (!here.length) return "";
    const [row, col] = posToGrid(pos);
    const tokens = here.map(p => `<button class="token ${p.jailed ? "jailed" : ""} ${p.id === state.currentPlayer && state.phase === "choose" ? "token-active" : ""}" type="button" data-player-id="${p.id}" style="--token-color:${p.color}" aria-label="${escapeHtml(p.name)}, the ${p.animal.name}${p.jailed ? ", is in Jail" : ""}${p.id === state.currentPlayer && state.phase === "choose" ? ". Choose movement" : ""}" title="${escapeHtml(p.name)} · ${p.animal.name}">${avatarArt(p.animal)}</button>`).join("");
    return `<div class="token-rack" data-pos="${pos}" style="grid-row:${row};grid-column:${col}" aria-label="Players on ${escapeHtml(space.name)}">${tokens}</div>`;
  }).join("");

  // Ownership pips sit in the first inner cell next to their space, so a piece
  // standing on the square can never hide who owns it.
  const owners = spaces.map((space, pos) => {
    if (!isProperty(space) || space.owner === null) return "";
    const [row, col] = posToGrid(pos);
    const edge = row === 1 ? "top" : row === BOARD_ROWS ? "bottom" : col === 1 ? "left" : "right";
    const pipRow = edge === "top" ? 2 : edge === "bottom" ? BOARD_ROWS - 1 : row;
    const pipCol = edge === "left" ? 2 : edge === "right" ? BOARD_COLS - 1 : col;
    const holder = state.players[space.owner];
    return `<i class="owner-pip owner-pip-${edge} ${space.building ? "owner-pip-built" : ""}" style="grid-row:${pipRow};grid-column:${pipCol};--pip-color:${holder.color}" aria-hidden="true">${icon(`pip-${holder.animal.pip || "grass"}`)}</i>`;
  }).join("");

  board.innerHTML = `${cells}<section class="city-center" aria-label="PUI Fortune"><div class="center-plaque"><p class="center-eyebrow">Buy · Trade · Build</p><h1 class="center-title">PUI<span>FORTUNE</span></h1></div><div class="center-dice" aria-hidden="true"><span class="die die-a"><i></i><i></i><i></i></span><span class="die die-b"><i></i><i></i><i></i><i></i></span></div></section>${racks}${owners}`;
  board.querySelectorAll(".token").forEach(token => token.addEventListener("click", () => {
    const selected = state.players[Number(token.dataset.playerId)];
    if (selected.id !== state.currentPlayer) { toast(`It is ${player().name}'s turn.`); return; }
    openStepChooser();
  }));
}

function renderToolbar() {
  const current = player();
  $("current-player-label").textContent = current.name;
  $("status-dot").style.background = current.color;
  $("status-dot").style.boxShadow = `0 0 0 5px ${current.color}2d`;
  $("round-display").textContent = String(state.round).padStart(2, "0");
  $("time-callout").classList.toggle("hidden", !state.finishAfterRound);
  $("call-time-button").disabled = state.finishAfterRound;
  $("call-time-button").textContent = state.finishAfterRound ? "Round ending" : "Call time";
}

function renderTurn() {
  const p = player();
  const prompt = $("turn-prompt"), actions = $("turn-actions"), badge = $("turn-badge");
  badge.textContent = state.phase.toUpperCase();
  if (state.phase === "choose") {
    prompt.innerHTML = `<strong>${avatarArt(p.animal, "avatar-inline")} ${escapeHtml(p.name)}, choose your move.</strong><span>Click your ${p.animal.name} token on the board, then select 1–6 steps.</span>`;
    const here = spaces[p.position];
    const canUpgrade = isProperty(here) && here.owner === p.id && !here.building && p.cash >= buildingCost(here);
    actions.innerHTML = `<button class="primary-button" id="choose-steps-button" type="button"><span>Choose 1–6 steps</span></button>${canUpgrade ? `<button class="outline-button" id="develop-button" type="button">Upgrade ${escapeHtml(here.name)} · ${money(buildingCost(here))}</button>` : ""}`;
    $("choose-steps-button").addEventListener("click", openStepChooser);
    if (canUpgrade) $("develop-button").addEventListener("click", () => developProperty(here));
  } else if (state.phase === "decision") {
    prompt.innerHTML = `<strong>Resolve your city decision.</strong><span>Check the city card for your next step.</span>`;
    actions.innerHTML = `<button class="outline-button" type="button" id="decision-reminder">Show decision</button>`;
    $("decision-reminder").addEventListener("click", () => $("decision-dialog").showModal());
  } else {
    prompt.innerHTML = state.pending?.kind === "movement"
      ? `<strong>${escapeHtml(p.name)} is on the move.</strong><span>Arriving at ${escapeHtml(spaces[state.pending.route.at(-1) ?? p.position].name)}…</span>`
      : `<strong>Wrapping up the turn.</strong><span>The city ledger is updating.</span>`;
    actions.innerHTML = "";
  }
}

function renderPlayers() {
  const turn = player();
  $("turn-spotlight").innerHTML = `<div class="spotlight-avatar" style="--avatar-color:${turn.color}">${avatarArt(turn.animal)}</div><div class="spotlight-text"><p class="eyebrow">Now playing</p><strong>${escapeHtml(turn.name)}</strong><span>${turn.animal.name}</span></div>`;
  $("player-list").innerHTML = state.players.map(p => {
    const owned = properties.filter(prop => prop.owner === p.id); const upgrades = owned.filter(prop => prop.building).length;
    return `<div class="player-row ${p.out ? "is-out" : ""} ${p.id === state.currentPlayer && !p.out ? "active" : ""}"><span class="player-avatar" style="--avatar-color:${p.color}" title="${escapeHtml(p.animal.name)}">${avatarArt(p.animal)}</span><div><div class="player-name">${escapeHtml(p.name)}</div><div class="player-portfolio">${p.out ? "Bankrupt — out of the game" : `${owned.length} properties${upgrades ? ` · ${upgrades} upgrade${upgrades === 1 ? "" : "s"}` : ""}${p.jailPasses ? ` · ${p.jailPasses} pass` : ""}`}</div></div><strong class="player-cash">${p.out ? "Out" : money(p.cash)}</strong></div>`;
  }).join("");
}

function renderActivity() { $("activity-log").innerHTML = state.activity.slice(0, 60).map(item => `<li>${escapeHtml(item)}</li>`).join(""); }
function log(message) { state.activity.unshift(message); renderActivity(); queueSave(); }
function toast(message) { const region = $("toast-region"); region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { region.innerHTML = ""; }, 3600); }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#039;", '"':"&quot;" }[char])); }

function callTime() { state.finishAfterRound = true; log("Time was called. Complete the round."); toast("Time called — finish the current round."); renderToolbar(); queueSave(); }

function openStepChooser() {
  if (!state || state.phase !== "choose") return;
  const p = player();
  if (p.jailed) { showJailDecision(); return; }
  const actions = Array.from({ length: 6 }, (_, index) => ({ label: `${index + 1} ${index === 0 ? "step" : "steps"}`, primary: index === 2, action: () => chooseSteps(index + 1) }));
  showDecision({ icon: "i-flag", kicker: `${p.animal.name} movement`, title: `How far will ${p.name} travel?`, copy: "Choose one to six spaces. You control the route through the world landmarks.", details: `<div class="step-picker-note"><span class="step-avatar">${avatarArt(p.animal)}</span><strong>${escapeHtml(p.name)}</strong><small>is currently on ${escapeHtml(spaces[p.position].name)}</small></div>`, actions });
  $("decision-dialog").classList.add("step-selection");
}

function chooseSteps(steps) {
  if (!state || state.phase !== "choose" || !Number.isInteger(steps) || steps < 1 || steps > 6) return;
  const p = player();
  closeDecision();
  log(`${p.name} chose to move ${steps} ${steps === 1 ? "step" : "steps"}.`);
  return movePlayer(p, steps, { collectStart: true, source: "choice" });
}

function movePlayer(p, steps, options = {}) {
  const route = Array.from({ length: Math.abs(steps) }, (_, i) => ((p.position + Math.sign(steps) * (i + 1)) % spaces.length + spaces.length) % spaces.length);
  return travelPlayer(p, route, { ...options, direction: Math.sign(steps) || 1 }, { kind: "resolve" });
}

function forwardRoute(from, to) {
  const steps = (to - from + spaces.length) % spaces.length;
  return Array.from({ length: steps }, (_, i) => (from + i + 1) % spaces.length);
}

function travelPlayer(p, route, options, completion) {
  if (!state || state.pending?.kind === "movement") return movementPromise;
  // Persist intent and progress only. No meshes, camera state or parallel cash/ownership model.
  state.pending = { kind: "movement", player: p.id, route, nextStep: 0, options, completion, startRewarded: false };
  state.phase = "moving";
  $("board-3d-info").hidden = true;
  renderTurn(); queueSave();
  return resumeMovement();
}

function resumeMovement() {
  if (!state || state.pending?.kind !== "movement") return Promise.resolve();
  if (movementPromise) return movementPromise;
  const session = state, pending = state.pending;
  const p = state.players.find(item => item.id === pending.player);
  if (!p) return Promise.resolve();
  const controller = new AbortController(); movementController = controller;
  const valid = () => state === session && session.pending === pending && !controller.signal.aborted;
  const stepLanded = (index, step) => {
    if (!valid() || step !== pending.nextStep) return;
    p.position = index; pending.nextStep = step + 1;
    // Exactly once per logical move, never per animation frame or resumed hop.
    if (index === 0 && pending.options.collectStart && pending.options.direction > 0 && !pending.startRewarded) {
      pending.startRewarded = true;
      adjustCash(p, 200); showCashEffect(200, "START BONUS"); log(`${p.name} passed Start and collected $200.`);
    }
    renderBoard(); renderPlayers(); queueSave();
  };
  const run = async () => {
    let view = await ensureBoard3D();
    if (!valid()) return;
    view?.sync(session);
    let arrived = false;
    if (view) {
      try { arrived = await view.animateMovement(p, pending, stepLanded, controller.signal); }
      catch (error) { useBoardFallback(error); view = null; }
    }
    if (!valid()) return;
    // Same engine and step commits also power the classic-board fallback.
    if (!arrived) {
      for (let step = pending.nextStep; step < pending.route.length; step++) {
        await new Promise(resolve => setTimeout(resolve, 170));
        if (!valid()) return;
        stepLanded(pending.route[step], step);
      }
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    if (!valid()) return;
    movementController = null; movementPromise = null;
    finishMovement(p, pending);
  };
  const task = run().finally(() => { if (movementController === controller) { movementController = null; movementPromise = null; } });
  movementPromise = task;
  return task;
}

function finishMovement(p, pending) {
  if (!state || state.pending !== pending) return;
  state.pending = null;
  const completion = pending.completion;
  if (completion.kind === "resolve") { resolveSpace(p, pending.options); return; }
  if (completion.kind === "chance-start") { adjustCash(p, 200); showCashEffect(200, "START BONUS"); log(`${p.name} advanced to Start and collected $200.`); }
  if (completion.kind === "transit-pass") log(`${p.name} used a free Transit pass to ${spaces[p.position].name}.`);
  if (completion.kind === "transit") log(`${p.name} rode the city line for $40.`);
  if (completion.kind === "jail") { p.jailed = true; log(`${p.name} was sent to Jail by ${completion.source}.`); toast(`${p.name} is in Jail.`); }
  renderBoard(); renderPlayers(); endTurn();
}

function resolveSpace(p, options = {}) {
  const space = spaces[p.position];
  if (isProperty(space)) { resolveProperty(p, space); return; }
  if (space.type === "start") { log(`${p.name} lands on Start.`); endTurn(); }
  else if (space.type === "tax") { const paid = Math.min(p.cash, space.amount); if (chargeCash(p, space.amount)) { showCashEffect(-paid, space.name.toUpperCase()); log(`${p.name} paid ${money(space.amount)} for ${space.name}.`); toast(`${space.name}: ${money(space.amount)}`); } else if (paid) showCashEffect(-paid, "TAX LOSS"); endTurn(); }
  else if (space.type === "chance") drawChance(p);
  else if (space.type === "station") resolveStation(p, options);
  else if (space.type === "go-jail") sendToJail(p, "Go to Jail");
  else if (space.type === "parking") { log(`${p.name} took a breather at Free Parking.`); endTurn(); }
  else { log(`${p.name} is just visiting Jail.`); endTurn(); }
}

function resolveProperty(p, prop) {
  if (prop.owner === null) { showPurchaseDecision(p, prop); return; }
  if (prop.owner === p.id) { log(`${p.name} landed on ${prop.name}. It is already theirs.`); endTurn(); return; }
  showRentDecision(p, prop);
}

// Rival-facing decisions expire so one group cannot stall the table.
const DECISION_SECONDS = 30;

const rentOf = (prop) => prop.rent * (prop.building ? 2 : 1);

function showRentDecision(p, prop) {
  const owner = state.players[prop.owner];
  const rent = rentOf(prop);
  state.phase = "decision"; setPending({ kind: "rent", player: p.id, pos: prop.position }); renderTurn();
  showDecision({
    icon: "i-bank",
    kicker: "Rival landmark",
    title: `${prop.name} belongs to ${owner.name}`,
    copy: `Pay the rent, or challenge ${owner.name} to a mini game. Beat them and you pay nothing — lose and the rent doubles.`,
    details: `<div class="space-summary" style="--detail-color:${prop.color}"><i class="swatch"></i><div><strong>${escapeHtml(prop.name)}</strong><span>Rent ${money(rent)} · doubled ${money(rent * 2)}</span></div><strong class="money">${money(rent)}</strong></div>`,
    actions: [
      { label: `Pay ${money(rent)} rent`, primary: true, action: () => { closeDecision(); payRent(p, prop, 1); } },
      { label: `Challenge ${owner.name}`, action: () => { closeDecision(); log(`${p.name} challenged ${owner.name} to a mini game over ${prop.name}.`); showChallengeDecision(p, prop); } }
    ],
    timeLimit: DECISION_SECONDS,
    timeoutNote: "the rent is paid automatically",
    onTimeout: () => { log(`${p.name} ran out of time and paid the rent rather than challenging.`); toast("Time up — rent paid."); closeDecision(); payRent(p, prop, 1); }
  });
}

function showChallengeDecision(p, prop) {
  const owner = state.players[prop.owner];
  const rent = rentOf(prop);
  state.phase = "decision"; setPending({ kind: "challenge", player: p.id, pos: prop.position });
  showDecision({
    icon: "i-flag",
    kicker: "Mini game challenge",
    title: `${p.name} vs ${owner.name}`,
    copy: "Play the mini game away from the screen, then record who won. This cannot be undone.",
    details: `<div class="challenge-stakes">
      <div class="stake stake-lose"><p>${escapeHtml(owner.name)} wins</p><strong>${money(rent * 2)}</strong><span>double rent</span></div>
      <div class="stake stake-win"><p>${escapeHtml(p.name)} wins</p><strong>${money(0)}</strong><span>pays nothing</span></div>
    </div>`,
    actions: [
      { label: `${owner.name} won`, variant: "button-lose", action: () => { closeDecision(); payRent(p, prop, 2, true); } },
      { label: `${p.name} won`, primary: true, variant: "button-win", action: () => { closeDecision(); winChallenge(p, prop); } }
    ]
  });
}

function payRent(p, prop, multiplier = 1, viaChallenge = false) {
  const owner = state.players[prop.owner];
  const rent = rentOf(prop) * multiplier;
  const paid = Math.min(p.cash, rent);
  // Whatever they have goes to the owner; a shortfall ends their game.
  const settled = chargeCash(p, rent, owner);
  if (paid) {
    showCashEffect(-paid, viaChallenge ? "DOUBLE RENT PAID" : "RENT PAID");
    showCashEffect(paid, "RENT PROFIT");
  }
  if (settled) {
    log(viaChallenge
      ? `${owner.name} won the mini game. ${p.name} paid double rent, ${money(rent)}, for ${prop.name}.`
      : `${p.name} paid ${money(rent)} rent to ${owner.name} for ${prop.name}.`);
    toast(viaChallenge ? `Challenge lost — ${money(rent)} double rent` : `${money(rent)} rent paid to ${owner.name}`);
  }
  renderPlayers(); endTurn();
}

function winChallenge(p, prop) {
  const owner = state.players[prop.owner];
  log(`${p.name} beat ${owner.name} at the mini game and stays on ${prop.name} rent free.`);
  toast(`${p.name} won the challenge — no rent!`);
  endTurn();
}

function showPurchaseDecision(p, prop) {
  state.phase = "decision"; setPending({ kind: "purchase", player: p.id, pos: prop.position }); renderTurn();
  const affordable = p.cash >= prop.price;
  const actions = [];
  // No buying into debt: without the full price the only move is to walk away.
  if (affordable) actions.push({ label: `Buy for ${money(prop.price)}`, primary: true, action: () => { adjustCash(p, -prop.price); showCashEffect(-prop.price, "LANDMARK ACQUIRED"); prop.owner = p.id; log(`${p.name} bought ${prop.name} for ${money(prop.price)}.`); toast(`${prop.name} is now yours.`); closeDecision(); endTurn(); } });
  actions.push({ label: affordable ? "Pass on this property" : "Leave it — not enough cash", primary: !affordable, action: () => { log(`${p.name} left ${prop.name} open for another group.`); closeDecision(); endTurn(); } });
  const timeout = { timeLimit: DECISION_SECONDS, timeoutNote: "the block stays open", onTimeout: () => { log(`${p.name} ran out of time and left ${prop.name} open for another group.`); toast(`Time up — ${prop.name} not bought.`); closeDecision(); endTurn(); } };
  showDecision({ ...timeout, icon: "i-build", kicker: "Open city block", title: `${prop.name} is available`, copy: affordable ? `Buy this address to add it to ${p.name}’s city portfolio. You can add a City Upgrade on a later turn for ${money(buildingCost(prop))}.` : `${p.name} holds ${money(p.cash)} and cannot cover the ${money(prop.price)} price. The block stays open.`, details: `<div class="space-summary" style="--detail-color:${prop.color}"><i class="swatch"></i><div><strong>${escapeHtml(prop.name)}</strong><span>Base rent ${money(prop.rent)} · upgraded rent ${money(prop.rent * 2)}</span></div><strong class="money">${money(prop.price)}</strong></div>`, actions });
}

function drawChance(p) {
  showChanceCard(p, Math.floor(Math.random() * chanceCards.length));
}

function showChanceCard(p, index) {
  const card = chanceCards[index];
  state.phase = "decision"; setPending({ kind: "chance", player: p.id, card: index }); renderTurn();
  showDecision({ icon: "i-card", kicker: "City chance", title: card.title, copy: card.text, details: `<div class="chance-card"><strong>CHANCE CARD</strong><p>${escapeHtml(card.text)}</p></div>`, actions: [{ label: "Resolve card", primary: true, action: () => { closeDecision(); applyChance(p, card); } }] });
}

function applyChance(p, card) {
  if (card.effect === "cash") {
    let settled = true;
    if (card.amount < 0) { const paid = Math.min(p.cash, -card.amount); settled = chargeCash(p, -card.amount); if (paid) showCashEffect(-paid, card.title.toUpperCase()); }
    else { adjustCash(p, card.amount); showCashEffect(card.amount, card.title.toUpperCase()); }
    if (settled) { log(`${p.name}: ${card.title} (${money(card.amount)}).`); toast(`${card.amount >= 0 ? "Collected" : "Paid"} ${money(Math.abs(card.amount))}`); }
    endTurn();
  }
  if (card.effect === "start") return travelPlayer(p, forwardRoute(p.position, 0), { collectStart: false, direction: 1 }, { kind: "chance-start" });
  if (card.effect === "move") { log(`${p.name} moves back 3 spaces from a Chance card.`); return movePlayer(p, card.amount, { collectStart: false, source: "chance" }); }
  if (card.effect === "nearestStation") { const station = stationPositions.reduce((nearest, candidate) => ((candidate - p.position + spaces.length) % spaces.length) < ((nearest - p.position + spaces.length) % spaces.length) ? candidate : nearest, stationPositions[0]); return travelPlayer(p, forwardRoute(p.position, station), { collectStart: false, direction: 1 }, { kind: "transit-pass" }); }
  if (card.effect === "jailPass") { p.jailPasses++; log(`${p.name} received a Get Out of Jail pass.`); toast("Get Out of Jail pass added."); endTurn(); }
  if (card.effect === "jail") return sendToJail(p, "a Chance card");
  if (card.effect === "goto") { const target = spaces.findIndex(s => s.name === card.targetName); log(`${p.name} advances to ${card.targetName}.`); return travelPlayer(p, forwardRoute(p.position, target), { collectStart: false, source: "chance", direction: 1 }, { kind: "resolve" }); }
  renderAll();
}

function resolveStation(p, options) {
  if (options.freeTransit) { endTurn(); return; }
  showStationDecision(p, stationPositions.find(pos => pos !== p.position) ?? stationPositions[0]);
}

function showStationDecision(p, target) {
  state.phase = "decision"; setPending({ kind: "station", player: p.id, target }); renderTurn();
  const affordable = p.cash >= 40;
  const actions = [{ label: "Stay here", primary: !affordable, action: () => { log(`${p.name} stayed at the Transit Station.`); closeDecision(); endTurn(); } }];
  if (affordable) actions.push({ label: "Ride for $40", primary: true, action: () => { adjustCash(p, -40); showTransitEffect(); closeDecision(); return travelPlayer(p, [target], { collectStart: false, direction: 1 }, { kind: "transit" }); } });
  showDecision({ icon: "i-train", kicker: "Transit Station", title: "Catch the city line?", copy: affordable ? `Pay $40 to travel directly to the other Transit Station. Your turn ends when you arrive.` : `The fare is $40 and ${p.name} holds ${money(p.cash)}. You will have to stay put.`, details: `<div class="space-summary"><i class="swatch" style="background:var(--violet)"></i><div><strong>${spaces[target].name}</strong><span>A fast route across the city.</span></div><strong class="money">$40</strong></div>`, actions });
}

function sendToJail(p, source) { showJailEffect(); return travelPlayer(p, [cornerAt[1]], { collectStart: false, direction: 1 }, { kind: "jail", source }); }

function showJailDecision() {
  const p = player(); state.phase = "decision"; setPending({ kind: "jail", player: p.id }); renderTurn();
  const actions = [{ label: "Miss this turn", action: () => { p.jailed = false; log(`${p.name} missed a turn to leave Jail.`); closeDecision(); endTurn(); } }];
  if (p.cash >= 50) actions.push({ label: "Pay $50 and choose steps", primary: true, action: () => { adjustCash(p, -50); showCashEffect(-50, "RELEASE FEE"); p.jailed = false; log(`${p.name} paid $50 to leave Jail.`); closeDecision(); state.phase = "choose"; renderAll(); toast("You’re out — choose your steps."); } });
  if (p.jailPasses > 0) actions.splice(1, 0, { label: "Use Jail pass and choose steps", action: () => { p.jailPasses--; p.jailed = false; log(`${p.name} used a Get Out of Jail pass.`); closeDecision(); state.phase = "choose"; renderAll(); toast("Pass used — choose your steps."); } });
  showDecision({ icon: "i-lock", kicker: "You’re in Jail", title: "Choose how to leave", copy: p.cash >= 50 ? "Pay the release fee, use a Get Out of Jail pass, or take a breather and miss this turn." : `The $50 fee is beyond ${p.name}’s ${money(p.cash)}. Use a pass if you hold one, or miss this turn.`, actions });
}

function stopDecisionTimer() {
  clearTimeout(decisionTimer); decisionTimer = null;
  const label = $("decision-timer");
  label.hidden = true; label.classList.remove("is-urgent");
}

function showDecision({ icon: iconName, kicker, title, copy, details = "", actions = [], timeLimit = 0, timeoutNote = "", onTimeout = null }) {
  stopDecisionTimer();
  $("decision-dialog").classList.remove("step-selection");
  $("dialog-icon").innerHTML = icon(iconName); $("dialog-kicker").textContent = kicker; $("dialog-title").textContent = title; $("dialog-copy").textContent = copy; $("dialog-details").innerHTML = details;
  $("dialog-actions").innerHTML = actions.map((action, index) => `<button class="${action.primary ? "primary-button" : "outline-button"}${action.variant ? ` ${action.variant}` : ""}" type="button" data-action="${index}">${escapeHtml(action.label)}</button>`).join("");
  const session = state; let handled = false;
  // One gate for both the buttons and the clock, so a decision can only resolve once.
  const resolve = (run) => {
    if (handled || state !== session) return;
    handled = true;
    stopDecisionTimer();
    $("dialog-actions").querySelectorAll("button").forEach(item => { item.disabled = true; });
    run();
  };
  $("dialog-actions").querySelectorAll("button").forEach((button, index) => button.addEventListener("click", () => resolve(actions[index].action)));
  if (timeLimit > 0 && onTimeout) {
    // The clock belongs to the decision, not the dialog: closing the dialog to look at the
    // board does not stop it, but starting another game does.
    const label = $("decision-timer");
    let left = timeLimit;
    const tick = () => {
      if (state !== session) { stopDecisionTimer(); return; }
      label.textContent = `${left}s to decide · ${timeoutNote}`;
      label.classList.toggle("is-urgent", left <= 10);
      if (left <= 0) { resolve(onTimeout); return; }
      left -= 1;
      decisionTimer = setTimeout(tick, 1000);
    };
    label.hidden = false;
    tick();
  }
  $("decision-dialog").showModal();
}
// A decision that is open but unanswered is persisted, so resuming a game reopens it
// instead of silently continuing the turn as if it had been settled.
function setPending(pending) { state.pending = pending; queueSave(); }

function resumePending() {
  const pending = state?.pending;
  if (!pending) { if (state && state.phase === "decision") { state.phase = "choose"; renderTurn(); } return; }
  const p = state.players[pending.player] || player();
  state.currentPlayer = p.id;
  if (pending.kind === "purchase" && propertyAt[pending.pos]) return showPurchaseDecision(p, propertyAt[pending.pos]);
  if (pending.kind === "rent" && propertyAt[pending.pos]) return showRentDecision(p, propertyAt[pending.pos]);
  if (pending.kind === "challenge" && propertyAt[pending.pos]) return showChallengeDecision(p, propertyAt[pending.pos]);
  if (pending.kind === "chance" && chanceCards[pending.card]) return showChanceCard(p, pending.card);
  if (pending.kind === "station") return showStationDecision(p, pending.target);
  if (pending.kind === "jail") return showJailDecision();
  state.pending = null; state.phase = "choose"; renderTurn();
}

function closeDecision() { if ($("decision-dialog").open) $("decision-dialog").close(); }
function adjustCash(p, amount) { p.cash += amount; renderPlayers(); queueSave(); }

// Cash never goes below zero. Optional spending is refused outright; a forced payment a
// group cannot cover takes everything they have left and puts them out of the game.
function chargeCash(p, amount, creditor = null) {
  const paid = Math.min(p.cash, amount);
  p.cash -= paid;
  if (creditor) creditor.cash += paid;
  if (paid < amount) bankrupt(p, creditor, amount - paid);
  renderPlayers(); queueSave();
  return paid >= amount;
}

function bankrupt(p, creditor, shortfall) {
  p.out = true;
  // Their landmarks go back on the market; upgrades are torn down with them.
  properties.forEach(prop => { if (prop.owner === p.id) { prop.owner = null; prop.building = false; } });
  log(`${p.name} could not cover ${money(shortfall)}${creditor ? ` owed to ${creditor.name}` : ""} and is out of the game. Their landmarks return to the bank.`);
  toast(`${p.name} is bankrupt — out of the game.`);
  renderBoard();
}

function developProperty(prop) {
  const p = player(); const cost = buildingCost(prop); if (prop.owner !== p.id || prop.building) return;
  if (p.cash < cost) { toast(`${p.name} needs ${money(cost)} to upgrade ${prop.name}.`); return; }
  adjustCash(p, -cost); showCashEffect(-cost, "LANDMARK UPGRADED"); prop.building = true; sparkleUpgrade(prop.position); log(`${p.name} added a City Upgrade to ${prop.name} for ${money(cost)}. Rent is now ${money(prop.rent * 2)}.`); toast(`${prop.name} upgraded — rent doubled.`); renderAll();
}

function endTurn() {
  if (!state || state.pending?.kind === "turn-end" || state.phase === "complete") return;
  state.pending = { kind: "turn-end" };
  const p = player(); p.turns++; state.phase = "moving"; renderAll();
  const session = state;
  queueSave();
  clearTimeout(turnTimer);
  turnTimer = setTimeout(() => completeTurn(session), 280);
}

function completeTurn(session) {
  if (state !== session || state.pending?.kind !== "turn-end") return;
  // Last group standing wins there and then.
  if (activePlayers().length <= 1) { state.pending = null; endGame(); return; }
  // Hand over to the next group still in the game, noting when that wraps the round.
  let next = state.currentPlayer, wrapped = false;
  do { next += 1; if (next >= state.players.length) { next = 0; wrapped = true; } } while (state.players[next].out);
  if (wrapped && state.finishAfterRound) { state.pending = null; endGame(); return; }
  state.currentPlayer = next; if (wrapped) state.round++;
  state.pending = null;
  state.phase = "choose"; renderAll(); log(`${player().name}’s turn begins. Select the ${player().animal.name} to choose a move.`); queueSave();
}

function openTrade() { if (!state || state.phase === "complete") return; $("trade-form").dataset.fromPlayer = String(player().id); $("trade-from-name").textContent = player().name; const partner = $("trade-partner"); partner.innerHTML = state.players.filter(p => p.id !== player().id && !p.out).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join(""); populateTradeProperties(); $("trade-from-cash").value = 0; $("trade-to-cash").value = 0; $("trade-dialog").showModal(); }
function populateTradeProperties() {
  const partnerId = Number($("trade-partner").value); const options = (owner) => `<option value="">No property</option>${properties.filter(p => p.owner === owner).map(p => `<option value="${p.position}">${escapeHtml(p.name)} (${money(p.price)})</option>`).join("")}`;
  $("trade-from-property").innerHTML = options(Number($("trade-form").dataset.fromPlayer)); $("trade-to-property").innerHTML = options(partnerId);
}
function submitTrade(event) {
  event.preventDefault(); if (!state || state.phase === "complete") return; const from = state.players[Number($("trade-form").dataset.fromPlayer)]; const to = state.players[Number($("trade-partner").value)]; if (!from || !to || from === to) return; const fromProp = propertyAt[$("trade-from-property").value]; const toProp = propertyAt[$("trade-to-property").value]; const fromCash = Math.max(0, Number($("trade-from-cash").value) || 0); const toCash = Math.max(0, Number($("trade-to-cash").value) || 0);
  if (!fromProp && !toProp && !fromCash && !toCash) { toast("Choose a property or cash amount for the trade."); return; }
  if (fromProp && fromProp.owner !== from.id) { toast("That property is no longer available."); return; } if (toProp && toProp.owner !== to.id) { toast("That property is no longer available."); return; }
  if (from.out || to.out) { toast("That group is out of the game."); return; }
  // Neither side may trade itself into debt.
  if (fromCash > from.cash) { toast(`${from.name} only holds ${money(from.cash)}.`); return; }
  if (toCash > to.cash) { toast(`${to.name} only holds ${money(to.cash)}.`); return; }
  if (fromProp) fromProp.owner = to.id; if (toProp) toProp.owner = from.id; adjustCash(from, -fromCash + toCash); adjustCash(to, fromCash - toCash); const parts = []; if (fromProp) parts.push(`${from.name} gave ${fromProp.name}`); if (toProp) parts.push(`${to.name} gave ${toProp.name}`); if (fromCash || toCash) parts.push("cash changed hands"); log(`Trade complete: ${parts.join("; ")}.`); toast("Agreed trade recorded."); $("trade-dialog").close(); renderAll();
}

function endGame() {
  state.phase = "complete"; state.pending = null;
  // Bankrupt groups always place below anyone still standing, however small their pile.
  const scores = state.players.map(p => ({ ...p, wealth: totalWealth(p), propertyValue: properties.filter(x => x.owner === p.id).reduce((sum, x) => sum + propertyWorth(x), 0) }))
    .sort((a, b) => (Boolean(a.out) === Boolean(b.out) ? b.wealth - a.wealth : a.out ? 1 : -1));
  const winner = scores[0];
  $("winner-message").textContent = activePlayers().length === 1
    ? `${winner.name} is the last group standing and takes the city with ${money(winner.wealth)} in total wealth.`
    : `${winner.name} takes the city with ${money(winner.wealth)} in total wealth.`;
  $("scoreboard").innerHTML = standingsHtml(scores);
  saveGame(false, "complete");
  $("end-dialog").showModal();
}

init();
