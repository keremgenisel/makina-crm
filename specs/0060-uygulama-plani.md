# 0060 Uygulama Planı: Ödeme Neyin Ödemesi Olduğunu Söylesin

| | |
|---|---|
| **Bağlı spec** | `specs/0060-odeme-hedefi-adlari-ve-personel-detayi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0060-hedef-adlari` (`feat/0065-stok-hareketi` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q10) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- 0047 ve 0059 çıktı testleri `"2.345"`, `"Prim"`, `"Fazla mesai"`, `"ikramiye"`'yi yasaklıyor; `giderRaporu.js`'te `ekOdemeler`
  kaynak yasağı var (`gider-kasa-raporu.test.js:250`). Spec'in "tek daraltma R21" iddiası tutmuyordu (R28).
- `donemYontemKirilimi` personel yöntem kırılımını (`personelSatirlar`) zaten veriyor (R32).
- AC-6 taramasına takılacak ama hedef adı olmayan metinler: tedarikçinin "Vergi dairesi" alanı, cümle içi notlar (R30).
- 0059 altın JSON testi yeni alanları çıkarmalı.
- Taksitsiz kiranın bugünkü rozet metni birebir korunmalı (R29, AC-40).
- Personel kalem satırları yalnız grup açıkken çiziliyor; K21 kendiliğinden korunur.

## 2. Dosyalar

- `src/lib/odemeYontemi.js`: `HEDEF_ADLARI` (tek tablo, yalın/yönelme), `hedefAdi` (değişmedi), `hedefBasligi`, `taksitAdi`.
- `src/lib/gider.js`: `ekOdemeTurToplamlari`, `stopajOzeti`.
- `src/lib/giderRaporu.js`: ek ödeme ve stopaj kutuları, avans satırları (personel yöntem tablosu R3 kararıyla rapora girmedi).
- `src/components/gider/DonemRaporu.jsx`, `src/components/Kasa.jsx`, `src/components/gider/OdemeGirisi.jsx`,
  `src/components/GiderForm.jsx`, `src/components/gider/GiderAlanlari.jsx`.
- Testler: `tests/hedef-adlari-0060.test.js`, `tests/gider-kasa-raporu-0060.test.js`, `tests/ui/hedef-adlari-0060.test.jsx`;
  ek bloklar `gider-gizlilik`, `gider-kasa-raporu`, `gider-kasa-raporu-0059`.
- Görüntü aracı, `CLAUDE.md`.

## 3. Kararlar

Q1 → R28 · Q2 → R29 · Q3 → R30 · Q4 → R31 · Q5 → R32 · Q6 → R33 · Q7 → R34 · Q8 → R35 · Q9 kanıt (R26) · Q10 R20 aynen.

## 4. Adım sırası

1. Ad tablosu ve testleri. 2. Saf motorlar. 3. Ekranlar ve kaynak taraması. 4. Rapor ve gizlilik testleri. 5. Kanıt,
CLAUDE.md, tam test ve lint.

## 5. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1–AC-4, AC-8, AC-9, AC-24–AC-26, AC-36, AC-40 | `tests/ui/hedef-adlari-0060.test.jsx` (Giderler listesi) |
| AC-5, AC-6, AC-12, AC-27–AC-29 | `tests/hedef-adlari-0060.test.js` (tablo, taramalar) + UI |
| AC-7, AC-10, AC-11 | `tests/ui/hedef-adlari-0060.test.jsx` (Kasa listesi, mahsup kırılımı, ekstre) |
| AC-13–AC-19, AC-30, AC-31, AC-33, AC-35, AC-37, AC-41, AC-42 | `tests/gider-kasa-raporu-0060.test.js` |
| AC-20–AC-23, AC-32, AC-34, AC-39 | `tests/gider-gizlilik.test.js`, `tests/gider-kasa-raporu.test.js` (0047 bloğu) |
| AC-38 | görüntü aracı + `kanit-eslemesi.json` |

## 6. Uygulama notları

- **R3 revizyonu (uygulamada bulunan çelişki, TY kararı):** personel ödemelerinin yöntem kırılımı (R14) rapora girmedi. Elden genelde nakit, resmi havaleyle ödendiği için kırılım resmi/elden ayrımını açığa çıkarıyordu; tek çalışanlı test verisinde "Havale 31.111" o kişinin resmi maaşını birebir bastı ve 0047'nin gizlilik testi düştü. Toplu "Personel ödemeleri" satırı kaldı; AC-16 ve AC-31 buna göre yeniden yazıldı.
- **Ek ödeme kutusu yorum işaretleriyle sınırlı** (`<!--ek-odeme-->…<!--/ek-odeme-->` + `data-bolum="ek-odeme"`); 0047 ve 0059 gizlilik testleri eski yasak listesini kutunun dışına aynen uygular, kutuya ad/açıklama/resmi-elden yasağını ayrıca uygular (R28). Kutunun notu "resmi" ve "elden" sözcüklerini kullanmaz.
- **Rozet sarmalayıcısı:** hedef rozetleri `data-testid="hedef-rozeti"` taşıyan bir `div` içinde (yanında ek ödeme tür özeti için); taksitsiz kiranın metni birebir aynı (AC-40), görünüm kanıtla ölçüldü.
- **Güncellenen eski beklentiler:** `ui/personel-hedef` (çok hedefli personelde toplu "Kısmen ödendi 1/2" yerine hedef rozetleri; R2), `gider-kasa-raporu-0059` (şerit listesine iki yeni kutu; altın karşılaştırmadan 0060 alanları), `gider-gizlilik` (R21 daraltması, R28 kutu ayırımı), `gider-kasa-raporu` (R28).
- **Avans satırları** mevcut kutunun içinde "Açık avans toplamı" satırından önce; başlık ve satır metni aynı (R33).
- **Kanıt:** `0060-piksel-raporu.json`, Giderler/Kasa/ödeme/rapor/Anasayfa ekranlarından 128'i (× 2 tema); 104 ekran 0 piksel (taksitsiz kira satırı dahil, AC-40). Değişenler taksitli stopajlı kira ve çok hedefli personel bulunan Giderler ekranları (hedef rozetleri), Kasa'nın iki ekranı (taksit adı), raporun üç ekranı (yeni kutular); yeni `giderler-0060-hedef-rozetleri`, `giderler-0060-personel-acik`. İlk çekimde taksitsiz kira rozetinin sarmalayıcı `div` yüzünden yerleşimi değişmişti; sarmalayıcı yalnız ek ödeme özetli rozete bırakıldı ve 0 piksele döndü. TY onayı 2026-10-02.
- **Triyaj (2026-10-02):** (1) ek ödeme rozetinin yanındaki tür özeti hedef başına (`ekOdemeTurToplamlari(…, { bilesen })`; resmi rozetinde resmi tutarı olan türler, elden rozetinde elden tutarı olanlar). (2) Gider formunun kira özetindeki "Tedarikçiye ödenecek" tablodan ("Kiraya verene ödenecek"); AC-6 taraması genel yönelme adı "Tedarikçiye"yi de arar, yalın "Tedarikçi" tedarikçi kaydının adı olduğu için gerekçeli istisna. (3) AC-5 ve AC-23 adlı testler eklendi. (4) §2'deki personel yöntem tablosu satırı düzeltildi.
