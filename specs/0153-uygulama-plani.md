# 0153 Uygulama planı: Gider kalemi döviz cinsinden girilir ve dövizle ödenir

| | |
|---|---|
| **Spec** | `specs/0153-doviz-gider-kalemi.md` (Onaylandı, 2026-11-21) |
| **Onay** | Takım Yöneticisi, 2026-11-21 ("tüm önerilerini onaylıyorum, spece işle, planı yaz ve uygula") |
| **Dal** | `feat/0153-doviz-kalem` (main `a3c9d193` üstünde) |
| **Durum** | Uygulandı, commit bekliyor |

## 1. Dosyalar

- **Yeni yaprak modül `src/lib/kur.js` (C9/2):** `kurCoz`, `kurGirdisi`, `dovizKurusu`, `karsiKurusu`, `kurTuret`, `KUR_*`, `KUR_KAYNAK`,
  kur hata metinleri, `paraMetni`, `kurMetni`, `kurSapmaUyarisi`. Lib modülü içe almaz; `doviz.js` aynı adlarla yeniden dışa verir.
- **`src/lib/gider.js`:** tek okuyucu `kalemParaBirimi` / `dovizKalemMi` (C9/3), `kalemDovizKurusu`, kilit ölçütü
  `kalemOdemeAlmisMi`, `giderKalemDogrula`'nın normal dalında döviz kipi ve üç alanın tek yazıcısı, borç özetinde kalem başına döviz.
- **`src/lib/kasa.js`:** `odemeDogrula` seçeneği `kalemDoviz` (ANA hedefte döviz okuma, kırpma, hesap aynı para birimi ya da boş, üç alan
  hesapsızda da), `cokluOdemeDogrula` grup kırpması (P3), `cokKalemOdemeleri` döviz kalem reddi, `sonKullanilanHesap` para birimi
  parametresi (P6), `tedarikciEkstresi` satırında döviz.
- **`src/lib/cek.js`**, **`src/lib/formOdemesi.js`**, **`src/lib/acikKalemler.js`**, **`src/lib/odemeHatirlatma.js`**,
  **`src/lib/aramaGider.js`**, **`src/lib/giderRaporu.js`**: çek adayları, ödeme girişi, satırlarda döviz, arama, rapor hücresi.
- **`electron/db.cjs`:** `GIDER_DOVIZ_COLUMNS` yalnız `giderler`'de, dört nokta, okumada ayıklama.
- **Ekran:** `GiderAlanlari.jsx`, `GiderForm.jsx`, `OdemeGirisi.jsx`, `OdemeKayitPenceresi.jsx`, `DonemRaporu.jsx` (hücre, `BorcOzeti`),
  `AcikKalemler.jsx`, `OdemeHatirlatma.jsx`, `EkstrePenceresi.jsx`, `Giderler.jsx` (iz). Kasa değişmez (R19/2).
- **Testler:** `doviz-gider-0153` (S), `doviz-gider-0153-kiyas` (K, `0153-once.json`), `ui/doviz-gider-0153-form` (F ve U; plan
  P20), `ui/doviz-gider-0153-liste` (L), `ui/doviz-gider-0153-app` (A), `server-authz` 0153 bloğu (SA), `db-roundtrip.cjs` (E).

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan. 2. `kur.js` taşıması. 3. `gider.js`. 4. `kasa.js`, `cek.js`, `formOdemesi.js`. 5. `db.cjs`.
6. Tüketici motorlar. 7. Ekran. 8. Tam doğrulama, mutasyon, kanıt, belgeler.

## 3. Kararlar (2026-11-21'de onaylandı; spec'te P1–P12)

| No | Konu | Karar |
|---|---|---|
| P1 | Tevkifatlı döviz kalem | Döviz kipi yalnız ANA hedefte; tevkifat hedefi lira. |
| P2 | Borç özeti | Yalnız döviz kalemli satırda açılan liste ve ibare. |
| P3 | Çok satırlı ödeme | Grup kırpması. |
| P4 | DoD ↔ C6/2 | C6/2 (neden yazılmaz). |
| P5 | TL'ye çevirme | Rakam aynen kalır. |
| P6 | Ön seçili hesap | Kalemin para birimindeki son hesap, yoksa hesapsız. |
| P7 | Döviz ödenecek | Lira ödenecekten türetilir, ±1 sent kabul. |
| P8 | Kısıtlı kalem hücresi | Üstte döviz matrah, altta lira gider tutarı. |
| P9 | Düzenleme izi | Kod yok, test; oluşturma izinde ayrıntı yalnız döviz kalemde. |
| P10 | Kur sapma uyarısı | Günün kuruna göre; kur yoksa ya da değiştirilmediyse yok. |
| P11 | Öteki sütunlar | KDV ve Ödenecek lira; raporda ek yalnız kalem satırlarında. |
| P12 | Kanıt | Parçalı çekim. |

## 4. Kriter ↔ test

S = saf, K = kıyas, F = form, U = ödeme girişi, L = listeler, A = gerçek App, SA = `server-authz`, E = Electron.

| AC | Test |
|---|---|
| 1, 2, 3, 4, 6, 7, 42 | F |
| 5, 40, 41 | S + F |
| 8, 10, 35, 36, 37, 43 | S + F |
| 9, 11 | S |
| 12, 13, 44 | S + F |
| 14, 54 | L |
| 15 | S + L |
| 16, 55 | S |
| 17, 18, 19, 48 | U |
| 20, 21, 22, 49 | S + U |
| 23, 47 | S + U + L |
| 24, 50 | S + U |
| 25, 53 | S |
| 26, 52 | S + U |
| 27, 57 | S + L |
| 28 | S + L |
| 29, 51 | S + L |
| 30, 56 | S + A |
| 31, 58 | S + A |
| 32 | K |
| 33 | E + A |
| 34, 38, 39 | S (tarama) |
| 45, 46 | S + U |
| 59 | S + L |
| C4 | SA |

## 5. Uygulamada verilen kararlar

| No | Konu | Karar |
|---|---|---|
| P13 | Döviz kipinin kaynağı | `odemeDogrula` döviz kipini kalemden kendisi türetir (`hedefDovizKipi`); R13/2'nin "seçenek" ifadesi yerine. Kalem tek doğruluk kaynağıdır, hiçbir çağıran (çek, stopaj dönemi, çöpten geri alma, düzenleme) seçeneği unutup döviz kalemi lira çapayla ödeyemez. TL kalemde dal hiç çalışmaz (kıyas altını birebir). |
| P14 | Çöpten geri alma | `copHareketGeriAlmaNedeni` döviz kalemin ödemesini doğrulayıcıya kendi döviz tutarıyla verir (lira tutar döviz sanılırdı). |
| P15 | Düzenleme birleştirmesi | `Giderler.kaydet`'in `{ ...eski, ...kayit }` birleştirmesi eskiyi döviz alanlarından arındırır; yoksa TL'ye çevrilen kalemde eski kur kalırdı (uygulamada bulundu, AC-13 testi ölçer). |
| P16 | Kilidin iki katmanı | Form alanları pasif ve doğrulayıcı `kilit` seçeneğiyle reddeder (form dışı bir yazım da kuru değiştiremesin). |
| P17 | Kur önerisinin alanı | Formun kur alanının erişilebilir adı "Kalemin kuru"; ödeme satırının 0152 "Kur" alanıyla aynı formda çakışmasın. Kur sapma uyarısı yalnız kullanıcı kuru yazınca (`_kurDokunuldu`, kayda girmez). |
| P18 | Kıyas altını | İlk üretimde rapor motoru yanlış imzayla çağrılmıştı; altın `main` worktree'sinde spec öncesi kodla yeniden üretildi (`0153-once.json`). |
| P19 | Mutasyon | Lira çarpımının yuvarlaması, tek yazıcı, kırpma, grup kırpması, çek adayı, kilit ölçütü, tevkifat hedefi (P1) ve düzenleme birleştirmesi tek tek bozuldu; sekizi de 0153 testlerince yakalandı (ilk turda üçü kaçtı, testler güçlendirildi). |
| P20 | Test dosyaları | Form ve ödeme girişi tek dosyada (`ui/doviz-gider-0153-form`, F ve U blokları). |
| P21 | Ters çevrilen testler | "spec 0153 ile": `doviz-odeme-0152` (kur ilkelleri `kur.js`'te; GiderForm kalemin kendi döviz tutarını okur), `ui/form-pencere-boyutu` (para birimi alanı). Sözlükte üç `Giderler.jsx` satır atfı kaydı. |
| P22 | Kanıt | Eski kod (main) iki kez, yeni kod bir kez çekildi (gider, ödeme, kasa, anasayfa ve arama ekranları; 240 ekran × 2 tema, parçalı). Eski kodun iki çekimi birbirinden farklı çıktı: süzgeç açılır listelerinin genişliği çekimden çekime birkaç piksel oynuyor (kodla ilgisi yok). Bu yüzden yeni görüntü iki eski çekimden birine birebir uyuyorsa "aynı" sayıldı: 434 görüntü aynı. Bilinçli değişen yalnız normal davranışlı gider formu ekranları (17 ekran, yeni "Para birimi" alanı); yeni 7 ekran. `evrak-0126-parca-arama` aydınlık ilk çekimde seçim penceresini çizmedi, yeniden çekilince eski çekimle birebir aynı (çekim hatası); `uygulama-menu-kasali` bilinen köşe gürültüsü. Rapor `0153-piksel-raporu.json`, eşlemede 25 "değişti" kaydı (P12 onayıyla). |
| P23 | Bilinen sınırlar | Kalem listesinin Ödeme sütunundaki "Ödenen / kalan" metni lira kalır (P11'in genişlemesi; tutar hücresi döviz). Giderler başlığındaki "Tüm tutarlar TL." cümlesi değişmedi: döviz kalemin satırı kendi para birimini gösterir ama toplamlar lira olduğu için cümle toplamlar için doğrudur; değiştirmek bütün Giderler ekranlarının kanıtını değiştirirdi. |
