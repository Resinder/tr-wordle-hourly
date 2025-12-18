document.addEventListener('DOMContentLoaded', () => {
    // --- Sabitler ve Değişkenler ---
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
    let guesses = []; // LocalStorage takibi için

    const gameBoard = document.getElementById('game-board');
    const klavye = document.getElementById('keyboard');
    const messageContainer = document.getElementById('message-container');
    const timerSpan = document.querySelector('#timer span');

    // --- Başlangıç Fonksiyonları ---
    async function init() {
        console.log('🎮 Oyun optimize edilmiş modda başlatılıyor...');
        try {
            oyunTahtasiniOlustur();
            
            // Gizli kelimeyi yükle (Saatlik Cache Bypass)
            const cacheBuster = `?t=${Math.floor(Date.now() / 3600000)}`;
            const gizliKelimeResponse = await fetch(gizliKelimeURL + cacheBuster);
            if (!gizliKelimeResponse.ok) throw new Error("Kelime dosyası bulunamadı.");

            const gizliKelimeData = await gizliKelimeResponse.json();
            hedefKelime = gizliKelimeData.kelime.toLocaleUpperCase('tr-TR').trim();

            // Sözlük listesini yükle
            const kelimelerResponse = await fetch(kelimelerGistURL);
            if (kelimelerResponse.ok) {
                const liste = await kelimelerResponse.json();
                kelimeler = liste.map(k => k.toLocaleLowerCase('tr-TR').trim());
            }

            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            
            // Mevcut saatteki ilerlemeyi geri yükle
            await loadGameState();

        } catch (error) {
            console.error("❌ Başlatma Hatası:", error);
            renderErrorUI(error.message);
        }
    }

    // --- Local Storage (Kayıt Sistemi) ---
    function saveGameState() {
        const state = {
            target: hedefKelime,
            guesses: guesses,
            hour: new Date().getHours(),
            date: new Date().toDateString()
        };
        localStorage.setItem('tr-wordle-hourly-state', JSON.stringify(state));
    }

    async function loadGameState() {
        const saved = localStorage.getItem('tr-wordle-hourly-state');
        if (!saved) return;

        const state = JSON.parse(saved);
        const now = new Date();

        // Eğer saat veya gün değişmişse eski kaydı temizle
        if (state.hour !== now.getHours() || state.date !== now.toDateString() || state.target !== hedefKelime) {
            localStorage.removeItem('tr-wordle-hourly-state');
            return;
        }

        // Eski tahminleri sessizce doldur
        for (const guess of state.guesses) {
            for (const char of guess) {
                harfEkle(char, true); // true: sessiz ekleme
            }
            await tahminiGonder(true); // true: yükleme modu
        }
    }

    // --- Oyun Mantığı ---
    function harfEkle(harf, silent = false) {
        if (oyunBitti || mevcutKaro >= WORD_LENGTH) return;
        const turkceHarf = harf.toLocaleUpperCase('tr-TR');
        const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        if (karo) {
            karo.textContent = turkceHarf;
            karo.classList.add('filled');
            if (!silent) {
                karo.style.animation = 'none';
                karo.offsetHeight; // reflow
                karo.style.animation = 'pop 0.1s ease-in-out';
            }
            mevcutKaro++;
        }
    }

    function harfSil() {
        if (oyunBitti || mevcutKaro <= 0) return;
        mevcutKaro--;
        const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        if (karo) {
            karo.textContent = '';
            karo.classList.remove('filled');
        }
    }

    async function tahminiGonder(isLoading = false) {
        if (oyunBitti || mevcutKaro !== WORD_LENGTH) {
            if (!isLoading && mevcutKaro !== WORD_LENGTH) {
                mesajGoster('Yeterli harf yok');
                shakeRow(mevcutSatir);
            }
            return;
        }

        const tahmin = Array.from({length: WORD_LENGTH}, (_, i) => 
            document.getElementById(`tile-${mevcutSatir}-${i}`).textContent
        ).join('');

        const normalizedTahmin = tahmin.toLocaleLowerCase('tr-TR');
        
        // Sözlük kontrolü (Yükleme aşamasında yapılmaz)
        if (!isLoading && kelimeler.length > 0 && !kelimeler.includes(normalizedTahmin)) {
            mesajGoster('Sözlükte yok');
            shakeRow(mevcutSatir);
            return;
        }

        if (!isLoading) {
            guesses.push(tahmin);
            saveGameState();
        }

        await tahminiIsle(tahmin, isLoading);
        
        if (tahmin === hedefKelime) {
            oyunBitti = true;
            if (!isLoading) mesajGoster('🎉 Harika!', 5000);
            celebrateWin();
            return;
        }

        if (mevcutSatir + 1 >= MAX_GUESSES) {
            oyunBitti = true;
            if (!isLoading) mesajGoster(`😔 Kelime: ${hedefKelime}`, 5000);
            return;
        }

        mevcutSatir++;
        mevcutKaro = 0;
    }

    async function tahminiIsle(tahmin, isLoading) {
        const row = document.getElementById(`row-${mevcutSatir}`);
        const tiles = Array.from(row.children);
        const hedefHarfler = hedefKelime.split('');
        const sonuc = new Array(WORD_LENGTH).fill('absent');
        const harfHavuzu = {};

        // Harf sayılarını hesapla (Çift harf mantığı için)
        hedefHarfler.forEach(h => harfHavuzu[h] = (harfHavuzu[h] || 0) + 1);

        // 1. Adım: Tam eşleşmeler (Yeşil)
        tahmin.split('').forEach((h, i) => {
            if (h === hedefHarfler[i]) {
                sonuc[i] = 'correct';
                harfHavuzu[h]--;
            }
        });

        // 2. Adım: Var olan ama yanlış yerdeki harfler (Sarı)
        tahmin.split('').forEach((h, i) => {
            if (sonuc[i] !== 'correct' && harfHavuzu[h] > 0 && hedefHarfler.includes(h)) {
                sonuc[i] = 'present';
                harfHavuzu[h]--;
            }
        });

        // Animasyon ve Renklendirme
        for (let i = 0; i < WORD_LENGTH; i++) {
            const tile = tiles[i];
            if (!isLoading) await new Promise(r => setTimeout(r, ANIMATION_DURATION));
            
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.add(sonuc[i]);
                klavyeGuncelle(tahmin[i], sonuc[i]);
            }, 250);
        }

        if (!isLoading) await new Promise(r => setTimeout(r, 500));
    }

    function klavyeGuncelle(harf, durum) {
        const key = document.querySelector(`[data-key="${harf}"]`);
        if (!key) return;

        if (durum === 'correct') {
            key.className = 'key correct';
        } else if (durum === 'present' && !key.classList.contains('correct')) {
            key.className = 'key present';
        } else if (durum === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
            key.className = 'key absent';
        }
    }

    // --- Arayüz ve Yardımcılar ---
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
        // Fiziksel Klavye + Ekrandaki tuş animasyonu senkronu
        document.addEventListener('keydown', (e) => {
            if (oyunBitti) return;
            const key = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACKSPACE' : e.key.toLocaleUpperCase('tr-TR');
            
            // Ekrandaki tuşu bul ve "active" efekti ver
            const visualKey = document.querySelector(`[data-key="${key}"]`);
            if (visualKey) {
                visualKey.classList.add('active');
                setTimeout(() => visualKey.classList.remove('active'), 100);
            }

            if (key === 'ENTER') tahminiGonder();
            else if (key === 'BACKSPACE') harfSil();
            else if (/^[A-ZÇĞİÖŞÜ]$/.test(key)) harfEkle(key);
        });

        // Ekran Klavyesi
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
        const update = () => {
            const now = new Date();
            const diff = new Date(now).setHours(now.getHours() + 1, 0, 0, 0) - now;
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (timerSpan) timerSpan.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        update();
        setInterval(update, 1000);
    }

    function mesajGoster(t, d = 2000) {
        const m = document.createElement('div');
        m.className = 'message show';
        m.textContent = t;
        messageContainer.appendChild(m);
        setTimeout(() => { m.classList.remove('show'); setTimeout(() => m.remove(), 300); }, d);
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
    }

    function renderErrorUI(msg) {
        gameBoard.innerHTML = `<div class="error-container"><h2>😟 Hata</h2><p>${msg}</p><button onclick="location.reload()">Yenile</button></div>`;
    }

    init();
});
