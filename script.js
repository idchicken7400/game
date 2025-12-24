const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// =====================
// 볼륨 설정
// =====================
const BGM_VOLUME = 0.2;
const EFFECT_VOLUME = 0.15;

// =====================
// 캔버스 리사이즈
// =====================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// =====================
// 기본 설정
// =====================
const playerSize = 128;
const playerSpeed = 5;
const ITEM_RESPAWN_TIME = 8000;

let playerX = 0;
let playerY = 0;

function centerPlayer() {
  playerX = (canvas.width - playerSize) / 2;
  playerY = (canvas.height - playerSize) / 2;
}

let isGameOver = false;
let startTime, currentTime;

// ⭐ 숫자로 관리
let elapsedTime = 0;
let highScore = parseFloat(localStorage.getItem('highScore')) || 0;

// =====================
// 이미지
// =====================
const background = new Image();
background.src = 'background.png';

const playerNormalImg = new Image();
playerNormalImg.src = 'LeeSY.png';

const playerPickupImg = new Image();
playerPickupImg.src = 'pickup.png';

let currentPlayerImg = playerNormalImg;

const enemyImg = new Image();
enemyImg.src = 'baseball.png';

const itemImg = new Image();
itemImg.src = 'bat.png';

// =====================
// 사운드
// =====================
const bgmList = [
  'bgm1.mp3',
  'bgm2.mp3',
  'bgm3.mp3',
  'bgm4.mp3',
  'bgm5.mp3'
];

let currentBgmIndex = -1;
let bgmStarted = false;

const bgmAudio = new Audio();
bgmAudio.volume = BGM_VOLUME;

const collectAudio = new Audio('collect.mp3');
collectAudio.volume = EFFECT_VOLUME;

const homeRunAudio = new Audio('HomeRun.mp3');
homeRunAudio.volume = EFFECT_VOLUME;

function getRandomBgmIndex() {
  let index;
  do {
    index = Math.floor(Math.random() * bgmList.length);
  } while (index === currentBgmIndex);
  return index;
}

function playRandomBgm() {
  currentBgmIndex = getRandomBgmIndex();
  bgmAudio.src = bgmList[currentBgmIndex];
  bgmAudio.play();
}
bgmAudio.addEventListener('ended', playRandomBgm);

// =====================
// 키 입력
// =====================
const keys = { w: false, a: false, s: false, d: false, shift: false };

window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();

  if (!bgmStarted) {
    playRandomBgm();
    bgmStarted = true;
  }

  if (key in keys) keys[key] = true;
  if (e.key === 'Shift') keys.shift = true;
});

window.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  if (key in keys) keys[key] = false;
  if (e.key === 'Shift') keys.shift = false;
});

// =====================
// 플레이어
// =====================
function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.d) dx++;
  if (keys.a) dx--;
  if (keys.s) dy++;
  if (keys.w) dy--;

  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    const speed = keys.shift ? playerSpeed * 2 : playerSpeed;
    playerX += dx * speed;
    playerY += dy * speed;
  }

  playerX = Math.max(0, Math.min(canvas.width - playerSize, playerX));
  playerY = Math.max(0, Math.min(canvas.height - playerSize, playerY));
}

function drawPlayer() {
  ctx.drawImage(currentPlayerImg, playerX, playerY, playerSize, playerSize);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(playerX, playerY, playerSize, playerSize);
}

// =====================
// 적
// =====================
const enemies = [];

function initializeEnemies(count) {
  enemies.length = 0;
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * (canvas.width - 64),
      y: Math.random() * (canvas.height - 64),
      width: 64,
      height: 64,
      speedX: Math.random() * 2 + 1,
      speedY: Math.random() * 2 + 1
    });
  }
}

function moveEnemies() {
  enemies.forEach(enemy => {
    enemy.x += enemy.speedX;
    enemy.y += enemy.speedY;

    if (enemy.x < 0) {
      enemy.x = 0;
      enemy.speedX *= -1;
    } else if (enemy.x + enemy.width > canvas.width) {
      enemy.x = canvas.width - enemy.width;
      enemy.speedX *= -1;
    }

    if (enemy.y < 0) {
      enemy.y = 0;
      enemy.speedY *= -1;
    } else if (enemy.y + enemy.height > canvas.height) {
      enemy.y = canvas.height - enemy.height;
      enemy.speedY *= -1;
    }
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

function knockbackEnemy(enemy) {
  enemy.speedX *= -1;
  enemy.speedY *= -1;

  enemy.x += enemy.speedX * 80;
  enemy.y += enemy.speedY * 80;

  enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
  enemy.y = Math.max(0, Math.min(canvas.height - enemy.height, enemy.y));
}

// =====================
// 아이템
// =====================
const item = { x: 0, y: 0, size: 100, active: false };

let isPickupActive = false;
let pickupTimeoutId = null;
let pickupEndTime = 0;

function spawnItem() {
  item.x = Math.random() * (canvas.width - item.size);
  item.y = Math.random() * (canvas.height - item.size);
  item.active = true;
}

function drawItem() {
  if (!item.active) return;
  ctx.drawImage(itemImg, item.x, item.y, item.size, item.size);
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.strokeRect(item.x, item.y, item.size, item.size);
}

function checkItemCollision() {
  if (!item.active) return;

  if (
    playerX < item.x + item.size &&
    playerX + playerSize > item.x &&
    playerY < item.y + item.size &&
    playerY + playerSize > item.y
  ) {
    item.active = false;

    collectAudio.currentTime = 0;
    collectAudio.play();

    isPickupActive = true;
    currentPlayerImg = playerPickupImg;
    pickupEndTime = Date.now() + 10000;

    if (pickupTimeoutId) clearTimeout(pickupTimeoutId);
    pickupTimeoutId = setTimeout(() => {
      isPickupActive = false;
      currentPlayerImg = playerNormalImg;
      pickupEndTime = 0;
      pickupTimeoutId = null;
    }, 10000);

    setTimeout(spawnItem, ITEM_RESPAWN_TIME);
  }
}

// =====================
// 충돌
// =====================
function checkCollisions() {
  enemies.forEach(enemy => {
    if (
      playerX < enemy.x + enemy.width &&
      playerX + playerSize > enemy.x &&
      playerY < enemy.y + enemy.height &&
      playerY + playerSize > enemy.y
    ) {
      if (isPickupActive) {
        isPickupActive = false;
        currentPlayerImg = playerNormalImg;

        if (pickupTimeoutId) clearTimeout(pickupTimeoutId);
        pickupEndTime = 0;

        homeRunAudio.currentTime = 0;
        homeRunAudio.play();

        knockbackEnemy(enemy);
        return;
      }

      isGameOver = true;
      bgmAudio.pause();
    }
  });
}

// =====================
// UI
// =====================
function drawTime() {
  if (!isGameOver) {
    currentTime = Date.now();
    elapsedTime = (currentTime - startTime) / 1000;
  }

  ctx.font = '20px Arial';
  ctx.fillStyle = 'black';
  ctx.fillText(`Time: ${elapsedTime.toFixed(2)}s`, 10, 40);
  ctx.fillText(`High Score: ${highScore.toFixed(2)}s`, 10, 65);
}

// =====================
// 게임 루프
// =====================
function gameLoop() {
  if (isGameOver) {
    if (elapsedTime > highScore) {
      highScore = elapsedTime;
      localStorage.setItem('highScore', highScore.toString());
    }
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  drawTime();

  movePlayer();
  drawPlayer();

  drawItem();
  checkItemCollision();

  moveEnemies();
  drawEnemies();
  checkCollisions();

  requestAnimationFrame(gameLoop);
}

// =====================
// 시작
// =====================
background.onload = () => {
  centerPlayer();
  startTime = Date.now();
  initializeEnemies(3);
  spawnItem();
  gameLoop();
};
