# 🇹🇷 Türkçe Wordle - Saatlik

Bu proje, popüler Wordle oyununun tamamen Türkçe ve her saat başı değişen bir kelime ile oynanan, modern ve hileye karşı korumalı bir klonudur.

---

## 🎮 Oyunu Oyna

Oyuna hemen başlamak için aşağıdaki linke tıklayın:

**🔗 [https://resinder.github.io/tr-wordle-hourly/](https://resinder.github.io/tr-wordle-hourly/)**

---

## ✨ Özellikler

- **✅ Tamamen Türkçe:** Tüm arayüz, klavye ve kelimeler Türkçe'dir
- **⏰ Saatlik Kelime:** Her saat başı, herkes için aynı yeni kelimeyle oynama şansı
- **🔒 Hileye Karşı Koruma:** Günlük kelime tarayıcıda hesaplanmaz. GitHub Actions tarafından sunucu tarafında belirlenir, bu sayede kelimeyi önceden öğrenmek neredeyse imkansızdır
- **📱 Modern ve Responsive Tasarım:** Mobil, tablet ve masaüstü cihazlarda kusursuz deneyim
- **⚡ Hızlı ve Sunucusuz:** GitHub Pages üzerinde çalıştığı için herhangi bir veritabanı veya sunucu maliyeti gerektirmez
- **🎯 6 Tahmin Hakkı:** Klasik Wordle kurallarına uygun oynanış
- **🎨 Görsel Geri Bildirimler:** Renkli kutucuklarla doğru, yanlış ve yakın tahminler

---

## 🎲 Nasıl Oynanır?

1. **Kelime Tahmin Edin:** 5 harfli Türkçe bir kelime tahmin edin
2. **Renk Kodlarını İzleyin:**
   - 🟩 **Yeşil:** Harf doğru ve doğru yerde
   - 🟨 **Sarı:** Harf kelimede var ama yanlış yerde
   - ⬜ **Gri:** Harf kelimede yok
3. **6 Denemede Bulun:** Toplam 6 tahmin hakkınız var
4. **Saatlik Yeni Kelime:** Her saat başı yeni bir kelimeyle tekrar oynayın

---

## 🔧 Nasıl Çalışır?

Projenin iki ana bileşeni vardır: **istemci tarafı** (oyunun kendisi) ve **sunucu tarafı otomasyonu** (kelime seçimi).

### 1️⃣ Oyun Mantığı (İstemci Tarafı)

- Oyun, tarayıcınızda çalışan saf HTML, CSS ve JavaScript'ten oluşur
- Oyun başladığında, `gizli-kelime.json` dosyasından o anki kelimeyi çeker
- Tahminlerinizi kontrol etmek için kelime listesini Gist üzerinden dinamik olarak yükler

### 2️⃣ Otomasyon (Kelime Seçimi - Sunucu Tarafı)

GitHub Actions kullanılarak her saat başı otomatik bir iş tetiklenir:

1. Belirtilen Gist linkinden 5 harfli tüm kelimelerin listesini indirir
2. Bu listeden tamamen rastgele bir kelime seçer
3. Seçilen kelimeyi `{"kelime": "RASTGELE_KELIME"}` formatında `gizli-kelime.json` dosyasına yazar
4. Bu yeni dosyayı repository'ye otomatik olarak commit'ler

Bu yöntemle kelime her saat başı GitHub tarafından güncellenir ve oyuncular adil bir oyun deneyimi yaşar.

---

## 🚀 Yerel Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

### Adım 1: Repository'i Klonlayın

```bash
git clone https://github.com/Resinder/tr-wordle-hourly.git
cd tr-wordle-hourly
```

### Adım 2: Test Kelimesi Oluşturun (İsteğe Bağlı)

GitHub Actions henüz çalışmadıysa, test için bir `gizli-kelime.json` dosyası oluşturun:

```json
{"kelime": "DENEME"}
```

### Adım 3: Projeyi Açın

`index.html` dosyasını web tarayıcınızda açın veya bir yerel sunucu kullanın:

```bash
# Python 3 ile
python -m http.server 8000

# Node.js ile (http-server kurulu ise)
npx http-server
```

Ardından tarayıcınızda `http://localhost:8000` adresine gidin.

---

## 📁 Proje Yapısı

```
tr-wordle-hourly/
├── .github/
│   └── workflows/
│       └── update-word.yml      # Saatlik kelime güncelleme otomasyonu
├── index.html                   # Ana sayfa
├── style.css                    # Stil dosyası
├── script.js                    # Oyun mantığı
├── gizli-kelime.json           # Güncel kelime (GitHub Actions tarafından oluşturulur)
└── README.md                    # Bu dosya
```

---

## 🛠️ Kullanılan Teknolojiler

| Teknoloji | Kullanım Amacı |
|-----------|---------------|
| **HTML5** | Oyunun iskeleti ve yapısı |
| **CSS3** | Modern ve animasyonlu arayüz (Grid, Flexbox, Transitions) |
| **Vanilla JavaScript** | Tüm oyun mantığı ve etkileşimler |
| **GitHub Actions** | Saatlik kelime seçimi için otomasyon |
| **GitHub Pages** | Projenin statik olarak yayınlanması |
| **GitHub Gist** | Türkçe kelime listesi barındırma |

---

## ⚙️ Kendi Wordle'ınızı Oluşturun

Bu projeyi fork'layarak kendi Wordle versiyonunuzu oluşturabilirsiniz:

### Adım 1: Fork'layın

Projeyi GitHub'da fork'layın ve kendi repository'nize kopyalayın.

### Adım 2: Kelime Listesi Oluşturun

1. [GitHub Gist](https://gist.github.com) üzerinde 5 harfli kelimelerinizi içeren bir liste oluşturun
2. Her kelime yeni satırda olmalı (örnek: `MERHABA\nDÜNYA\nKELİME`)
3. Gist'in "Raw" linkini kopyalayın

### Adım 3: Workflow'u Güncelleyin

`.github/workflows/update-word.yml` dosyasındaki Gist URL'sini kendi linkinizle değiştirin:

```yaml
run: curl -o kelimeler.txt "GIST_RAW_LINKINIZ"
```

### Adım 4: GitHub Pages'i Aktifleştirin

Repository ayarlarından **Settings > Pages** bölümüne gidin ve **Source** olarak `main` branch'ini seçin.

### Adım 5: GitHub Actions'a İzin Verin

**Settings > Actions > General** bölümünden workflow izinlerini ayarlayın.

---

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Katkıda bulunmak için:

1. Projeyi fork'layın
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit'leyin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi push'layın (`git push origin feature/yeniOzellik`)
5. Bir Pull Request açın

### Geliştirme Fikirleri

- [ ] İstatistik sistemi (kazanma oranı, ortalama tahmin sayısı)
- [ ] Koyu tema desteği
- [ ] Zorluk seviyeleri (4, 5, 6 harfli kelimeler)
- [ ] Paylaşım butonu (sonuçları kopyalama)
- [ ] Ses efektleri
- [ ] Çoklu dil desteği

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakabilirsiniz.

---

## 🙏 Teşekkürler

- **Josh Wardle** - Orijinal Wordle oyununun yaratıcısı
- **Türkçe Kelime Listeleri** - Kelime havuzu sağlayanlar
- **GitHub** - Ücretsiz hosting ve otomasyon altyapısı

---

## 📞 İletişim

Sorularınız veya önerileriniz için:

- 🐛 [Issue Açın](https://github.com/Resinder/tr-wordle-hourly/issues)
- 💬 [Discussions](https://github.com/Resinder/tr-wordle-hourly/discussions)
- 📧 GitHub profili üzerinden iletişime geçin

---

## 📊 Proje Durumu

![GitHub repo size](https://img.shields.io/github/repo-size/Resinder/tr-wordle-hourly)
![GitHub stars](https://img.shields.io/github/stars/Resinder/tr-wordle-hourly)
![GitHub forks](https://img.shields.io/github/forks/Resinder/tr-wordle-hourly)
![GitHub issues](https://img.shields.io/github/issues/Resinder/tr-wordle-hourly)
![GitHub last commit](https://img.shields.io/github/last-commit/Resinder/tr-wordle-hourly)

---

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**
