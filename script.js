const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreElement = document.getElementById("score");
const linesElement = document.getElementById("lines");
const levelElement = document.getElementById("level");
const restartButton = document.getElementById("restart");

const message = document.getElementById("message");
const messageTitle = document.getElementById("message-title");
const messageText = document.getElementById("message-text");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  "#00d9ff",
  "#ffd500",
  "#a855f7",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f97316"
];

const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [2, 2],
    [2, 2]
  ],
  [
    [0, 3, 0],
    [3, 3, 3]
  ],
  [
    [0, 4, 4],
    [4, 4, 0]
  ],
  [
    [5, 5, 0],
    [0, 5, 5]
  ],
  [
    [6, 0, 0],
    [6, 6, 6]
  ],
  [
    [0, 0, 7],
    [7, 7, 7]
  ]
];

let board;
let player;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let lastTime;
let dropInterval;
let gameOver;
let paused;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return shape.map(row => [...row]);
}

function resetGame() {
  board = createBoard();

  player = {
    matrix: randomPiece(),
    pos: { x: 0, y: 0 }
  };

  nextPiece = randomPiece();

  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  lastTime = performance.now();
  dropInterval = 800;
  gameOver = false;
  paused = false;

  message.classList.add("hidden");
  updatePlayerPosition();
  updateUI();
  drawNext();
  requestAnimationFrame(update);
}

function updatePlayerPosition() {
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS / 2) - Math.ceil(player.matrix[0].length / 2);

  if (collides()) {
    endGame();
  }
}

function collides() {
  const matrix = player.matrix;
  const pos = player.pos;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (
        matrix[y][x] !== 0 &&
        (
          board[y + pos.y] === undefined ||
          board[y + pos.y][x + pos.x] === undefined ||
          board[y + pos.y][x + pos.x] !== 0
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function merge() {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function playerDrop() {
  player.pos.y++;

  if (collides()) {
    player.pos.y--;
    merge();
    clearLines();
    spawnNextPiece();
  }

  dropCounter = 0;
}

function hardDrop() {
  let distance = 0;

  while (!collides()) {
    player.pos.y++;
    distance++;
  }

  player.pos.y--;
  distance--;

  merge();
  clearLines();
  spawnNextPiece();

  score += Math.max(0, distance) * 2;
  updateUI();
}

function spawnNextPiece() {
  player.matrix = nextPiece;
  nextPiece = randomPiece();
  updatePlayerPosition();
  drawNext();
}

function playerMove(direction) {
  player.pos.x += direction;

  if (collides()) {
    player.pos.x -= direction;
  }
}

function rotate(matrix, direction) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [
        matrix[x][y],
        matrix[y][x]
      ] = [
        matrix[y][x],
        matrix[x][y]
      ];
    }
  }

  if (direction > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(direction) {
  const originalX = player.pos.x;
  rotate(player.matrix, direction);

  let offset = 1;

  while (collides()) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));

    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix, -direction);
      player.pos.x = originalX;
      return;
    }
  }
}

function clearLines() {
  let cleared = 0;

  outer:
  for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }

    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
    y++;
    cleared++;
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800];
    score += points[cleared] * level;
    lines += cleared;

    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 60);

    updateUI();
  }
}

function drawMatrix(matrix, offset, context = ctx, size = BLOCK) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = COLORS[value];
        context.fillRect(
          (x + offset.x) * size,
          (y + offset.y) * size,
          size,
          size
        );

        context.strokeStyle = "rgba(255,255,255,0.18)";
        context.strokeRect(
          (x + offset.x) * size,
          (y + offset.y) * size,
          size,
          size
        );
      }
    });
  });
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(COLS * BLOCK, y * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawMatrix(board, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  const size = 24;
  const offsetX = (nextCanvas.width / size - nextPiece[0].length) / 2;
  const offsetY = (nextCanvas.height / size - nextPiece.length) / 2;

  drawMatrix(
    nextPiece,
    { x: offsetX, y: offsetY },
    nextCtx,
    size
  );
}

function updateUI() {
  scoreElement.textContent = score;
  linesElement.textContent = lines;
  levelElement.textContent = level;
}

function endGame() {
  gameOver = true;
  messageTitle.textContent = "Game Over";
  messageText.textContent = `Final score: ${score}. Press Restart to play again.`;
  message.classList.remove("hidden");
}

function togglePause() {
  if (gameOver) return;

  paused = !paused;

  if (paused) {
    messageTitle.textContent = "Paused";
    messageText.textContent = "Press P to continue.";
    message.classList.remove("hidden");
  } else {
    message.classList.add("hidden");
    lastTime = performance.now();
  }
}

function update(time = 0) {
  if (gameOver) {
    draw();
    return;
  }

  const deltaTime = time - lastTime;
  lastTime = time;

  if (!paused) {
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
      playerDrop();
    }

    draw();
  }

  requestAnimationFrame(update);
}

document.addEventListener("keydown", event => {
  if (event.key === "p" || event.key === "P") {
    togglePause();
    return;
  }

  if (gameOver || paused) return;

  if (event.key === "ArrowLeft") {
    playerMove(-1);
  } else if (event.key === "ArrowRight") {
    playerMove(1);
  } else if (event.key === "ArrowDown") {
    playerDrop();
  } else if (event.key === "ArrowUp") {
    playerRotate(1);
  } else if (event.code === "Space") {
    event.preventDefault();
    hardDrop();
  }

  draw();
});

restartButton.addEventListener("click", resetGame);

resetGame();
