/* ---------- Starfield & Constellation background ---------- */
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let W = (canvas.width = innerWidth);
let H = (canvas.height = innerHeight);
const stars = [];
const constellations = [];
const STAR_COUNT = Math.max(140, Math.floor((W * H) / 8000));

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function makeStars() {
  stars.length = 0;
  constellations.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.3,
      tw: Math.random() * 2 + 1,
      phase: Math.random() * Math.PI * 2,
      group: Math.random() > 0.96,
    };
    stars.push(s);
  }
  // create a few constellations (paths connecting some bright stars)
  for (let c = 0; c < 12; c++) {
    const n = 3 + Math.floor(Math.random() * 5);
    const pts = [];
    for (let i = 0; i < n; i++)
      pts.push({
        x: rand(W * 0.05, W * 0.95),
        y: rand(H * 0.05, H * 0.95),
      });
    constellations.push(pts);
  }
}

function drawStars(t) {
  ctx.clearRect(0, 0, W, H);
  // subtle gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(8,12,25,0.25)");
  g.addColorStop(1, "rgba(2,4,10,0.7)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // draw constel lines softly
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = "rgba(124,58,237,0.06)";
  constellations.forEach((pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  });

  // stars
  for (const s of stars) {
    const tw = 0.6 + 0.4 * Math.sin((t / 800) * s.tw + s.phase);
    ctx.beginPath();
    ctx.globalAlpha = s.group ? 0.95 : 0.6 * tw;
    ctx.fillStyle = s.group
      ? "rgba(255,255,255,0.95)"
      : "rgba(221,234,255,0.9)";
    ctx.arc(s.x, s.y, s.r * (1 + 0.25 * tw), 0, Math.PI * 2);
    ctx.fill();
  }

  // animate faint shooting streak occasionally
  if (Math.random() < 0.02) {
    const sx = rand(0, W * 0.7);
    const sy = rand(0, H * 0.6);
    const ex = sx + rand(120, 380),
      ey = sy + rand(-80, 80);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function onResize() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
  makeStars();
  resizeLineCanvas();
}
addEventListener("resize", onResize);
makeStars();
let lastT = 0;
function loop(t) {
  drawStars(t || 0);
  lastT = t;
  requestAnimationFrame(loop);
}
loop(0);

/* ---------- Super Tic Tac Toe Logic & Rendering ---------- */
const superBoard = document.getElementById("superBoard");
const lineCanvas = document.getElementById("lineCanvas");
const lctx = lineCanvas.getContext("2d");

function resizeLineCanvas() {
  lineCanvas.width = superBoard.clientWidth;
  lineCanvas.height = superBoard.clientHeight;
  lineCanvas.style.width = superBoard.clientWidth + "px";
  lineCanvas.style.height = superBoard.clientHeight + "px";
  lineCanvas.style.position = "absolute";
  lineCanvas.style.left = superBoard.offsetLeft + "px";
  lineCanvas.style.top = superBoard.offsetTop + "px";
}
window.addEventListener("resize", resizeLineCanvas);

const state = {
  boards: Array.from({ length: 9 }, () => Array(9).fill(null)), // each small board has 9 cells
  miniWinner: Array(9).fill(null), // winner of each mini board: 'X','O','D' (draw), null
  currentPlayer: "X",
  activeMini: null, // 0-8 or null means any
  gameWinner: null,
  ai: false,
};

function createMini(i) {
  const el = document.createElement("div");
  el.className = "mini";
  el.dataset.index = i;
  for (let c = 0; c < 9; c++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.mini = i;
    cell.dataset.cell = c;
    cell.addEventListener("click", onCellClick);
    el.appendChild(cell);
  }
  superBoard.appendChild(el);
}

for (let i = 0; i < 9; i++) createMini(i);
resizeLineCanvas();

function showBanner(text) {
  const root = document.getElementById("bannerRoot");
  root.innerHTML = "";
  const b = document.createElement("div");
  b.className = "winner-banner";
  b.textContent = text;
  root.appendChild(b);
  setTimeout(() => {
    if (root.contains(b)) root.removeChild(b);
  }, 3800);
}

function onCellClick(e) {
  const mini = Number(this.dataset.mini);
  const cell = Number(this.dataset.cell);
  if (state.gameWinner) return;
  if (state.miniWinner[mini]) return; // locked
  if (state.activeMini !== null && state.activeMini !== mini) return;

  if (state.boards[mini][cell]) return; // occupied

  playMove(mini, cell, state.currentPlayer);

  if (state.ai && !state.gameWinner) {
    setTimeout(aiMoveIfNeeded, 350);
  }
}

function playMove(mini, cell, player) {
  state.boards[mini][cell] = player;
  renderCell(mini, cell);
  const miniRes = checkMiniWinner(state.boards[mini]);
  if (miniRes) {
    state.miniWinner[mini] = miniRes;
    markMiniWinner(mini, miniRes);
  }

  // set next active mini
  state.activeMini = state.miniWinner[cell] ? null : cell;

  // check super winner
  const big = checkSuperWinner(state.miniWinner);
  if (big) {
    state.gameWinner = big;
    showBanner("Winner: " + big);
    animateSuperWin(big);
  }

  // swap player
  state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
  updateUI();
}

function renderCell(mini, cell) {
  const mEl = superBoard.querySelector(`.mini[data-index='${mini}']`);
  const cellEl = mEl.querySelector(`.cell[data-cell='${cell}']`);
  const val = state.boards[mini][cell];
  cellEl.innerHTML = "";
  if (val) {
    const span = document.createElement("div");
    span.className = "mark " + (val === "X" ? "x" : "o");
    span.textContent = val;
    cellEl.appendChild(span);
  }
}

function markMiniWinner(mini, winner) {
  const el = superBoard.querySelector(`.mini[data-index='${mini}']`);
  el.classList.add("locked");
  el.classList.remove("active");
  el.classList.add("win");
  // stamp the winner symbol in center big
  const stamp = document.createElement("div");
  stamp.style.position = "absolute";
  stamp.style.left = "50%";
  stamp.style.top = "50%";
  stamp.style.transform = "translate(-50%,-50%) rotate(-6deg)";
  stamp.style.fontSize = "48px";
  stamp.style.fontWeight = "900";
  stamp.style.opacity = "0.09";
  stamp.style.pointerEvents = "none";
  stamp.textContent = winner === "D" ? "★" : winner;
  stamp.className = "twinkle";
  el.appendChild(stamp);
}

function updateUI() {
  // turn indicator
  document.getElementById("turnText").textContent = state.currentPlayer;
  document.getElementById("turnToken").className =
    "token " + state.currentPlayer.toLowerCase();
  // active minis
  for (let i = 0; i < 9; i++) {
    const el = superBoard.querySelector(`.mini[data-index='${i}']`);
    el.classList.remove("active");
    if (
      !state.miniWinner[i] &&
      (state.activeMini === null || state.activeMini === i)
    )
      el.classList.add("active");
    if (state.miniWinner[i]) el.classList.add("locked");
  }
  // redraw super win lines
  drawSuperLines();
}

function checkMiniWinner(arr) {
  // arr length 9
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const w of wins) {
    const [a, b, c] = w;
    if (arr[a] && arr[a] === arr[b] && arr[b] === arr[c]) return arr[a];
  }
  if (arr.every((x) => x !== null)) return "D";
  return null;
}

function checkSuperWinner(miniW) {
  // miniW length 9 with 'X','O','D', null
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const w of wins) {
    const [a, b, c] = w;
    if (
      miniW[a] &&
      miniW[a] !== "D" &&
      miniW[a] === miniW[b] &&
      miniW[b] === miniW[c]
    )
      return miniW[a];
  }
  if (miniW.every((x) => x !== null)) return "D";
  return null;
}

function animateSuperWin(winner) {
  // flash winner across page
  const bn = document.createElement("div");
  bn.className = "winner-banner";
  bn.textContent = "🏆 Winner: " + winner;
  document.getElementById("bannerRoot").appendChild(bn);
  setTimeout(() => {
    if (bn.parentNode) bn.parentNode.removeChild(bn);
  }, 5000);
  // create sparkling particles on winning mini boards
  for (let i = 0; i < 9; i++)
    if (state.miniWinner[i] === winner) {
      const el = superBoard.querySelector(`.mini[data-index='${i}']`);
      el.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.02)" },
          { transform: "scale(1)" },
        ],
        { duration: 900, easing: "ease-in-out" }
      );
    }
}

/* draw lines across the super board to indicate big win */
function drawSuperLines() {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  lctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
  if (!state.gameWinner || state.gameWinner === "D") return;
  // find which winning triple
  for (const w of wins) {
    const [a, b, c] = w;
    if (
      state.miniWinner[a] === state.gameWinner &&
      state.miniWinner[b] === state.gameWinner &&
      state.miniWinner[c] === state.gameWinner
    ) {
      // compute center positions
      const rect = superBoard.getBoundingClientRect();
      const miniEls = Array.from(superBoard.querySelectorAll(".mini"));
      const pa = miniEls[a].getBoundingClientRect();
      const pc = miniEls[c].getBoundingClientRect();
      const offsetX = -superBoard.offsetLeft;
      const offsetY = -superBoard.offsetTop;
      const x1 =
        pa.left - superBoard.getBoundingClientRect().left + pa.width / 2;
      const y1 =
        pa.top - superBoard.getBoundingClientRect().top + pa.height / 2;
      const x2 =
        pc.left - superBoard.getBoundingClientRect().left + pc.width / 2;
      const y2 =
        pc.top - superBoard.getBoundingClientRect().top + pc.height / 2;
      lctx.strokeStyle =
        state.gameWinner === "X"
          ? "rgba(255,122,182,0.95)"
          : "rgba(125,211,252,0.95)";
      lctx.lineWidth = Math.max(
        8,
        Math.min(lineCanvas.width, lineCanvas.height) * 0.02
      );
      lctx.beginPath();
      lctx.moveTo(x1, y1);
      lctx.lineTo(x2, y2);
      lctx.stroke();
      // small glow
      lctx.globalCompositeOperation = "lighter";
      lctx.strokeStyle = "rgba(255,255,255,0.12)";
      lctx.lineWidth = lctx.lineWidth / 3;
      lctx.stroke();
      lctx.globalCompositeOperation = "source-over";
      break;
    }
  }
}

/* Simple AI (plays random legal move) */
function aiMoveIfNeeded() {
  if (!state.ai || state.gameWinner) return;
  // choose active mini or any
  let candidates = [];
  const active = state.activeMini;
  if (active === null) {
    for (let m = 0; m < 9; m++) if (!state.miniWinner[m]) candidates.push(m);
  } else if (!state.miniWinner[active]) candidates = [active];
  if (candidates.length === 0) return;
  const chosenMini = candidates[Math.floor(Math.random() * candidates.length)];
  const freeCells = [];
  for (let c = 0; c < 9; c++)
    if (!state.boards[chosenMini][c]) freeCells.push(c);
  if (freeCells.length === 0) return;
  const chosenCell = freeCells[Math.floor(Math.random() * freeCells.length)];
  playMove(chosenMini, chosenCell, state.currentPlayer);
}

/* UI events */
document.getElementById("restartBtn").addEventListener("click", () => {
  // reset state
  state.boards = Array.from({ length: 9 }, () => Array(9).fill(null));
  state.miniWinner = Array(9).fill(null);
  state.currentPlayer = "X";
  state.activeMini = null;
  state.gameWinner = null;
  // clear DOM
  document.querySelectorAll(".mini").forEach((m, i) => {
    m.className = "mini";
    m.innerHTML = "";
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.mini = i;
      cell.dataset.cell = c;
      cell.addEventListener("click", onCellClick);
      m.appendChild(cell);
    }
  });
  updateUI();
  lctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
});

document.getElementById("aiBtn").addEventListener("click", () => {
  state.ai = !state.ai;
  document.getElementById("aiState").textContent = state.ai ? "On" : "Off";
  if (state.ai) setTimeout(aiMoveIfNeeded, 450);
});

// initial render
updateUI();

// position line canvas overboard each frame (in case layout shifts)
function frame() {
  resizeLineCanvas();
  requestAnimationFrame(frame);
}
frame();
