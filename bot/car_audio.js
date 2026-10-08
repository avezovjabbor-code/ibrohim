/**
 * Mashina Poygasi Ovoz Tizimi (Web Audio API)
 * Motor tovushi, nitro, avariya, signal va drift effektlari
 */
class CarAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.engineOsc = null;
        this.engineGain = null;
        this.isEngineRunning = false;
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

    startEngine() {
        if (!this.enabled || this.isEngineRunning) return;
        this.init();

        try {
            // Asosiy dvigatel tovushi (sawtooth / square aralashmasi)
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc2.type = 'triangle';

            this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);
            this.engineOsc2.frequency.setValueAtTime(130, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

            // Past chastotali filtr (dvigatel shovqinini yumshatish)
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

            this.engineOsc.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.engineOsc2.start();
            this.isEngineRunning = true;
        } catch (e) {
            console.warn("Audio start error:", e);
        }
    }

    updateEngine(speedRatio, isNitro = false) {
        if (!this.isEngineRunning || !this.enabled) return;
        const now = this.ctx.currentTime;
        // speedRatio: 0 dan 1 gacha
        const baseFreq = 65 + speedRatio * 180 + (isNitro ? 50 : 0);
        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);

        const filterFreq = 300 + speedRatio * 800 + (isNitro ? 600 : 0);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

        const targetVol = Math.min(0.22, 0.06 + speedRatio * 0.12 + (isNitro ? 0.04 : 0));
        this.engineGain.gain.setTargetAtTime(targetVol, now, 0.05);
    }

    stopEngine() {
        if (!this.isEngineRunning) return;
        try {
            this.engineGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.1);
            setTimeout(() => {
                try {
                    this.engineOsc?.stop();
                    this.engineOsc2?.stop();
                } catch(e){}
                this.isEngineRunning = false;
            }, 120);
        } catch(e) {
            this.isEngineRunning = false;
        }
    }

    playNitro() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Turbina hushtagi va olovli shovqin
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.3);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
    }

    playSkid() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(450, now + 0.18);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
    }

    playHorn() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        [440, 554].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.36);
        });
    }

    playCoin() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987, now); // B5
        osc.frequency.setValueAtTime(1318, now + 0.07); // E6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
    }

    playPowerup() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        [523, 659, 783, 1046].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.06);

            g.gain.setValueAtTime(0.15, now + idx * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.16);
        });
    }

    playCrash() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Portlash zarbasi
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
    }
}

window.carAudio = new CarAudio();
