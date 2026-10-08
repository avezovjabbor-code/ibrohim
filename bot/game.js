/**
 * Futbol O'yini (Football 1v1 & Penalty Shootout)
 * Botga qarshi o'yin va Penaltilar seriyasi
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas o'lchamlari
canvas.width = 960;
canvas.height = 540;

// O'yin holati
const GAME_STATE = {
    mode: 'match', // 'match' yoki 'penalty'
    difficulty: 'medium', // 'easy', 'medium', 'hard'
    matchDuration: 90, // soniya (90 min)
    gameTime: 0,
    isPaused: false,
    isGameOver: false,
    goalCelebration: false,
    twoPlayer: false,
    scores: { p1: 0, p2: 0 },
    penaltyRound: 0,
    penaltyScores: { p1: [], p2: [] },
    penaltyTurn: 'p1' // 'p1' tepadi
};

// Klaviatura tugmalari
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

// To'p obyekti
class Ball {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        this.reset();
        this.radius = 11;
        this.rotation = 0;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.height = 0;
        this.vHeight = 0;
    }

    update() {
        // Ishqalanish
        this.vx *= 0.985;
        this.vy *= 0.985;

        this.x += this.vx;
        this.y += this.yOffset ? this.vy : this.vy;

        // Balandlik va sakrash fizikasi
        if (this.height > 0 || this.vHeight > 0) {
            this.height += this.vHeight;
            this.vHeight -= 0.35; // gravitatsiya
            if (this.height <= 0) {
                this.height = 0;
                this.vHeight = -this.vHeight * 0.55; // sakrash
                if (Math.abs(this.vHeight) < 0.3) this.vHeight = 0;
            }
        }

        const speed = Math.hypot(this.vx, this.vy);
        this.rotation += speed * 0.08;

        // Maydon chegaralari (Goal hududidan tashqari)
        const leftLimit = 35;
        const rightLimit = canvas.width - 35;
        const topLimit = 35;
        const bottomLimit = canvas.height - 35;
        const goalTop = canvas.height / 2 - 65;
        const goalBottom = canvas.height / 2 + 65;

        // Yuqori va pastki chegara
        if (this.y - this.radius < topLimit) {
            this.y = topLimit + this.radius;
            this.vy = -this.vy * 0.7;
        } else if (this.y + this.radius > bottomLimit) {
            this.y = bottomLimit - this.radius;
            this.vy = -this.vy * 0.7;
        }

        // Chap darvoza chegarasi
        if (this.x - this.radius < leftLimit) {
            if (this.y > goalTop && this.y < goalBottom) {
                // Darvoza to'ri ichi
                if (this.x < 10) {
                    this.x = 10;
                    this.vx = -this.vx * 0.3;
                }
            } else {
                this.x = leftLimit + this.radius;
                this.vx = -this.vx * 0.7;
            }
        }

        // O'ng darvoza chegarasi
        if (this.x + this.radius > rightLimit) {
            if (this.y > goalTop && this.y < goalBottom) {
                if (this.x > canvas.width - 10) {
                    this.x = canvas.width - 10;
                    this.vx = -this.vx * 0.3;
                }
            } else {
                this.x = rightLimit - this.radius;
                this.vx = -this.vx * 0.7;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        // Soya
        const shadowScale = Math.max(0.4, 1 - this.height * 0.02);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 4 + this.height * 0.3, this.radius * shadowScale, (this.radius / 1.8) * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Haqiqiy to'p
        const drawY = this.y - this.height;
        ctx.translate(this.x, drawY);
        ctx.rotate(this.rotation);

        // Oq asos
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.8, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Qora beshburchaklar (Futbol to'pi naqshi)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const px = Math.cos(angle) * (this.radius * 0.65);
            const py = Math.sin(angle) * (this.radius * 0.65);
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// O'yinchi obyekti
class Player {
    constructor(x, y, isBot = false, color = '#3b82f6', number = '10') {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 18;
        this.isBot = isBot;
        this.color = color;
        this.number = number;
        this.baseSpeed = 3.6;
        this.speed = this.baseSpeed;
        this.stamina = 100;
        this.power = 0;
        this.isChargingPower = false;
        this.angle = 0;
        this.tackleCooldown = 0;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.stamina = 100;
        this.power = 0;
        this.isChargingPower = false;
    }

    update(ball, opponent) {
        if (this.isBot) {
            this.updateAI(ball, opponent);
        } else {
            this.updateManual();
        }

        // Inertsiya
        this.vx *= 0.82;
        this.vy *= 0.82;
        this.x += this.vx;
        this.y += this.vy;

        // Maydon devorlari
        const minX = 40 + this.radius;
        const maxX = canvas.width - 40 - this.radius;
        const minY = 40 + this.radius;
        const maxY = canvas.height - 40 - this.radius;

        this.x = Math.max(minX, Math.min(maxX, this.x));
        this.y = Math.max(minY, Math.min(maxY, this.y));

        // Stamina tiklanishi
        if (!this.isSprinting && this.stamina < 100) {
            this.stamina += 0.35;
        }

        if (this.tackleCooldown > 0) this.tackleCooldown--;
    }

    updateManual() {
        let dx = 0;
        let dy = 0;

        // Boshqaruv: WASD yoki Strelkalar
        if (!GAME_STATE.twoPlayer) {
            if (keys['w'] || keys['arrowup']) dy -= 1;
            if (keys['s'] || keys['arrowdown']) dy += 1;
            if (keys['a'] || keys['arrowleft']) dx -= 1;
            if (keys['d'] || keys['arrowright']) dx += 1;

            this.isSprinting = (keys['shift'] || keys['shiftleft'] || window.touchSprint) && this.stamina > 10;
            const shootKey = keys[' '] || keys['k'] || keys['enter'] || window.touchKick;

            this.handleShootKey(shootKey);
        } else {
            // 2 O'yinchi rejimi: P1 (WASD + Space) vs P2 (Strelkalar + Enter)
            if (this === player2) {
                if (keys['arrowup']) dy -= 1;
                if (keys['arrowdown']) dy += 1;
                if (keys['arrowleft']) dx -= 1;
                if (keys['arrowright']) dx += 1;
                this.isSprinting = (keys['control'] || keys['controlright'] || keys['0']) && this.stamina > 10;
                this.handleShootKey(keys['enter'] || keys['l'] || keys['numpad0']);
            } else {
                if (keys['w']) dy -= 1;
                if (keys['s']) dy += 1;
                if (keys['a']) dx -= 1;
                if (keys['d']) dx += 1;
                this.isSprinting = (keys['shift'] || keys['shiftleft']) && this.stamina > 10;
                this.handleShootKey(keys[' '] || keys['k']);
            }
        }

        // Harakat tezligi va yo'nalishi
        let currentSpeed = this.baseSpeed;
        if (this.isSprinting) {
            currentSpeed *= 1.45;
            this.stamina = Math.max(0, this.stamina - 0.7);
        }

        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy);
            this.vx += (dx / mag) * currentSpeed * 0.35;
            this.vy += (dy / mag) * currentSpeed * 0.35;
            this.angle = Math.atan2(dy, dx);
        }
    }

    handleShootKey(shootKey) {
        if (shootKey) {
            this.isChargingPower = true;
            this.power = Math.min(100, this.power + 2.5);
        } else if (this.isChargingPower) {
            // Zarba berish
            this.shootBall(ballInstance, this.power / 100);
            this.power = 0;
            this.isChargingPower = false;
        }
    }

    updateAI(ball, opponent) {
        // Sun'iy intellekt xatti-harakati
        let targetX = ball.x;
        let targetY = ball.y;

        const diffMultipliers = {
            easy: { reaction: 0.18, maxSpeed: 2.6, aggression: 0.4 },
            medium: { reaction: 0.28, maxSpeed: 3.4, aggression: 0.75 },
            hard: { reaction: 0.38, maxSpeed: 4.1, aggression: 0.95 }
        };

        const setting = diffMultipliers[GAME_STATE.difficulty] || diffMultipliers.medium;
        const distToBall = Math.hypot(ball.x - this.x, ball.y - this.y);

        // Raqib darvozasi chapda: (40, 270)
        const targetGoal = { x: 40, y: canvas.height / 2 };

        // Himoya yoki hujum taktikasini belgilash
        if (ball.x < canvas.width / 2) {
            // To'p o'z darvozasidan uzoqda, hujum qilish
            targetX = ball.x + 10;
            targetY = ball.y;
        } else {
            // Himoyalanish: To'p va o'z darvozasi (o'ng darvoza) o'rtasida turish
            if (distToBall > 140) {
                targetX = Math.min(canvas.width - 150, ball.x + 60);
                targetY = ball.y * 0.7 + (canvas.height / 2) * 0.3;
            }
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
            this.vx += (dx / dist) * setting.maxSpeed * setting.reaction;
            this.vy += (dy / dist) * setting.maxSpeed * setting.reaction;
            this.angle = Math.atan2(dy, dx);
        }

        // Bot to'pga yaqinlashganda darvozaga tepishi
        if (distToBall < this.radius + ball.radius + 15) {
            const angleToGoal = Math.atan2(targetGoal.y - this.y, targetGoal.x - this.x);
            // Tasodifiy ozgina xatolik
            const accuracyError = GAME_STATE.difficulty === 'hard' ? 0.05 : 0.25;
            const shootAngle = angleToGoal + (Math.random() - 0.5) * accuracyError;

            const kickPower = GAME_STATE.difficulty === 'hard' ? 14 : 11;
            ball.vx = Math.cos(shootAngle) * kickPower;
            ball.vy = Math.sin(shootAngle) * kickPower;
            ball.vHeight = 2.5;

            window.soundFX?.playKick(1.2);
        }
    }

    shootBall(ball, powerRatio) {
        const dist = Math.hypot(ball.x - this.x, ball.y - this.y);
        if (dist < this.radius + ball.radius + 18) {
            // O'yinchi qarab turgan yoki to'p markaziga nisbatan burchak
            const angle = Math.atan2(ball.y - this.y, ball.x - this.x);
            const actualPower = 8 + powerRatio * 15;

            ball.vx = Math.cos(angle) * actualPower;
            ball.vy = Math.sin(angle) * actualPower;
            ball.vHeight = 2 + powerRatio * 4;

            window.soundFX?.playKick(1 + powerRatio);

            // Ekran silkintirish effekti (kuchli zarba bo'lsa)
            if (powerRatio > 0.75) {
                triggerScreenShake(4);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // O'yinchi soyasi
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 4, this.radius * 0.9, this.radius * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // O'yinchi yo'nalish nishoni (kichik qanot)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, this.angle - 0.4, this.angle + 0.4);
        ctx.stroke();

        // O'yinchi tanasi
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(this.x - 4, this.y - 4, 3, this.x, this.y, this.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Raqami
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.number, this.x, this.y);

        // Zarba kuchi to'lganda ko'rsatuvchi aylanma bar
        if (this.power > 0) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (this.power / 100)));
            ctx.stroke();
        }

        ctx.restore();
    }
}

// O'yin obyektlarini yaratish
const ballInstance = new Ball(canvas.width / 2, canvas.height / 2);
const player1 = new Player(180, canvas.height / 2, false, '#2563eb', '10');
const player2 = new Player(canvas.width - 180, canvas.height / 2, true, '#dc2626', '7');

// Ekranni silkintirish
let screenShake = 0;
function triggerScreenShake(amount) {
    screenShake = amount;
}

// Maydonni chizish (HD Stadion maysazori va chiziqlar)
function drawPitch(ctx) {
    // Maysazor asosiy foni
    ctx.fillStyle = '#1e3922';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Maysazordagi chiziqlar (alternating stripes)
    const stripeWidth = 50;
    for (let x = 35; x < canvas.width - 35; x += stripeWidth) {
        const stripeIdx = Math.floor(x / stripeWidth);
        ctx.fillStyle = stripeIdx % 2 === 0 ? '#1b4a24' : '#17401f';
        ctx.fillRect(x, 35, Math.min(stripeWidth, canvas.width - 35 - x), canvas.height - 70);
    }

    // Stadion projektorlari (yorug'lik gradienti)
    const lightGlow = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 80, canvas.width / 2, canvas.height / 2, 450);
    lightGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    lightGlow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = lightGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Oq chiziqlar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;

    // Maydon tashqi to'rtburchagi
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // Markaziy chiziq
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 35);
    ctx.lineTo(canvas.width / 2, canvas.height - 35);
    ctx.stroke();

    // Markaziy doira va nuqta
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Chap jarima maydoni
    const boxHeight = 180;
    const boxWidth = 110;
    const boxY = (canvas.height - boxHeight) / 2;
    ctx.strokeRect(35, boxY, boxWidth, boxHeight);

    // Chap darvozabon maydonchasi
    const smallBoxHeight = 100;
    const smallBoxWidth = 50;
    ctx.strokeRect(35, (canvas.height - smallBoxHeight) / 2, smallBoxWidth, smallBoxHeight);

    // Chap penalti nuqtasi
    ctx.beginPath();
    ctx.arc(35 + 80, canvas.height / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // O'ng jarima maydoni
    ctx.strokeRect(canvas.width - 35 - boxWidth, boxY, boxWidth, boxHeight);
    ctx.strokeRect(canvas.width - 35 - smallBoxWidth, (canvas.height - smallBoxHeight) / 2, smallBoxWidth, smallBoxHeight);

    // O'ng penalti nuqtasi
    ctx.beginPath();
    ctx.arc(canvas.width - 35 - 80, canvas.height / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Burchak sektorlari
    [[35, 35], [35, canvas.height - 35], [canvas.width - 35, 35], [canvas.width - 35, canvas.height - 35]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Darvozalar va to'rlar
    drawGoalNets(ctx);
}

// Darvozalarni chizish
function drawGoalNets(ctx) {
    const goalH = 120;
    const goalW = 28;
    const goalY = (canvas.height - goalH) / 2;

    // Chap darvoza to'ri
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(35 - goalW, goalY, goalW, goalH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let y = goalY; y <= goalY + goalH; y += 8) {
        ctx.beginPath();
        ctx.moveTo(35 - goalW, y);
        ctx.lineTo(35, y);
        ctx.stroke();
    }
    for (let x = 35 - goalW; x <= 35; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, goalY);
        ctx.lineTo(x, goalY + goalH);
        ctx.stroke();
    }

    // Chap darvoza ustunlari
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(35, goalY, 5, 0, Math.PI * 2);
    ctx.arc(35, goalY + goalH, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(35, goalY);
    ctx.lineTo(35 - goalW, goalY);
    ctx.lineTo(35 - goalW, goalY + goalH);
    ctx.lineTo(35, goalY + goalH);
    ctx.stroke();

    // O'ng darvoza to'ri
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(canvas.width - 35, goalY, goalW, goalH);
    for (let y = goalY; y <= goalY + goalH; y += 8) {
        ctx.beginPath();
        ctx.moveTo(canvas.width - 35, y);
        ctx.lineTo(canvas.width - 35 + goalW, y);
        ctx.stroke();
    }
    for (let x = canvas.width - 35; x <= canvas.width - 35 + goalW; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, goalY);
        ctx.lineTo(x, goalY + goalH);
        ctx.stroke();
    }

    // O'ng darvoza ustunlari
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(canvas.width - 35, goalY, 5, 0, Math.PI * 2);
    ctx.arc(canvas.width - 35, goalY + goalH, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 35, goalY);
    ctx.lineTo(canvas.width - 35 + goalW, goalY);
    ctx.lineTo(canvas.width - 35 + goalW, goalY + goalH);
    ctx.lineTo(canvas.width - 35, goalY + goalH);
    ctx.stroke();
}

// O'yinchi va to'p to'qnashuvi
function handleCollisions(p, ball) {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const dist = Math.hypot(dx, dy);
    const minDist = p.radius + ball.radius;

    if (dist < minDist) {
        const overlap = minDist - dist;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);

        // To'pni siljitish
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        // Tezlik almashish
        const pSpeed = Math.hypot(p.vx, p.vy);
        const hitPower = Math.max(2.5, pSpeed * 1.3);

        ball.vx = nx * hitPower + p.vx * 0.4;
        ball.vy = ny * hitPower + p.vy * 0.4;

        window.soundFX?.playKick(0.5);
    }
}

// 2 ta o'yinchi bir-biriga urilganda
function handlePlayerCollisions(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = p1.radius + p2.radius;

    if (dist < minDist) {
        const overlap = (minDist - dist) / 2;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);

        p1.x -= nx * overlap;
        p1.y -= ny * overlap;
        p2.x += nx * overlap;
        p2.y += ny * overlap;
    }
}

// Konfetti zarrachalari
const confettis = [];
function spawnConfetti() {
    for (let i = 0; i < 90; i++) {
        confettis.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.5) * 16 - 3,
            size: Math.random() * 8 + 4,
            color: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#ffffff'][Math.floor(Math.random() * 6)],
            rot: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 10,
            alpha: 1
        });
    }
}

function updateConfetti(ctx) {
    for (let i = confettis.length - 1; i >= 0; i--) {
        const c = confettis[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.25; // tortishish
        c.rot += c.vRot;
        c.alpha -= 0.015;

        if (c.alpha <= 0) {
            confettis.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rot * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size / 1.5);
        ctx.restore();
    }
}

// Gol tekshiruvi
function checkGoal() {
    if (GAME_STATE.goalCelebration) return;

    const goalH = 120;
    const goalTop = (canvas.height - goalH) / 2;
    const goalBottom = goalTop + goalH;

    // Chap darvoza ichiga kirsa (Bot / P2 ga gol urildi, P1 yutdi)
    if (ballInstance.x < 30 && ballInstance.y > goalTop && ballInstance.y < goalBottom) {
        onGoalScored('p2', "BOT / QIZIL JAMOA GOL URDİ!");
    }
    // O'ng darvoza ichiga kirsa (Siz / P1 gol urdingiz!)
    else if (ballInstance.x > canvas.width - 30 && ballInstance.y > goalTop && ballInstance.y < goalBottom) {
        onGoalScored('p1', "GOOOOL! SIZ GOL URDINGIZ! ⚽🔥");
    }
}

function onGoalScored(scorer, message) {
    GAME_STATE.goalCelebration = true;
    GAME_STATE.scores[scorer]++;
    updateScoreboardUI();

    window.soundFX?.playGoalCheer();
    window.soundFX?.playWhistle();
    spawnConfetti();
    triggerScreenShake(8);

    const banner = document.getElementById('goalBanner');
    const bannerText = document.getElementById('goalText');
    bannerText.textContent = message;
    banner.classList.add('show');

    setTimeout(() => {
        banner.classList.remove('show');
        resetPositionsAfterGoal();
        GAME_STATE.goalCelebration = false;
        window.soundFX?.playWhistle();
    }, 2400);
}

function resetPositionsAfterGoal() {
    ballInstance.reset();
    player1.reset();
    player2.reset();
}

// UI yangilanishlari
function updateScoreboardUI() {
    document.getElementById('scoreP1').textContent = GAME_STATE.scores.p1;
    document.getElementById('scoreP2').textContent = GAME_STATE.scores.p2;

    // Stamina va Power barlari
    const staminaBar = document.getElementById('staminaFill');
    if (staminaBar) {
        staminaBar.style.width = `${player1.stamina}%`;
    }
    const powerBar = document.getElementById('powerFill');
    if (powerBar) {
        powerBar.style.width = `${player1.power}%`;
    }
}

// Taymer yangilanishi
let timerInterval = null;
function startMatchTimer() {
    clearInterval(timerInterval);
    GAME_STATE.gameTime = 0;
    timerInterval = setInterval(() => {
        if (!GAME_STATE.isPaused && !GAME_STATE.goalCelebration && GAME_STATE.mode === 'match') {
            GAME_STATE.gameTime++;
            const minutes = Math.floor((GAME_STATE.gameTime / GAME_STATE.matchDuration) * 90);
            const timeLabel = document.getElementById('matchTime');
            timeLabel.textContent = `${Math.min(90, minutes)}'`;

            if (GAME_STATE.gameTime >= GAME_STATE.matchDuration) {
                endMatch();
            }
        }
    }, 1000);
}

function endMatch() {
    clearInterval(timerInterval);
    GAME_STATE.isGameOver = true;
    window.soundFX?.playWhistle();

    let title = "O'yin Yakunlandi!";
    let desc = "";

    if (GAME_STATE.scores.p1 > GAME_STATE.scores.p2) {
        title = "G'ALABA! 🏆";
        desc = `Tabriklaymiz! Siz ${GAME_STATE.scores.p1} : ${GAME_STATE.scores.p2} hisobida g'alaba qozondingiz!`;
        window.soundFX?.playGoalCheer();
    } else if (GAME_STATE.scores.p1 < GAME_STATE.scores.p2) {
        title = "MAG'LUBIYAT! 😢";
        desc = `Afsuski, bot ${GAME_STATE.scores.p2} : ${GAME_STATE.scores.p1} hisobida yutdi. Yana urinib ko'ring!`;
    } else {
        title = "DURANG! 🤝";
        desc = `Qiziqarli o'yin! Hisob ${GAME_STATE.scores.p1} : ${GAME_STATE.scores.p2} bo'ldi!`;
    }

    showGameOverModal(title, desc);
}

function showGameOverModal(title, desc) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalDesc').textContent = desc;
    document.getElementById('gameOverModal').classList.add('open');
}

// ==========================================
// PENALTI REJIMI (PENALTY SHOOTOUT MODE)
// ==========================================
const penaltyState = {
    targetX: canvas.width / 2,
    targetY: canvas.height / 2 - 40,
    ballX: canvas.width / 2,
    ballY: canvas.height - 70,
    ballScale: 1,
    isKicked: false,
    flightProgress: 0,
    gkX: canvas.width / 2,
    gkY: canvas.height / 2 - 20,
    gkTargetX: canvas.width / 2,
    gkTargetY: canvas.height / 2 - 20,
    isGkSaved: false,
    curve: 0
};

function initPenaltyMode() {
    GAME_STATE.mode = 'penalty';
    GAME_STATE.scores = { p1: 0, p2: 0 };
    GAME_STATE.penaltyRound = 1;
    GAME_STATE.penaltyScores = { p1: [], p2: [] };
    updatePenaltyDots();
    resetPenaltyRound();
}

function resetPenaltyRound() {
    penaltyState.targetX = canvas.width / 2;
    penaltyState.targetY = canvas.height / 2 - 50;
    penaltyState.ballX = canvas.width / 2;
    penaltyState.ballY = canvas.height - 70;
    penaltyState.ballScale = 1;
    penaltyState.isKicked = false;
    penaltyState.flightProgress = 0;
    penaltyState.gkX = canvas.width / 2;
    penaltyState.gkY = canvas.height / 2 - 30;
    penaltyState.isGkSaved = false;

    // Darvozabonning nishonga nisbatan reaktsiyasini sozlash
    const diffMap = { easy: 0.35, medium: 0.65, hard: 0.85 };
    penaltyState.gkSuccessRate = diffMap[GAME_STATE.difficulty] || 0.6;
}

canvas.addEventListener('mousemove', (e) => {
    if (GAME_STATE.mode !== 'penalty' || penaltyState.isKicked) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Nishonni darvoza maydonida chegaralash
    penaltyState.targetX = Math.max(canvas.width / 2 - 220, Math.min(canvas.width / 2 + 220, mouseX));
    penaltyState.targetY = Math.max(140, Math.min(340, mouseY));
});

canvas.addEventListener('click', () => {
    if (GAME_STATE.mode === 'penalty' && !penaltyState.isKicked) {
        shootPenalty();
    }
});

function shootPenalty() {
    penaltyState.isKicked = true;
    window.soundFX?.playKick(1.4);

    // Darvozabon AI qayerga sakrashini hisoblaydi
    const willSave = Math.random() < penaltyState.gkSuccessRate;
    if (willSave) {
        penaltyState.gkTargetX = penaltyState.targetX + (Math.random() - 0.5) * 30;
        penaltyState.gkTargetY = penaltyState.targetY + (Math.random() - 0.5) * 30;
    } else {
        // Darvozabon boshqa burchakka sakraydi yoki kechikadi
        const wrongSide = penaltyState.targetX > canvas.width / 2 ? -150 : 150;
        penaltyState.gkTargetX = canvas.width / 2 + wrongSide;
        penaltyState.gkTargetY = 220;
    }
}

function updatePenalty() {
    if (!penaltyState.isKicked) return;

    penaltyState.flightProgress += 0.035;

    // To'p nishonga qarab harakatlanishi
    const t = penaltyState.flightProgress;
    penaltyState.ballX = (canvas.width / 2) + (penaltyState.targetX - canvas.width / 2) * t;
    penaltyState.ballY = (canvas.height - 70) + (penaltyState.targetY - (canvas.height - 70)) * t;
    penaltyState.ballScale = 1 - t * 0.55;

    // Darvozabon sakrashi
    penaltyState.gkX += (penaltyState.gkTargetX - penaltyState.gkX) * 0.12;
    penaltyState.gkY += (penaltyState.gkTargetY - penaltyState.gkY) * 0.12;

    if (t >= 1) {
        // To'p darvozaga yetib bordi
        const distToGk = Math.hypot(penaltyState.targetX - penaltyState.gkX, penaltyState.targetY - penaltyState.gkY);
        const saved = distToGk < 55;

        if (saved) {
            window.soundFX?.playSave();
            showGoalBanner("SEYV! 🧤 Darvozabon qaytardi!", '#ef4444');
            GAME_STATE.penaltyScores.p1.push(false);
        } else {
            window.soundFX?.playGoalCheer();
            spawnConfetti();
            showGoalBanner("GOOOOL! ⚽ Ajoyib zarba!", '#10b981');
            GAME_STATE.scores.p1++;
            GAME_STATE.penaltyScores.p1.push(true);
        }

        updatePenaltyDots();
        updateScoreboardUI();

        setTimeout(() => {
            if (GAME_STATE.penaltyScores.p1.length >= 5) {
                endPenaltyShootout();
            } else {
                resetPenaltyRound();
            }
        }, 2200);

        penaltyState.isKicked = false;
    }
}

function showGoalBanner(msg, color) {
    const banner = document.getElementById('goalBanner');
    const bannerText = document.getElementById('goalText');
    banner.style.borderColor = color;
    bannerText.textContent = msg;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 2000);
}

function updatePenaltyDots() {
    const dotsContainer = document.getElementById('penaltyDots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i < GAME_STATE.penaltyScores.p1.length) {
            dot.classList.add(GAME_STATE.penaltyScores.p1[i] ? 'scored' : 'missed');
        }
        dotsContainer.appendChild(dot);
    }
}

function endPenaltyShootout() {
    const scored = GAME_STATE.penaltyScores.p1.filter(Boolean).length;
    let title = scored >= 3 ? "AJOYIB G'ALABA! 🏆" : "PENALTI YAKUNLANDI!";
    let desc = `Siz 5 ta penaltidan ${scored} tasini muvaffaqiyatli kiritdingiz!`;
    showGameOverModal(title, desc);
}

function drawPenaltyMode(ctx) {
    // 3D Stadioni darvozasi ko'rinishi
    ctx.fillStyle = '#0f2415';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Maysazor
    const grassGrad = ctx.createLinearGradient(0, 180, 0, canvas.height);
    grassGrad.addColorStop(0, '#164220');
    grassGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 200, canvas.width, canvas.height - 200);

    // Stadion projektorlari va tribunalari
    ctx.fillStyle = '#091522';
    ctx.fillRect(0, 0, canvas.width, 200);

    // Katta Darvoza
    const goalLeft = canvas.width / 2 - 250;
    const goalRight = canvas.width / 2 + 250;
    const goalTop = 130;
    const goalBottom = 380;

    // Darvoza to'ri (Nets)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(goalLeft, goalTop, 500, goalBottom - goalTop);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    for (let x = goalLeft; x <= goalRight; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, goalTop);
        ctx.lineTo(x, goalBottom);
        ctx.stroke();
    }
    for (let y = goalTop; y <= goalBottom; y += 18) {
        ctx.beginPath();
        ctx.moveTo(goalLeft, y);
        ctx.lineTo(goalRight, y);
        ctx.stroke();
    }

    // Darvoza ustunlari (Post & Crossbar)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(goalLeft, goalBottom);
    ctx.lineTo(goalLeft, goalTop);
    ctx.lineTo(goalRight, goalTop);
    ctx.lineTo(goalRight, goalBottom);
    ctx.stroke();

    // Darvozabon (Goalkeeper)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(penaltyState.gkX, goalBottom - 5, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darvozabon tanasi va qo'llari
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(penaltyState.gkX, penaltyState.gkY - 20, 16, 0, Math.PI * 2); // bosh
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(penaltyState.gkX - 18, penaltyState.gkY - 5, 36, 45); // tana

    // Qo'lqoplar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(penaltyState.gkX - 28, penaltyState.gkY + 5, 12, 0, Math.PI * 2);
    ctx.arc(penaltyState.gkX + 28, penaltyState.gkY + 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Nishon (Reticle)
    if (!penaltyState.isKicked) {
        ctx.save();
        ctx.strokeStyle = '#38ef7d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(penaltyState.targetX, penaltyState.targetY, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(penaltyState.targetX - 28, penaltyState.targetY);
        ctx.lineTo(penaltyState.targetX + 28, penaltyState.targetY);
        ctx.moveTo(penaltyState.targetX, penaltyState.targetY - 28);
        ctx.lineTo(penaltyState.targetX, penaltyState.targetY + 28);
        ctx.stroke();
        ctx.restore();
    }

    // Penalti to'pi
    ctx.save();
    const pRadius = 22 * penaltyState.ballScale;
    ctx.translate(penaltyState.ballX, penaltyState.ballY);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, pRadius * 0.8, pRadius, pRadius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, pRadius, 0, Math.PI * 2);
    const bGrad = ctx.createRadialGradient(-pRadius * 0.3, -pRadius * 0.3, 2, 0, 0, pRadius);
    bGrad.addColorStop(0, '#ffffff');
    bGrad.addColorStop(0.8, '#cbd5e1');
    bGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = bGrad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

// ==========================================
// ASOSIY O'YIN SIKLI (MAIN GAME LOOP)
// ==========================================
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    if (GAME_STATE.mode === 'match') {
        if (!GAME_STATE.isPaused) {
            player1.update(ballInstance, player2);
            player2.update(ballInstance, player1);
            ballInstance.update();

            handleCollisions(player1, ballInstance);
            handleCollisions(player2, ballInstance);
            handlePlayerCollisions(player1, player2);

            checkGoal();
            updateScoreboardUI();
        }

        drawPitch(ctx);
        ballInstance.draw(ctx);
        player1.draw(ctx);
        player2.draw(ctx);
        drawRadar(ctx);
    } else {
        // Penalti rejimi
        updatePenalty();
        drawPenaltyMode(ctx);
    }

    updateConfetti(ctx);
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Mini radar (Maydon xaritasi)
function drawRadar(ctx) {
    const radarW = 120;
    const radarH = 68;
    const radarX = canvas.width / 2 - radarW / 2;
    const radarY = canvas.height - radarH - 8;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(radarX, radarY, radarW, radarH);
    ctx.strokeRect(radarX, radarY, radarW, radarH);

    // O'rta chiziq
    ctx.beginPath();
    ctx.moveTo(radarX + radarW / 2, radarY);
    ctx.lineTo(radarX + radarW / 2, radarY + radarH);
    ctx.stroke();

    // Nuqtalar
    const mapX = (x) => radarX + (x / canvas.width) * radarW;
    const mapY = (y) => radarY + (y / canvas.height) * radarH;

    // To'p
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mapX(ballInstance.x), mapY(ballInstance.y), 2.5, 0, Math.PI * 2);
    ctx.fill();

    // P1
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(mapX(player1.x), mapY(player1.y), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // P2
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(mapX(player2.x), mapY(player2.y), 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ==========================================
// TUGMALAR VA HODISALAR (EVENT LISTENERS)
// ==========================================
document.getElementById('modeMatch').addEventListener('click', () => {
    document.getElementById('modeMatch').classList.add('active');
    document.getElementById('modePenalty').classList.remove('active');
    GAME_STATE.mode = 'match';
    document.getElementById('matchTime').style.display = 'block';
    document.getElementById('penaltyDots').style.display = 'none';
    resetPositionsAfterGoal();
    startMatchTimer();
});

document.getElementById('modePenalty').addEventListener('click', () => {
    document.getElementById('modePenalty').classList.add('active');
    document.getElementById('modeMatch').classList.remove('active');
    document.getElementById('matchTime').style.display = 'none';
    document.getElementById('penaltyDots').style.display = 'flex';
    initPenaltyMode();
});

// Sozlamalar modali
const settingsModal = document.getElementById('settingsModal');
document.getElementById('btnSettings').addEventListener('click', () => {
    settingsModal.classList.add('open');
});
document.getElementById('closeSettings').addEventListener('click', () => {
    settingsModal.classList.remove('open');
});

// Qiyinlik tugmalari
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        GAME_STATE.difficulty = btn.dataset.diff;
    });
});

// Rejim (1P vs 2P)
document.querySelectorAll('.player-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.player-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        GAME_STATE.twoPlayer = btn.dataset.players === '2';
        player2.isBot = !GAME_STATE.twoPlayer;
        const p2Label = document.getElementById('p2NameLabel');
        if (p2Label) {
            p2Label.textContent = GAME_STATE.twoPlayer ? "2-O'YINCHI (QIZIL)" : "BOT (QIZIL)";
        }
    });
});

// Qayta boshlash
document.getElementById('btnRestart').addEventListener('click', restartCurrentGame);
document.getElementById('modalRestartBtn').addEventListener('click', () => {
    document.getElementById('gameOverModal').classList.remove('open');
    restartCurrentGame();
});

function restartCurrentGame() {
    GAME_STATE.scores = { p1: 0, p2: 0 };
    GAME_STATE.isGameOver = false;
    updateScoreboardUI();
    if (GAME_STATE.mode === 'match') {
        resetPositionsAfterGoal();
        startMatchTimer();
    } else {
        initPenaltyMode();
    }
    window.soundFX?.playWhistle();
}

// Ovoz yoqish/o'chirish
const btnSound = document.getElementById('btnSound');
btnSound.addEventListener('click', () => {
    if (window.soundFX) {
        window.soundFX.enabled = !window.soundFX.enabled;
        btnSound.innerHTML = window.soundFX.enabled ? '🔊 Ovoz: Yoqilgan' : '🔇 Ovoz: Oʻchirilgan';
    }
});

// To'liq ekran (Fullscreen)
document.getElementById('btnFullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// Touch boshqaruvlari
['touchUp', 'touchDown', 'touchLeft', 'touchRight'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const keyMap = {
        touchUp: 'arrowup',
        touchDown: 'arrowdown',
        touchLeft: 'arrowleft',
        touchRight: 'arrowright'
    };
    const key = keyMap[id];
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
});

const touchKickBtn = document.getElementById('touchKick');
if (touchKickBtn) {
    touchKickBtn.addEventListener('touchstart', (e) => { e.preventDefault(); window.touchKick = true; });
    touchKickBtn.addEventListener('touchend', (e) => { e.preventDefault(); window.touchKick = false; });
}
const touchSprintBtn = document.getElementById('touchSprint');
if (touchSprintBtn) {
    touchSprintBtn.addEventListener('touchstart', (e) => { e.preventDefault(); window.touchSprint = true; });
    touchSprintBtn.addEventListener('touchend', (e) => { e.preventDefault(); window.touchSprint = false; });
}

// O'yinni boshlash
startMatchTimer();
requestAnimationFrame(gameLoop);
