document.addEventListener('DOMContentLoaded', () => {
    // YAPILANDIRMA
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const gizliKelimeURL = 'gizli-kelime.json';
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';

    // OYUN DURUMU
    let kelimeler = [];
    let hedefKelime = '';
    let mevcutSatir = 0;
    let mevcutKaro = 0;
    let oyunBitti = false;
    let guesses = [];

    const gameBoard = document.getElementById('game-board');
    const timerSpan = document.querySelector('#timer span');

    // TÜRKÇE HARF NORMALİZASYONU
    const trNormalize = (text, type = 'upper') => {
        if (type === 'upper') {
            return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase().trim();
        }
        return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().trim();
    };

    // BAŞLATMA FONKSİYONU
    async function init() {
        oyunTahtasiniOlustur();
        geriSayimiBaslat(); // Her ihtimale karşı önce sayacı başlatıyoruz

        try {
            // Sunucudan gizli kelimeyi çek (Cache-buster ile taze veri zorunlu)
            const response = await fetch(`${gizliKelimeURL}?t=${Date.now()}`);
            const data = await response.json();
            
            if (!data || !data.kelime) throw new Error("Veri formatı hatalı");

            hedefKelime = trNormalize(data.kelime, 'upper');
            
            // Sunucu saatini güvenli yakala
            const sunucuSaatiRaw = data.saat ? new Date(data.saat) : new Date();
            const sunucuSaatiSira = isNaN(sunucuSaatiRaw.getTime()) ? new Date().getHours() : sunucuSaatiRaw.getHours();

            // Sözlük listesini çek
            const kResp = await fetch(kelimelerGistURL);
            if (kResp.ok) {
                const list = await kResp.json();
                kelimeler = list.map(k => trNormalize(k, 'lower'));
            }

            klavyeDinle();
            await loadGameState(sunucuSaatiSira);

        } catch (e) {
            console.error("Başlatma hatası:", e);
            mesajGoster("Bağlantı hatası oluştu.", "error");
        }
    }

    // MODERN GERİ SAYIM MANTIĞI
    function geriSayimiBaslat() {
        const tick = () => {
            const now = new Date();
            // Bir sonraki tam saati hedefle
            const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
            const diff = next - now;

            // Saat başı geldiğinde overlay göster ve yenile
            if (diff <= 3000) {
                document.getElementById('wait-overlay').classList.add('active');
                if (diff <= 0) {
                    setTimeout(() => location.reload(), 15000); // Deploy payı için 15sn bekle
                    return;
                }
            }

            const m = Math.floor((diff / 60000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            
            if (timerSpan) {
                timerSpan.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
        };

        tick();
        setInterval(tick, 1000);
    }

    // TAHMİNİ İŞLEME VE KONTROL
    async function tahminiGonder(isLoading = false) {
        if (oyunBitti || mevcutKaro !== WORD_LENGTH) return;

        const tahmin = Array.from({ length: WORD_LENGTH }, (_, i) => 
            document.getElementById(`tile-${mevcutSatir}-${i}`).textContent
        ).join('');

        const tUpper = trNormalize(tahmin, 'upper');

        if (!isLoading) {
            const tLower = trNormalize(tahmin, 'lower');
            // Sözlükte yoksa sars ve hata ver
            if (tUpper !== hedefKelime && !kelimeler.includes(tLower)) {
                mesajGoster("Sözlükte yok 🙀", "nyan");
                shakeRow(mevcutSatir);
                return;
            }
            guesses.push(tUpper);
            saveGameState();
        }

        await tahminiIsle(tUpper, isLoading);

        if (tUpper === hedefKelime) {
            oyunBitti = true;
            if (!isLoading) mesajGoster("TEBRİKLER! 🎉");
            return;
        }

        if (mevcutSatir >= MAX_GUESSES - 1) {
            oyunBitti = true;
            if (!isLoading) mesajGoster(`Kelime: ${hedefKelime}`, "normal", 5000);
        } else {
            mevcutSatir++;
            mevcutKaro = 0;
        }
    }

    async function tahminiIsle(tahmin, isLoading) {
        const row = document.getElementById(`row-${mevcutSatir}`);
        const tiles = row.children;
        const havuz = {};
        [...hedefKelime].forEach(h => havuz[h] = (havuz[h] || 0) + 1);

        const sonuc = new Array(WORD_LENGTH).fill('absent');

        // Önce tam eşleşenleri (Yeşil) bul
        [...tahmin].forEach((h, i) => {
            if (h === hedefKelime[i]) {
                sonuc[i] = 'correct';
                havuz[h]--;
            }
        });

        // Sonra yanlış konumdakileri (Sarı) bul
        [...tahmin].forEach((h, i) => {
            if (sonuc[i] !== 'correct' && havuz[h] > 0 && hedefKelime.includes(h)) {
                sonuc[i] = 'present';
                havuz[h]--;
            }
        });

        for (let i = 0; i < WORD_LENGTH; i++) {
            if (!isLoading) await new Promise(r => setTimeout(r, 150));
            const tile = tiles[i];
            tile.classList.add('flip');
            
            setTimeout(() => {
                tile.className = `tile filled ${sonuc[i]}`;
                // Klavyeyi güncelle
                const key = document.querySelector(`[data-key="${tahmin[i]}"]`);
                if (key && !key.classList.contains('correct')) {
                    key.className = `key ${sonuc[i]}`;
                }
            }, 250);
        }
    }

    // KLAVYE VE GİRİŞ KONTROLLERİ
    function klavyeDinle() {
        const handleInput = (key) => {
            if (oyunBitti) return;
            if (key === 'ENTER') {
                tahminiGonder();
            } else if (key === 'BACKSPACE') {
                if (mevcutKaro > 0) {
                    mevcutKaro--;
                    const tile = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
                    tile.textContent = '';
                    tile.classList.remove('filled');
                }
            } else if (/^[A-ZÇĞİıÖŞÜ]$/i.test(key) && mevcutKaro < WORD_LENGTH) {
                const tile = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
                tile.textContent = trNormalize(key, 'upper');
                tile.classList.add('filled');
                mevcutKaro++;
            }
        };

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleInput('ENTER');
            else if (e.key === 'Backspace') handleInput('BACKSPACE');
            else handleInput(e.key);
        });

        document.getElementById('keyboard').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn) handleInput(btn.dataset.key);
        });
    }

    // KAYIT VE YÜKLEME SİSTEMİ
    function saveGameState() {
        const state = {
            target: hedefKelime,
            guesses: guesses,
            saat: new Date().getHours(),
            tarih: new Date().toDateString()
        };
        localStorage.setItem('tr-wordle-state', JSON.stringify(state));
    }

    async function loadGameState(sunucuSaati) {
        const saved = localStorage.getItem('tr-wordle-state');
        if (!saved) return;

        const state = JSON.parse(saved);
        const now = new Date();

        // Eğer saat veya tarih değişmişse temizle
        if (state.saat !== sunucuSaati || state.tarih !== now.toDateString() || state.target !== hedefKelime) {
            localStorage.removeItem('tr-wordle-state');
            return;
        }

        for (const g of state.guesses) {
            [...g].forEach(h => {
                const tile = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
                tile.textContent = h;
                tile.classList.add('filled');
                mevcutKaro++;
            });
            await tahminiGonder(true);
        }
    }

    // YARDIMCI GÖRSEL FONKSİYONLAR
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

    function mesajGoster(t, type = 'normal', d = 3000) {
        const m = document.createElement('div');
        m.className = `message ${type === 'nyan' ? 'nyan' : ''}`;
        m.innerHTML = type === 'nyan' 
            ? `<img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXE2cTBkMXQ4NG9tajZoZmd5b3A3MDBxdTQ3NzZtMWFwZ3J1MXNlYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7lsw8RenVcjCM/giphy.gif" width="30"> <span>${t}</span>`
            : t;
        document.getElementById('message-container').appendChild(m);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        setTimeout(() => m.remove(), d);
    }

    function shakeRow(i) {
        const r = document.getElementById(`row-${i}`);
        r.style.animation = 'shake 0.4s ease';
        setTimeout(() => r.style.animation = '', 400);
    }

    init();
});
