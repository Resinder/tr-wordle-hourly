document.addEventListener('DOMContentLoaded', () => {
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const gizliKelimeURL = 'gizli-kelime.json';
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';

    let kelimeler = [];
    let hedefKelime = '';
    let mevcutSatir = 0;
    let mevcutKaro = 0;
    let oyunBitti = false;
    let guesses = [];

    const gameBoard = document.getElementById('game-board');
    const timerSpan = document.querySelector('#timer span');

    function trNormalize(text, type = 'upper') {
        if (type === 'upper') return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase().trim();
        return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().trim();
    }

    async function init() {
        oyunTahtasiniOlustur();
        try {
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(gizliKelimeURL + cacheBuster);
            const data = await response.json();
            
            hedefKelime = trNormalize(data.kelime, 'upper');
            const sunucuSaati = new Date(data.saat).getHours();

            const kResp = await fetch(kelimelerGistURL);
            if (kResp.ok) {
                const list = await kResp.json();
                kelimeler = list.map(k => trNormalize(k, 'lower'));
            }

            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            await loadGameState(sunucuSaati);
        } catch (e) { console.error("Baslatma hatasi:", e); }
    }

    function geriSayimiBaslat() {
        const tick = () => {
            const now = new Date();
            const next = new Date(now).setHours(now.getHours() + 1, 0, 0, 0);
            const diff = next - now;

            if (diff <= 5000) { // Son 5 saniye
                document.getElementById('wait-overlay').classList.add('active');
                setTimeout(() => location.reload(), 25000); // 25 saniye sonra yenile
                return;
            }

            const m = Math.floor((diff / 60000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            timerSpan.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        setInterval(tick, 1000);
        tick();
    }

    function mesajGoster(t, type = 'normal') {
        const m = document.createElement('div');
        m.className = `message show ${type === 'nyan' ? 'nyan' : ''}`;
        m.innerHTML = type === 'nyan' 
            ? `<img src="https://media.giphy.com/media/sIIhZUs2lzdzq/giphy.gif" width="40"> <span>${t}</span>`
            : t;
        document.getElementById('message-container').appendChild(m);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        setTimeout(() => m.remove(), 3000);
    }

    async function tahminiGonder(isLoading = false) {
        if (oyunBitti || mevcutKaro !== WORD_LENGTH) return;

        const tahmin = Array.from({length: WORD_LENGTH}, (_, i) => 
            document.getElementById(`tile-${mevcutSatir}-${i}`).textContent
        ).join('');

        const normalizedTahminUpper = trNormalize(tahmin, 'upper');

        if (!isLoading) {
            const normalizedTahminLower = trNormalize(tahmin, 'lower');
            if (normalizedTahminUpper !== hedefKelime && !kelimeler.includes(normalizedTahminLower)) {
                mesajGoster("Bu ne biçim kelime? 🙀", "nyan");
                shakeRow(mevcutSatir);
                return;
            }
            guesses.push(normalizedTahminUpper);
            saveGameState();
        }

        await tahminiIsle(normalizedTahminUpper, isLoading);

        if (normalizedTahminUpper === hedefKelime) {
            oyunBitti = true;
            if (!isLoading) mesajGoster("HARİKA! 🎉");
            return;
        }

        if (mevcutSatir >= MAX_GUESSES - 1) {
            oyunBitti = true;
            if (!isLoading) mesajGoster(`Kelime: ${hedefKelime}`, 5000);
        } else {
            mevcutSatir++;
            mevcutKaro = 0;
        }
    }

    async function tahminiIsle(tahmin, isLoading) {
        const row = document.getElementById(`row-${mevcutSatir}`);
        const tiles = Array.from(row.children);
        const hedef = hedefKelime;
        const sonuc = new Array(WORD_LENGTH).fill('absent');
        const havuz = {};
        [...hedef].forEach(h => havuz[h] = (havuz[h] || 0) + 1);

        [...tahmin].forEach((h, i) => {
            if (h === hedef[i]) { sonuc[i] = 'correct'; havuz[h]--; }
        });

        [...tahmin].forEach((h, i) => {
            if (sonuc[i] !== 'correct' && havuz[h] > 0 && hedef.includes(h)) {
                sonuc[i] = 'present'; havuz[h]--;
            }
        });

        for (let i = 0; i < WORD_LENGTH; i++) {
            const tile = tiles[i];
            if (!isLoading) await new Promise(r => setTimeout(r, 100));
            tile.classList.add('flip');
            setTimeout(() => {
                tile.className = `tile filled ${sonuc[i]}`;
                const key = document.querySelector(`[data-key="${tahmin[i]}"]`);
                if (key && !key.classList.contains('correct')) key.className = `key ${sonuc[i]}`;
            }, 250);
        }
    }

    function harfEkle(h) {
        if (oyunBitti || mevcutKaro >= WORD_LENGTH) return;
        const tile = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        tile.textContent = trNormalize(h, 'upper');
        tile.classList.add('filled');
        mevcutKaro++;
    }

    function harfSil() {
        if (mevcutKaro <= 0) return;
        mevcutKaro--;
        const tile = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        tile.textContent = '';
        tile.classList.remove('filled');
    }

    function saveGameState() {
        localStorage.setItem('tr-wordle-state', JSON.stringify({
            target: hedefKelime,
            guesses: guesses,
            saat: new Date().getHours(),
            tarih: new Date().toDateString()
        }));
    }

    async function loadGameState(sunucuSaati) {
        const saved = localStorage.getItem('tr-wordle-state');
        if (!saved) return;
        const state = JSON.parse(saved);
        if (state.saat !== sunucuSaati || state.target !== hedefKelime) {
            localStorage.removeItem('tr-wordle-state');
            return;
        }
        for (const g of state.guesses) {
            [...g].forEach(h => harfEkle(h));
            await tahminiGonder(true);
        }
    }

    function oyunTahtasiniOlustur() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < MAX_GUESSES; i++) {
            const row = document.createElement('div');
            row.className = 'row'; row.id = `row-${i}`;
            for (let j = 0; j < WORD_LENGTH; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile'; tile.id = `tile-${i}-${j}`;
                row.appendChild(tile);
            }
            gameBoard.appendChild(row);
        }
    }

    function klavyeOlayDinleyicileriEkle() {
        document.addEventListener('keydown', (e) => {
            if (oyunBitti) return;
            if (e.key === 'Enter') tahminiGonder();
            else if (e.key === 'Backspace') harfSil();
            else if (/^[a-zA-ZçğİıöşüÇĞÖŞÜ]$/.test(e.key)) harfEkle(e.key);
        });
        document.getElementById('keyboard').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || oyunBitti) return;
            const key = btn.dataset.key;
            if (key === 'ENTER') tahminiGonder();
            else if (key === 'BACKSPACE') harfSil();
            else harfEkle(key);
        });
    }

    function shakeRow(i) {
        const r = document.getElementById(`row-${i}`);
        r.style.animation = 'shake 0.3s ease';
        setTimeout(() => r.style.animation = '', 300);
    }

    init();
});
