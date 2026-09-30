# 0050 Uygulama Planı: Form Pencerelerinin Boyutu ve Müşteri Detayının Uzunluğu

| | |
|---|---|
| **Bağlı spec** | `specs/0050-pencere-boyutu-ve-musteri-detay-uzunlugu.md` (R2, plan onayıyla) |
| **Dal** | `feat/0050-pencere-boyutu` (`feat/0051-kasa-bakim` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-30: bütün öneriler (Q1–Q9) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `GiderForm.jsx`, `Kasa.jsx` (Hesap, Virman), `gider/OdemeKayitPenceresi.jsx`, `kasa/CalisanAvanslari.jsx` (Avans Ver), `cek/CiroPenceresi.jsx`, `cek/CekEklePenceresi.jsx`, `gider/Tedarikciler.jsx` (form), `gider/UretimPartileri.jsx` (form), `gider/OdemePlaniPenceresi.jsx`, `gider/EkstrePenceresi.jsx` | `maxWidth` yerine `wide` (Sınıf 1) |
| `customers/CustomerDetailModal.jsx` | Maliyet kutusu denetimli katlanan `KartBolum`; `maliyetKutusuAcik` |
| `docs/tasarim-sozlugu.md` | Pencere boyutu kuralı |
| `scripts/tests/layout/form-pencere.{html,jsx}`, `scripts/tests/form-pencere-yerlesim.cjs`, `tests/form-pencere-yerlesim.test.js`, `vite.config.js` | Electron yerleşim testi |
| Testler | `ui/form-pencere-boyutu.test.jsx` (yeni); `ui/customer-maliyet-kutusu` güncellenir |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Maliyet kutusu testleri kutuyu açar; kutu `KartBolum` kartı |
| Q2 | Alınan Çek Durumu/Geçmişi Sınıf 2; Standart Gider işlem ve Tahsilat Hesap pencereleri dokunulmaz |
| Q3 | Kaynak taraması pencere bazında |
| Q4 | Değerler jsdom'da, yerleşim Electron'da (1280, 1024) |
| Q5 | `maliyetKutusuAcik` `sidebarDar` deseniyle, tek okuma tek yazma |
| Q6 | Kapalı kutuda rakam yok testi |
| Q7 | Alan sırası ve kaydedilen nesne testi |
| Q8 | Kanıt; Sınıf 1 ve müşteri detayı `degisti` |
| Q9 | Dal 0051 üstünden |

## 3. Adım sırası

1. `wide` geçişi, boyut ve kaynak taraması testi. 2. Maliyet kutusu. 3. Electron yerleşim testi. 4. Sözlük, CLAUDE.md, tam paket. 5. Kanıt, TY onayı.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-16, AC-17, AC-18 | `ui/form-pencere-boyutu` |
| AC-6, AC-14 | `ui/form-pencere-boyutu` |
| AC-15 | `ui/form-pencere-boyutu` (kaynak taraması) |
| AC-3, AC-7, AC-19 | `form-pencere-yerlesim.test.js` (Electron) |
| AC-4, AC-5 | `ui/form-pencere-boyutu` + `ui/gider-form`, `ui/gider-form-odeme` aynen |
| AC-8, AC-9, AC-11, AC-13, AC-22 | `ui/customer-maliyet-kutusu` |
| AC-10, AC-20, AC-21 | `ui/customer-maliyet-kutusu` |
| AC-12 | `ui/makina-karliligi` |
| AC-23 | `bayi-modal-layout.test.js` aynen + kaynak taraması |
| AC-24 | `kanit-eslemesi.test.js` |

## 5. Uygulama notları
- Sınıf 1 pencerelerinin boyut özellikleri `<Modal` açılış satırındadır; kaynak taraması o satırı başlığıyla bulur (Tedarikçi ve Üretim Partisi `onClose={() => …}` içerdiği için `>` ile kesmek yanlış olurdu).
- Onay penceresi (`ConfirmDialog`) `Modal` kullanmaz, kendi 400 px kabını çizer; AC-6 onu ölçer.
- Electron testinde on satır tek tek eklenir (tek tıkta dokuz tıklama React güncellemesini birleştiriyordu).
- Mevcut `ui/customer-maliyet-kutusu` içerik testleri kutuyu önce açar; iddiaları değişmedi (Q1).
- Kanıt: kira gider formu genişliği aynı ama yüksekliği 90vh → 94vh (R3); R14'ün "kira formu `ayni`" beklentisi yerine kira ekranları da `degisti` + TY onayı (spec'e not düşüldü).
- Görüntü aracı her sayfa açılışında `maliyetKutusuAcik`'i siler; Electron'un varsayılan oturumu localStorage'ı çekimler arasında tutuyordu.
- Triyaj (2026-09-30), bulgu 1: Electron yerleşim testi en geniş sabit içerikli iki pencereyi de ölçer: Ekstre tablosu (`?p=ekstre`, minWidth 720) ve dağıtım ızgarası (`?p=ciro`; Ciro ve Kendi Çekimizi Yaz aynı ızgara, alacaklı ön seçili). 1280 ve 1024 px'te taşma yok.
- Triyaj bulgu 2: 0016'nın "Görüşmeler ve Dosyalar kapalı başlar" testinin başlığı 0050 AC-13 atfını taşır.
