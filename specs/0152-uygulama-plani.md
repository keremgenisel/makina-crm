# 0152 Uygulama planı: Döviz hesaptan gider ödemesi ve hesaplar arası bozdurma

| | |
|---|---|
| **Spec** | `specs/0152-kasa-doviz-odeme-ve-bozdurma.md` (Onaylandı, 2026-11-20) |
| **Onay** | Takım Yöneticisi, 2026-11-20 ("tüm önerilerini onaylıyorum, spece işle, planı yaz ve uygula") |
| **Dal** | `feat/0152-doviz` (main `b20b78e4` üstünde) |
| **Durum** | Uygulandı, commit bekliyor |

## 1. Dosyalar

- **Yeni saf modül `src/lib/doviz.js`:** kur ayrıştırıcısı `kurCoz` (elle dört, öneri ve türetilen altı ondalık), `kurOnerisi`
  (0132'den taşındı; `malzeme.js` aynı adlarla yeniden dışa verir) ve `bozdurmaKurOnerisi`, çevrim (`dovizKurusu`,
  `karsiKurusu`, `kurTuret`), satır ve pencere yamaları (`dovizSatirYamasi`, `dovizHesapYamasi`, `bozdurmaYamasi`), doğrulayıcı
  çekirdeği `cevrimOku`, tek yazıcı `dovizAlanlariYaz` / `dovizAlanlariOf`, ayraçlar (`dovizOdemeMi`, `bozdurmaMi`), metinler ve
  iz ayrıntısı `dovizIzAyrintisi`. Gider modülünden yalnız `tutarCoz`'u alır (döngü yok).
- **`src/lib/kasa.js`:** bakiyenin iki tek okuyucusu `hesaptanCikanK` / `girenBacakK`, `hareketParaBirimi` (P7), `acikHesaplar`;
  `hesapBakiyeleri` ödeme ve virman kolları; `odemeDogrula` (TL şartı kalktı, döviz dalı, `yalnizTl`), `cokKalemOdemeleri`
  `yalnizTl: true` (P5), `virmanDogrula` (bozdurma), `hesapTasimaPlani` (döviz ödeme hesapsız bırakılamaz). Avansın TL şartı aynen.
- **`src/lib/formOdemesi.js`:** satırın kur alanları doğrulayıcıya iner; düzenleme tek yazıcıdan; `hepsiniOde` döviz satırın
  kurunu öneriyle doldurur (P1).
- **`src/lib/copKutusu.js`**, **`src/lib/giderRaporu.js`**, **`src/lib/audit.js`**: çöp etiketi, rapor tabloları, iz ayrıntısı.
- **`electron/db.cjs`:** `hesap_hareketleri`'ne beş sütun (`HAREKET_DOVIZ_COLUMNS`), dört nokta, okumada ayıklama.
- **Ekran:** `gider/OdemeGirisi.jsx` (hesap listesi, kur ve döviz tutar alanları, çek kısıtı, düzenleme girişi),
  `gider/OdemeKayitPenceresi.jsx`, `GiderForm.jsx`, `Giderler.jsx`, `Dashboard.jsx`, `Kasa.jsx` (Virman / Bozdurma penceresi,
  satır ibaresi, hesapsız liste, iz), `App.jsx` (günün kuru Kasa ve Giderler'e).
- **Testler:** `doviz-odeme-0152` (S), `doviz-odeme-0152-kiyas` (K, `0152-once.json`), `ui/doviz-odeme-0152` (U),
  `ui/bozdurma-0152` (B), `ui/doviz-odeme-0152-app` (A), `server-authz` 0152 bloğu, `db-roundtrip.cjs`, `server-security.cjs`.

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan. 2. `doviz.js`. 3. `kasa.js`. 4. `formOdemesi.js`. 5. Veri ve sunucu. 6. Çöp ve rapor.
7. Ekran (önce kurun dört yola inmesi). 8. Tam doğrulama, mutasyon, kanıt, belgeler.

## 3. Kararlar (2026-11-20'de onaylandı; spec'te P1–P11)

| No | Konu | Karar |
|---|---|---|
| P1 | Son kullanılan hesap | TL şartı ön seçimde kalır; toplu işaretleme kuru yalnız döviz hesap seçili satırda doldurur. |
| P2 | Türetilen kur | Altı ondalık; TL ve döviz tutar asıl değer, yeniden hesaplanmaz. |
| P3 | Kur hassasiyeti | Dört ondalık yalnız elle yazılan kura; öneri ve türetilen altı ondalık. |
| P4 | Bozdurmanın giren para birimi | Beşinci alan `karsiParaBirimi`. |
| P5 | Stopaj ve çek dağıtımı | Motorda da yalnız TL (`yalnizTl`). |
| P6 | HAREKETLER özeti | Virman satırı çıkan bacaklar; bilinen sınır. |
| P7 | Para biriminin okunması | Kayıt, hesap, TL. |
| P8 | Kasa'dan düzenleme | Günün kuru o pencereye de iner. |
| P9 | Öneri metinleri | 0132'nin iki metni. |
| P10 | Sürüm notu | Önce sunucu PC; güncelleme bitene kadar döviz ödeme ve bozdurma girilmez. |
| P11 | Kanıt | "Değişti" + onay, kapanışta "aynı". |

## 4. Kriter ↔ test

S = saf, K = kıyas, U = ödeme ekranı, B = Kasa ekranı, A = gerçek App, SA = `server-authz`, E = Electron.

| AC | Test |
|---|---|
| 1, 30 | U + A |
| 2, 3, 44 | S + U |
| 4, 5, 37 | S + U |
| 6, 34 | S + U |
| 7, 8, 9, 29 | S (çapraz) + tarama |
| 10, 33 | S |
| 11, 17, 24 | K + S + U/B |
| 12, 13 | S + U |
| 14, 15, 16, 27, 28, 35, 51 | S + B + SA/E |
| 18 | S |
| 19 | S |
| 20 | S |
| 21, 49 | B + S |
| 22, 50 | S |
| 23 | S (0024 B6 çapraz ölçüsü) |
| 25, 26 | S + A + E |
| 31 | S (P5 motor) + tarama (stopaj listesi TL) |
| 32 | A + tarama |
| 36 | S + B |
| 38 | S |
| 39 | S + U |
| 40 | S + B |
| 41 | S + U |
| 42 | S + B |
| 43 | S |
| 45 | S + U |
| 46 | S + U |
| 47 | S + tarama |
| 48 | S + B |
| 52 | S + U + B |

## 5. Uygulamada verilen kararlar

| No | Konu | Karar |
|---|---|---|
| P12 | Döviz hareketi olmayan veri | Bakiye, gider zenginleştirmesi, borç özeti, açık kalemler, iki ekstre, yöntem kırılımı, taşıma planı, çöp etiketi, doğrulayıcıların TL çıktısı, toplu işaretleme, ödeme girişi, düzenleme, rapor nesnesi ve HTML spec öncesi altınla birebir (`0152-once.json`, 0059 verisi, açık kalemler K5 ve K7). Döviz alanları yalnız döviz harekette yazılır; TL satıra ve kayda anahtar eklenmez. |
| P13 | Döviz tutarın ayrıştırılması | Döviz tutar ve karşı tutar tutar alanıdır (`tutarCoz`, binlik nokta); yalnız kur kendi ayrıştırıcısından geçer. `tutarCoz` `{ deger, bos, gecersiz }` döndürür. |
| P14 | Ekran ayrıntıları | Kur alanının etiketi "Kur (1 USD = ? TL)", erişilebilir adı hedefle ("Tedarikçiye kuru"); hesap seçeneği döviz hesabın para birimini yazar ("Dolar (Banka · USD)"); düzenleme başlığı "Virman / Bozdurma · Düzenle"; hareket listesinde bozdurmanın türü "Bozdurma". Virman penceresinin iki hesap seçicisi erişilebilir ad aldı ("Çıkan hesap", "Giren hesap"). Kendi çekin banka hesabı listesi yalnız TL bankalar. |
| P15 | AC-31 ölçüsü | Stopaj penceresinin listesi kod olarak değişmedi (TL süzgeci yerinde); ekran testi yerine kaynak taraması ve motorun `yalnizTl` şartı (P5). |
| P16 | Ters çevrilen testler | "spec 0152 ile": `kasa.test` (C5, AC-30), `gider-form-odeme` (AC-14/35), `hareket-duzenleme-0073` (AC-12, AC-31 imza), `calisan-sgk-0070` (imza), `ui/kasa` (AC-30), `ui/gider-form-odeme`, `ui/gider-form` (R17), `ui/kasa-app` (AC-3), `ui/hareket-duzenleme-0073` (başlık), `ui/form-pencere-boyutu` (başlık sabiti), `db-roundtrip.cjs` (hesap sayısı). Sözlükte üç satır atfı kaydı. |
| P17 | Mutasyon | Bozdurmanın giren kolu, düzenlemedeki tek yazıcı, elle kurun dört ondalığı, stopajın TL şartı, döviz satırda çek kısıtı, çöp etiketi ve taşıma engeli tek tek bozuldu; her biri 0152 testlerince yakalandı (1–2 test). |
| P18 | Uygulamada bulunan hata | Döviz hesap seçilince öneri kur alanına yazılmıyordu (`dovizHesapYamasi` yamaya kuru koymuyordu); düzeltildi, `doviz-odeme-0152` AC-45 ve ekran testleri ölçer. |
| P19 | Kanıt | Eski kodun iki çekimi birebir aynı (gürültü yok). Bilinçli değişen eski ekran yalnız `kasa-virman` (pencere adı ve ipucu); yeni on ekran. Kanıt aracı on dakikalık sınıra takıldığı için her turun son ekranı (`gider-formu-0076-tevkifat`, 0152'den etkilenmez) çekilemedi; rapor turun satır kayıtlarından kuruldu. |
