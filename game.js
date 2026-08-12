import { createWebPEER } from "webpeerjs";

const $ = (selector) => document.querySelector(selector);
const els = {
  loading: $("#loading"), lobby: $("#lobby"), game: $("#game"), name: $("#name"), roomName: $("#roomName"),
  joinRoom: $("#joinRoom"), copyRoom: $("#copyRoom"), lobbyNotice: $("#lobbyNotice"), players: $("#players"),
  playerCount: $("#playerCount"), startGame: $("#startGame"), startHelp: $("#startHelp"), rulesDialog: $("#rulesDialog"),
  turnTitle: $("#turnTitle"), gameNotice: $("#gameNotice"), statusPills: $("#statusPills"), fields: $("#fields"),
  coinDialog: $("#coinDialog"), coinDialogTitle: $("#coinDialogTitle"), coinDialogMatchup: $("#coinDialogMatchup"), coin: $("#coin"), coinResultText: $("#coinResultText"),
  coinCountdownWrap: $("#coinCountdownWrap"), coinCountdown: $("#coinCountdown"), coinCountdownBar: $("#coinCountdownBar"), coinReflipPlayerWrap: $("#coinReflipPlayerWrap"), coinReflipPlayer: $("#coinReflipPlayer"), coinReflip: $("#coinReflip"), coinReflipHelp: $("#coinReflipHelp"),
  deckCount: $("#deckCount"), discardCount: $("#discardCount"), selectionHelp: $("#selectionHelp"),
  guessWrap: $("#guessWrap"), coinGuess: $("#coinGuess"), drawButton: $("#drawButton"), playButton: $("#playButton"),
  validateChallenge: $("#validateChallenge"), discardButton: $("#discardButton"), clearButton: $("#clearButton"), baaButton: $("#baaButton"), hand: $("#hand"), handTitleText: $("#handTitleText"), handCount: $("#handCount"), leaveGame: $("#leaveGame"),
  debugPlayerCount: $("#debugPlayerCount"), startDebug: $("#startDebug"), debugPerspectiveWrap: $("#debugPerspectiveWrap"), debugPerspective: $("#debugPerspective"), debugActorWrap: $("#debugActorWrap"), debugActor: $("#debugActor"),
  discardDialog: $("#discardDialog"), discardCards: $("#discardCards"), discardHelp: $("#discardHelp"), confirmRecoverSelection: $("#confirmRecoverSelection"),
  challengeSelectionDialog: $("#challengeSelectionDialog"), challengeSelectionTitle: $("#challengeSelectionTitle"), challengeSelectionHelp: $("#challengeSelectionHelp"),
  challengeSelectionSheep: $("#challengeSelectionSheep"), confirmChallengeSelection: $("#confirmChallengeSelection"),
  yoinkDialog: $("#yoinkDialog"), yoinkHelp: $("#yoinkHelp"), yoinkCards: $("#yoinkCards"), confirmYoinkSelection: $("#confirmYoinkSelection"),
  gameOverDialog: $("#gameOverDialog"), gameOverTitle: $("#gameOverTitle"), gameOverSummary: $("#gameOverSummary"), gameOverRanking: $("#gameOverRanking"),
  playAgainButton: $("#playAgainButton"), gameOverLeaveButton: $("#gameOverLeaveButton"), floatingTooltip: $("#floatingTooltip")
};


const BASIC_COLORS = ["white", "orange", "magenta", "cyan", "yellow", "lime", "pink", "grey", "beige", "mint", "purple", "blue", "brown", "green", "red", "black"];
const COLORS = {
  white: "#f7f4e8", orange: "#ef7b32", magenta: "#df4f91", cyan: "#28bdd2", yellow: "#f3c847", lime: "#9acb45",
  pink: "#f29abb", grey: "#858b8b", beige: "#dbc49a", mint: "#8fd4b6", purple: "#8358a6", blue: "#3f73b8",
  brown: "#875a3c", green: "#4f9b59", red: "#dc5047", black: "#383d40", rainbow: "linear-gradient(135deg,#e64b45,#f1c84a,#64ad65,#49aaca,#8a62ae)"
};
const CHALLENGES = ["lure2", "yoinkHand", "halve2", "remove2", "recover1"];
const CARD_NAMES = {
  paint: "Paint", franken: "Franken", yoink: "Yoink!", wheat: "Wheat", wolf: "Wolf", reflip: "Re-Flip",
  lure2: "Challenge: Lure 2", yoinkHand: "Challenge: Yoink hand", halve2: "Challenge: Halve 2",
  remove2: "Challenge: Remove 2", recover1: "Challenge: Recover 1"
};
const SYMBOLS = { head: "🐑", butt: "☁️", paint: "🎨", franken: "⚡", yoink: "✋", wheat: "🌾", wolf: "🐺", reflip: "🔁", challenge: "🪙" };
const CARD_DESCRIPTIONS = {
  paint: "Join one head and one butt of different non-rainbow colours.",
  franken: "Join two heads or two butts. Double heads protect against Wolf; double butts protect against Wheat.",
  yoink: "Choose an opponent, then choose up to two face-down cards from their hand.",
  wheat: "Choose an opponent's sheep and move it to your field unless their flock is protected.",
  wolf: "Choose an opponent's sheep and discard it unless their flock is protected.",
  reflip: "During a challenge countdown, discard this card to toss the coin again and restart the timer.",
  lure2: "Challenge an opponent. The winner moves up to two sheep from the loser into their own field.",
  yoinkHand: "Challenge an opponent. The winner takes the loser's entire hand.",
  halve2: "Challenge an opponent. Choose up to two sheep and choose the head or butt you want from each. The winner also takes attached modifiers.",
  remove2: "Challenge an opponent. The winner removes up to two sheep from the loser's field.",
  recover1: "Challenge an opponent. Select discarded cards that form one valid sheep; the winner places it in their field."
};

const state = {
  peer: null, room: null, peerId: "", joined: false, roomName: "", name: "", members: [], players: new Map(),
  hostId: "", snapshot: null, server: null, selectedCards: [], selectedSheep: [], selectedHalves: {}, selectedDiscard: [], selectedYoink: [], selectedTarget: "", challengeSelectionKey: "", notice: "", error: false,
  joinOrder: [], joinedAt: 0, helloTimer: null, resolveTimer: null, coinDisplayTimer: null, coinCountdownTimer: null, lastCoinTossKey: "", lastCueId: "", audioContext: null, debug: false, debugPlayerId: ""
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const uid = () => crypto.randomUUID();
const shuffle = (array) => { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; };
const send = (message) => state.room?.sendMessage(JSON.stringify({ app: "sheep-game-v1", ...message }));
const activePlayerId = () => state.debug ? state.debugPlayerId : state.peerId;
const me = () => state.snapshot?.players.find((player) => player.id === activePlayerId());
const currentPlayer = () => state.snapshot?.players[state.snapshot.turnIndex];
const isHost = () => state.debug || state.hostId === state.peerId;
const isMyTurn = () => currentPlayer()?.id === activePlayerId();

function makeCard(kind, side, color = null, effect = null) { return { id: uid(), kind, side, color, effect }; }
function makeDeck() {
  const deck = [];
  for (const color of BASIC_COLORS) {
    deck.push(makeCard("sheep", "head", color), makeCard("sheep", "butt", color));
  }
  // Two complete rainbow sheep: 2 heads and 2 butts.
  for (let i = 0; i < 2; i++) {
    deck.push(makeCard("sheep", "head", "rainbow"), makeCard("sheep", "butt", "rainbow"));
  }
  for (let i = 0; i < 2; i++) deck.push(makeCard("modifier", "paint"), makeCard("modifier", "franken"));
  for (let i = 0; i < 2; i++) deck.push(makeCard("action", "yoink"));
  for (let i = 0; i < 3; i++) deck.push(makeCard("action", "wheat"));
  for (let i = 0; i < 2; i++) deck.push(makeCard("action", "wolf"), makeCard("action", "reflip"));
  for (const effect of CHALLENGES) deck.push(makeCard("challenge", "challenge", null, effect));
  return shuffle(deck);
}

function makeSheep(cards) {
  const halves = cards.filter((card) => card.kind === "sheep");
  const modifiers = cards.filter((card) => card.kind === "modifier");
  if (halves.length !== 2 || modifiers.length > 1 || cards.length !== halves.length + modifiers.length) return null;
  const modifier = modifiers[0] || null;
  const heads = halves.filter((card) => card.side === "head");
  const butts = halves.filter((card) => card.side === "butt");
  if (!modifier && heads.length === 1 && butts.length === 1 && (heads[0].color === butts[0].color || heads[0].color === "rainbow" || butts[0].color === "rainbow")) {
    return { id: uid(), cards: [heads[0], butts[0]], modifier: null, type: heads[0].color === "rainbow" && butts[0].color === "rainbow" ? "Full rainbow" : "Sheep" };
  }
  if (modifier?.side === "paint" && heads.length === 1 && butts.length === 1 && heads[0].color !== "rainbow" && butts[0].color !== "rainbow" && heads[0].color !== butts[0].color) {
    return { id: uid(), cards: [heads[0], butts[0]], modifier, type: "Painted" };
  }
  if (modifier?.side === "franken" && modifiers.length === 1 && (heads.length === 2 || butts.length === 2)) {
    return { id: uid(), cards: halves, modifier, type: heads.length === 2 ? "Double-headed" : "Double-butted" };
  }
  return null;
}

function cardLabel(card) {
  if (card.kind === "sheep") return `${card.color} ${card.side}`;
  if (card.kind === "challenge") return CARD_NAMES[card.effect];
  return CARD_NAMES[card.side] || card.side;
}
function cardSymbol(card) { return SYMBOLS[card.side] || "🃏"; }
function titleCase(value) { return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function cardDetails(card) {
  if (card.kind === "sheep") {
    const pairing = card.color === "rainbow" ? "Rainbow is wild and can pair with any opposite half." : "Pair with an opposite half of the same colour, or use a valid modifier.";
    return `${titleCase(card.color)} ${titleCase(card.side)} — Sheep half\n${pairing}`;
  }
  const key = card.kind === "challenge" ? card.effect : card.side;
  const category = card.kind === "challenge" ? "Challenge card" : card.kind === "modifier" ? "Modifier card" : "Action card";
  return `${cardLabel(card)} — ${category}\n${CARD_DESCRIPTIONS[key] || "Use this card as part of a valid move."}`;
}
function sheepDetails(sheep) {
  const halves = sheep.cards.map((card) => `${titleCase(card.color)} ${card.side}`).join(" + ");
  const modifier = sheep.modifier ? `\nModifier: ${CARD_NAMES[sheep.modifier.side]} — ${CARD_DESCRIPTIONS[sheep.modifier.side]}` : "\nModifier: none";
  return `${sheep.type} sheep — ${sheepScore(sheep)} point${sheepScore(sheep) === 1 ? "" : "s"}\nHalves: ${halves}${modifier}`;
}
function cardBackground(card) { return card.color ? COLORS[card.color] : card.kind === "challenge" ? "#f6ce69" : card.kind === "action" ? "#f1a892" : "#cfdac0"; }
function cardTextColor(card) { return card.color === "black" ? "#ffffff" : "#183a31"; }
function sheepScore(sheep) { return sheep.cards.every((card) => card.color === "rainbow") ? 2 : 1; }
function playerScore(player) { return player.field.reduce((sum, sheep) => sum + sheepScore(sheep), 0) - player.challengeCount * 3; }
function hasProtection(player, action) {
  return player.field.some((sheep) => sheep.modifier?.side === "franken" && (action === "wheat" ? sheep.cards.every((card) => card.side === "butt") : sheep.cards.every((card) => card.side === "head")));
}

function ensureAudio() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return null;
  if (!state.audioContext) state.audioContext = new AudioEngine();
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}
function playTone(frequency, duration, type = "sine", delay = 0, gain = .12) {
  const audio = ensureAudio();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  const start = audio.currentTime + delay;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(gain, start); volume.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(volume); volume.connect(audio.destination); oscillator.start(start); oscillator.stop(start + duration);
}
function playSound(cue) {
  if (!cue) return;
  if (cue === "turn") { playTone(880, .13); playTone(1175, .2, "sine", .12); }
  if (cue === "error") playTone(125, .28, "sawtooth", 0, .08);
  if (cue === "baa") { playTone(230, .18, "triangle"); playTone(150, .38, "triangle", .14); }
  if (cue === "chime") { playTone(523, .3); playTone(659, .3, "sine", .16); playTone(784, .55, "sine", .32); }
}
function playSnapshotCue(snapshot) {
  const cue = snapshot?.cue;
  if (!cue || cue.id === state.lastCueId) return;
  state.lastCueId = cue.id;
  if (!cue.targetId || cue.targetId === activePlayerId()) playSound(cue.type);
}
function setNotice(text, error = false) { state.notice = text; state.error = error; if (error) playSound("error"); render(); }
function updateHost() {
  if (state.server) return;
  const candidates = [...new Set([state.peerId, ...state.members].filter(Boolean))].filter((id) => state.players.has(id));
  candidates.sort((a, b) => (state.players.get(a)?.joinedAt || Infinity) - (state.players.get(b)?.joinedAt || Infinity) || a.localeCompare(b));
  state.hostId = candidates[0] || state.peerId;
}
function announce() { if (state.joined) send({ type: "HELLO", id: state.peerId, name: state.name, joinedAt: state.joinedAt }); }

function joinRoom() {
  const name = els.name.value.trim().slice(0, 20);
  const roomName = els.roomName.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  if (!name || !roomName) return setNotice("Enter your name and a room code.", true);
  state.name = name; state.roomName = roomName; state.joined = true; state.joinedAt = Date.now();
  state.players.set(state.peerId, { id: state.peerId, name, joinedAt: state.joinedAt });
  if (!state.joinOrder.includes(state.peerId)) state.joinOrder.push(state.peerId);
  state.room = state.peer.joinRoom(`its-that-sheep-${roomName}`);
  state.room.onMessage(onMessage);
  state.room.onMembers((members) => { state.members = members; updateHost(); announce(); render(); });
  announce();
  clearInterval(state.helloTimer); state.helloTimer = setInterval(announce, 5000);
  setNotice("Room joined. Ask your friends to use the same room code.");
}

function onMessage(raw, senderId) {
  let message;
  try { message = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return; }
  if (!message || message.app !== "sheep-game-v1") return;
  if (message.type === "HELLO") {
    const previous = state.players.get(senderId);
    const joinedAt = Number(message.joinedAt) || previous?.joinedAt || Date.now();
    state.players.set(senderId, { id: senderId, name: String(message.name || "Shepherd").slice(0, 20), joinedAt });
    if (!state.joinOrder.includes(senderId)) state.joinOrder.push(senderId);
    state.joinOrder.sort((a, b) => (state.players.get(a)?.joinedAt || Infinity) - (state.players.get(b)?.joinedAt || Infinity) || a.localeCompare(b));
    updateHost();
    if (isHost() && state.server) broadcastState();
    render(); return;
  }
  if (message.type === "STATE" && (!message.target || message.target === state.peerId)) {
    state.hostId = message.hostId; state.snapshot = message.snapshot; state.notice = message.snapshot.notice || state.notice; state.error = Boolean(message.snapshot.noticeError);
    state.selectedCards = state.selectedCards.filter((id) => state.snapshot.hand.some((card) => card.id === id));
    state.selectedDiscard = state.selectedDiscard.filter((id) => state.snapshot.discard.some((card) => card.id === id));
    playSnapshotCue(state.snapshot); render(); return;
  }
  if (message.type === "COMMAND" && isHost() && state.server) handleCommand(senderId, message.command, message.data || {});
}

function startGame() {
  if (!isHost()) return;
  const eligibleIds = new Set([...state.members, state.peerId]);
  const roster = [...state.players.values()].filter((player) => eligibleIds.has(player.id)).sort((a, b) => (a.joinedAt || Infinity) - (b.joinedAt || Infinity) || a.id.localeCompare(b.id)).slice(0, 4);
  if (roster.length < 2) return setNotice("You need at least two players.", true);
  createGame(roster);
}

function startDebugGame() {
  const count = Number(els.debugPlayerCount.value);
  const names = ["Dummy Daisy", "Dummy Wooliam", "Dummy Baa-rbara", "Dummy Shaun"];
  const roster = Array.from({ length: count }, (_, index) => ({ id: `debug-${index + 1}`, name: names[index], joinedAt: index + 1 }));
  state.debug = true;
  state.joinOrder = roster.map((player) => player.id);
  state.debugPlayerId = roster[0].id;
  state.debugReflipPlayerId = roster[0].id;
  state.joined = false;
  state.room = null;
  state.hostId = roster[0].id;
  state.players = new Map(roster.map((player) => [player.id, player]));
  createGame(roster);
}

function createGame(roster) {
  const deck = makeDeck();
  state.selectedCards = []; state.selectedSheep = []; state.selectedHalves = {}; state.selectedDiscard = []; state.selectedYoink = []; state.selectedTarget = ""; state.challengeSelectionKey = ""; state.lastCoinTossKey = "";
  const players = roster.map((player) => ({ id: player.id, name: player.name, hand: [], field: [] }));
  for (let round = 0; round < 5; round++) for (const player of players) player.hand.push(deck.pop());
  state.server = { phase: "playing", hostId: state.hostId || state.peerId, players, deck, discard: [], turnIndex: 0, drawn: false, challengePlayed: false, pending: null, pendingSelection: null, coinResult: null, finalTurns: null, notice: `${players[0].name} goes first.`, noticeError: false, cue: { id: uid(), type: "turn", targetId: players[0].id } };
  broadcastState();
}

function snapshotFor(playerId) {
  const game = state.server;
  const pendingSelection = game.pendingSelection?.effect === "yoink" && game.pendingSelection.winnerId === playerId
    ? { ...game.pendingSelection, cardIds: findServerPlayer(game.pendingSelection.victimId)?.hand.map((card) => card.id) || [] }
    : game.pendingSelection?.effect === "yoink"
      ? { effect: "yoink", winnerId: game.pendingSelection.winnerId, victimId: game.pendingSelection.victimId }
      : game.pendingSelection;
  return {
    phase: game.phase, turnIndex: game.turnIndex, drawn: game.drawn, challengePlayed: game.challengePlayed, pending: game.pending, pendingSelection,
    coinResult: game.coinResult, finalTurns: game.finalTurns, deckCount: game.deck.length, discardCount: game.discard.length, notice: game.notice, noticeError: Boolean(game.noticeError), cue: game.cue,
    hand: game.players.find((player) => player.id === playerId)?.hand || [],
    discard: game.pendingSelection?.effect === "recover1" && game.pendingSelection.winnerId === playerId ? game.discard : [],
    players: game.players.map((player) => ({ id: player.id, name: player.name, field: player.field, handCount: player.hand.length, challengeCount: player.hand.filter((card) => card.kind === "challenge").length }))
  };
}
function broadcastState() {
  if (!state.server) return;
  if (!state.debug) for (const player of state.server.players) send({ type: "STATE", hostId: state.hostId, target: player.id, snapshot: snapshotFor(player.id) });
  state.snapshot = snapshotFor(activePlayerId()); state.notice = state.server.notice; state.error = Boolean(state.server.noticeError); playSnapshotCue(state.snapshot); render();
}
function command(command, data = {}) { const senderId = activePlayerId(); if (!state.server || !isHost()) send({ type: "COMMAND", command, data }); else handleCommand(senderId, command, data); }
function findServerPlayer(id) { return state.server.players.find((player) => player.id === id); }
function removeCards(hand, ids) { const cards = hand.filter((card) => ids.includes(card.id)); if (cards.length !== ids.length) return null; for (const id of ids) hand.splice(hand.findIndex((card) => card.id === id), 1); return cards; }
function findSheepRef(id) { for (const player of state.server.players) { const index = player.field.findIndex((sheep) => sheep.id === id); if (index >= 0) return { player, index, sheep: player.field[index] }; } return null; }

function handleCommand(senderId, type, data) {
  const game = state.server; const actor = findServerPlayer(senderId); if (!actor) return;
  if (type === "PLAY_AGAIN" && game.phase === "finished") { if (senderId !== game.hostId) return hostNotice("Only the room host can start another game.", true); return createGame(game.players.map(({ id, name }) => ({ id, name }))); }
  if (game.phase !== "playing") return;
  const current = game.players[game.turnIndex];
  if (type === "REFLIP") return playReflip(actor, data);
  if (type === "CHALLENGE_SELECTION") return completeChallengeSelection(actor, data);
  if (senderId !== current.id) return hostNotice("It is not your turn.", true);
  if (game.pending || game.pendingSelection) return hostNotice("Finish resolving the challenge first.", true, senderId);
  if (type === "DRAW") {
    if (game.drawn) return hostNotice("You already drew this turn.", true);
    const amount = Math.max(1, 3 - actor.hand.length); let drawn = 0;
    while (drawn < amount && game.deck.length) { actor.hand.push(game.deck.pop()); drawn++; }
    game.drawn = true;
    if (!game.deck.length && game.finalTurns === null) game.finalTurns = game.players.length;
    return hostNotice(drawn ? `${actor.name} drew ${drawn} card${drawn === 1 ? "" : "s"}.` : "The draw pile is empty. Finish your last turn.");
  }
  if (!game.drawn && game.deck.length) return hostNotice("Draw before playing cards.", true);
  if (type === "PLAY") return playCards(actor, data);
  if (type === "DISCARD") return discardCards(actor, data);
  if (type === "BAA") {
    if (actor.hand.length > 7) return hostNotice(`${actor.name} must discard down to 7 cards.`, true);
    if (game.finalTurns !== null) { game.finalTurns--; if (game.finalTurns <= 0) return finishGame(); }
    game.turnIndex = (game.turnIndex + 1) % game.players.length; game.drawn = false; game.challengePlayed = false;
    if (state.debug) state.debugPlayerId = game.players[game.turnIndex].id;
    game.cue = { id: uid(), type: "baa" };
    hostNotice(`${actor.name} says “Baa!” ${game.players[game.turnIndex].name}'s turn.`);
    setTimeout(() => { if (state.server?.phase === "playing" && state.server.players[state.server.turnIndex]?.id === game.players[game.turnIndex].id) { state.server.cue = { id: uid(), type: "turn", targetId: game.players[game.turnIndex].id }; broadcastState(); } }, 450);
    return;
  }
}

function discardCards(actor, data) {
  const game = state.server; const ids = Array.isArray(data.cardIds) ? data.cardIds : [];
  if (actor.hand.length <= 7) return hostNotice("You only discard when you have more than 7 cards.", true);
  const cards = actor.hand.filter((card) => ids.includes(card.id));
  if (!cards.length) return hostNotice("Select at least one card to discard.", true);
  const amountNeeded = actor.hand.length - 7;
  if (cards.length > amountNeeded) return hostNotice(`Discard no more than ${amountNeeded} card${amountNeeded === 1 ? "" : "s"}.`, true, actor.id);
  const removed = removeCards(actor.hand, ids); if (!removed) return hostNotice("That selection is no longer available.", true, actor.id);
  game.discard.push(...removed); return hostNotice(`${actor.name} discarded ${removed.length} card${removed.length === 1 ? "" : "s"}.`);
}

function playCards(actor, data) {
  const game = state.server; const ids = Array.isArray(data.cardIds) ? data.cardIds : [];
  const cards = actor.hand.filter((card) => ids.includes(card.id));
  const target = findServerPlayer(data.targetId); const sheepRef = findSheepRef(data.sheepIds?.[0]);
  const built = makeSheep(cards);
  if (built) { removeCards(actor.hand, ids); actor.field.push(built); return hostNotice(`${actor.name} added a ${built.type.toLowerCase()} sheep.`); }
  if (cards.length === 1 && cards[0].kind === "sheep" && sheepRef) return bodySwap(actor, cards[0], sheepRef);
  if (cards.length !== 1) return hostNotice("Select a valid sheep, one action, or one challenge card.", true, actor.id);
  const card = cards[0];
  if (card.kind === "action") {
    if (card.side === "reflip") return hostNotice("Re-Flip can only be used while a challenge coin is waiting.", true, actor.id);
    if (!target || target.id === actor.id) return hostNotice("Choose an opponent by clicking their field.", true, actor.id);
    if (card.side === "yoink") {
      const removedAction = removeCards(actor.hand, ids);
      if (!removedAction) return hostNotice("That Yoink card is no longer available.", true, actor.id);
      game.discard.push(removedAction[0]);
      const count = Math.min(2, target.hand.length);
      if (!count) return hostNotice(`${target.name} has no cards to yoink.`, true, actor.id);
      game.pendingSelection = { effect: "yoink", winnerId: actor.id, victimId: target.id };
      if (state.debug) state.debugPlayerId = actor.id;
      return hostNotice(`${actor.name} must choose ${count} face-down card${count === 1 ? "" : "s"} from ${target.name}.`);
    }
    if (!["wheat", "wolf"].includes(card.side)) return hostNotice("That action is not available.", true, actor.id);
    if (!target || target.id === actor.id || !sheepRef || sheepRef.player.id !== target.id) return hostNotice("Choose one sheep in an opponent's field.", true, actor.id);
    if (hasProtection(target, card.side)) return hostNotice(`${target.name}'s FrankenSheep protects the whole flock.`, true, actor.id);
    const removedAction = removeCards(actor.hand, ids);
    if (!removedAction) return hostNotice("That action card is no longer available.", true, actor.id);
    const sheep = sheepRef.player.field.splice(sheepRef.index, 1)[0];
    if (!sheep) return hostNotice("That sheep is no longer available.", true, actor.id);
    game.discard.push(removedAction[0]);
    if (card.side === "wheat") {
      actor.field.push(sheep);
      return hostNotice(`${actor.name} used Wheat and moved one sheep from ${target.name}'s field.`);
    }
    game.discard.push(...sheep.cards, ...(sheep.modifier ? [sheep.modifier] : []));
    return hostNotice(`${actor.name}'s wolf removed a sheep from ${target.name}.`);
  }
  if (card.kind === "challenge") {
    if (game.challengePlayed) return hostNotice("Only one challenge can be played per turn.", true, actor.id);
    if (!target || target.id === actor.id) return hostNotice("Choose an opponent for the challenge.", true, actor.id);
    const sheepIds = Array.isArray(data.sheepIds) ? data.sheepIds : [];
    const halfChoices = data.halfChoices && typeof data.halfChoices === "object" ? data.halfChoices : {};
    const discardIds = Array.isArray(data.discardIds) ? data.discardIds : [];
    game.challengePlayed = true;
    game.coinResult = null;
    game.pending = { cardId: card.id, effect: card.effect, actorId: actor.id, targetId: target.id, guess: data.guess === "butt" ? "butt" : "head", coin: Math.random() < .5 ? "head" : "butt", tossId: uid(), sheepIds, halfChoices, discardIds, resolvesAt: Date.now() + 5000 };
    scheduleChallenge(); return hostNotice(`${actor.name} challenged ${target.name}. Re-Flip cards may be played for 5 seconds…`);
  }
  hostNotice("Those cards do not make a valid move.", true, actor.id);
}

function bodySwap(actor, handCard, ref) {
  const sheep = ref.sheep;
  // Keep the field half whose colour matches the played card. The played card
  // must provide the opposite body side, creating a normal two-colour match.
  const keptIndex = sheep.cards.findIndex((fieldCard) => fieldCard.color === handCard.color && fieldCard.side !== handCard.side);
  if (keptIndex < 0) return hostNotice("BodySwap needs a hand card matching the colour of the opposite sheep half.", true, actor.id);

  const keptCard = sheep.cards[keptIndex];
  const returnedCard = sheep.cards[keptIndex === 0 ? 1 : 0];
  const replacement = makeSheep([keptCard, handCard]);
  if (!replacement) return hostNotice("Those halves do not make a valid sheep.", true, actor.id);

  const handIndex = actor.hand.findIndex((card) => card.id === handCard.id);
  if (handIndex < 0) return hostNotice("That hand card is no longer available.", true, actor.id);
  actor.hand.splice(handIndex, 1);
  actor.hand.push(returnedCard);
  if (sheep.modifier) actor.hand.push(sheep.modifier);

  replacement.id = sheep.id;
  ref.player.field[ref.index] = replacement;
  hostNotice(`${actor.name} BodySwapped a sheep in ${ref.player.name}'s field and took the other half${sheep.modifier ? " and modifier" : ""}.`);
}

function playReflip(actor, data) {
  console.debug("playReflip invoked for actor", actor?.id, "data:", data);
  const game = state.server; if (!game.pending) return hostNotice("There is no coin to re-flip.", true, actor.id);
  if (Date.now() >= game.pending.resolvesAt) return hostNotice("The Re-Flip window has closed.", true, actor.id);
  const cardId = Array.isArray(data.cardIds) ? data.cardIds[0] : null;
  console.debug("playReflip: looking for cardId", cardId, "in actor.hand", actor.hand.map(c=>c.id));
  const card = actor.hand.find((item) => item.id === cardId && item.kind === "action" && item.side === "reflip");
  if (!card) { console.debug("playReflip: card not found on actor.hand"); return hostNotice("You do not have that Re-Flip card.", true, actor.id); }
  actor.hand.splice(actor.hand.indexOf(card), 1); game.discard.push(card);
  const previousCoin = game.pending.coin;
  game.pending.coin = Math.random() < .5 ? "head" : "butt";
  game.pending.tossId = uid();
  game.pending.resolvesAt = Date.now() + 5000;
  scheduleChallenge(); hostNotice(`${actor.name} played Re-Flip. The coin was tossed again${game.pending.coin === previousCoin ? " and landed on the same side" : ""}.`);
}
function scheduleChallenge() {
  clearTimeout(state.resolveTimer); const wait = Math.max(0, state.server.pending.resolvesAt - Date.now());
  state.resolveTimer = setTimeout(resolveChallenge, wait + 50); broadcastState();
}
function resolveChallenge() {
  const game = state.server; const pending = game?.pending; if (!pending) return;
  const challenger = findServerPlayer(pending.actorId); const opponent = findServerPlayer(pending.targetId); if (!challenger || !opponent) return;
  const success = pending.guess === pending.coin; const winner = success ? challenger : opponent; const victim = success ? opponent : challenger;
  const challengeCard = challenger.hand.find((card) => card.id === pending.cardId); if (challengeCard) { challenger.hand.splice(challenger.hand.indexOf(challengeCard), 1); game.discard.push(challengeCard); }
  const needsFieldSelection = ["lure2", "halve2", "remove2"].includes(pending.effect) && victim.field.length > 0;
  const needsRecoverSelection = pending.effect === "recover1" && canMakeRecoverableSheep(game.discard);
  const needsSelection = needsFieldSelection || needsRecoverSelection;
  if (needsSelection) {
    game.pendingSelection = { effect: pending.effect, winnerId: winner.id, victimId: victim.id };
    if (state.debug) state.debugPlayerId = winner.id;
  } else {
    applyChallenge(pending.effect, winner, victim, pending.sheepIds, pending.halfChoices || {}, pending.discardIds || []);
  }
  game.notice = `The coin showed ${pending.coin === "head" ? "a looking sheep" : "a sheep butt"}. ${winner.name} won the challenge${needsSelection ? pending.effect === "recover1" ? " and must choose cards from the discard pile." : " and must choose the sheep." : "."}`;
  game.noticeError = false;
  game.coinResult = { face: pending.coin, visibleUntil: Date.now() + 1800 };
  game.pending = null; broadcastState();
}
function completeChallengeSelection(actor, data) {
  const game = state.server; const pending = game.pendingSelection;
  if (!pending || actor.id !== pending.winnerId) return hostNotice("Only the challenge winner can make this selection.", true, actor.id);
  const victim = findServerPlayer(pending.victimId); if (!victim) return hostNotice("That player is no longer available.", true, actor.id);
  const selectedIds = Array.isArray(data.sheepIds) ? [...new Set(data.sheepIds)] : [];
  const halfChoices = data.halfChoices && typeof data.halfChoices === "object" ? data.halfChoices : {};
  const discardIds = Array.isArray(data.discardIds) ? [...new Set(data.discardIds)] : [];
  if (pending.effect === "recover1") {
    const recovered = makeSheep(game.discard.filter((card) => discardIds.includes(card.id)));
    if (!recovered) return hostNotice("Choose cards that form one valid sheep.", true, actor.id);
    applyChallenge(pending.effect, actor, victim, [], {}, discardIds);
  } else if (pending.effect === "yoink") {
    const cardIds = Array.isArray(data.cardIds) ? [...new Set(data.cardIds)] : [];
    const required = Math.min(2, victim.hand.length);
    if (cardIds.length !== required || !cardIds.every((id) => victim.hand.some((card) => card.id === id))) return hostNotice(`Choose ${required} face-down card${required === 1 ? "" : "s"}.`, true, actor.id);
    const acquired = removeCards(victim.hand, cardIds);
    if (!acquired) return hostNotice("Those cards are no longer available.");
    actor.hand.push(...acquired);
  } else {
    const required = Math.min(2, victim.field.length);
    const chosen = victim.field.filter((sheep) => selectedIds.includes(sheep.id));
    if (chosen.length !== required) return hostNotice(`Choose ${required} sheep${required === 1 ? "" : "s"}.`, true, actor.id);
    if (pending.effect === "halve2" && !chosen.every((sheep) => sheep.cards.some((card) => card.id === halfChoices[sheep.id]))) return hostNotice("Choose the head or butt to take from each sheep.", true, actor.id);
    applyChallenge(pending.effect, actor, victim, selectedIds, halfChoices);
  }
  game.pendingSelection = null;
  return hostNotice(pending.effect === "yoink" ? `${actor.name} acquired the selected cards from ${victim.name}.` : `${actor.name} completed the ${CARD_NAMES[pending.effect].replace("Challenge: ", "")} challenge.`);
}
function applyChallenge(effect, winner, victim, selectedIds, halfChoices = {}, discardIds = []) {
  const game = state.server;
  if (effect === "yoinkHand") { winner.hand.push(...victim.hand.splice(0)); return; }
  if (effect === "recover1") {
    const selectedCards = game.discard.filter((card) => discardIds.includes(card.id));
    const recovered = makeSheep(selectedCards);
    if (recovered) {
      for (const id of discardIds) {
        const index = game.discard.findIndex((card) => card.id === id);
        if (index >= 0) game.discard.splice(index, 1);
      }
      winner.field.push(recovered);
    }
    return;
  }
  const chosen = selectedIds.map((id) => victim.field.find((sheep) => sheep.id === id)).filter(Boolean);
  const sheepList = [...chosen, ...victim.field.filter((sheep) => !chosen.includes(sheep))].slice(0, 2);
  for (const sheep of sheepList) {
    const index = victim.field.findIndex((item) => item.id === sheep.id); if (index < 0) continue; victim.field.splice(index, 1);
    if (effect === "lure2") winner.field.push(sheep);
    if (effect === "remove2") game.discard.push(...sheep.cards, ...(sheep.modifier ? [sheep.modifier] : []));
    if (effect === "halve2") {
      const chosenCardId = halfChoices[sheep.id];
      const winnerCard = sheep.cards.find((card) => card.id === chosenCardId);
      const victimCard = sheep.cards.find((card) => card.id !== chosenCardId);
      if (!winnerCard || !victimCard) continue;
      winner.hand.push(winnerCard);
      victim.hand.push(victimCard);
      if (sheep.modifier) winner.hand.push(sheep.modifier);
    }
  }
}
function canMakeRecoverableSheep(discard) {
  for (let a = 0; a < discard.length; a++) for (let b = a + 1; b < discard.length; b++) {
    if (makeSheep([discard[a], discard[b]])) return true;
    for (let c = b + 1; c < discard.length; c++) if (makeSheep([discard[a], discard[b], discard[c]])) return true;
  }
  return false;
}
function findRecoverableSheep(discard) {
  for (let a = 0; a < discard.length; a++) for (let b = a + 1; b < discard.length; b++) {
    const pair = [discard[a], discard[b]]; let sheep = makeSheep(pair);
    if (sheep) { discard.splice(b, 1); discard.splice(a, 1); return sheep; }
    for (let c = 0; c < discard.length; c++) if (c !== a && c !== b) { sheep = makeSheep([...pair, discard[c]]); if (sheep) { for (const index of [a, b, c].sort((x, y) => y - x)) discard.splice(index, 1); return sheep; } }
  }
  return null;
}
function hostNotice(text, error = false, targetId = null) {
  state.server.notice = text;
  state.server.noticeError = error;
  if (error) state.server.cue = { id: uid(), type: "error", targetId: targetId || state.server.players[state.server.turnIndex]?.id };
  broadcastState();
}
function finishGame() {
  const game = state.server; game.phase = "finished"; game.pending = null; game.pendingSelection = null;
  const ranked = [...game.players].sort((a, b) => finalScore(b) - finalScore(a));
  game.notice = `${ranked[0].name} wins with ${finalScore(ranked[0])} points!`;
  game.noticeError = false;
  game.cue = { id: uid(), type: "baa" };
  broadcastState();
  setTimeout(() => { if (state.server?.phase === "finished") { state.server.cue = { id: uid(), type: "chime" }; broadcastState(); } }, 450);
}
function finalScore(player) { return player.field.reduce((sum, sheep) => sum + sheepScore(sheep), 0) - player.hand.filter((card) => card.kind === "challenge").length * 3; }

function render() {
  els.loading.classList.toggle("hidden", Boolean(state.peer));
  els.lobby.classList.toggle("hidden", !state.peer || Boolean(state.snapshot));
  els.game.classList.toggle("hidden", !state.snapshot);
  if (!state.peer) return;
  if (!state.snapshot) renderLobby(); else renderGame();
}
function renderLobby() {
  const visible = [...state.players.values()].filter((player) => !state.joined || state.members.includes(player.id) || player.id === state.peerId);
  els.playerCount.textContent = `${visible.length}/4`;
  els.players.innerHTML = visible.length ? visible.map((player) => `<li><span>${esc(player.name)} ${player.id === state.peerId ? "(you)" : ""}</span><span>${player.id === state.hostId ? "👑 Host" : "🐑"}</span></li>`).join("") : "<li>Join a room to find your flock.</li>";
  els.lobbyNotice.textContent = state.notice || (state.joined ? "Waiting for players…" : "Choose the same room code as your friends.");
  els.lobbyNotice.classList.toggle("error", state.error);
  els.joinRoom.disabled = state.joined; els.name.disabled = state.joined; els.roomName.disabled = state.joined;
  els.startGame.disabled = !state.joined || !isHost() || visible.length < 2 || visible.length > 4;
  els.startHelp.textContent = isHost() ? "Start when 2–4 players have joined." : "The room host can start with 2–4 players.";
}
function renderGame() {
  const game = state.snapshot; const current = currentPlayer(); const myTurn = isMyTurn();
  els.turnTitle.textContent = game.phase === "finished"
    ? "Game over"
    : state.debug
      ? `${current?.name || "Another shepherd"}'s turn`
      : myTurn
        ? "Your turn"
        : `${current?.name || "Another shepherd"}'s turn`;
  els.gameNotice.textContent = state.notice || game.notice || "Build the biggest flock."; els.gameNotice.classList.toggle("error", state.error);
  const selected = game.hand.filter((card) => state.selectedCards.includes(card.id));
  const challengeSelected = selected.length === 1 && selected[0].kind === "challenge";
  const yoinkSelected = selected.length === 1 && selected[0].side === "yoink";
  const turnReady = game.drawn || game.deckCount === 0;
  const choosingChallengeTarget = challengeSelected && myTurn && turnReady && !game.pending && !game.pendingSelection && game.phase === "playing";
  const choosingOpponentTarget = (challengeSelected || yoinkSelected) && myTurn && turnReady && !game.pending && !game.pendingSelection && game.phase === "playing";
  els.statusPills.innerHTML = game.players.map((player, index) => {
    const isOpponent = player.id !== activePlayerId();
    const classes = ["pill", index === game.turnIndex && game.phase === "playing" ? "turn" : "", choosingOpponentTarget && isOpponent ? "targetable" : "", choosingOpponentTarget && state.selectedTarget === player.id ? "selected-target" : ""].filter(Boolean).join(" ");
    const label = esc(player.name);
    return choosingOpponentTarget && isOpponent ? `<button class="${classes}" data-challenge-target="${esc(player.id)}">${label}</button>` : `<span class="${classes}">${label}</span>`;
  }).join("");
  els.fields.innerHTML = game.players.map((player) => `<section class="field ${player.id === activePlayerId() ? "me" : ""}" data-player-id="${esc(player.id)}"><header><div class="field-player-line"><strong>${esc(player.name)} ${player.id === activePlayerId() ? "(you)" : ""}</strong><span class="field-hand-count">${player.handCount} card${player.handCount === 1 ? "" : "s"} in hand</span></div>${game.phase === "finished" ? `<span class="field-score">${playerScore(player)} pts</span>` : ""}</header><div class="flock">${player.field.length ? player.field.map((sheep) => sheepHtml(sheep, player.id)).join("") : "<span class='muted'>No sheep yet.</span>"}</div></section>`).join("");
  els.debugPerspectiveWrap.classList.toggle("hidden", !state.debug);
  els.debugActorWrap.classList.toggle("hidden", !state.debug);
  if (state.debug) {
    els.debugPerspective.innerHTML = state.server.players.map((player) => `<option value="${esc(player.id)}" ${player.id === state.debugPlayerId ? "selected" : ""}>${esc(player.name)}</option>`).join("");
    els.debugActor.innerHTML = state.server.players.map((player) => `<option value="${esc(player.id)}" ${player.id === (state.debugReflipPlayerId || state.debugPlayerId) ? "selected" : ""}>${esc(player.name)}</option>`).join("");
  }
  els.deckCount.textContent = `Draw pile: ${game.deckCount}`; els.discardCount.textContent = `Discard: ${game.discardCount}`;
  renderCoinDialog(game);
  renderGameOverDialog(game);
  renderChallengeSelectionDialog(game);
  renderRecoverSelectionDialog(game);
  renderYoinkSelectionDialog(game);
  els.handTitleText.textContent = state.debug ? `${me()?.name || "Selected player"}'s hand` : "Your hand";
  els.handCount.textContent = `(${game.hand.length})`;
  els.hand.innerHTML = game.hand.length ? game.hand.map(cardHtml).join("") : `<span class='muted'>${state.debug ? "This hand" : "Your hand"} is empty.</span>`;
  const canReflip = game.pending && selected.length === 1 && selected[0].side === "reflip";
  els.guessWrap.classList.toggle("hidden", !choosingChallengeTarget);
  els.validateChallenge.classList.toggle("hidden", !choosingChallengeTarget);
  const selectedTargetPlayer = game.players.find((player) => player.id === state.selectedTarget);
  els.validateChallenge.disabled = !state.selectedTarget;
  els.drawButton.disabled = game.phase !== "playing" || !myTurn || game.drawn || game.deckCount === 0 || Boolean(game.pending) || Boolean(game.pendingSelection);
  els.drawButton.title = game.deckCount === 0 ? "The draw pile is empty. You may play immediately." : "Draw cards";
  els.playButton.classList.toggle("hidden", choosingChallengeTarget);
  const selectedActionNeedsSheep = selected.length === 1 && ["wheat", "wolf"].includes(selected[0].side);
  const selectedSheepOwner = game.players.find((player) => player.field.some((sheep) => state.selectedSheep.includes(sheep.id)))?.id;
  const hasValidActionSheep = !selectedActionNeedsSheep || (state.selectedSheep.length === 1 && selectedSheepOwner && selectedSheepOwner !== activePlayerId());
  const hasValidYoinkTarget = !yoinkSelected || Boolean(state.selectedTarget && state.selectedTarget !== activePlayerId());
  // Hand size never prevents playing cards. A player may keep making any
  // valid move, including a FrankenSheep, before ending the turn.
  els.playButton.disabled = game.phase !== "playing" || Boolean(game.pendingSelection) || (!myTurn && !canReflip) || (myTurn && !turnReady) || !selected.length || !hasValidActionSheep || !hasValidYoinkTarget;
  const mustDiscard = game.hand.length > 7;
  els.discardButton.disabled = game.phase !== "playing" || !myTurn || !turnReady || Boolean(game.pending) || Boolean(game.pendingSelection) || !mustDiscard || !selected.length;
  els.discardButton.title = mustDiscard ? "Discard selected cards." : "You only discard when holding more than 7 cards.";
  els.baaButton.disabled = game.phase !== "playing" || !myTurn || !turnReady || Boolean(game.pending) || Boolean(game.pendingSelection) || mustDiscard;
  els.baaButton.title = mustDiscard ? "Discard or play cards until you have 7 or fewer." : "End your turn";
  els.playButton.textContent = canReflip ? "Re-flip coin" : "Play selected";
  els.selectionHelp.textContent = selectionMessage(selected, game);
  bindDynamic();
}
function renderCoinDialog(game) {
  const resultVisible = game.coinResult && game.coinResult.visibleUntil > Date.now();
  const shouldShow = Boolean(game.pending || resultVisible);
  clearInterval(state.coinCountdownTimer);
  clearTimeout(state.coinDisplayTimer);
  if (!shouldShow) {
    if (els.coinDialog.open) els.coinDialog.close();
    state.lastCoinTossKey = "";
    return;
  }
  if (!els.coinDialog.open) els.coinDialog.showModal();
  const face = game.pending?.coin || game.coinResult.face;
  const tossKey = game.pending ? game.pending.tossId || `${game.pending.coin}-${game.pending.resolvesAt}` : `result-${game.coinResult.face}-${game.coinResult.visibleUntil}`;
  els.coin.textContent = face === "head" ? "🐑" : "🍑";
  if (state.lastCoinTossKey !== tossKey) {
    state.lastCoinTossKey = tossKey;
    els.coin.classList.remove("tossing");
    void els.coin.offsetWidth;
    els.coin.classList.add("tossing");
  }
  if (game.pending) {
    const challenger = game.players.find((player) => player.id === game.pending.actorId);
    const opponent = game.players.find((player) => player.id === game.pending.targetId);
    // Every player receives the pending challenge in their snapshot, so this
    // modal—and the Re-Flip action—appears for everyone at the table.
    const reflipCardSnapshot = game.hand.find((card) => card.kind === "action" && card.side === "reflip");
    const challengeName = CARD_NAMES[game.pending.effect] || "Challenge";
    const chosenIssue = game.pending.guess === "head" ? "looking sheep (head)" : "sheep butt";
    els.coinDialogTitle.textContent = challengeName;
    els.coinDialogMatchup.textContent = `${challengeName}: ${CARD_DESCRIPTIONS[game.pending.effect]} ${challenger?.name || "A player"} challenged ${opponent?.name || "an opponent"} and chose ${chosenIssue}.`;
    els.coinResultText.textContent = `Coin result: ${face === "head" ? "looking sheep (head)" : "sheep butt"}`;
    els.coinCountdownWrap.classList.remove("hidden");
    // Show a per-dialog actor selector in debug mode so testers can choose which
    // debug player should play the Re-Flip card.
    els.coinReflipPlayerWrap.classList.toggle("hidden", !state.debug);
    if (state.debug) {
      els.coinReflipPlayer.innerHTML = game.players.map((player) => `<option value="${esc(player.id)}" ${player.id === (state.debugReflipPlayerId || state.debugPlayerId) ? "selected" : ""}>${esc(player.name)}</option>`).join("");
      els.coinReflipPlayer.value = state.debugReflipPlayerId || state.debugPlayerId || "";
    }
    // Determine if Re-Flip is available for the active snapshot or for the
    // selected debug actor. Prefer the selected debug actor when present.
    const reflipCardFromHand = game.hand.find((card) => card.kind === "action" && card.side === "reflip");
    let selectedReflipCard = null;
    if (state.debug && state.debugReflipPlayerId && state.server) {
      const serverPlayer = state.server.players.find((p) => p.id === state.debugReflipPlayerId);
      selectedReflipCard = serverPlayer?.hand.find((card) => card.kind === "action" && card.side === "reflip");
    }
    const availableReflip = selectedReflipCard || reflipCardFromHand || reflipCardSnapshot;
    els.coinReflip.classList.remove("hidden");
    els.coinReflip.disabled = !availableReflip;
    const chosenId = selectedReflipCard?.id || reflipCardFromHand?.id || reflipCardSnapshot?.id || "";
    els.coinReflip.dataset.cardId = chosenId;
    els.coinReflip.textContent = "Use Re-Flip now";
    els.coinReflipHelp.textContent = availableReflip ? "Play it directly from this dialog. It is discarded automatically and the coin is tossed again—no separate validation is needed." : "You do not have a Re-Flip card.";
    console.debug("renderCoinDialog: availableReflip:", Boolean(availableReflip), "selectedReflipCardId:", selectedReflipCard?.id, "reflipCardFromHandId:", reflipCardFromHand?.id, "reflipCardSnapshotId:", reflipCardSnapshot?.id, "dataset.cardId:", els.coinReflip.dataset.cardId, "debugReflipPlayerId:", state.debugReflipPlayerId);
    const updateCountdown = () => {
      const remaining = Math.max(0, game.pending.resolvesAt - Date.now());
      els.coinCountdown.textContent = (remaining / 1000).toFixed(1);
      els.coinCountdownBar.style.transform = `scaleX(${Math.min(1, remaining / 5000)})`;
      els.coinReflip.disabled = !availableReflip || remaining <= 0;
    };
    updateCountdown();
    state.coinCountdownTimer = setInterval(updateCountdown, 100);
  } else {
    els.coinDialogTitle.textContent = "Challenge result";
    els.coinDialogMatchup.textContent = game.notice;
    els.coinResultText.textContent = face === "head" ? "Looking sheep (head)" : "Sheep butt";
    els.coinCountdownWrap.classList.add("hidden");
    els.coinReflip.classList.add("hidden");
    els.coinReflipHelp.textContent = "";
    state.coinDisplayTimer = setTimeout(render, Math.max(0, game.coinResult.visibleUntil - Date.now()) + 50);
  }
}
function renderGameOverDialog(game) {
  if (game.phase !== "finished") {
    if (els.gameOverDialog.open) els.gameOverDialog.close();
    return;
  }
  const ranked = [...game.players].sort((a, b) => playerScore(b) - playerScore(a));
  const winner = ranked[0];
  els.gameOverTitle.textContent = `${winner?.name || "A player"} wins!`;
  els.gameOverSummary.textContent = `Final score: ${winner ? playerScore(winner) : 0} points`;
  els.gameOverRanking.innerHTML = ranked.map((player, index) => `<li class="${index === 0 ? "winner" : ""}"><span class="rank-name">${esc(player.name)}${player.id === activePlayerId() ? " (you)" : ""}</span><span class="rank-score">${playerScore(player)} point${playerScore(player) === 1 ? "" : "s"}</span></li>`).join("");
  els.playAgainButton.disabled = !isHost();
  els.playAgainButton.title = isHost() ? "Start a new game with the same players." : "The room host can start another game.";
  if (!els.gameOverDialog.open) els.gameOverDialog.showModal();
}
function renderChallengeSelectionDialog(game) {
  const pending = game.pendingSelection;
  const resultVisible = game.coinResult && game.coinResult.visibleUntil > Date.now();
  const winnerCanChoose = pending && !["recover1", "yoink"].includes(pending.effect) && pending.winnerId === activePlayerId() && !resultVisible;
  if (!winnerCanChoose) {
    if (els.challengeSelectionDialog.open) els.challengeSelectionDialog.close();
    if (!pending) state.challengeSelectionKey = "";
    return;
  }
  const victim = game.players.find((player) => player.id === pending.victimId);
  const selectionKey = `${pending.effect}-${pending.winnerId}-${pending.victimId}`;
  if (state.challengeSelectionKey !== selectionKey) {
    state.challengeSelectionKey = selectionKey;
    state.selectedSheep = [];
    state.selectedHalves = {};
  }
  const required = Math.min(2, victim?.field.length || 0);
  const selected = victim?.field.filter((sheep) => state.selectedSheep.includes(sheep.id)) || [];
  const halvesComplete = pending.effect !== "halve2" || selected.every((sheep) => state.selectedHalves[sheep.id]) && selected.length === required;
  const verbs = { lure2: "move to your field", remove2: "remove", halve2: "halve" };
  els.challengeSelectionTitle.textContent = pending.effect === "halve2" ? "Choose sheep halves" : "Choose sheep";
  els.challengeSelectionHelp.textContent = pending.effect === "halve2"
    ? `Choose ${required} sheep from ${victim?.name || "the loser"}, then choose the head or butt you want from each.`
    : `Choose ${required} sheep from ${victim?.name || "the loser"} to ${verbs[pending.effect]}.`;
  els.challengeSelectionSheep.innerHTML = victim?.field.length
    ? victim.field.map((sheep) => challengeSelectionSheepHtml(sheep, pending.effect)).join("")
    : "<span class='muted'>There are no sheep to choose.</span>";
  els.confirmChallengeSelection.disabled = selected.length !== required || !halvesComplete;
  if (!els.challengeSelectionDialog.open) els.challengeSelectionDialog.showModal();
  bindChallengeSelection();
}
function renderRecoverSelectionDialog(game) {
  const pending = game.pendingSelection;
  const resultVisible = game.coinResult && game.coinResult.visibleUntil > Date.now();
  const winnerCanChoose = pending?.effect === "recover1" && pending.winnerId === activePlayerId() && !resultVisible;
  if (!winnerCanChoose) {
    if (els.discardDialog.open) els.discardDialog.close();
    return;
  }
  const selectionKey = `recover1-${pending.winnerId}`;
  if (state.challengeSelectionKey !== selectionKey) {
    state.challengeSelectionKey = selectionKey;
    state.selectedDiscard = [];
  }
  renderDiscardDialog();
  if (!els.discardDialog.open) els.discardDialog.showModal();
}
function renderYoinkSelectionDialog(game) {
  const pending = game.pendingSelection;
  const winnerCanChoose = pending?.effect === "yoink" && pending.winnerId === activePlayerId();
  if (!winnerCanChoose) {
    if (els.yoinkDialog.open) els.yoinkDialog.close();
    return;
  }
  const victim = game.players.find((player) => player.id === pending.victimId);
  const cardIds = Array.isArray(pending.cardIds) ? pending.cardIds : [];
  const selectionKey = `yoink-${pending.winnerId}-${pending.victimId}`;
  if (state.challengeSelectionKey !== selectionKey) {
    state.challengeSelectionKey = selectionKey;
    state.selectedYoink = [];
  }
  state.selectedYoink = state.selectedYoink.filter((id) => cardIds.includes(id));
  const required = Math.min(2, cardIds.length);
  els.yoinkHelp.textContent = `Choose ${required} face-down card${required === 1 ? "" : "s"} from ${victim?.name || "the opponent"}. Their card faces remain hidden.`;
  els.yoinkCards.innerHTML = cardIds.length
    ? cardIds.map((id, index) => `<button class="hidden-card ${state.selectedYoink.includes(id) ? "selected" : ""}" data-yoink-card-id="${esc(id)}" aria-label="Face-down card ${index + 1}"></button>`).join("")
    : "<span class='muted'>There are no cards to acquire.</span>";
  els.confirmYoinkSelection.disabled = state.selectedYoink.length !== required;
  document.querySelectorAll("[data-yoink-card-id]").forEach((button) => button.onclick = () => {
    const id = button.dataset.yoinkCardId;
    state.selectedYoink = state.selectedYoink.includes(id) ? state.selectedYoink.filter((item) => item !== id) : [...state.selectedYoink, id].slice(-required);
    renderYoinkSelectionDialog(state.snapshot);
  });
  if (!els.yoinkDialog.open) els.yoinkDialog.showModal();
}
function challengeSelectionSheepHtml(sheep, effect) {
  const selected = state.selectedSheep.includes(sheep.id);
  return `<div class="challenge-choice ${selected ? "selected" : ""}"><button class="sheep" data-challenge-sheep-id="${sheep.id}" data-tooltip="${esc(sheepDetails(sheep))}">${sheep.cards.map((card) => `<span class="half" style="background:${cardBackground(card)}">${card.side === "head" ? "🐑" : "☁️"}</span>`).join("")}${sheep.modifier ? `<span class="modifier">${cardSymbol(sheep.modifier)} ${esc(CARD_NAMES[sheep.modifier.side])}</span>` : ""}</button>${effect === "halve2" && selected ? `<div class="half-choice-buttons">${sheep.cards.map((card) => `<button data-challenge-half-sheep="${sheep.id}" data-challenge-half-id="${card.id}" class="${state.selectedHalves[sheep.id] === card.id ? "selected-half-button" : ""}">Take ${card.side === "head" ? "head" : "butt"}</button>`).join("")}</div>` : ""}</div>`;
}
function bindChallengeSelection() {
  document.querySelectorAll("[data-challenge-sheep-id]").forEach((button) => button.onclick = () => {
    const id = button.dataset.challengeSheepId;
    if (state.selectedSheep.includes(id)) { state.selectedSheep = state.selectedSheep.filter((item) => item !== id); delete state.selectedHalves[id]; }
    else { state.selectedSheep = [...state.selectedSheep, id].slice(-2); for (const sheepId of Object.keys(state.selectedHalves)) if (!state.selectedSheep.includes(sheepId)) delete state.selectedHalves[sheepId]; }
    render();
  });
  document.querySelectorAll("[data-challenge-half-id]").forEach((button) => button.onclick = () => { state.selectedHalves[button.dataset.challengeHalfSheep] = button.dataset.challengeHalfId; render(); });
}
function sheepHtml(sheep, ownerId) {
  const selectedCard = state.snapshot.hand.find((card) => state.selectedCards.includes(card.id));
  const canChooseHalf = selectedCard?.kind === "challenge" && selectedCard.effect === "halve2" && ownerId === state.selectedTarget && state.selectedSheep.includes(sheep.id);
  return `<button class="sheep ${state.selectedSheep.includes(sheep.id) ? "selected" : ""}" data-sheep-id="${sheep.id}" data-owner-id="${ownerId}" data-tooltip="${esc(sheepDetails(sheep))}" aria-label="${esc(sheepDetails(sheep).replace(/\n/g, ". "))}">${sheep.cards.map((card) => `<span class="half ${canChooseHalf ? "selectable" : ""} ${state.selectedHalves[sheep.id] === card.id ? "selected-half" : ""}" data-half-card-id="${card.id}" style="background:${cardBackground(card)}">${card.side === "head" ? "🐑" : "☁️"}</span>`).join("")}${sheep.modifier ? `<span class="modifier">${cardSymbol(sheep.modifier)} ${esc(CARD_NAMES[sheep.modifier.side])}</span>` : ""}</button>`;
}
function cardHtml(card) {
  return `<button class="card ${state.selectedCards.includes(card.id) ? "selected" : ""}" data-card-id="${card.id}" data-tooltip="${esc(cardDetails(card))}" title="${esc(cardDetails(card))}" aria-label="${esc(cardDetails(card).replace(/\n/g, ". "))}" style="background:${cardBackground(card)};color:${cardTextColor(card)}"><span class="card-symbol">${cardSymbol(card)}</span><strong>${esc(cardLabel(card))}</strong></button>`;
}
function renderDiscardDialog() {
  const discard = state.snapshot?.discard || [];
  const chosenCards = discard.filter((card) => state.selectedDiscard.includes(card.id));
  const validSheep = makeSheep(chosenCards);
  els.discardHelp.textContent = validSheep ? `Valid ${validSheep.type.toLowerCase()} selected.` : "Select two sheep halves and, when required, one Paint or Franken modifier to form a valid sheep.";
  els.confirmRecoverSelection.disabled = !validSheep;
  els.discardCards.innerHTML = discard.length ? discard.map((card) => `<button class="card ${state.selectedDiscard.includes(card.id) ? "selected" : ""}" data-discard-card-id="${card.id}" data-tooltip="${esc(cardDetails(card))}" title="${esc(cardDetails(card))}" aria-label="${esc(cardDetails(card).replace(/\n/g, ". "))}" style="background:${cardBackground(card)};color:${cardTextColor(card)}"><span class="card-symbol">${cardSymbol(card)}</span><strong>${esc(cardLabel(card))}</strong></button>`).join("") : "<span class='muted'>The discard pile is empty.</span>";
  document.querySelectorAll("[data-discard-card-id]").forEach((button) => button.onclick = () => {
    const id = button.dataset.discardCardId;
    state.selectedDiscard = state.selectedDiscard.includes(id) ? state.selectedDiscard.filter((item) => item !== id) : [...state.selectedDiscard, id];
    renderDiscardDialog();
  });
}
function selectionMessage(cards, game) {
  if (game.phase === "finished") return game.notice;
  if (game.pending) return cards.some((card) => card.side === "reflip") ? "Play Re-Flip before the five-second window closes." : "The challenge coin will resolve shortly.";
  if (game.pendingSelection) return game.pendingSelection.winnerId === activePlayerId() ? game.pendingSelection.effect === "recover1" ? "Choose cards for one valid sheep in the recovery dialog." : game.pendingSelection.effect === "yoink" ? "Choose the face-down cards you want to acquire." : "Choose the affected sheep in the challenge dialog." : "The other player is completing the selection.";
  if (!isMyTurn()) return "Watch the other player's move—or select Re-Flip during a challenge.";
  if (!game.drawn && game.deckCount > 0) return "Start your turn by drawing.";
  if (!game.drawn && game.deckCount === 0 && !cards.length) return "The draw pile is empty. You may play immediately, or say Baa to end your turn.";
  if (!cards.length) return game.hand.length > 7 ? "You may keep playing valid cards, or discard until you have 7 or fewer cards before saying Baa." : "Select cards. Click an opponent's field or sheep when a target is needed.";
  const built = makeSheep(cards); if (built) return `Ready to make a ${built.type.toLowerCase()} sheep${game.hand.length > 7 ? ". You can still play it while holding more than 7 cards" : ""}.`;
  if (cards.length === 1 && cards[0].kind === "challenge") {
    const target = game.players.find((player) => player.id === state.selectedTarget);
    if (!target) return "Choose an opponent using the player names above.";
    if (["lure2", "halve2", "remove2"].includes(cards[0].effect)) return "Choose your coin guess, then validate. The winner will choose the affected sheep after the toss.";
    if (cards[0].effect === "recover1") return "Choose your coin guess, then validate. The winner will see the discard pile after the toss.";
    return `${target.name} selected. Choose your coin guess, then validate.`;
  }
  if (cards.length === 1 && ["wheat", "wolf"].includes(cards[0].side)) return "Choose one opponent sheep, then play.";
  if (cards.length === 1 && cards[0].side === "yoink") return state.selectedTarget ? "Opponent selected. Play Yoink, then choose two face-down cards." : "Choose an opponent using the player names above.";
  if (cards.length === 1 && cards[0].kind === "sheep" && state.selectedSheep.length) {
    const selectedSheep = game.players.flatMap((player) => player.field).find((sheep) => state.selectedSheep.includes(sheep.id));
    const matchingHalf = selectedSheep?.cards.some((fieldCard) => fieldCard.color === cards[0].color && fieldCard.side !== cards[0].side);
    return matchingHalf ? "Ready to BodySwap. The other half and modifier will return to your hand." : "BodySwap needs the same colour and the opposite sheep half.";
  }
  return "This selection is not a valid move yet.";
}
function bindDynamic() {
  document.querySelectorAll("[data-card-id]").forEach((button) => button.onclick = () => {
    const id = button.dataset.cardId;
    const wasSelected = state.selectedCards.includes(id);
    state.selectedCards = wasSelected ? state.selectedCards.filter((item) => item !== id) : [...state.selectedCards, id];
    state.selectedTarget = ""; state.selectedSheep = []; state.selectedHalves = {}; state.selectedDiscard = []; state.selectedYoink = [];
    // If a Re-Flip card was just selected during a pending coin toss, auto-play it
    const card = state.snapshot?.hand.find((c) => c.id === id);
    if (!wasSelected && state.snapshot?.pending && card && card.kind === "action" && card.side === "reflip") {
      // Deselect all and select only this card
      state.selectedCards = [id];
      // Stop countdown UI and send REFLIP immediately
      clearInterval(state.coinCountdownTimer); state.coinCountdownTimer = null; if (els.coinCountdown) els.coinCountdown.textContent = "";
      console.debug("card click auto-playing reflip from hand as", activePlayerId(), "cardId:", id);
      command("REFLIP", { cardIds: [id] });
      // Clear selection to match validation behavior
      clearSelection();
      return;
    }
    render();
  });
  document.querySelectorAll("[data-challenge-target]").forEach((button) => button.onclick = () => { state.selectedTarget = button.dataset.challengeTarget; state.selectedSheep = []; state.selectedHalves = {}; render(); });
  document.querySelectorAll("[data-player-id]").forEach((field) => field.onclick = (event) => {
    if (event.target.closest("[data-sheep-id]")) return;
    const selected = state.snapshot.hand.filter((card) => state.selectedCards.includes(card.id));
    if (selected.length === 1 && selected[0].kind === "challenge") return;
    state.selectedTarget = field.dataset.playerId; render();
  });
  document.querySelectorAll("[data-sheep-id]").forEach((button) => button.onclick = (event) => {
    event.stopPropagation();
    const id = button.dataset.sheepId;
    const ownerId = button.dataset.ownerId;
    const selected = state.snapshot.hand.filter((card) => state.selectedCards.includes(card.id));
    const clickedHalf = event.target.closest("[data-half-card-id]");
    const choosingHalvePart = selected.length === 1 && selected[0].kind === "challenge" && selected[0].effect === "halve2" && ownerId === state.selectedTarget;
    if (choosingHalvePart && state.selectedSheep.includes(id) && clickedHalf) {
      state.selectedHalves[id] = clickedHalf.dataset.halfCardId;
      return render();
    }
    const needsOneOpponentSheep = selected.length === 1 && ["wheat", "wolf"].includes(selected[0].side);
    if (needsOneOpponentSheep && ownerId === activePlayerId()) return setNotice("Choose a sheep in an opponent's field.", true);
    state.selectedTarget = ownerId;
    if (needsOneOpponentSheep) state.selectedSheep = state.selectedSheep.includes(id) ? [] : [id];
    else {
      const removing = state.selectedSheep.includes(id);
      state.selectedSheep = removing ? state.selectedSheep.filter((item) => item !== id) : [...state.selectedSheep, id].slice(-2);
      if (removing || !state.selectedSheep.includes(id)) delete state.selectedHalves[id];
      for (const sheepId of Object.keys(state.selectedHalves)) if (!state.selectedSheep.includes(sheepId)) delete state.selectedHalves[sheepId];
    }
    render();
  });
}
function clearSelection() { state.selectedCards = []; state.selectedSheep = []; state.selectedHalves = {}; state.selectedDiscard = []; state.selectedYoink = []; state.selectedTarget = ""; render(); }

function hideFloatingTooltip() {
  els.floatingTooltip.classList.add("hidden");
  els.floatingTooltip.classList.remove("below");
}
function showFloatingTooltip(target) {
  const text = target?.dataset.tooltip;
  if (!text) return hideFloatingTooltip();
  const gap = 9;
  const edge = 8;
  const targetRect = target.getBoundingClientRect();
  els.floatingTooltip.textContent = text;
  els.floatingTooltip.classList.remove("hidden", "below");
  els.floatingTooltip.style.left = "0px";
  els.floatingTooltip.style.top = "0px";
  const tipRect = els.floatingTooltip.getBoundingClientRect();
  const centeredLeft = targetRect.left + targetRect.width / 2 - tipRect.width / 2;
  const left = Math.max(edge, Math.min(centeredLeft, innerWidth - tipRect.width - edge));
  let top = targetRect.top - tipRect.height - gap;
  if (top < edge) {
    top = Math.min(targetRect.bottom + gap, innerHeight - tipRect.height - edge);
    els.floatingTooltip.classList.add("below");
  }
  const arrowLeft = Math.max(10, Math.min(targetRect.left + targetRect.width / 2 - left, tipRect.width - 10));
  els.floatingTooltip.style.left = `${left}px`;
  els.floatingTooltip.style.top = `${Math.max(edge, top)}px`;
  els.floatingTooltip.style.setProperty("--arrow-left", `${arrowLeft}px`);
}
document.addEventListener("pointerover", (event) => {
  const target = event.target.closest("[data-tooltip]");
  if (target) showFloatingTooltip(target);
});
document.addEventListener("pointerout", (event) => {
  const target = event.target.closest("[data-tooltip]");
  if (target && !target.contains(event.relatedTarget)) hideFloatingTooltip();
});
document.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-tooltip]");
  if (target) showFloatingTooltip(target);
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest("[data-tooltip]")) hideFloatingTooltip();
});
document.addEventListener("scroll", hideFloatingTooltip, true);
window.addEventListener("resize", hideFloatingTooltip);

els.joinRoom.onclick = joinRoom;
els.startGame.onclick = startGame;
els.startDebug.onclick = startDebugGame;
els.debugPerspective.onchange = () => { state.debugPlayerId = els.debugPerspective.value; state.selectedCards = []; state.selectedSheep = []; state.selectedHalves = {}; state.selectedDiscard = []; state.selectedYoink = []; state.selectedTarget = ""; state.snapshot = snapshotFor(state.debugPlayerId); render(); };
els.debugActor.onchange = () => { state.debugReflipPlayerId = els.debugActor.value; render(); };
els.copyRoom.onclick = async () => { const room = els.roomName.value.trim(); if (!room) return setNotice("Enter a room code first.", true); await navigator.clipboard.writeText(room); setNotice("Room code copied."); };
els.drawButton.onclick = () => command("DRAW");
els.playButton.onclick = () => {
    const selected = state.snapshot.hand.filter((card) => state.selectedCards.includes(card.id));
    const isReflipPlay = state.snapshot.pending && selected[0]?.side === "reflip";
    if (isReflipPlay) {
      const reflipCard = selected[0] || state.snapshot.hand.find((c) => c.kind === "action" && c.side === "reflip");
      if (!reflipCard) return setNotice("No Re-Flip card available.", true);
      // Deselect everything and select only the Re-Flip card
      clearSelection();
      state.selectedCards = [reflipCard.id];
      // Stop local countdown UI immediately
      clearInterval(state.coinCountdownTimer); state.coinCountdownTimer = null;
      if (els.coinCountdown) els.coinCountdown.textContent = "";
      console.debug("auto-playing reflip from hand as", activePlayerId(), "cardId:", reflipCard.id);
      command("REFLIP", { cardIds: [reflipCard.id] });
      clearSelection();
      return;
    }
    const type = "PLAY";
    command(type, { cardIds: state.selectedCards, sheepIds: state.selectedSheep, halfChoices: state.selectedHalves, discardIds: state.selectedDiscard, targetId: state.selectedTarget, guess: els.coinGuess.value });
    clearSelection();
  };
els.validateChallenge.onclick = () => { command("PLAY", { cardIds: state.selectedCards, sheepIds: state.selectedSheep, halfChoices: state.selectedHalves, discardIds: state.selectedDiscard, targetId: state.selectedTarget, guess: els.coinGuess.value }); clearSelection(); };
els.discardButton.onclick = () => { command("DISCARD", { cardIds: state.selectedCards }); clearSelection(); };
els.clearButton.onclick = clearSelection;
els.baaButton.onclick = () => command("BAA");
els.leaveGame.onclick = () => location.reload();
els.confirmRecoverSelection.onclick = () => {
  els.confirmRecoverSelection.disabled = true;
  command("CHALLENGE_SELECTION", { discardIds: state.selectedDiscard });
};
els.confirmChallengeSelection.onclick = () => {
  els.confirmChallengeSelection.disabled = true;
  command("CHALLENGE_SELECTION", { sheepIds: state.selectedSheep, halfChoices: state.selectedHalves });
};
els.confirmYoinkSelection.onclick = () => {
  els.confirmYoinkSelection.disabled = true;
  command("CHALLENGE_SELECTION", { cardIds: state.selectedYoink });
};
els.coinReflip.onclick = () => {
  if (!state.snapshot?.pending || els.coinReflip.disabled) return;
  // Allow selecting a different debug actor to play the Re-Flip card.
  const actorIdToUse = state.debug && state.debugReflipPlayerId ? state.debugReflipPlayerId : activePlayerId();
  console.debug("coinReflip.clicked, actorToUse:", actorIdToUse, "dataset.cardId:", els.coinReflip.dataset.cardId, "debugReflipPlayerId:", state.debugReflipPlayerId);
  const actorSnapshot = snapshotFor(actorIdToUse);
  const cardId = els.coinReflip.dataset.cardId;
  const reflipCard = actorSnapshot.hand.find((card) => card.id === cardId && card.kind === "action" && card.side === "reflip");
  if (!reflipCard) { console.debug("No reflip card found in snapshot for actor", actorIdToUse); return; }
  els.coinReflip.disabled = true;
  // Stop the local countdown UI immediately to avoid race conditions.
  clearInterval(state.coinCountdownTimer);
  state.coinCountdownTimer = null;
  if (els.coinCountdown) els.coinCountdown.textContent = "";
  // Temporarily switch the debug actor (so activePlayerId() reflects the chosen actor)
  let previousDebugPlayerId = null;
  if (state.debug) { previousDebugPlayerId = state.debugPlayerId; state.debugPlayerId = actorIdToUse; }
  // Update the snapshot to the chosen actor and clear current selections.
  state.snapshot = actorSnapshot;
  clearSelection();
  state.selectedCards = [reflipCard.id];
  render();
  console.debug("Sending REFLIP command as", activePlayerId(), "cardId:", reflipCard.id);
  // Send REFLIP command directly so the server processes it as a re-flip immediately.
  command("REFLIP", { cardIds: [reflipCard.id] });
  // Restore previous debug player context and snapshot.
  if (state.debug) { state.debugPlayerId = previousDebugPlayerId || actorIdToUse; state.snapshot = snapshotFor(state.debugPlayerId); render(); }
};
els.playAgainButton.onclick = () => command("PLAY_AGAIN");
els.gameOverLeaveButton.onclick = () => location.reload();
els.coinDialog.addEventListener("cancel", (event) => event.preventDefault());
els.gameOverDialog.addEventListener("cancel", (event) => event.preventDefault());
els.discardDialog.addEventListener("cancel", (event) => event.preventDefault());
els.challengeSelectionDialog.addEventListener("cancel", (event) => event.preventDefault());
els.yoinkDialog.addEventListener("cancel", (event) => event.preventDefault());
document.addEventListener("pointerdown", () => ensureAudio(), { once: true });
document.querySelectorAll("[data-rules]").forEach((button) => button.onclick = () => els.rulesDialog.showModal());
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.onclick = () => button.closest("dialog").close());
els.rulesDialog.onclick = (event) => { if (event.target === els.rulesDialog) els.rulesDialog.close(); };
// Allow choosing the dialog actor when debugging
if (els.coinReflipPlayer) els.coinReflipPlayer.onchange = () => { state.debugReflipPlayerId = els.coinReflipPlayer.value; render(); };


(async function initialise() {
  try {
    state.peer = await createWebPEER({ appName: "Its-That-Sheep-Looking-At-Me-v1" }); state.peerId = state.peer.id; render();
  } catch (error) {
    console.error("WebPeer error", error); els.loading.innerHTML = "<strong>Could not connect to WebPeer.</strong><p>Serve this page over HTTPS, check your connection, and reload.</p>";
  }
})();
