# 0106 uygulama planı: müşteri satırları makina ve kalıp durumunu renkli pille gösterir

Spec: `specs/0106-musteri-satirlarinda-makina-ve-kalip-durumu.md` (revizyon 3). Plan Takım Yöneticisi tarafından 2026-10-24'te
onaylandı; onaylanan öneriler spec'e "Plan turu kararları" (Karar 31–40) olarak işlendi. Mockup tuvali plana göre güncellendi:
https://claude.ai/artifact/Ujpo2sqN6FETmuJ7apr942

Çalışma kopyası `../wt0106`, dal `feat/0106-musteri-durumu`, taban `origin/main` `52651a1`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/musteriDurumu.js` (yeni) | sabitler, `makinaDurumuOf`, `uretimFormHaritasi`, `kalipDurumuTuret`, `kalipDurumuOf`, `extraKalipGrupla`, `kalipKumesi`, `makinaPili`, `kalipPili`, `odemePili`, `teslimBekliyorMu`, `otomatikEtiket`, `durumYaz` (Karar 31, 36, 40); renk tablosu `var(--token, #yedek)` |
| `src/lib/satisKaydi.js` | `makinaDurumuDamgala` (tek `uretimDurumuOf` çağrısı, R2/2) |
| `src/components/customers/DurumPili.jsx` (yeni) | yerel pil, Stok rozeti ölçüleri (Karar 34) |
| `src/components/customers/DurumSecici.jsx` (yeni) | `MakinaDurumuSecici`, `KalipDurumuSecici` (Karar 33) |
| `src/components/Customers.jsx` | `uretimFormlari = []`; harita ve satır durumu tek `useMemo`; Durum sütunu; "Teslim Bekleyenler" pili; damga zinciri (Karar 39); harita forma ve detaya |
| `src/App.jsx` | `<Customers … uretimFormlari={liveUretimFormlari}>` (mevcut satırda) |
| `src/components/customers/CustomerAddEditForm.jsx` | makina seçicisi Garanti Bitiş ile `giderYetki` bloğu arasında; kalıp ızgarası altı sütun; ayna satırda salt okunur ad |
| `src/components/customers/CustomerDetailModal.jsx` | makina seçicisi kalıp kartının üstünde (Karar 32); kalıp şeridi satır listesi |
| `src/components/customers/detail/MachineTimeline.jsx` | Extra Kalıp satırında kalıp seçicisi (`cust_kalip_edit`) |
| `electron/db.cjs` | üç sütun, dört nokta, ayıklamalı okuma (C2/2) |
| `docs/tasarim-sozlugu.md` | rozet borcu maddesi; üç atıf (Karar 37) |
| `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/*` | dört yeni ekran, `0106-taban`, `0106` raporları, eşleme |
| `CLAUDE.md`, `specs/README.md` | kapanışta |

Testler: yeni `tests/musteri-durumu-0106.test.js` (S), `tests/ui/musteri-durumu-0106.test.jsx` (U),
`tests/ui/musteri-durumu-0106-app.test.jsx` (A); ek bloklar `tasarim-kontrast` (0030), `db-roundtrip.cjs`
(`0106-govde-once.json`), `db-clean-install.cjs`.

## 2. Adım sırası

1. Önkoşul testleri eski kodla: borçlu satırın zemini, hover ve `title`'ı (AC-15), "Borçlu Firmalar" sayısı (AC-27), manuel seri
   satışın kayıt nesnesi.
2. Görsel taban eski kodla, iki çekim (değişecek yedi ekran ve 0 piksel kalması gereken Stok, pano, Kalıp Üretim Formu).
3. Veri: spec öncesi gövde fikstürü, sonra `db.cjs` ve iki Electron testi.
4. Saf katman ve kontrast kayıtları (ton ayrımı dahil, Karar 35).
5. Ekran: `DurumPili`, `DurumSecici` → Customers → App → form → detay → zaman çizelgesi.
6. UI testleri ve mutasyonla ölçüm: ayna satırı kümeye katmak (AC-37), R21 bastırmasını kaldırmak (AC-21), paydayı
   bastırılmışsız saymak (AC-19), haritayı satır başına kurmak (AC-29), damgayı `setCustomers`'tan sonra yapmak (AC-1, gerçek App).
7. İş raporu, kanıt eşlemesi (`degisti` + onay), sözlük atıfları.
8. `npm run lint`, `npm run typecheck`, `npm test` (Electron dahil).

Kapanışta (C9, AC-44) taban son kodla yeniden çekilir, bütün kayıtlar `ayni`ye çevrilir.

## 3. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| 1, 2 | S + A (gerçek App: serili, serisiz, alanı boş stok satırı; manuel seri) |
| 3, 36 | U (dört seçenek, boş siler, `giderYetki=false`, DOM sırası) |
| 4, 39 | U (detay ve zaman çizelgesi yazımı, kapılar) |
| 5, 17, 22, 23 | U + S |
| 6, 33 | mevcut 0100, Dashboard, UretimFormu testleri dokunulmadan + 0 piksel kanıt |
| 7–14 | S + U (AC-14 seçimi) |
| 15, 27 | U önkoşul (eski kodla yeşil) |
| 16, 18–21 | S + U |
| 24 | `tasarim-kontrast` 0030 (kayıt dosyası kütüphane, ton ≥ 26°, token benzersizliği) |
| 25, 26 | U + S tarama |
| 28, 35, 41, 42 | S taramaları |
| 29 | S casus (1000 müşteri, 50 form) + U (aynı nesne) |
| 30, 31 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| 32, 34 | S içerik taramaları |
| 37, 38 | S + U |
| 40 | U + 35 düzenek dokunulmadan |
| 43 | S tarama |
| 44 | kapanışta `kanit-eslemesi`, `tasarim-kaynak` |

## 4. Uygulamada çıkanlar

- **Ton ayrımı (Karar 41):** kırmızı ile amber aydınlıkta 25,96 derece; Takım Yöneticisi kararıyla test tam dereceye yuvarlar,
  renkler değişmedi.
- **Bilinçli değişen eski testler ("spec 0106 ile" notlu):** 0104 AC-6'nın kayıt nesnesi (serisiz satış artık
  `makinaDurumu: "hazir"` damgalanır, R2); 0079 ve 0095 ekran kıyasları bu spec'in eklemelerini `tests/fixtures/0106-ayikla.js` ile
  iki taraftan ayıklar (0100'ün stok kutusu deseni).
- **Formdaki ayna satır:** mockup'tan farklı olarak "Üretim formuna gönder" kutusu ayna satırda da durur (R29: yazım yolları
  değişmez); yalnız durum seçicisinin yerinde salt okunur ad yazar.
- **Formda seçici genişliği sabit (210 px):** satırlar ayrı ızgara olduğu için seçici genişliği satırdan satıra değişip sütunları
  kaydırıyordu.
- **Sözlük atıfları (Karar 37):** `Customers.jsx:499` → `:510`, `:533` → `:545`, `MachineTimeline.jsx:88` → `:91`, form `:163` →
  `:167`, `:128` → `:132`.
- **Mutasyonla ölçüm:** ayna satır kümeye katılır (AC-17/37/40), R21 bastırması yok (AC-19/21/40), payda bastırılmışsız (AC-19/40),
  form kimliği aranmaz (AC-11, Karar 31), damga yok (AC-1 gerçek App), harita satır başına (AC-28/29 iki test), veritabanı okuması
  ayıklamasız (AC-30 iki kontrol). Hepsi geri alındı.
- **Değişen ekran sayısı spec'in tablosundan fazla:** makina durumu satırı her müşteri detayında, seçici her müşteri formunda
  çizildiği için bütün form ve detay türevleri değişti (iş raporunda 25 değişen ekran + 4 yeni; taban 114 görüntü eski ↔ eski
  0 fark). Stok, pano, Kalıp Üretim Formu ve Anasayfa ekranları 0 piksel (C10). `kalip-formu` ve
  `musteri-tahsilat-hesap-penceresi` arkadaki müşteri detayı yüzünden değişti; kayıtları detay penceresine bağlandı.
- **`suzgec-yerlesim` (Electron):** süzgeç sayısı beşten altıya ("spec 0106 ile"); sarma ve taşma ölçümleri altı pille yeşil.

## 5. Sürüm notu için

- "Teslim Bekleyenler" süzgeci ilk gün 0 gösterir; yeni satışlar damgalandıkça ve ilk Kalıp Üretim Formu açıldıkça dolar.
- Kalıp durumu üretim formuna kalıbın listedeki sırasıyla bağlıdır. Müşteri formundan bir kalıp silinirse ya da bir Extra Kalıp
  satışı silinirse sonraki kalıplar başka bir kalıbın durumunu gösterebilir (ör. "hazır"); gerekirse durum kalıbın seçicisinden
  elle yazılır. Kalıcı çözüm (kalıba kimlik) ayrı iştir.
- Ödeme pilinin ince kenarı, borçlu satırın üzerine gelindiğinde pilin seçilebilmesi içindir.
