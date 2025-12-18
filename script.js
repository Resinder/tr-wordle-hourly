document.addEventListener('DOMContentLoaded', () => {
    // --- Sabitler ve Değişkenler ---
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';
    const gizliKelimeURL = 'gizli-kelime.json'; // GitHub Actions'ın oluşturacağı dosya

    let kelimeler = [];
    let hedefKelime = '';
    let mevcutSatir = 0;
    let mevcutKaro = 0;
    let oyunBitti = false;
    let tahminler = [];

    const gameBoard = document.getElementById('game-board');
    const klavye = document.getElementById('keyboard');
    const messageContainer = document.getElementById('message-container');
    const timerSpan = document.querySelector('#timer span');

    // --- Başlangıç Fonksiyonları ---
    async function init() {
        try {
            // Önce gizli kelimeyi yükle
            const gizliKelimeResponse = await fetch(gizliKelimeURL);
            if (!gizliKelimeResponse.ok) {
                throw new Error("Gizli kelime yüklenemedi. GitHub Actions henüz çalışmamış olabilir.");
            }
            const gizliKelimeData = await gizliKelimeResponse.json();
            hedefKelime = gizliKelimeData.kelime.toUpperCase();

            // Sonra kelime listesini kontrol için yükle
            const kelimelerResponse = await fetch(kelimelerGistURL);
            kelimeler = await kelimelerResponse.json();
            
            oyunTahtasiniOlustur();
            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            console.log(`Hedef Kelime: ${hedefKelime}`); // Hile için :) Yayında kaldırın.
        } catch (error) {
            console.error("Oyun başlatılırken hata:", error);
            document.body.innerHTML = `<div style="color: white; text-align: center; margin-top: 50px;"><h1>Oyun Yüklenemedi</h1><p>${error.message}</p><p>Lütfen daha sonra tekrar deneyin.</p></div>`;
        }
    }

    function geriSayimiBaslat() {
        const guncelle = () => {
            const simdi = new Date();
            const sonrakiSaat = new Date(simdi);
            sonrakiSaat.setHours(simdi.getHours() + 1, 0, 0, 0);
            
            const fark = sonrakiSaat - simdi;
            const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
            const saniye = Math.floor((fark % (1000 * 60)) / 1000);

            timerSpan.textContent = `${dakika}dk ${saniye}s`;
        };

        guncelle();
        setInterval(guncelle, 1000);
    }

    // --- Oyun Tahtası ve Arayüz ---
    function oyunTahtasiniOlustur() {
        for (let i = 0; i < MAX_GUESSES; i++) {
            const satirDiv = document.createElement('div');
            satirDiv.setAttribute('id', `row-${i}`);
            for (let j = 0; j < WORD_LENGTH; j++) {
                const karoDiv = document.createElement('div');
                karoDiv.setAttribute('id', `tile-${i}-${j}`);
                karoDiv.classList.add('tile');
                satirDiv.appendChild(karoDiv);
            }
            gameBoard.appendChild(satirDiv);
        }
    }

    function mesajGoster(text, duration = 2000) {
        const mesajDiv = document.createElement('div');
        mesajDiv.classList.add('message');
        mesajDiv.textContent = text;
        messageContainer.appendChild(mesajDiv);
        setTimeout(() => {
            mesajDiv.remove();
        }, duration);
    }

    // --- Oyun Mantığı ---
    function harfEkle(harf) {
        if (mevcutKaro < WORD_LENGTH && mevcutSatir < MAX_GUESSES) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
            karo.textContent = harf;
            mevcutKaro++;
        }
    }

    function harfSil() {
        if (mevcutKaro > 0 && mevcutSatir < MAX_GUESSES) {
            mevcutKaro--;
            const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
            karo.textContent = '';
        }
    }

    async function tahminiGonder() {
        if (mevcutKaro !== WORD_LENGTH) {
            mesajGoster('Yeterli harf değil');
            return;
        }

        const tahmin = [];
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            tahmin.push(karo.textContent);
        }
        const tahminString = tahmin.join('');

        if (!kelimeler.includes(tahminString.toLowerCase())) {
            mesajGoster('Listede böyle bir kelime yok');
            shakeRow(mevcutSatir);
            return;
        }
        
        tahminler.push(tahminString);
        await tahminiIsle(tahminString);
        
        if (tahminString === hedefKelime) {
            mesajGoster('Tebrikler! Kazandınız!', 5000);
            oyunBitti = true;
            return;
        }

        mevcutSatir++;
        mevcutKaro = 0;

        if (mevcutSatir === MAX_GUESSES) {
            mesajGoster(`Oyun Bitti! Kelime: ${hedefKelime}`, 5000);
            oyunBitti = true;
        }
    }
    
    function shakeRow(rowIndex) {
        const row = document.getElementById(`row-${rowIndex}`);
        row.style.animation = 'shake 0.5s';
        setTimeout(() => {
            row.style.animation = '';
        }, 500);
    }

    async function tahminiIsle(tahmin) {
        const hedefHarfler = hedefKelime.split('');
        const tahminHarfleri = tahmin.split('');
        const sonuc = new Array(WORD_LENGTH).fill('absent');

        for (let i = 0; i < WORD_LENGTH; i++) {
            if (tahminHarfleri[i] === hedefHarfler[i]) {
                sonuc[i] = 'correct';
                hedefHarfler[i] = null;
            }
        }

        for (let i = 0; i < WORD_LENGTH; i++) {
            if (sonuc[i] === 'absent' && hedefHarfler.includes(tahminHarfleri[i])) {
                sonuc[i] = 'present';
                hedefHarfler[hedefHarfler.indexOf(tahminHarfleri[i])] = null;
            }
        }

        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            const key = document.querySelector(`[data-key="${tahminHarfleri[i]}"]`);
            
            setTimeout(() => {
                karo.classList.add(sonuc[i]);
                if (key && !key.classList.contains('correct') && !key.classList.contains('present')) {
                     key.classList.add(sonuc[i]);
                } else if (key && sonuc[i] === 'correct') {
                    key.classList.remove('present');
                    key.classList.add('correct');
                }
            }, i * 100);
        }
    }

    // --- Olay Dinleyicileri ---
    function klavyeOlayDinleyicileriEkle() {
        document.addEventListener('keydown', (e) => {
            if (oyunBitti) return;
            
            if (e.key === 'Enter') {
                tahminiGonder();
            } else if (e.key === 'Backspace') {
                harfSil();
            } else if (/^[a-zA-ZğĞıİöÖşŞüÜçÇ]$/.test(e.key)) {
                harfEkle(e.key.toUpperCase());
            }
        });

        klavye.addEventListener('click', (e) => {
            if (oyunBitti) return;

            const tus = e.target;
            if (!tus.matches('button')) return;

            const key = tus.dataset.key;
            if (key === 'ENTER') {
                tahminiGonder();
            } else if (key === 'BACKSPACE') {
                harfSil();
            } else {
                harfEkle(key);
            }
        });
    }
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);

    // Oyunu Başlat
    init();
});
