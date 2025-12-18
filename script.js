document.addEventListener('DOMContentLoaded', () => {
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const ANIMATION_DURATION = 300; 
    
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';
    const gizliKelimeURL = 'gizli-kelime.json';

    let kelimeler = [];
    let hedefKelime = '';
    let mevcutSatir = 0;
    let mevcutKaro = 0;
    let oyunBitti = false;
    let guesses = [];

    const gameBoard = document.getElementById('game-board');
    const klavye = document.getElementById('keyboard');
    const messageContainer = document.getElementById('message-container');
    const timerSpan = document.querySelector('#timer span');

    // TÜM TÜRKÇE HARF SORUNLARINI ÇÖZEN FONKSİYON
    function trNormalize(text, type = 'upper') {
        if (type === 'upper') {
            return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase().trim();
        }
        return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().trim();
    }

    async function init() {
        try {
            oyunTahtasiniOlustur();
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(gizliKelimeURL + cacheBuster);
            const data = await response.json();
            
            // Hedef kelimeyi standardize et
            hedefKelime = trNormalize(data.kelime, 'upper');

            const kResp = await fetch(kelimelerGistURL);
            if (kResp.ok) {
                const list = await kResp.json();
                // Sözlüğü standardize et
                kelimeler = list.map(k => trNormalize(k, 'lower'));
            }

            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            await loadGameState();
        } catch (e) { console.error("Sistem yüklenemedi:", e); }
    }

    async function tahminiIsle(tahmin, isLoading) {
        const row = document.getElementById(`row-${mevcutSatir}`);
        const tiles = Array.from(row.children);
        const hedef = hedefKelime;
        const tahm = trNormalize(tahmin, 'upper');
        
        const sonuc = new Array(WORD_LENGTH).fill('absent');
        const havuz = {};

        [...hedef].forEach(h => havuz[h] = (havuz[h] || 0) + 1);

        // Yeşil kontrolü
        [...tahm].forEach((h, i) => {
            if (h === hedef[i]) {
                sonuc[i] = 'correct';
                havuz[h]--;
            }
        });

        // Sarı kontrolü
        [...tahm].forEach((h, i) => {
            if (sonuc[i] !== 'correct' && havuz[h] > 0 && hedef.includes(h)) {
                sonuc[i] = 'present';
                havuz[h]--;
            }
        });

        for (let i = 0; i < WORD_LENGTH; i++) {
            const tile = tiles[i];
            if (!isLoading) await new Promise(r => setTimeout(r, 100));
            tile.classList.add('flip');
            
            setTimeout(() => {
                tile.className = `tile filled ${sonuc[i]}`;
                klavyeGuncelle(tahm[i], sonuc[i]);
            }, 250);
        }
    }

    async function tahminiGonder(isLoading = false) {
        if (oyunBitti || mevcutKaro !== WORD_LENGTH) return;

        const tahmin = Array.from({length: WORD_LENGTH}, (_, i) => 
            document.getElementById(`tile-${mevcutSatir}-${i}`).textContent
        ).join('');

        const normalizedTahminUpper = trNormalize(tahmin, 'upper');
        const normalizedTahminLower = trNormalize(tahmin, 'lower');

        if (!isLoading) {
            const isMatch = (normalizedTahminUpper === hedefKelime);
            if (!isMatch && kelimeler.length > 0 && !kelimeler.includes(normalizedTahminLower)) {
                mesajGoster('Sözlükte yok');
                shakeRow(mevcutSatir);
                return;
            }
            guesses.push(normalizedTahminUpper);
            saveGameState();
        }

        await tahminiIsle(normalizedTahminUpper, isLoading);

        if (normalizedTahminUpper === hedefKelime) {
            oyunBitti = true;
            if (!isLoading) celebrateWin();
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

    function klavyeGuncelle(h, s) {
        const key = document.querySelector(`[data-key="${h}"]`);
        if (!key) return;
        if (s === 'correct') key.className = 'key correct';
        else if (s === 'present' && !key.classList.contains('correct')) key.className = 'key present';
        else if (s === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) key.className = 'key absent';
    }

    async function loadGameState() {
        const saved = localStorage.getItem('tr-wordle-state');
        if (!saved) return;
        const state = JSON.parse(saved);
        if (state.target !== hedefKelime) {
            localStorage.removeItem('tr-wordle-state');
            return;
        }
        for (const g of state.guesses) {
            [...g].forEach(h => harfEkle(h));
            await tahminiGonder(true);
        }
    }

    function saveGameState() {
        localStorage.setItem('tr-wordle-state', JSON.stringify({target: hedefKelime, guesses: guesses}));
    }

    function oyunTahtasiniOlustur() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < MAX_GUESSES; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.id = `row-${i}`;
            for (let j = 0; j < WORD_LENGTH; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.id = `tile-${i}-${j}`;
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
        klavye.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || oyunBitti) return;
            const key = btn.dataset.key;
            if (key === 'ENTER') tahminiGonder();
            else if (key === 'BACKSPACE') harfSil();
            else harfEkle(key);
        });
    }

    function geriSayimiBaslat() {
        const tick = () => {
            const now = new Date();
            const next = new Date(now).setHours(now.getHours() + 1, 0, 0, 0);
            const diff = next - now;
            const m = Math.floor((diff / 60000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            timerSpan.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        tick();
        setInterval(tick, 1000);
    }

    function mesajGoster(t, d = 2000) {
        const m = document.createElement('div');
        m.className = 'message show';
        m.textContent = t;
        messageContainer.appendChild(m);
        setTimeout(() => m.remove(), d);
    }

    function celebrateWin() { mesajGoster('TEBRİKLER!', 5000); }
    function shakeRow(i) {
        const r = document.getElementById(`row-${i}`);
        r.classList.add('shake');
        setTimeout(() => r.classList.remove('shake'), 500);
    }

    init();
});
