/**
 * Mashina Poygasi (Highway Traffic Racer & Supercar Drift)
 * 2D Yuqori tezlikdagi trassa poygasi
 */

const canvas = document.getElementById('racingCanvas');
const ctx = canvas.getContext('2d');

// Trassa vertikal o'lchamlari
canvas.width = 680;
canvas.height = 820;

// O'yin sozlamalari va holati
const GAME = {
    isRunning: false,
    isGameOver: false,
    isPaused: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('car_highscore') || '0'),
    coins: 0,
    distance: 0, // metr
    combo: 0,
    comboTimer: 0,
    screenShake: 0,
    cameraOffset: 0,
    selectedCarId: 'ferrari',
    magnetTimer: 0,
    shieldActive: false
};

// Mavjud superkarlar
const CAR_MODELS = {
    ferrari: {
        name: "Ferrari GT",
        color: "#ef4444",
        roofColor: "#991b1b",
        maxSpeed: 280,
        accel: 1.1,
        handling: 1.15,
        nitroMult: 1.35,
        armor: 1.0
    },
    lambo: {
        name: "Lamborghini SV",
        color: "#f59e0b",
        roofColor: "#b45309",
        maxSpeed: 320,
        accel: 1.35,
        handling: 1.25,
        nitroMult: 1.5,
        armor: 0.9
    },
    cyber: {
        name: "Cyber Neon GT",
        color: "#06b6d4",
        roofColor: "#0284c7",
        maxSpeed: 300,
        accel: 1.25,
        handling: 1.3,
        nitroMult: 1.6,
        armor: 1.1
    },
    police: {
        name: "Police Interceptor",
        color: "#0f172a",
        roofColor: "#ffffff",
        maxSpeed: 290,
        accel: 1.1,
        handling: 1.1,
        nitroMult: 1.3,
        armor: 1.6,
        isPolice: true
    }
};

// Klaviatura boshqaruvi
const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    nitro: false
};

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.up = true;
    if (k === 's' || k === 'arrowdown') keys.down = true;
    if (k === 'a' || k === 'arrowleft') keys.left = true;
    if (k === 'd' || k === 'arrowright') keys.right = true;
    if (k === ' ' || k === 'shift') keys.nitro = true;
    if (k === 'h') window.carAudio?.playHorn();

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.up = false;
    if (k === 's' || k === 'arrowdown') keys.down = false;
    if (k === 'a' || k === 'arrowleft') keys.left = false;
    if (k === 'd' || k === 'arrowright') keys.right = false;
    if (k === ' ' || k === 'shift') keys.nitro = false;
});

// Trassa tasmalarining koordinatalari (4 ta tasma)
const LANES = [140, 260, 420, 540];

// O'yinchi mashinasi
class PlayerCar {
    constructor() {
        this.reset();
    }

    reset() {
        this.width = 46;
        this.height = 86;
        this.x = canvas.width / 2;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.speed = 0; // km/h
        this.speedMps = 0; // piksellar/kadr
        this.angle = 0;
        this.health = 100;
        this.nitro = 100;
        this.isNitroActive = false;
        this.model = CAR_MODELS[GAME.selectedCarId];
    }

    update() {
        if (GAME.isGameOver) return;

        // Tezlanish va Tormoz
        const maxCarSpeed = this.isNitroActive ? this.model.maxSpeed * 1.25 : this.model.maxSpeed;
        const accelRate = (this.isNitroActive ? 2.4 : 1.2) * this.model.accel;

        if (keys.up || window.touchGas) {
            this.speed = Math.min(maxCarSpeed, this.speed + accelRate);
        } else if (keys.down || window.touchBrake) {
            this.speed = Math.max(0, this.speed - 3.2);
            if (this.speed > 80 && Math.random() < 0.2) {
                window.carAudio?.playSkid();
                spawnSkidMark(this.x, this.y + 35);
            }
        } else {
            // Bo'sh harakat (inertsiyada pasayish)
            this.speed = Math.max(0, this.speed - 0.45);
        }

        // Nitro boshqaruvi
        const nitroPressed = (keys.nitro || window.touchNitro) && this.nitro > 5 && this.speed > 40;
        if (nitroPressed) {
            if (!this.isNitroActive) window.carAudio?.playNitro();
            this.isNitroActive = true;
            this.nitro = Math.max(0, this.nitro - 0.75);
            triggerScreenShake(1.5);
            spawnNitroParticles(this.x, this.y + 40);
        } else {
            this.isNitroActive = false;
            if (this.nitro < 100) this.nitro += 0.12; // asta sekin tiklanish
        }

        // Chap / O'ng boshqaruv
        const steerSpeed = (this.speed / 160) * 4.6 * this.model.handling;
        let targetAngle = 0;

        if (keys.left || window.touchLeft) {
            this.vx = -steerSpeed;
            targetAngle = -0.12;
            if (this.speed > 140 && Math.random() < 0.15) spawnSkidMark(this.x, this.y + 35);
        } else if (keys.right || window.touchRight) {
            this.vx = steerSpeed;
            targetAngle = 0.12;
            if (this.speed > 140 && Math.random() < 0.15) spawnSkidMark(this.x, this.y + 35);
        } else {
            this.vx *= 0.75;
        }

        this.x += this.vx;
        this.angle += (targetAngle - this.angle) * 0.2;

        // Yo'l chetidan chiqib ketmaslik
        const minX = 75;
        const maxX = canvas.width - 75;
        if (this.x < minX) {
            this.x = minX;
            this.speed *= 0.94;
            triggerScreenShake(3);
        } else if (this.x > maxX) {
            this.x = maxX;
            this.speed *= 0.94;
            triggerScreenShake(3);
        }

        // Tezlikni piksel tezligiga aylantirish
        this.speedMps = this.speed * 0.085;

        // Dvigatel ovozini yangilash
        window.carAudio?.updateEngine(this.speed / this.model.maxSpeed, this.isNitroActive);

        // Masofa va ball
        if (this.speed > 10) {
            const deltaDist = (this.speed / 3.6) * (1 / 60); // metr
            GAME.distance += deltaDist;
            GAME.score += Math.floor((this.speed / 40) * (GAME.combo > 0 ? GAME.combo : 1));
        }

        if (GAME.comboTimer > 0) {
            GAME.comboTimer--;
            if (GAME.comboTimer <= 0) {
                GAME.combo = 0;
                document.getElementById('comboBadge').style.display = 'none';
            }
        }

        if (GAME.magnetTimer > 0) GAME.magnetTimer--;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Fara nuri (Yorug'lik konusi asfaltga tushadi)
        const lightGrad = ctx.createLinearGradient(0, -this.height / 2, 0, -this.height / 2 - 240);
        lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(-16, -this.height / 2);
        ctx.lineTo(-70, -this.height / 2 - 240);
        ctx.lineTo(70, -this.height / 2 - 240);
        ctx.lineTo(16, -this.height / 2);
        ctx.fill();

        // Mashina soyasi
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(-this.width / 2 + 3, -this.height / 2 + 5, this.width, this.height, 10);
        ctx.fill();

        // Mashina korpusi
        ctx.fillStyle = this.model.color;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);
        ctx.fill();

        // Tom va orqa oynasi
        ctx.fillStyle = this.model.roofColor;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2 + 5, -this.height / 2 + 20, this.width - 10, 42, 6);
        ctx.fill();

        // Old oyna (Glass)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-this.width / 2 + 6, -this.height / 2 + 15, this.width - 12, 16, 4);
        ctx.fill();

        // Yon ko'zgular
        ctx.fillStyle = this.model.color;
        ctx.fillRect(-this.width / 2 - 4, -this.height / 2 + 25, 4, 8);
        ctx.fillRect(this.width / 2, -this.height / 2 + 25, 4, 8);

        // Fara chiroqlari (Headlights)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 2 + 4, -this.height / 2, 8, 4);
        ctx.fillRect(this.width / 2 - 12, -this.height / 2, 8, 4);

        // Orqa chiroqlar (Brakelights)
        const isBraking = keys.down || window.touchBrake;
        ctx.fillStyle = isBraking ? '#ff0000' : '#b91c1c';
        if (isBraking) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
        }
        ctx.fillRect(-this.width / 2 + 4, this.height / 2 - 4, 9, 4);
        ctx.fillRect(this.width / 2 - 13, this.height / 2 - 4, 9, 4);
        ctx.shadowBlur = 0;

        // Politsiya mashinasi bo'lsa miltillovchi sirenalar
        if (this.model.isPolice) {
            const isBlue = Math.floor(Date.now() / 150) % 2 === 0;
            ctx.fillStyle = isBlue ? '#3b82f6' : '#ef4444';
            ctx.fillRect(-8, -this.height / 2 + 35, 7, 6);
            ctx.fillStyle = isBlue ? '#ef4444' : '#3b82f6';
            ctx.fillRect(1, -this.height / 2 + 35, 7, 6);
        }

        // Qalqon effekti (Shield Dome)
        if (GAME.shieldActive) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width * 0.9, this.height * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

// Tirbandlikdagi mashinalar (Traffic Cars AI)
class TrafficCar {
    constructor(x, y, speed, type) {
        this.width = type === 'truck' ? 52 : 44;
        this.height = type === 'truck' ? 120 : 82;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.type = type;
        this.color = this.getRandomColor();
        this.passed = false;
        this.laneChangeTimer = Math.random() * 200 + 100;
        this.targetLaneX = x;
    }

    getRandomColor() {
        if (this.type === 'taxi') return '#facc15';
        if (this.type === 'truck') return '#64748b';
        const colors = ['#3b82f6', '#10b981', '#a855f7', '#e2e8f0', '#334155'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(playerSpeedMps) {
        // O'yinchiga nisbiy harakat
        const trafficSpeedMps = this.speed * 0.085;
        this.y += playerSpeedMps - trafficSpeedMps;

        // Tasmalar bo'yicha manyovr qilish
        this.laneChangeTimer--;
        if (this.laneChangeTimer <= 0) {
            const randomLane = LANES[Math.floor(Math.random() * LANES.length)];
            this.targetLaneX = randomLane;
            this.laneChangeTimer = Math.random() * 300 + 200;
        }

        if (Math.abs(this.targetLaneX - this.x) > 2) {
            this.x += (this.targetLaneX - this.x) * 0.04;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Soya
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(-this.width / 2 + 2, -this.height / 2 + 4, this.width, this.height, 8);
        ctx.fill();

        // Korpus
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
        ctx.fill();

        // Tomi
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-this.width / 2 + 5, -this.height / 2 + 15, this.width - 10, this.height * 0.5, 4);
        ctx.fill();

        // Fara va stop chiroqlar
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-this.width / 2 + 3, -this.height / 2, 7, 3);
        ctx.fillRect(this.width / 2 - 10, -this.height / 2, 7, 3);

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-this.width / 2 + 3, this.height / 2 - 3, 7, 3);
        ctx.fillRect(this.width / 2 - 10, this.height / 2 - 3, 7, 3);

        if (this.type === 'taxi') {
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("TAXI", 0, 0);
        }

        ctx.restore();
    }
}

// Bonuslar (Tangalar, Nitro, Qalqon, Magnit)
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'coin', 'nitro', 'shield', 'magnet', 'repair'
        this.radius = 16;
        this.rot = 0;
    }

    update(playerSpeedMps, player) {
        this.y += playerSpeedMps;
        this.rot += 0.06;

        // Magnit tortishi
        if (GAME.magnetTimer > 0 && this.type === 'coin') {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 260) {
                this.x += (dx / dist) * 12;
                this.y += (dy / dist) * 12;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === 'coin') {
            ctx.scale(Math.cos(this.rot), 1);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#92400e';
            ctx.font = 'bold 12px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
        } else if (this.type === 'nitro') {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.roundRect(-10, -14, 20, 28, 6);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('N2O', 0, 4);
        } else if (this.type === 'shield') {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', 0, 0);
        } else if (this.type === 'magnet') {
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧲', 0, 0);
        } else if (this.type === 'repair') {
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔧', 0, 0);
        }

        ctx.restore();
    }
}

// Skid marks (Tormoz va drift izlari)
const skidMarks = [];
function spawnSkidMark(x, y) {
    skidMarks.push({ x: x - 15, y, alpha: 0.5 });
    skidMarks.push({ x: x + 15, y, alpha: 0.5 });
}

// Nitro olov zarrachalari
const particles = [];
function spawnNitroParticles(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 16,
            y: y + Math.random() * 8,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 8 + 6,
            size: Math.random() * 6 + 4,
            color: Math.random() > 0.4 ? '#06b6d4' : '#f97316',
            alpha: 1
        });
    }
}

// Portlash va to'qnashuv zarrachalari
function spawnExplosion(x, y) {
    for (let i = 0; i < 45; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.5) * 16,
            size: Math.random() * 8 + 4,
            color: ['#ef4444', '#f97316', '#fbbf24', '#334155'][Math.floor(Math.random() * 4)],
            alpha: 1
        });
    }
}

// Asosiy o'yin obyekti
const player = new PlayerCar();
let trafficCars = [];
let powerUps = [];
let roadY = 0;

// Trassa chizish
function drawRoad(ctx) {
    // Asfalt
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yo'l cheti (Yashil maysazor / shahar foni)
    ctx.fillStyle = '#0d131f';
    ctx.fillRect(0, 0, 50, canvas.height);
    ctx.fillRect(canvas.width - 50, 0, 50, canvas.height);

    // Qizil-oq kerblar (Road Curbs)
    const curbHeight = 40;
    const curbOffset = roadY % curbHeight;
    for (let y = -curbHeight; y < canvas.height + curbHeight; y += curbHeight) {
        const isRed = Math.floor((y - curbOffset) / curbHeight) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
        ctx.fillRect(45, y + curbOffset, 10, curbHeight);
        ctx.fillRect(canvas.width - 55, y + curbOffset, 10, curbHeight);
    }

    // Tasmalar o'rtasidagi uzuq-yuluq chiziqlar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 4;
    ctx.setLineDash([35, 25]);
    ctx.lineDashOffset = -roadY;

    // 3 ta oraliq chiziq (4 ta tasma uchun)
    [200, 340, 480].forEach(laneX => {
        ctx.beginPath();
        ctx.moveTo(laneX, 0);
        ctx.lineTo(laneX, canvas.height);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Drift izlarini chizish
    for (let i = skidMarks.length - 1; i >= 0; i--) {
        const sm = skidMarks[i];
        sm.y += player.speedMps;
        sm.alpha -= 0.003;
        if (sm.y > canvas.height + 50 || sm.alpha <= 0) {
            skidMarks.splice(i, 1);
            continue;
        }
        ctx.fillStyle = `rgba(0, 0, 0, ${sm.alpha})`;
        ctx.fillRect(sm.x - 3, sm.y, 6, 8);
    }
}

// Trafik va Bonuslarni yaratish
let spawnTrafficTimer = 0;
let spawnPowerupTimer = 0;

function handleSpawns() {
    spawnTrafficTimer++;
    if (spawnTrafficTimer > Math.max(35, 80 - player.speed / 5)) {
        spawnTrafficTimer = 0;
        const lane = LANES[Math.floor(Math.random() * LANES.length)];
        const types = ['sedan', 'sedan', 'taxi', 'sport', 'truck'];
        const type = types[Math.floor(Math.random() * types.length)];
        const speed = type === 'truck' ? 70 + Math.random() * 20 : 90 + Math.random() * 40;
        trafficCars.push(new TrafficCar(lane, -140, speed, type));
    }

    spawnPowerupTimer++;
    if (spawnPowerupTimer > 180) {
        spawnPowerupTimer = 0;
        const lane = LANES[Math.floor(Math.random() * LANES.length)];
        const types = ['coin', 'coin', 'coin', 'nitro', 'shield', 'magnet', 'repair'];
        const pType = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(lane, -60, pType));
    }
}

// To'qnashuv va Quvib o'tish tekshiruvi
function handleCollisions() {
    const pBox = {
        left: player.x - player.width / 2 + 4,
        right: player.x + player.width / 2 - 4,
        top: player.y - player.height / 2 + 6,
        bottom: player.y + player.height / 2 - 6
    };

    // Trafik bilan tekshiruv
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const t = trafficCars[i];
        const tBox = {
            left: t.x - t.width / 2,
            right: t.x + t.width / 2,
            top: t.y - t.height / 2,
            bottom: t.y + t.height / 2
        };

        // Yaqin quvib o'tish (Close Call)
        if (!t.passed && Math.abs(t.y - player.y) < 30 && player.speed > 120) {
            const sideDist = Math.abs(t.x - player.x);
            if (sideDist < 58 && sideDist > 30) {
                t.passed = true;
                onCloseCall();
            }
        }

        // To'qnashuv (Crash)
        if (pBox.right > tBox.left && pBox.left < tBox.right &&
            pBox.bottom > tBox.top && pBox.top < tBox.bottom) {

            if (GAME.shieldActive) {
                GAME.shieldActive = false;
                window.carAudio?.playCrash();
                spawnExplosion(t.x, t.y);
                trafficCars.splice(i, 1);
                triggerScreenShake(8);
                continue;
            }

            // Mashina shikastlanishi
            const damage = Math.floor(35 / player.model.armor);
            player.health -= damage;
            player.speed *= 0.45;
            triggerScreenShake(12);
            spawnExplosion(player.x, player.y);
            window.carAudio?.playCrash();

            showAlert("💥 TO'QNASHUV! -" + damage + "%", 'alert-crash');
            trafficCars.splice(i, 1);

            if (player.health <= 0) {
                gameOver();
            }
            break;
        }
    }

    // Bonuslarni terish
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist < player.width / 2 + p.radius) {
            collectPowerUp(p);
            powerUps.splice(i, 1);
        }
    }
}

function onCloseCall() {
    GAME.combo++;
    GAME.comboTimer = 180;
    const bonus = 150 * GAME.combo;
    GAME.score += bonus;

    const badge = document.getElementById('comboBadge');
    badge.textContent = `🔥 x${GAME.combo} COMBO!`;
    badge.style.display = 'inline-block';

    triggerScreenShake(3);
    showAlert(`⚡ QUVIB O'TISH! +${bonus}`, 'alert-close-call');
    window.carAudio?.playNitro();
}

function collectPowerUp(p) {
    if (p.type === 'coin') {
        GAME.coins++;
        GAME.score += 50;
        window.carAudio?.playCoin();
    } else if (p.type === 'nitro') {
        player.nitro = 100;
        window.carAudio?.playPowerup();
        showAlert("⚡ NITRO TO'LDIRILDI!", 'alert-close-call');
    } else if (p.type === 'shield') {
        GAME.shieldActive = true;
        window.carAudio?.playPowerup();
        showAlert("🛡️ QALQON FAOL!", 'alert-close-call');
    } else if (p.type === 'magnet') {
        GAME.magnetTimer = 500;
        window.carAudio?.playPowerup();
        showAlert("🧲 MAGNIT ISHGA TUSHDI!", 'alert-close-call');
    } else if (p.type === 'repair') {
        player.health = Math.min(100, player.health + 35);
        window.carAudio?.playPowerup();
        showAlert("🔧 TA'MIRLANDI! +35% HP", 'alert-close-call');
    }
}

function showAlert(text, typeClass) {
    const alertEl = document.getElementById('overlayAlert');
    alertEl.textContent = text;
    alertEl.className = `overlay-alert show ${typeClass}`;
    setTimeout(() => {
        alertEl.classList.remove('show');
    }, 1200);
}

function triggerScreenShake(amount) {
    GAME.screenShake = amount;
}

function gameOver() {
    GAME.isGameOver = true;
    player.speed = 0;
    window.carAudio?.stopEngine();
    window.carAudio?.playCrash();

    if (GAME.score > GAME.highScore) {
        GAME.highScore = GAME.score;
        localStorage.setItem('car_highscore', GAME.highScore.toString());
    }

    document.getElementById('finalScore').textContent = GAME.score;
    document.getElementById('finalDistance').textContent = (GAME.distance / 1000).toFixed(2) + " km";
    document.getElementById('finalCoins').textContent = GAME.coins;
    document.getElementById('finalHighScore').textContent = GAME.highScore;

    document.getElementById('gameOverModal').classList.add('open');
}

// UI yangilanishi
function updateHUD() {
    document.getElementById('hudSpeed').textContent = Math.round(player.speed);
    document.getElementById('hudDistance').textContent = (GAME.distance / 1000).toFixed(2);
    document.getElementById('hudScore').textContent = GAME.score;
    document.getElementById('hudCoins').textContent = GAME.coins;
    document.getElementById('hudSpeedBig').textContent = Math.round(player.speed);

    // Vites (Gear)
    let gear = 'N';
    if (player.speed > 250) gear = 'D6';
    else if (player.speed > 200) gear = 'D5';
    else if (player.speed > 150) gear = 'D4';
    else if (player.speed > 100) gear = 'D3';
    else if (player.speed > 40) gear = 'D2';
    else if (player.speed > 5) gear = 'D1';
    document.getElementById('hudGear').textContent = gear;

    // Nitro & Health barlar
    document.getElementById('barNitro').style.width = `${player.nitro}%`;
    const hpBar = document.getElementById('barHealth');
    hpBar.style.width = `${Math.max(0, player.health)}%`;
    if (player.health < 30) hpBar.style.background = '#ef4444';
    else if (player.health < 60) hpBar.style.background = '#f59e0b';
    else hpBar.style.background = 'linear-gradient(90deg, #10b981, #22c55e)';
}

// Asosiy o'yin tsikli
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (GAME.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * GAME.screenShake, (Math.random() - 0.5) * GAME.screenShake);
        GAME.screenShake *= 0.88;
        if (GAME.screenShake < 0.4) GAME.screenShake = 0;
    }

    if (GAME.isRunning && !GAME.isGameOver && !GAME.isPaused) {
        player.update();
        roadY += player.speedMps;

        // Trafik yangilanishi
        for (let i = trafficCars.length - 1; i >= 0; i--) {
            const t = trafficCars[i];
            t.update(player.speedMps);
            if (t.y > canvas.height + 150) trafficCars.splice(i, 1);
        }

        // Bonuslar yangilanishi
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i];
            p.update(player.speedMps, player);
            if (p.y > canvas.height + 60) powerUps.splice(i, 1);
        }

        handleSpawns();
        handleCollisions();
        updateHUD();
    }

    // Chizish tartibi: Trassa -> Bonuslar -> Trafik -> O'yinchi -> Zarrachalar
    drawRoad(ctx);
    powerUps.forEach(p => p.draw(ctx));
    trafficCars.forEach(t => t.draw(ctx));
    player.draw(ctx);

    // Zarrachalar
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.035;
        if (pt.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// O'yinni boshlash / Yangilash
function startNewGame() {
    GAME.score = 0;
    GAME.coins = 0;
    GAME.distance = 0;
    GAME.combo = 0;
    GAME.isGameOver = false;
    GAME.isRunning = true;
    GAME.shieldActive = false;
    trafficCars = [];
    powerUps = [];
    particles.length = 0;
    skidMarks.length = 0;

    player.reset();
    document.getElementById('gameOverModal').classList.remove('open');
    window.carAudio?.startEngine();
}

// Garajda mashina tanlash
document.querySelectorAll('.car-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.car-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        GAME.selectedCarId = card.dataset.car;
        player.model = CAR_MODELS[GAME.selectedCarId];
    });
});

document.getElementById('btnGarage').addEventListener('click', () => {
    document.getElementById('garageModal').classList.add('open');
});
document.getElementById('closeGarage').addEventListener('click', () => {
    document.getElementById('garageModal').classList.remove('open');
});

// Restart tugmalari
document.getElementById('btnRestart').addEventListener('click', startNewGame);
document.getElementById('btnModalRestart').addEventListener('click', startNewGame);

// Ovoz tugmasi
const btnSound = document.getElementById('btnSound');
btnSound.addEventListener('click', () => {
    if (window.carAudio) {
        window.carAudio.enabled = !window.carAudio.enabled;
        btnSound.textContent = window.carAudio.enabled ? '🔊 Ovoz: Yoqilgan' : '🔇 Ovoz: Oʻchirilgan';
        if (!window.carAudio.enabled) window.carAudio.stopEngine();
        else if (GAME.isRunning) window.carAudio.startEngine();
    }
});

// To'liq ekran
document.getElementById('btnFullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

// Mobil touch boshqaruvlari
const touchMap = [
    { id: 'tLeft', prop: 'touchLeft' },
    { id: 'tRight', prop: 'touchRight' },
    { id: 'tGas', prop: 'touchGas' },
    { id: 'tBrake', prop: 'touchBrake' },
    { id: 'tNitro', prop: 'touchNitro' }
];
touchMap.forEach(({ id, prop }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); window[prop] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); window[prop] = false; });
});

// O'yinni ilk yuklanishi
window.addEventListener('click', () => {
    if (!GAME.isRunning) startNewGame();
}, { once: true });

startNewGame();
requestAnimationFrame(gameLoop);
