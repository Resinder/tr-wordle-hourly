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

    async function init() {
        try {
            oyunTahtasiniOlustur();
            const cacheBuster = `?t=${Date.now()}`;
            const gizliKelimeResponse = await fetch(gizliKelimeURL + cacheBuster);
            if (!gizliKelimeResponse.ok) throw new Error("Kelime dosyası bulunamadı.");

            const gizliKelimeData = await gizliKelimeResponse.json();
            hedefKelime = gizliKelimeData.kelime.trim().toLocaleUpperCase('tr-TR');

            const kelimelerResponse = await fetch(kelimelerGistURL);
            if (kelimelerResponse.ok) {
                const liste = await kelimelerResponse.json();
                kelimeler = liste.map(k => k.trim().toLocaleLowerCase('tr-TR'));
            }

            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            await loadGameState();
        } catch (error) {
            console.error("Başlatma Hatası:", error);
        }
    }

    async function tahminiIsle(tahmin, isLoading) {
        const row = document.getElementById(`row-${mevcutSatir}`);
        const tiles = Array.from(row.children);
        
        const hedef = hedefKelime.toLocaleUpperCase('tr-TR');
        const tahm = tahmin.toLocaleUpperCase('tr-TR');
        const hedefHarfler = hedef.split('');
        const tahminHarfler = tahm.split('');
        
        const sonuc = new Array(WORD_LENGTH).fill('absent');
        const harfHavuzu = {};

        hedefHarfler.forEach(h => harfHavuzu[h] = (harfHavuzu[h] || 0) + 1);

        tahminHarfler.forEach((h, i) => {
            if (h === hedefHarfler[i]) {
                sonuc[i] = 'correct';
                harfHavuzu[h]--;
            }
        });

        tahminHarfler.forEach((h, i) => {
            if (sonuc[i] !== 'correct' && harfHavuzu[h] > 0 && hedefHarfler.includes(h)) {
                sonuc[i] = 'present';
                harfHavuzu[h]--;
            }
        });

        for (let i = 0; i < WORD_LENGTH; i++) {
            const tile = tiles[i];
            if (!isLoading) await new Promise(r => setTimeout(r, ANIMATION_DURATION));
            
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.add(sonuc[i]);
                klavyeGuncelle(tahminHarfler[i], sonuc[i]);
            }, 250);
        }
        if (!isLoading) await new Promise(r => setTimeout(r, 500));
    }

    function harfEkle(harf, silent = false) {
        if (oyunBitti || mevcutKaro >= WORD_LENGTH) return;
        const turkceHarf = harf.toLocaleUpperCase('tr-TR');
        const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        if (karo) {
            karo.textContent = turkceHarf;
            karo.classList.add('filled');
            mevcutKaro++;
        }
    }

    function harfSil() {
        if (oyunBitti || mevcutKaro <= 0) return;
        mevcutKaro--;
        const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        karo.textContent = '';
        karo.classList.remove('filled');
    }

    async function tahminiGonder(isLoading = false) {
        if (oyunBitti || mevcutKaro !== WORD_LENGTH) return;

        const tahmin = Array.from({length: WORD_LENGTH}, (_, i) => 
            document.getElementById(`tile-${mevcutSatir}-${i}`).textContent
        ).join('');

        if (!isLoading) {
            const normalizedTahmin = tahmin.toLocaleLowerCase('tr-TR');
            if (kelimeler.length > 0 && !kelimeler.includes(normalizedTahmin)) {
                mesajGoster('Sözlükte yok');
                shakeRow(mevcutSatir);
                return;
            }
            guesses.push(tahmin);
            saveGameState();
        }

        await tahminiIsle(tahmin, isLoading);
        
        if (tahmin === hedefKelime) {
            oyunBitti = true;
            if (!isLoading) celebrateWin();
            return;
        }

        if (mevcutSatir + 1 >= MAX_GUESSES) {
            oyunBitti = true;
            if (!isLoading) mesajGoster(`Kelime: ${hedefKelime}`, 5000);
            return;
        }

        mevcutSatir++;
        mevcutKaro = 0;
    }

    function klavyeGuncelle(harf, durum) {
        const key = document.querySelector(`[data-key="${harf}"]`);
        if (!key) return;
        if (durum === 'correct') key.className = 'key correct';
        else if (durum === 'present' && !key.classList.contains('correct')) key.className = 'key present';
        else if (durum === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) key.className = 'key absent';
    }

    function saveGameState() {
        const state = { target: hedefKelime, guesses: guesses, hour: new Date().getHours(), date: new Date().toDateString() };
        localStorage.setItem('tr-wordle-state', JSON.stringify(state));
    }

    async function loadGameState() {
        const saved = localStorage.getItem('tr-wordle-state');
        if (!saved) return;
        const state = JSON.parse(saved);
        if (state.hour !== new Date().getHours() || state.target !== hedefKelime) return;
        for (const guess of state.guesses) {
            for (const char of guess) harfEkle(char, true);
            await tahminiGonder(true);
        }
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
            const key = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACKSPACE' : e.key.toLocaleUpperCase('tr-TR');
            if (key === 'ENTER') tahminiGonder();
            else if (key === 'BACKSPACE') harfSil();
            else if (/^[A-ZÇĞİÖŞÜ]$/.test(key)) harfEkle(key);
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
        setInterval(() => {
            const now = new Date();
            const next = new Date(now).setHours(now.getHours() + 1, 0, 0, 0);
            const diff = next - now;
            const m = Math.floor((diff / 60000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            timerSpan.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }, 1000);
    }

    function mesajGoster(t, d = 2000) {
        const m = document.createElement('div');
        m.className = 'message show';
        m.textContent = t;
        messageContainer.appendChild(m);
        setTimeout(() => { m.remove(); }, d);
    }

    function shakeRow(i) {
        const r = document.getElementById(`row-${i}`);
        r.classList.add('shake');
        setTimeout(() => r.classList.remove('shake'), 500);
    }

    function celebrateWin() {
        const r = document.getElementById(`row-${mevcutSatir}`);
        Array.from(r.children).forEach((t, i) => {
            setTimeout(() => t.classList.add('bounce'), i * 100);
        });
        mesajGoster('TEBRİKLER!', 5000);
    }

    init();
});
