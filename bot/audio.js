// Stadion ovoz effektlari (Web Audio API orqali generatsiya qilingan)
class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playWhistle() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // 2 ta qisqa hushtak sadosi
        [0, 0.18].forEach(delay => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2600, now + delay);
            osc.frequency.exponentialRampToValueAtTime(3200, now + delay + 0.08);
            osc.frequency.exponentialRampToValueAtTime(2800, now + delay + 0.15);

            gain.gain.setValueAtTime(0.3, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + delay);
            osc.stop(now + delay + 0.16);
        });
    }

    playKick(power = 1) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        gain.gain.setValueAtTime(Math.min(0.7, 0.3 * power), now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.14);
    }

    playPostHit() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.2);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    playGoalCheer() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Stadion shovqini va olqishlar (Noise generator)
        const bufferSize = this.ctx.sampleRate * 2.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(1400, now + 1.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.1);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 2.2);

        // Qo'shimcha tantanali akkord
        [330, 440, 554, 659].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            g.gain.setValueAtTime(0.2, now + idx * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(g);
            g.connect(this.ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + 1.3);
        });
    }

    playSave() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }
}

window.soundFX = new SoundFX();
