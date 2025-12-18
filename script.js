document.addEventListener('DOMContentLoaded', () => {
    // --- Sabitler ve Değişkenler ---
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';
    const gizliKelimeURL = 'gizli-kelime.json';

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
            // Önce gizli kelimeyi yükle (cache bypass için timestamp ekle)
            const cacheBuster = `?t=${Date.now()}`;
            const gizliKelimeResponse = await fetch(gizliKelimeURL + cacheBuster);
            
            if (!gizliKelimeResponse.ok) {
                throw new Error("Gizli kelime dosyası bulunamadı. GitHub Actions henüz çalışmamış olabilir.");
            }

            const gizliKelimeText = await gizliKelimeResponse.text();
            
            // Boş dosya kontrolü
            if (!gizliKelimeText || gizliKelimeText.trim() === '') {
                throw new Error("Gizli kelime dosyası boş. Lütfen birkaç dakika bekleyip tekrar deneyin.");
            }

            let gizliKelimeData;
            try {
                gizliKelimeData = JSON.parse(gizliKelimeText);
            } catch (parseError) {
                throw new Error("Gizli kelime dosyası geçersiz. JSON formatı hatalı.");
            }

            if (!gizliKelimeData.kelime) {
                throw new Error("Gizli kelime dosyasında 'kelime' alanı bulunamadı.");
            }

            hedefKelime = gizliKelimeData.kelime.toUpperCase();

            // Kelime uzunluğu kontrolü
            if (hedefKelime.length !== WORD_LENGTH) {
                throw new Error(`Gizli kelime ${WORD_LENGTH} harfli olmalı, ancak ${hedefKelime.length} harfli.`);
            }

            // Sonra kelime listesini kontrol için yükle
            const kelimelerResponse = await fetch(kelimelerGistURL);
            if (!kelimelerResponse.ok) {
                console.warn("Kelime listesi yüklenemedi, tüm tahminler kabul edilecek.");
                kelimeler = [];
            } else {
                kelimeler = await kelimelerResponse.json();
                // Normalize et - küçük harfe çevir
                kelimeler = kelimeler.map(k => k.toLowerCase());
            }
            
            oyunTahtasiniOlustur();
            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            
            // Geliştirme modunda konsola yazdır
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log(`🎯 Hedef Kelime: ${hedefKelime}`);
            }
            
        } catch (error) {
            console.error("Oyun başlatılırken hata:", error);
            document.body.innerHTML = `
                <div style="color: white; text-align: center; margin-top: 50px; padding: 20px;">
                    <h1>😔 Oyun Yüklenemedi</h1>
                    <p style="font-size: 18px; margin: 20px 0;">${error.message}</p>
                    <p style="margin-top: 30px;">Lütfen daha sonra tekrar deneyin veya sayfayı yenileyin.</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #6aaa64; color: white; border: none; border-radius: 5px;">
                        🔄 Sayfayı Yenile
                    </button>
                </div>
            `;
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

            timerSpan.textContent = `${String(dakika).padStart(2, '0')}:${String(saniye).padStart(2, '0')}`;
        };

        guncelle();
        setInterval(guncelle, 1000);
    }

    // --- Oyun Tahtası ve Arayüz ---
    function oyunTahtasiniOlustur() {
        gameBoard.innerHTML = ''; // Temizle
        
        for (let i = 0; i < MAX_GUESSES; i++) {
            const satirDiv = document.createElement('div');
            satirDiv.setAttribute('id', `row-${i}`);
            satirDiv.classList.add('row');
            
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
        
        // Animasyon için küçük gecikme
        setTimeout(() => {
            mesajDiv.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            mesajDiv.classList.remove('show');
            setTimeout(() => {
                mesajDiv.remove();
            }, 300);
        }, duration);
    }

    // --- Oyun Mantığı ---
    function harfEkle(harf) {
        if (oyunBitti) return;
        
        if (mevcutKaro < WORD_LENGTH && mevcutSatir < MAX_GUESSES) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
            karo.textContent = harf;
            karo.classList.add('filled');
            
            // Pop animasyonu
            karo.style.animation = 'pop 0.1s';
            setTimeout(() => {
                karo.style.animation = '';
            }, 100);
            
            mevcutKaro++;
        }
    }

    function harfSil() {
        if (oyunBitti) return;
        
        if (mevcutKaro > 0 && mevcutSatir < MAX_GUESSES) {
            mevcutKaro--;
            const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
            karo.textContent = '';
            karo.classList.remove('filled');
        }
    }

    async function tahminiGonder() {
        if (oyunBitti) return;
        
        if (mevcutKaro !== WORD_LENGTH) {
            mesajGoster('Yeterli harf yok');
            shakeRow(mevcutSatir);
            return;
        }

        const tahmin = [];
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            tahmin.push(karo.textContent);
        }
        const tahminString = tahmin.join('');

        // Kelime listesi varsa kontrol et
        if (kelimeler.length > 0 && !kelimeler.includes(tahminString.toLowerCase())) {
            mesajGoster('Listede böyle bir kelime yok');
            shakeRow(mevcutSatir);
            return;
        }
        
        tahminler.push(tahminString);
        await tahminiIsle(tahminString);
        
        if (tahminString === hedefKelime) {
            oyunBitti = true;
            // Kazanma mesajı için kısa gecikme
            setTimeout(() => {
                mesajGoster('🎉 Tebrikler! Kelimeyi buldunuz!', 5000);
                celebrateWin();
            }, 1500);
            return;
        }

        mevcutSatir++;
        mevcutKaro = 0;

        if (mevcutSatir === MAX_GUESSES) {
            oyunBitti = true;
            setTimeout(() => {
                mesajGoster(`😔 Oyun Bitti! Kelime: ${hedefKelime}`, 5000);
            }, 1500);
        }
    }
    
    function shakeRow(rowIndex) {
        const row = document.getElementById(`row-${rowIndex}`);
        row.classList.add('shake');
        setTimeout(() => {
            row.classList.remove('shake');
        }, 500);
    }

    function celebrateWin() {
        // Kazanan satırın kutularını dans ettir
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            setTimeout(() => {
                karo.classList.add('bounce');
            }, i * 100);
        }
    }

    async function tahminiIsle(tahmin) {
        const hedefHarfler = hedefKelime.split('');
        const tahminHarfleri = tahmin.split('');
        const sonuc = new Array(WORD_LENGTH).fill('absent');
        const hedefKullanilanlar = new Array(WORD_LENGTH).fill(false);

        // Önce doğru pozisyondakileri işaretle (yeşil)
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (tahminHarfleri[i] === hedefHarfler[i]) {
                sonuc[i] = 'correct';
                hedefKullanilanlar[i] = true;
            }
        }

        // Sonra yanlış pozisyondakileri işaretle (sarı)
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (sonuc[i] === 'absent') {
                for (let j = 0; j < WORD_LENGTH; j++) {
                    if (!hedefKullanilanlar[j] && tahminHarfleri[i] === hedefHarfler[j]) {
                        sonuc[i] = 'present';
                        hedefKullanilanlar[j] = true;
                        break;
                    }
                }
            }
        }

        // Karoları flip animasyonu ile renklendir
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            const key = document.querySelector(`[data-key="${tahminHarfleri[i]}"]`);
            
            setTimeout(() => {
                karo.classList.add('flip');
                
                setTimeout(() => {
                    karo.classList.add(sonuc[i]);
                    karo.classList.remove('flip');
                    
                    // Klavye tuşunu güncelle - öncelik sırası: correct > present > absent
                    if (key) {
                        if (sonuc[i] === 'correct') {
                            key.classList.remove('present', 'absent');
                            key.classList.add('correct');
                        } else if (sonuc[i] === 'present' && !key.classList.contains('correct')) {
                            key.classList.remove('absent');
                            key.classList.add('present');
                        } else if (sonuc[i] === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
                            key.classList.add('absent');
                        }
                    }
                }, 250);
            }, i * 300);
        }

        // Tüm animasyonların bitmesini bekle
        return new Promise(resolve => {
            setTimeout(resolve, WORD_LENGTH * 300 + 500);
        });
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

        if (klavye) {
            klavye.addEventListener('click', (e) => {
                if (oyunBitti) return;

                const tus = e.target;
                if (!tus.matches('button')) return;

                const key = tus.dataset.key;
                
                // Tuş basma animasyonu
                tus.classList.add('active');
                setTimeout(() => {
                    tus.classList.remove('active');
                }, 100);
                
                if (key === 'ENTER') {
                    tahminiGonder();
                } else if (key === 'BACKSPACE') {
                    harfSil();
                } else {
                    harfEkle(key);
                }
            });
        }
    }
    
    // CSS animasyonlarını ekle
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes flip {
            0% { transform: rotateX(0); }
            50% { transform: rotateX(90deg); }
            100% { transform: rotateX(0); }
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        .shake {
            animation: shake 0.5s;
        }
        
        .flip {
            animation: flip 0.5s;
        }
        
        .bounce {
            animation: bounce 0.5s ease-in-out;
        }
        
        .message {
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        }
        
        .message.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        button.active {
            transform: scale(0.95);
            transition: transform 0.1s;
        }
    `;
    document.head.appendChild(style);

    // Oyunu Başlat
    init();
});
