const properties = [
  [1, "Taipei 101", 80, 10, "#f4b942"], [3, "Petronas Twin Towers", 100, 12, "#e68463"],
  [5, "Marina Bay Sands", 120, 14, "#d57cc8"], [7, "Burj Khalifa", 140, 16, "#9a86ea"],
  [10, "Eiffel Tower", 160, 18, "#75bfbe"], [11, "Sagrada Família", 180, 20, "#5bb486"],
  [12, "Colosseum", 200, 22, "#62a5e1"], [15, "Big Ben", 220, 24, "#f0808c"],
  [17, "Acropolis", 240, 26, "#c3a268"], [19, "Christ the Redeemer", 260, 28, "#7db664"],
  [21, "Machu Picchu", 280, 30, "#ca8cdb"], [22, "Taj Mahal", 300, 32, "#e8b340"],
  [23, "Angkor Wat", 320, 34, "#76a9da"], [24, "Sydney Opera House", 340, 36, "#61c4b2"],
  [25, "Golden Gate Bridge", 360, 38, "#d17698"], [26, "Statue of Liberty", 380, 40, "#ee9172"],
  [28, "Moai of Rapa Nui", 400, 42, "#93b957"], [29, "Chichén Itzá", 420, 44, "#7672d6"],
  [30, "Pyramids of Giza", 440, 46, "#e57e5b"], [31, "Neuschwanstein Castle", 460, 48, "#a66e48"],
  [32, "Mount Fuji", 480, 50, "#5faed2"], [33, "Great Wall of China", 500, 52, "#8a73d5"],
  [34, "Hagia Sophia", 520, 54, "#dc9c4d"], [35, "Grand Canyon", 560, 58, "#ec6671"]
].map(([position, name, price, rent, color], art) => ({ position, name, price, rent, color, art, owner: null, building: false }));

const propertyAt = Object.fromEntries(properties.map(p => [p.position, p]));
const spaces = [
  { type: "start", name: "Start", label: "Collect $200", art: 24 }, propertyAt[1],
  { type: "chance", name: "Chance", label: "Draw a city card", art: 25 }, propertyAt[3],
  { type: "tax", name: "Income Tax", label: "Pay $100", art: 26, amount: 100 }, propertyAt[5],
  { type: "station", name: "Transit Station", label: "Ride for $40", art: 27 }, propertyAt[7],
  { type: "chance", name: "Chance", label: "Draw a city card", art: 25 },
  { type: "jail", name: "Jail", label: "Just Visiting", art: 29 }, propertyAt[10], propertyAt[11], propertyAt[12],
  { type: "tax", name: "City Maintenance", label: "Pay $50", art: 26, amount: 50 },
  { type: "chance", name: "Chance", label: "Draw a city card", art: 25 }, propertyAt[15],
  { type: "station", name: "Transit Station", label: "Ride for $40", art: 27 }, propertyAt[17],
  { type: "parking", name: "Free Parking", label: "Take a breather", art: 28 }, propertyAt[19],
  { type: "chance", name: "Chance", label: "Draw a city card", art: 25 }, propertyAt[21], propertyAt[22], propertyAt[23], propertyAt[24], propertyAt[25], propertyAt[26],
  { type: "go-jail", name: "Go to Jail", label: "Do not pass Start", art: 30 }, propertyAt[28], propertyAt[29], propertyAt[30], propertyAt[31], propertyAt[32], propertyAt[33], propertyAt[34], propertyAt[35]
];

const playerColors = ["#ef4a54", "#1769aa", "#8e5ee4", "#e27719", "#138c73", "#be3372"];
const playerAnimals = [
  { icon: "🐯", name: "Tiger" }, { icon: "🐼", name: "Panda" }, { icon: "🦊", name: "Fox" },
  { icon: "🦁", name: "Lion" }, { icon: "🐸", name: "Frog" }, { icon: "🦉", name: "Owl" }
];
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
  { title: "World tour", text: "Advance to the Taj Mahal and resolve the space.", effect: "goto", target: 22 }
];

const posToGrid = (position) => {
  if (position === 0) return [10, 10];
  if (position <= 8) return [10, 10 - position];
  if (position === 9) return [10, 1];
  if (position <= 17) return [19 - position, 1];
  if (position === 18) return [1, 1];
  if (position <= 26) return [1, position - 17];
  if (position === 27) return [1, 10];
  return [position - 26, 10];
};

let state = null;
let timerId = null;
let toastTimer = null;
let saveTimer = null;
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
const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"></use></svg>`;

function init() {
  renderNameFields(2);
  document.querySelectorAll('input[name="count"]').forEach(input => input.addEventListener("change", () => renderNameFields(Number(input.value))));
  $("setup-form").addEventListener("submit", startGame);
  $("rules-button").addEventListener("click", () => $("rules-dialog").showModal());
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
  $("back-to-games-button").addEventListener("click", returnToLobby);
  $("save-game-button").addEventListener("click", () => saveGame(true));
  [$("decision-dialog"), $("rules-dialog"), $("trade-dialog")].forEach(dialog => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  configureSupabase();
}

function renderNameFields(count) {
  const existing = [...document.querySelectorAll(".name-input")].map(input => input.value);
  $("player-name-fields").innerHTML = Array.from({ length: count }, (_, i) => `<label class="name-field"><span>Group ${i + 1}</span><input class="name-input" maxlength="22" value="${escapeHtml(existing[i] || `Group ${i + 1}`)}" aria-label="Name for group ${i + 1}" /></label>`).join("");
}

async function startGame(event) {
  event.preventDefault();
  const names = [...document.querySelectorAll(".name-input")].map((input, i) => input.value.trim() || `Group ${i + 1}`);
  const gameName = $("game-name").value.trim() || "My world tour";
  properties.forEach(p => { p.owner = null; p.building = false; });
  state = { gameId: null, gameName, players: names.map((name, id) => ({ id, name, color: playerColors[id], animal: playerAnimals[id], cash: 1000, position: 0, jailed: false, jailPasses: 0, turns: 0 })), currentPlayer: 0, round: 1, phase: "choose", activity: ["The city is open. Every group begins with $1,000."], timeLeft: 7200, timerStarted: false, finishAfterRound: false, selectedProperty: null };
  $("setup-screen").classList.add("hidden");
  $("play-screen").classList.remove("hidden");
  renderAll();
  log(`${player().name} opens the city. Select the ${player().animal.name} to choose a move.`);
  if (supabaseClient && authUser) await createCloudGame();
}

function resetGame() {
  if (timerId) clearInterval(timerId);
  clearTimeout(saveTimer);
  state = null;
  ["decision-dialog", "rules-dialog", "trade-dialog", "end-dialog"].forEach(id => { if ($(id).open) $(id).close(); });
  $("play-screen").classList.add("hidden");
  if (supabaseClient && authUser) showLobby(); else showSetup();
}

function showSetup() {
  if (timerId) clearInterval(timerId);
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
    $("save-status").textContent = "Local game";
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
  if (state?.gameId) await saveGame(false);
  if (timerId) clearInterval(timerId);
  state = null;
  showLobby();
}

async function renderGameLibrary() {
  const library = $("game-library");
  library.innerHTML = `<p class="empty-property">Loading your saved games…</p>`;
  const { data: games, error } = await supabaseClient.from("monopoly_games").select("id, name, player_count, status, updated_at").order("updated_at", { ascending: false });
  if (error) { library.innerHTML = `<p class="empty-property">Couldn’t load your games: ${escapeHtml(error.message)}</p>`; return; }
  if (!games.length) { library.innerHTML = `<div class="empty-library"><span>🌍</span><h2>No cities yet</h2><p>Create your first world-landmark game to start building a saved collection.</p></div>`; return; }
  library.innerHTML = games.map(game => `<article class="saved-game"><div><p class="eyebrow">${game.status === "complete" ? "Complete" : "In progress"}</p><h2>${escapeHtml(game.name)}</h2><p>${game.player_count} groups · saved ${new Date(game.updated_at).toLocaleString()}</p></div><button class="primary-button" type="button" data-game-id="${game.id}">Resume</button></article>`).join("");
  library.querySelectorAll("[data-game-id]").forEach(button => button.addEventListener("click", () => loadCloudGame(button.dataset.gameId)));
}

function snapshotGame() {
  return {
    state: { ...state },
    properties: properties.map(property => ({ position: property.position, owner: property.owner, building: property.building }))
  };
}

async function createCloudGame() {
  $("save-status").textContent = "Saving…";
  const { data, error } = await supabaseClient.from("monopoly_games").insert({
    owner_id: authUser.id, name: state.gameName, player_count: state.players.length, game_state: snapshotGame()
  }).select("id").single();
  if (error) { $("save-status").textContent = "Cloud save unavailable"; toast(`Couldn’t create save: ${error.message}`); return; }
  state.gameId = data.id;
  $("save-status").textContent = "Saved";
  $("back-to-games-button").hidden = false;
}

async function saveGame(showToast = false, status = "active") {
  if (!supabaseClient || !authUser || !state?.gameId) return;
  $("save-status").textContent = "Saving…";
  const { error } = await supabaseClient.from("monopoly_games").update({ name: state.gameName, player_count: state.players.length, status, game_state: snapshotGame() }).eq("id", state.gameId);
  $("save-status").textContent = error ? "Save failed" : "Saved";
  if (showToast) toast(error ? `Couldn’t save: ${error.message}` : "Game saved to your account.");
}

function queueSave() {
  if (!state?.gameId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveGame(false), 500);
}

async function loadCloudGame(gameId) {
  const { data: game, error } = await supabaseClient.from("monopoly_games").select("id, name, game_state").eq("id", gameId).single();
  if (error) { toast(`Couldn’t open game: ${error.message}`); return; }
  const snapshot = game.game_state;
  if (!snapshot?.state || !Array.isArray(snapshot.properties)) { toast("This saved game is not valid."); return; }
  snapshot.properties.forEach(saved => {
    const property = propertyAt[saved.position];
    if (property) { property.owner = saved.owner; property.building = saved.building; }
  });
  state = { ...snapshot.state, gameId: game.id, gameName: game.name, phase: snapshot.state.phase === "decision" ? "choose" : snapshot.state.phase };
  state.players = state.players.map((savedPlayer, id) => ({ ...savedPlayer, animal: savedPlayer.animal || playerAnimals[id] }));
  $("lobby-screen").classList.add("hidden");
  $("play-screen").classList.remove("hidden");
  $("back-to-games-button").hidden = false;
  $("save-status").textContent = "Saved";
  renderAll();
  toast(`${state.gameName} resumed.`);
}

function renderAll() {
  renderBoard(); renderToolbar(); renderTurn(); renderPlayers(); renderPropertyPanel(); renderActivity();
}

function renderBoard() {
  const board = $("game-board");
  const cells = spaces.map((space, pos) => {
    const [row, col] = posToGrid(pos);
    const propertyClass = isProperty(space) ? `space-property ${space.owner !== null ? `owned owner-${space.owner}` : ""} ${space.building ? "has-building" : ""}` : "";
    const typeClass = `space ${space.type || "property"} ${propertyClass} ${[0,9,18,27].includes(pos) ? "corner" : ""}`;
    const kind = isProperty(space) ? "Landmark" : ({ start: "Start", chance: "Chance", tax: "Tax", station: "Transit", jail: "Jail", parking: "Rest", "go-jail": "Jail" }[space.type] || "City");
    const propertyBits = isProperty(space) ? `<span>${money(space.price)}</span><span>${money(space.rent)} rent</span>` : `<span>${space.label}</span>`;
    const boardArt = space.type === "chance" ? `<span class="chance-card-icon" aria-hidden="true">${icon("i-card")}</span>` : `<span class="space-art" style="--art-col:${space.art % 6};--art-row:${Math.floor(space.art / 6)}" aria-hidden="true"></span>`;
    const tokens = state.players.filter(p => p.position === pos).map(p => `<button class="token ${p.jailed ? "jailed" : ""} ${p.id === state.currentPlayer && state.phase === "choose" ? "token-active" : ""}" type="button" data-player-id="${p.id}" style="--token-color:${p.color}" aria-label="${escapeHtml(p.name)}, the ${p.animal.name}${p.jailed ? ", is in Jail" : ""}${p.id === state.currentPlayer && state.phase === "choose" ? ". Choose movement" : ""}" title="${escapeHtml(p.name)} · ${p.animal.name}">${p.animal.icon}</button>`).join("");
    return `<article class="${typeClass}" style="grid-row:${row};grid-column:${col};${isProperty(space) ? `--space-color:${space.color};` : ""}" role="gridcell" aria-label="${escapeHtml(space.name)}${isProperty(space) ? `, price ${money(space.price)}, rent ${money(space.rent)}` : `, ${space.label}`}">
      <div class="space-top"><span class="space-index">${String(pos).padStart(2, "0")}</span><span class="space-kind">${kind}</span></div>
      ${boardArt}<strong class="space-name">${escapeHtml(space.name)}</strong><div class="space-meta">${propertyBits}</div><i class="building-mini" aria-hidden="true"></i><div class="token-rack" aria-label="Players on ${escapeHtml(space.name)}">${tokens}</div>
    </article>`;
  }).join("");
  board.innerHTML = `${cells}<section class="city-center" aria-label="City Fortune"><div class="city-skyline" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="center-content"><p class="eyebrow">Buy · trade · build</p><h1 class="center-title">CITY<span>FORTUNE</span></h1><p class="center-subtitle">The race to own the world's landmarks</p></div></section>`;
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
  const h = Math.floor(state.timeLeft / 3600); const m = Math.floor((state.timeLeft % 3600) / 60); const s = state.timeLeft % 60;
  $("timer").textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    prompt.innerHTML = `<strong>${p.animal.icon} ${escapeHtml(p.name)}, choose your move.</strong><span>Click your ${p.animal.name} token on the board, then select 1–6 steps.</span>`;
    actions.innerHTML = `<button class="primary-button" id="choose-steps-button" type="button"><span>Choose 1–6 steps</span></button>`;
    $("choose-steps-button").addEventListener("click", openStepChooser);
  } else if (state.phase === "decision") {
    prompt.innerHTML = `<strong>Resolve your city decision.</strong><span>Check the city card for your next step.</span>`;
    actions.innerHTML = `<button class="outline-button" type="button" id="decision-reminder">Show decision</button>`;
    $("decision-reminder").addEventListener("click", () => $("decision-dialog").showModal());
  } else {
    prompt.innerHTML = `<strong>Wrapping up the turn.</strong><span>The city ledger is updating.</span>`;
    actions.innerHTML = "";
  }
}

function renderPlayers() {
  $("player-list").innerHTML = state.players.map(p => {
    const owned = properties.filter(prop => prop.owner === p.id); const upgrades = owned.filter(prop => prop.building).length;
    return `<div class="player-row ${p.id === state.currentPlayer ? "active" : ""}"><span class="player-color" style="background:${p.color}"></span><div><div class="player-name">${escapeHtml(p.name)}</div><div class="player-portfolio">${owned.length} properties${upgrades ? ` · ${upgrades} upgrade${upgrades === 1 ? "" : "s"}` : ""}${p.jailPasses ? ` · ${p.jailPasses} pass` : ""}</div></div><strong class="player-cash ${p.cash < 0 ? "negative" : ""}">${money(p.cash)}</strong></div>`;
  }).join("");
}

function renderPropertyPanel() {
  const content = $("property-panel-content");
  let prop = state.selectedProperty ? propertyAt[state.selectedProperty] : null;
  if (!prop) prop = properties.find(p => p.owner === player().id) || null;
  if (!prop) { $("property-panel-title").textContent = "City portfolio"; content.innerHTML = `<p class="empty-property">${escapeHtml(player().name)} has no properties yet. Find an open block and make your first deal.</p>`; return; }
  $("property-panel-title").textContent = prop.owner === null ? "Open property" : "Property details";
  const owner = prop.owner === null ? "Open to buy" : state.players[prop.owner].name;
  const cost = buildingCost(prop);
  const canDevelop = prop.owner === player().id && !prop.building && state.phase === "choose";
  content.innerHTML = `<div class="property-detail" style="--detail-color:${prop.color}"><div class="property-detail-head"><span class="property-swatch"></span><div><h3>${escapeHtml(prop.name)}</h3><p>${escapeHtml(owner)}${prop.building ? " · City Upgrade added" : ""}</p></div></div><div class="property-stat-row"><div class="property-stat"><span>Value</span><strong>${money(prop.price)}</strong></div><div class="property-stat"><span>Rent</span><strong>${money(prop.rent * (prop.building ? 2 : 1))}</strong></div><div class="property-stat"><span>Upgrade</span><strong>${prop.building ? "Built" : money(cost)}</strong></div></div>${canDevelop ? `<button class="outline-button develop-button" id="develop-button" type="button">${icon("i-build")} Add City Upgrade · ${money(cost)}</button>` : ""}</div>`;
  if (canDevelop) $("develop-button").addEventListener("click", () => developProperty(prop));
}

function renderActivity() { $("activity-log").innerHTML = state.activity.slice(0, 7).map(item => `<li>${escapeHtml(item)}</li>`).join(""); }
function log(message) { state.activity.unshift(message); renderActivity(); }
function toast(message) { const region = $("toast-region"); region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { region.innerHTML = ""; }, 3600); }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#039;", '"':"&quot;" }[char])); }

function startTimer() { if (state.timerStarted) return; state.timerStarted = true; timerId = setInterval(() => { if (!state || state.timeLeft <= 0) return; state.timeLeft--; renderToolbar(); if (state.timeLeft === 0) { clearInterval(timerId); callTime(); } }, 1000); }
function callTime() { state.finishAfterRound = true; log("The two-hour city clock has ended. Complete the round."); toast("Time is up — finish the current round."); renderToolbar(); queueSave(); }

function openStepChooser() {
  if (state.phase !== "choose") return;
  const p = player();
  if (p.jailed) { showJailDecision(); return; }
  const actions = Array.from({ length: 6 }, (_, index) => ({ label: `${index + 1} ${index === 0 ? "step" : "steps"}`, primary: index === 2, action: () => chooseSteps(index + 1) }));
  showDecision({ icon: "i-flag", kicker: `${p.animal.icon} ${p.animal.name} movement`, title: `How far will ${p.name} travel?`, copy: "Choose one to six spaces. You control the route through the world landmarks.", details: `<div class="step-picker-note"><span>${p.animal.icon}</span><strong>${escapeHtml(p.name)}</strong><small>is currently on ${escapeHtml(spaces[p.position].name)}</small></div>`, actions });
}

function chooseSteps(steps) {
  if (state.phase !== "choose") return;
  startTimer();
  const p = player();
  state.phase = "moving"; renderTurn();
  closeDecision();
  log(`${p.name} chose to move ${steps} ${steps === 1 ? "step" : "steps"}.`);
  setTimeout(() => movePlayer(p, steps, { collectStart: true, source: "choice" }), 180);
}

function movePlayer(p, steps, options = {}) {
  const oldPosition = p.position; const raw = oldPosition + steps; p.position = ((raw % 36) + 36) % 36;
  if (options.collectStart && (steps > 0 && raw >= 36)) { adjustCash(p, 200); log(`${p.name} passed Start and collected $200.`); }
  renderBoard(); renderPlayers();
  setTimeout(() => resolveSpace(p, options), 220);
}

function resolveSpace(p, options = {}) {
  const space = spaces[p.position];
  if (isProperty(space)) { state.selectedProperty = space.position; renderPropertyPanel(); resolveProperty(p, space); return; }
  state.selectedProperty = null; renderPropertyPanel();
  if (space.type === "start") { log(`${p.name} lands on Start.`); endTurn(); }
  else if (space.type === "tax") { adjustCash(p, -space.amount); log(`${p.name} paid ${money(space.amount)} for ${space.name}.`); toast(`${space.name}: ${money(space.amount)}`); endTurn(); }
  else if (space.type === "chance") drawChance(p);
  else if (space.type === "station") resolveStation(p, options);
  else if (space.type === "go-jail") sendToJail(p, "Go to Jail");
  else { log(`${p.name} is just visiting Jail.`); endTurn(); }
}

function resolveProperty(p, prop) {
  if (prop.owner === null) { showPurchaseDecision(p, prop); return; }
  if (prop.owner === p.id) { log(`${p.name} landed on ${prop.name}. It is already theirs.`); endTurn(); return; }
  const owner = state.players[prop.owner]; const rent = prop.rent * (prop.building ? 2 : 1); adjustCash(p, -rent); adjustCash(owner, rent); log(`${p.name} paid ${money(rent)} rent to ${owner.name} for ${prop.name}.`); toast(`${money(rent)} rent paid to ${owner.name}`); renderPlayers(); endTurn();
}

function showPurchaseDecision(p, prop) {
  state.phase = "decision"; renderTurn();
  showDecision({ icon: "i-build", kicker: "Open city block", title: `${prop.name} is available`, copy: `Buy this address to add it to ${p.name}’s city portfolio. You can add a City Upgrade on a later turn for ${money(buildingCost(prop))}.`, details: `<div class="space-summary" style="--detail-color:${prop.color}"><i class="swatch"></i><div><strong>${escapeHtml(prop.name)}</strong><span>Base rent ${money(prop.rent)} · upgraded rent ${money(prop.rent * 2)}</span></div><strong class="money">${money(prop.price)}</strong></div>`, actions: [{ label: `Buy for ${money(prop.price)}`, primary: true, action: () => { adjustCash(p, -prop.price); prop.owner = p.id; log(`${p.name} bought ${prop.name} for ${money(prop.price)}.`); toast(`${prop.name} is now yours.`); closeDecision(); endTurn(); } }, { label: "Pass on this property", action: () => { log(`${p.name} left ${prop.name} open for another group.`); closeDecision(); endTurn(); } }] });
}

function drawChance(p) {
  const card = chanceCards[Math.floor(Math.random() * chanceCards.length)]; state.phase = "decision"; renderTurn();
  showDecision({ icon: "i-card", kicker: "City chance", title: card.title, copy: card.text, details: `<div class="chance-card"><strong>CHANCE CARD</strong><p>${escapeHtml(card.text)}</p></div>`, actions: [{ label: "Resolve card", primary: true, action: () => { closeDecision(); applyChance(p, card); } }] });
}

function applyChance(p, card) {
  if (card.effect === "cash") { adjustCash(p, card.amount); log(`${p.name}: ${card.title} (${money(card.amount)}).`); toast(`${card.amount >= 0 ? "Collected" : "Paid"} ${money(Math.abs(card.amount))}`); endTurn(); }
  if (card.effect === "start") { p.position = 0; adjustCash(p, 200); log(`${p.name} advanced to Start and collected $200.`); renderBoard(); endTurn(); }
  if (card.effect === "move") { log(`${p.name} moves back 3 spaces from a Chance card.`); movePlayer(p, card.amount, { collectStart: false, source: "chance" }); }
  if (card.effect === "nearestStation") { const station = [6, 16].reduce((nearest, candidate) => ((candidate - p.position + 36) % 36) < ((nearest - p.position + 36) % 36) ? candidate : nearest, 6); p.position = station; log(`${p.name} used a free Transit pass to ${spaces[station].name}.`); renderBoard(); endTurn(); }
  if (card.effect === "jailPass") { p.jailPasses++; log(`${p.name} received a Get Out of Jail pass.`); toast("Get Out of Jail pass added."); endTurn(); }
  if (card.effect === "jail") sendToJail(p, "a Chance card");
  if (card.effect === "goto") { p.position = card.target; log(`${p.name} advances to ${spaces[card.target].name}.`); renderBoard(); resolveSpace(p, { source: "chance" }); }
  renderAll();
}

function resolveStation(p, options) {
  if (options.freeTransit) { endTurn(); return; }
  state.phase = "decision"; renderTurn(); const target = p.position === 6 ? 16 : 6;
  showDecision({ icon: "i-train", kicker: "Transit Station", title: "Catch the city line?", copy: `Pay $40 to travel directly to the other Transit Station. Your turn ends when you arrive.`, details: `<div class="space-summary"><i class="swatch" style="background:var(--violet)"></i><div><strong>${spaces[target].name}</strong><span>A fast route across the city.</span></div><strong class="money">$40</strong></div>`, actions: [{ label: "Stay here", action: () => { log(`${p.name} stayed at the Transit Station.`); closeDecision(); endTurn(); } }, { label: "Ride for $40", primary: true, action: () => { adjustCash(p, -40); p.position = target; log(`${p.name} rode the city line for $40.`); closeDecision(); renderBoard(); endTurn(); } }] });
}

function sendToJail(p, source) { p.position = 9; p.jailed = true; log(`${p.name} was sent to Jail by ${source}.`); toast(`${p.name} is in Jail.`); renderBoard(); renderPlayers(); endTurn(); }

function showJailDecision() {
  const p = player(); state.phase = "decision"; renderTurn();
  const actions = [{ label: "Miss this turn", action: () => { p.jailed = false; log(`${p.name} missed a turn to leave Jail.`); closeDecision(); endTurn(); } }, { label: "Pay $50 and choose steps", primary: true, action: () => { adjustCash(p, -50); p.jailed = false; log(`${p.name} paid $50 to leave Jail.`); closeDecision(); state.phase = "choose"; renderAll(); toast("You’re out — choose your steps."); } }];
  if (p.jailPasses > 0) actions.splice(1, 0, { label: "Use Jail pass and choose steps", action: () => { p.jailPasses--; p.jailed = false; log(`${p.name} used a Get Out of Jail pass.`); closeDecision(); state.phase = "choose"; renderAll(); toast("Pass used — choose your steps."); } });
  showDecision({ icon: "i-lock", kicker: "You’re in Jail", title: "Choose how to leave", copy: "Pay the release fee, use a Get Out of Jail pass, or take a breather and miss this turn.", actions });
}

function showDecision({ icon: iconName, kicker, title, copy, details = "", actions = [] }) {
  $("dialog-icon").innerHTML = icon(iconName); $("dialog-kicker").textContent = kicker; $("dialog-title").textContent = title; $("dialog-copy").textContent = copy; $("dialog-details").innerHTML = details;
  $("dialog-actions").innerHTML = actions.map((action, index) => `<button class="${action.primary ? "primary-button" : "outline-button"}" type="button" data-action="${index}">${escapeHtml(action.label)}</button>`).join("");
  $("dialog-actions").querySelectorAll("button").forEach((button, index) => button.addEventListener("click", actions[index].action));
  $("decision-dialog").showModal();
}
function closeDecision() { if ($("decision-dialog").open) $("decision-dialog").close(); }
function adjustCash(p, amount) { p.cash += amount; renderPlayers(); }

function developProperty(prop) {
  const p = player(); const cost = buildingCost(prop); if (prop.owner !== p.id || prop.building) return;
  adjustCash(p, -cost); prop.building = true; log(`${p.name} added a City Upgrade to ${prop.name} for ${money(cost)}. Rent is now ${money(prop.rent * 2)}.`); toast(`${prop.name} upgraded — rent doubled.`); renderAll();
}

function endTurn() {
  const p = player(); p.turns++; state.phase = "moving"; renderAll();
  const lastPlayer = state.currentPlayer === state.players.length - 1;
  setTimeout(() => {
    if (lastPlayer && state.finishAfterRound) { endGame(); return; }
    state.currentPlayer = lastPlayer ? 0 : state.currentPlayer + 1; if (lastPlayer) state.round++;
    state.phase = "choose"; state.selectedProperty = null; renderAll(); log(`${player().name}’s turn begins. Select the ${player().animal.name} to choose a move.`); queueSave();
  }, 280);
}

function openTrade() { if (!state) return; $("trade-from-name").textContent = player().name; const partner = $("trade-partner"); partner.innerHTML = state.players.filter(p => p.id !== player().id).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join(""); populateTradeProperties(); $("trade-from-cash").value = 0; $("trade-to-cash").value = 0; $("trade-dialog").showModal(); }
function populateTradeProperties() {
  const partnerId = Number($("trade-partner").value); const options = (owner) => `<option value="">No property</option>${properties.filter(p => p.owner === owner).map(p => `<option value="${p.position}">${escapeHtml(p.name)} (${money(p.price)})</option>`).join("")}`;
  $("trade-from-property").innerHTML = options(player().id); $("trade-to-property").innerHTML = options(partnerId);
}
function submitTrade(event) {
  event.preventDefault(); const from = player(); const to = state.players[Number($("trade-partner").value)]; const fromProp = propertyAt[$("trade-from-property").value]; const toProp = propertyAt[$("trade-to-property").value]; const fromCash = Math.max(0, Number($("trade-from-cash").value) || 0); const toCash = Math.max(0, Number($("trade-to-cash").value) || 0);
  if (!fromProp && !toProp && !fromCash && !toCash) { toast("Choose a property or cash amount for the trade."); return; }
  if (fromProp && fromProp.owner !== from.id) { toast("That property is no longer available."); return; } if (toProp && toProp.owner !== to.id) { toast("That property is no longer available."); return; }
  if (fromProp) fromProp.owner = to.id; if (toProp) toProp.owner = from.id; adjustCash(from, -fromCash + toCash); adjustCash(to, fromCash - toCash); const parts = []; if (fromProp) parts.push(`${from.name} gave ${fromProp.name}`); if (toProp) parts.push(`${to.name} gave ${toProp.name}`); if (fromCash || toCash) parts.push("cash changed hands"); log(`Trade complete: ${parts.join("; ")}.`); toast("Agreed trade recorded."); $("trade-dialog").close(); renderAll();
}

function endGame() {
  if (timerId) clearInterval(timerId); const scores = state.players.map(p => ({ ...p, wealth: totalWealth(p), propertyValue: properties.filter(x => x.owner === p.id).reduce((sum, x) => sum + propertyWorth(x), 0) })).sort((a, b) => b.wealth - a.wealth);
  const winner = scores[0]; $("winner-message").textContent = `${winner.name} takes the city with ${money(winner.wealth)} in total wealth.`;
  $("scoreboard").innerHTML = scores.map((p, i) => `<div class="score-row"><span class="score-rank">${String(i + 1).padStart(2, "0")}</span><span class="player-color" style="background:${p.color}"></span><div><strong>${escapeHtml(p.name)}</strong><small>Cash ${money(p.cash)} · City value ${money(p.propertyValue)}</small></div><strong class="score-wealth ${p.wealth < 0 ? "negative" : ""}">${money(p.wealth)}</strong></div>`).join("");
  saveGame(false, "complete");
  $("end-dialog").showModal();
}

init();
