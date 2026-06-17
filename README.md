# Altunmak CRM — Windows Masaüstü Uygulaması

Altuntaş Makina müşteri ve servis takip sistemi. React + Electron ile geliştirilmiştir.

## Özellikler

- Müşteri yönetimi (model, kalıp, seri no, garanti takibi, not)
- Servis talepleri (durum filtresi, düzenleme, silme onayı)
- Makina geçmişi (servis zaman çizelgesi, yazdırılabilir rapor)
- Dashboard (son satışlar, garantisi bitenler, aktif servisler)
- **Kalıcı veri:** Tüm kayıtlar otomatik olarak bilgisayara kaydedilir
  - Konum: `%APPDATA%/makina-crm/data.json`
  - Her değişiklikten 0.5 saniye sonra otomatik yazılır
  - Yedek almak için bu dosyayı kopyalamanız yeterli

## Gereksinimler

- [Node.js](https://nodejs.org) (LTS sürümü, 18 veya üzeri)

## Kurulum

Proje klasöründe terminal/komut istemi açın:

```bash
npm install
```

## Geliştirme modunda çalıştırma

```bash
npm run dev
```

Uygulama penceresi açılır; kodda yaptığınız değişiklikler anında yansır.

## Windows kurulum dosyası (.exe) oluşturma

```bash
npm run build:win
```

Tamamlandığında `release/` klasöründe şunlar oluşur:

- `Altunmak CRM Setup 1.0.0.exe` — çift tıklayıp kurulabilen kurulum dosyası
- Kurulum sırasında klasör seçebilir, masaüstü kısayolu otomatik oluşur

> **Not:** İlk derlemede electron-builder gerekli araçları indirir, birkaç dakika sürebilir.
> İmzasız uygulamalarda Windows SmartScreen uyarı verebilir — "Daha fazla bilgi → Yine de çalıştır" ile geçilir.

## Proje Yapısı

```
makina-crm-desktop/
├── electron/
│   ├── main.cjs      # Electron ana süreç + JSON veri kaydetme
│   └── preload.cjs   # Güvenli köprü (window.crmStorage)
├── src/
│   ├── App.jsx       # CRM uygulaması (tüm arayüz)
│   └── main.jsx      # React giriş noktası
├── build/
│   └── icon.ico      # Uygulama simgesi
├── index.html
├── vite.config.js
└── package.json
```

## Veri Nasıl Saklanıyor?

- Uygulama açılınca `data.json` okunur; yoksa örnek verilerle başlar
- Müşteri/servis eklendiğinde, düzenlendiğinde veya silindiğinde otomatik kaydedilir
- Yazma işlemi önce geçici dosyaya yapılır, sonra taşınır — elektrik kesilse bile veri bozulmaz
- Tarayıcıda (Electron dışında) çalıştırılırsa veri bellekte kalır, kaydedilmez

## Sık Sorulanlar

**Veriyi başka bilgisayara taşımak?**
`%APPDATA%/makina-crm/data.json` dosyasını kopyalayıp yeni bilgisayarda aynı konuma yapıştırın.

**Birden fazla bilgisayardan aynı veriye erişim?**
Bu sürüm tek bilgisayar içindir. Çok kullanıcılı erişim için ortak bir sunucu + veritabanı (örn. PostgreSQL) gerekir.

---

# Otomatik Güncelleme Sistemi (v1.1+)

Uygulama, GitHub Releases üzerinden kendi kendini güncelleyebilir.
Kurulumu bir kez yapılır, sonrası otomatiktir.

## Bir Kerelik Kurulum

### 1. GitHub hesabı ve depo oluştur
1. https://github.com adresinde ücretsiz hesap aç
2. Sağ üstten **New repository** → ad: `makina-crm` → **Public** seç → **Create repository**
   (Public olması gerekir; ücretsizdir ve sadece kurulum dosyaları paylaşılır, verileriniz DEĞİL)

### 2. package.json'ı düzenle
`package.json` içinde şu satırı bul ve kendi GitHub kullanıcı adını yaz:

```json
"publish": [{ "provider": "github", "owner": "GITHUB-KULLANICI-ADINIZ", "repo": "makina-crm" }]
```

### 3. GitHub erişim anahtarı (token) oluştur
1. GitHub → sağ üst profil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)** → Note: "crm-release" → izinlerden sadece **repo** kutusunu işaretle → **Generate**
3. Çıkan `ghp_...` ile başlayan kodu kopyala (bir daha gösterilmez, not al)

### 4. Yeni paketi yükle
```bash
npm install
```

## Yeni Sürüm Yayınlama (her güncellemede)

1. `package.json` içindeki `"version"` değerini artır (örn. `1.1.0` → `1.2.0`)
2. Komut isteminde token'ı tanıt ve yayınla:

```bash
set GH_TOKEN=ghp_BURAYA_TOKENINIZ
npm run release
```

Bu komut derler ve GitHub Releases'e otomatik yükler.

## Kullanıcı Tarafında Ne Olur?

- Kurulu uygulama her açılışta sessizce yeni sürüm var mı diye bakar
- Varsa **Ayarlar → Uygulama Güncellemesi** bölümünde "Yeni sürüm hazır" rozeti görünür
- Kullanıcı **İndir** → ilerleme çubuğu → **Yeniden Başlat ve Kur** der, uygulama kendini günceller
- Müşteri/servis verileri etkilenmez (ayrı klasörde tutulur)

> Not: Otomatik güncelleme yalnızca Setup ile KURULMUŞ uygulamada çalışır.
> `npm run dev` (geliştirme) ve win-unpacked sürümünde devre dışıdır.
