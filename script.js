document.addEventListener('DOMContentLoaded', () => {
    // --- Sabitler ve Değişkenler ---
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const ANIMATION_DURATION = 300; // Her kutunun flip süresi
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';
    const gizliKelimeURL = 'gizli-kelime.json';

    let kelimeler = [];
    let hedefKelime = '';
    let mevcutSatir = 0;
    let mevcutKaro = 0;
    let oyunBitti = false;

    const gameBoard = document.getElementById('game-board');
    const klavye = document.getElementById('keyboard');
    const messageContainer = document.getElementById('message-container');
    const timerSpan = document.querySelector('#timer span');

    // --- Başlangıç Fonksiyonları ---
    async function init() {
        console.log('🎮 Oyun başlatılıyor...');
        
        try {
            // Önce oyun tahtasını oluştur
            oyunTahtasiniOlustur();
            console.log('✅ Oyun tahtası oluşturuldu');
            
            // Gizli kelimeyi yükle (cache bypass)
            const cacheBuster = `?t=${Date.now()}`;
            console.log('📥 Gizli kelime yükleniyor...');
            
            const gizliKelimeResponse = await fetch(gizliKelimeURL + cacheBuster);
            
            if (!gizliKelimeResponse.ok) {
                throw new Error("Gizli kelime dosyası bulunamadı. GitHub Actions henüz çalışmamış olabilir.");
            }

            const gizliKelimeText = await gizliKelimeResponse.text();
            
            if (!gizliKelimeText || gizliKelimeText.trim() === '') {
                throw new Error("Gizli kelime dosyası boş. Lütfen birkaç dakika bekleyip tekrar deneyin.");
            }

            let gizliKelimeData;
            try {
                gizliKelimeData = JSON.parse(gizliKelimeText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error("Gizli kelime dosyası geçersiz.");
            }

            if (!gizliKelimeData.kelime) {
                throw new Error("Gizli kelime dosyasında 'kelime' alanı bulunamadı.");
            }

            hedefKelime = gizliKelimeData.kelime.toUpperCase().trim();
            console.log(`✅ Hedef kelime yüklendi (${hedefKelime.length} harf)`);

            if (hedefKelime.length !== WORD_LENGTH) {
                throw new Error(`Kelime ${WORD_LENGTH} harfli olmalı.`);
            }

            // Kelime listesini yükle
            try {
                console.log('📥 Kelime listesi yükleniyor...');
                const kelimelerResponse = await fetch(kelimelerGistURL);
                if (kelimelerResponse.ok) {
                    kelimeler = await kelimelerResponse.json();
                    kelimeler = kelimeler.map(k => k.toLowerCase().trim());
                    console.log(`✅ ${kelimeler.length} kelime yüklendi`);
                }
            } catch (error) {
                console.warn("⚠️ Kelime listesi yüklenemedi, tüm tahminler kabul edilecek.");
            }
            
            klavyeOlayDinleyicileriEkle();
            geriSayimiBaslat();
            
            console.log('🎉 Oyun hazır!');
            
            // Sadece localhost'ta kelimeyi göster
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log(`🎯 Hedef Kelime: ${hedefKelime}`);
            }
            
        } catch (error) {
            console.error("❌ Oyun başlatma hatası:", error);
            gameBoard.innerHTML = `
                <div style="color: white; text-align: center; padding: 40px 20px; max-width: 400px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">😔</div>
                    <h2 style="font-size: 24px; margin-bottom: 16px; font-weight: 700;">Oyun Yüklenemedi</h2>
                    <p style="font-size: 16px; color: #9ca3af; margin-bottom: 24px; line-height: 1.6;">${error.message}</p>
                    <button onclick="location.reload()" style="padding: 14px 32px; font-size: 16px; cursor: pointer; background: linear-gradient(135deg, #6aaa64 0%, #5a9a54 100%); color: white; border: none; border-radius: 8px; font-weight: 700; box-shadow: 0 4px 12px rgba(106, 170, 100, 0.4); transition: all 0.2s;">
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

            if (timerSpan) {
                timerSpan.textContent = `${String(dakika).padStart(2, '0')}:${String(saniye).padStart(2, '0')}`;
            }
        };

        guncelle();
        setInterval(guncelle, 1000);
    }

    // --- Oyun Tahtası ve Arayüz ---
    function oyunTahtasiniOlustur() {
        if (!gameBoard) {
            console.error('❌ gameBoard elementi bulunamadı!');
            return;
        }
        
        gameBoard.innerHTML = '';
        
        for (let i = 0; i < MAX_GUESSES; i++) {
            const satirDiv = document.createElement('div');
            satirDiv.classList.add('row');
            satirDiv.id = `row-${i}`;
            
            for (let j = 0; j < WORD_LENGTH; j++) {
                const karoDiv = document.createElement('div');
                karoDiv.classList.add('tile');
                karoDiv.id = `tile-${i}-${j}`;
                satirDiv.appendChild(karoDiv);
            }
            
            gameBoard.appendChild(satirDiv);
        }
        
        console.log(`✅ ${MAX_GUESSES}x${WORD_LENGTH} oyun tahtası oluşturuldu`);
    }

    function mesajGoster(text, duration = 2000) {
        if (!messageContainer) return;
        
        const mesajDiv = document.createElement('div');
        mesajDiv.classList.add('message');
        mesajDiv.textContent = text;
        messageContainer.appendChild(mesajDiv);
        
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
        if (oyunBitti || mevcutKaro >= WORD_LENGTH) return;
        
        const karo = document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`);
        if (karo) {
            karo.textContent = harf;
            karo.classList.add('filled');
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

    async function tahminiGonder() {
        if (oyunBitti) return;
        
        if (mevcutKaro !== WORD_LENGTH) {
            mesajGoster('Yeterli harf yok');
            shakeRow(mevcutSatir);
            return;
        }

        // Tahmini topla
        const tahmin = [];
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            if (karo && karo.textContent) {
                tahmin.push(karo.textContent);
            }
        }
        
        if (tahmin.length !== WORD_LENGTH) {
            console.error('❌ Tahmin uzunluğu hatalı:', tahmin);
            return;
        }
        
        const tahminString = tahmin.join('');

        // Kelime kontrolü
        if (kelimeler.length > 0 && !kelimeler.includes(tahminString.toLowerCase())) {
            mesajGoster('Listede böyle bir kelime yok');
            shakeRow(mevcutSatir);
            return;
        }
        
        // Tahmini işle ve animasyonların bitmesini bekle
        await tahminiIsle(tahminString);
        
        // Kazanma kontrolü
        if (tahminString === hedefKelime) {
            oyunBitti = true;
            mesajGoster('🎉 Tebrikler! Kelimeyi buldunuz!', 5000);
            celebrateWin();
            return;
        }

        // Kaybetme kontrolü ÖNCE
        if (mevcutSatir + 1 >= MAX_GUESSES) {
            oyunBitti = true;
            mesajGoster(`😔 Oyun Bitti! Kelime: ${hedefKelime}`, 5000);
            return;
        }

        // Bir sonraki satıra geç (sadece oyun devam ediyorsa)
        mevcutSatir++;
        mevcutKaro = 0;
    }
    
    function shakeRow(rowIndex) {
        const row = document.getElementById(`row-${rowIndex}`);
        if (row) {
            row.classList.add('shake');
            setTimeout(() => {
                row.classList.remove('shake');
            }, 500);
        }
    }

    function celebrateWin() {
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            if (karo) {
                setTimeout(() => {
                    karo.classList.add('bounce');
                }, i * 100);
            }
        }
    }

    async function tahminiIsle(tahmin) {
        const hedefHarfler = hedefKelime.split('');
        const tahminHarfleri = tahmin.split('');
        const sonuc = new Array(WORD_LENGTH).fill('absent');
        const hedefKullanilanlar = new Array(WORD_LENGTH).fill(false);

        // 1. Önce doğru pozisyondakileri işaretle (yeşil)
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (tahminHarfleri[i] === hedefHarfler[i]) {
                sonuc[i] = 'correct';
                hedefKullanilanlar[i] = true;
            }
        }

        // 2. Sonra yanlış pozisyondakileri işaretle (sarı)
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

        // 3. Karoları sırayla renklendir
        for (let i = 0; i < WORD_LENGTH; i++) {
            const karo = document.getElementById(`tile-${mevcutSatir}-${i}`);
            const key = document.querySelector(`[data-key="${tahminHarfleri[i]}"]`);
            
            setTimeout(() => {
                if (karo) {
                    karo.classList.add('flip');
                    
                    setTimeout(() => {
                        karo.classList.add(sonuc[i]);
                        karo.classList.remove('flip');
                    }, 250);
                }
                
                // Klavyeyi güncelle (doğru öncelik sırası)
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
            }, i * ANIMATION_DURATION);
        }

        // Tüm animasyonların bitmesini bekle
        return new Promise(resolve => {
            setTimeout(resolve, WORD_LENGTH * ANIMATION_DURATION + 500);
        });
    }

    // --- Olay Dinleyicileri ---
    function klavyeOlayDinleyicileriEkle() {
        // Fiziksel klavye
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

        // Ekran klavyesi
        if (klavye) {
            klavye.addEventListener('click', (e) => {
                if (oyunBitti) return;

                const tus = e.target.closest('button');
                if (!tus) return;

                const key = tus.dataset.key;
                
                // Tuş animasyonu
                tus.classList.add('active');
                setTimeout(() => {
                    tus.classList.remove('active');
                }, 100);
                
                if (key === 'ENTER') {
                    tahminiGonder();
                } else if (key === 'BACKSPACE') {
                    harfSil();
                } else if (key) {
                    harfEkle(key);
                }
            });
        }
    }

    // Oyunu Başlat
    init();
});
