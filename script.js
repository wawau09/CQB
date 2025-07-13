(() => {
  const game = document.getElementById("game");
  const player = document.getElementById("player");
  const scoreEl = document.getElementById("score");
  const canvas = document.getElementById('vision-canvas');
  const ctx = canvas.getContext('2d');

  // 캔버스 크기 맞춤
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let obstacles = Array.from(document.getElementsByClassName('obstacle'));
  let enemies = Array.from(document.getElementsByClassName('enemy'));

  let playerX = window.innerWidth / 2;
  let playerY = window.innerHeight - 100;
  let bullets = [];
  let score = 0;

  const playerSpeed = 5;
  const keys = { w:false, a:false, s:false, d:false };
  let currentMouseAngle = 0;
  let lastMousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  // 키 입력
  document.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
  });
  document.addEventListener("keyup", e => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  });

  // 마우스 위치 & 시야 방향 업데이트
  document.addEventListener("mousemove", e => {
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
    updateVision(e.clientX, e.clientY);
  });

  function updateVision(mouseX, mouseY) {
    const rect = player.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    currentMouseAngle = Math.atan2(dy, dx);
  }




  function getPlayerCenter() {
    const rect = player.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function isCollidingWithObstacles(x, y, width, height) {
    for (const obs of obstacles) {
      const rect = obs.getBoundingClientRect();
  
      if (
        x - 25 < rect.right &&
        x + width - 25 > rect.left &&
        y < rect.bottom &&
        y + height > rect.top
      ) {
        return true; // 충돌 발생
      }
    }
    return false;
  }
  
  function updatePlayerPosition() {
    const playerWidth = player.offsetWidth;
    const playerHeight = player.offsetHeight;
  
    let newX = playerX;
    let newY = playerY;
  
    // 좌우 먼저 계산
    if (keys.a) newX -= playerSpeed;
    if (keys.d) newX += playerSpeed;
  
    // 가로 경계 제한 및 충돌 체크
    newX = Math.max(0, Math.min(window.innerWidth - playerWidth, newX));
    if (!isCollidingWithObstacles(newX, playerY, playerWidth, playerHeight)) {
      playerX = newX;
    }
  
    // 상하 계산
    if (keys.w) newY -= playerSpeed;
    if (keys.s) newY += playerSpeed;
  
    // 세로 경계 제한 및 충돌 체크
    newY = Math.max(0, Math.min(window.innerHeight - playerHeight, newY));
    if (!isCollidingWithObstacles(playerX, newY, playerWidth, playerHeight)) {
      playerY = newY;
    }
  
    player.style.left = playerX + "px";
    player.style.top = playerY + "px";
  }
  




  // 총알 발사
  function shootTowardMouse(mouseX, mouseY) {
    const bullet = document.createElement("div");
    bullet.className = "bullet";
    const center = getPlayerCenter();
    bullet.style.left = center.x + "px";
    bullet.style.top = center.y + "px";

    const angle = Math.atan2(mouseY - center.y, mouseX - center.x);
    bullet.dataset.dx = Math.cos(angle) * 16;
    bullet.dataset.dy = Math.sin(angle) * 16;

    game.appendChild(bullet);
    bullets.push(bullet);
  }
  game.addEventListener("click", (e) => {
    shootTowardMouse(e.clientX, e.clientY);
  });

  function updateBullets() {
  bullets.forEach((bullet, i) => {
    let x = parseFloat(bullet.style.left);
    let y = parseFloat(bullet.style.top);
    let dx = parseFloat(bullet.dataset.dx);
    let dy = parseFloat(bullet.dataset.dy);

    x += dx;
    y += dy;

    // 벽 충돌 검사
    const bulletWidth = bullet.offsetWidth;
    const bulletHeight = bullet.offsetHeight;

    let collided = false;
    for (const obs of obstacles) {
      const rect = obs.getBoundingClientRect();

      if (
        x < rect.right &&
        x + bulletWidth > rect.left &&
        y < rect.bottom &&
        y + bulletHeight > rect.top
      ) {
        collided = true;
        break;
      }
    }

    if (collided || x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
      bullet.remove();
      bullets.splice(i, 1);
    } else {
      bullet.style.left = x + "px";
      bullet.style.top = y + "px";
    }
  });
}

  function isColliding(a, b) {
    const rect1 = a.getBoundingClientRect();
    const rect2 = b.getBoundingClientRect();
    return !(
      rect1.top > rect2.bottom ||
      rect1.bottom < rect2.top ||
      rect1.right < rect2.left ||
      rect1.left > rect2.right
    );
  }

  // 레이 캐스팅 함수 (장애물과 충돌 검사)
  function castRay(px, py, angle, maxDist = 600) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    for (let i = 0; i < maxDist; i += 2) {
      const x = px + dx * i;
      const y = py + dy * i;

      // 장애물 충돌 체크
      for (const obs of obstacles) {
        const rect = obs.getBoundingClientRect();
        if (
          x >= rect.left && x <= rect.right &&
          y >= rect.top && y <= rect.bottom
        ) {
          return { x, y };
        }
      }
    }
    // 충돌 없으면 최대 거리 위치 반환
    return { x: px + dx * maxDist, y: py + dy * maxDist };
  }

  // 적이 시야 안에 있는지 각도 체크
  function isInFOV(enemy) {
    const playerCenter = getPlayerCenter();
    const rect = enemy.getBoundingClientRect();
    const enemyCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const dx = enemyCenter.x - playerCenter.x;
    const dy = enemyCenter.y - playerCenter.y;
    const directionToEnemy = Math.atan2(dy, dx);

    let angleDiff = directionToEnemy - currentMouseAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const fov = Math.PI / 6; // 30도씩 좌우 총 60도 시야

    return Math.abs(angleDiff) <= fov;
  }

  // 장애물에 가려서 적을 볼 수 있는지 검사
  function canSeeEnemy(enemy) {
    const playerCenter = getPlayerCenter();
    const rect = enemy.getBoundingClientRect();
    const enemyCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const dx = enemyCenter.x - playerCenter.x;
    const dy = enemyCenter.y - playerCenter.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    const hit = castRay(playerCenter.x, playerCenter.y, angle, distance);
    const distToHit = Math.sqrt((hit.x - playerCenter.x) ** 2 + (hit.y - playerCenter.y) ** 2);

    // 오차 허용
    return distToHit >= distance - 5;
  }

  // 시야 그리기
  function drawVision() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { x: px, y: py } = getPlayerCenter();
    const rays = [];

    const rayCount = 60;
    const spread = Math.PI / 3; // 60도
    const startAngle = currentMouseAngle - spread / 2;

    for (let i = 0; i < rayCount; i++) {
      const angle = startAngle + (spread * i) / (rayCount - 1);
      rays.push(castRay(px, py, angle));
    }

    // 어두운 배경 (시야 밖 영역)
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 시야 영역 투명하게 뚫기
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (const p of rays) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 224, 0.15)";
    ctx.fill();
  }

  // 적 상태 업데이트
  function updateEnemies() {
    for(let i = enemies.length -1; i >= 0; i--) {
      const enemy = enemies[i];
      let top = parseFloat(enemy.style.top) || enemy.getBoundingClientRect().top;

      // 시야 내 & 장애물에 가려지지 않으면 보이게
      if (isInFOV(enemy) && canSeeEnemy(enemy)) {
        enemy.style.opacity = "1";
        enemy.style.pointerEvents = "auto";
      } else {
        enemy.style.opacity = "0";
        enemy.style.pointerEvents = "none";
      }

      // 총알 충돌 체크
      for(let j = bullets.length -1; j >= 0; j--) {
        if (isColliding(bullets[j], enemy)) {
          bullets[j].remove();
          enemy.remove();
          bullets.splice(j, 1);
          enemies.splice(i, 1);
          score++;
          scoreEl.textContent = "점수: " + score;
          break;
        }
      }
    }
  }

  function gameLoop() {
    obstacles = Array.from(document.getElementsByClassName('obstacle'));
    enemies = Array.from(document.getElementsByClassName('enemy'));

    updatePlayerPosition();
    updateBullets();
    updateEnemies();
    drawVision();

    requestAnimationFrame(gameLoop);
  }

  // 초기 위치 설정
  player.style.left = playerX + "px";
  player.style.top = playerY + "px";

  updateVision(playerX, playerY);

  gameLoop();
})();