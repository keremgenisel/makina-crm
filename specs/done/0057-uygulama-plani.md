# 0057 Uygulama Planı: Taksitli Hedefin İlk Taksiti Formdan Ödenebilsin

| | |
|---|---|
| **Bağlı spec** | `specs/0057-taksitli-hedef-formdan-odensin.md` (R2, plan onayıyla) |
| **Dal** | `feat/0057-taksitli-form` (`feat/0054-ek-odeme-hedefi` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q8) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Düzenleme formu taksitli hedefi bugün de ödetiyor (`GiderForm.jsx` düzenleme eşlemesi pasifi yalnız plan değişikliği ve
  plan hatasıyla kuruyor); boşluk yalnız yeni kalemde.
- `formOdemeHedefleri` `taksitli: pasif` yazıyor; `taksitId` de `pasif`'e bağlı.
- Çek dalı satırın seçtiği tek taksidin adayıyla çalışıyor; dağıtım yok.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/formOdemesi.js` | `formOdemeHedefleri`: `pasif: false`, `neden: null`, `taksitli = satirlar.length > 1`, `taksitId` taksitli değilse tek satır, `ciroOlur = ANA` (R1, R8, R21). `duzenlemeOdemeDurumu`: taksitli hedefte `pasif` = plan değişti ya da plan hatası, neden `PASIF_TAKSIT_NEDENI` (R7, R22). `hepsiniOde`: taksitli hedefte en yakın açık taksit kalanı (R12, R23). `odemeGirisiHazirla` çek dalı: ANA adaylarına dağıtım (R19). `HEPSI_TAKSITLI_NOTU` ve `TAKSIT_PLANI_DEGISTI_NEDENI` kalkar, `PASIF_TAKSIT_NEDENI` yeni metin (R9, R20). |
| `src/components/GiderForm.jsx` | Düzenleme eşlemesi kalkar; hedefler `duzenlemeOdemeDurumu`'ndan olduğu gibi. |
| `src/components/gider/OdemeGirisi.jsx` | Hepsi-taksitli dalı kalkar; çek satırında taksit seçici yerine dağıtım notu; ciro tutarı hedef düzeyinde. |
| `src/components/gider/OdemeKayitPenceresi.jsx` | `pasif: false` açık kalır (çağıranın kuralı). |
| Testler | `tests/taksitli-form-odeme.test.js`, `tests/ui/taksitli-form-odeme.test.jsx`; güncellenenler (R17): `gider-form-odeme.test.js`, `duzenleme-odeme.test.js`, `ui/gider-form-odeme.test.jsx`, `ui/gider-form-duzenleme-odeme.test.jsx`, taksitli ANA'da çeki tek taksite bağlayan beklentiler. |
| Kanıt, belge | `scripts/evidence/0009-sayfa.jsx` üç ekran, `kanit-eslemesi.json`, `CLAUDE.md`. |

## 3. Kararlar

- **Q1 / R19.** Çek dağıtımı mevcut fonksiyonlarla; pencerede de geçerli.
- **Q2 / R20.** Tek neden sabiti `PASIF_TAKSIT_NEDENI`.
- **Q3 / R21.** `taksitli` ve `pasif` ayrı.
- **Q4 / R22.** Plan hatasında taksitli hedef pasif, karar `duzenlemeOdemeDurumu`'nda.
- **Q5.** AC-10 R7'ye hizalandı (ölçüt taksit sayısı).
- **Q6 / R23.** "Hepsini işaretle" hedef başına.
- **Q7.** Geçici kimlik yolu kod yazmadan testle (AC-4).
- **Q8.** Kanıt yalnız gider/kasa ekranlarıyla; atlama listesi önceki raporun ekran adlarıyla birleştirilir, adımlar eski
  etiketlere karşı önceden taranır.

## 4. Adım sırası

1. Motor ve motor testleri. 2. Çağıranlar. 3. Editör. 4. Mevcut testler, UI testleri. 5. Tam takım ve lint. 6. Kanıt, TY
onayı, `CLAUDE.md`.

## 5. Kriter ↔ test eşlemesi

M = `tests/taksitli-form-odeme.test.js`, U = `tests/ui/taksitli-form-odeme.test.jsx`.

| AC | Test |
|---|---|
| 1–4 | U (yeni gider, seçici, varsayılan, gerçek taksite bağ); M (`satirTaksitId` sıra bağı) |
| 5–8 | M (`odemeGirisiHazirla`); U (satır hatası) |
| 9, 22, 23 | M (`duzenlemeOdemeDurumu`); U (düzenlemede varsayılan) |
| 10, 24 | M, U; `ui/gider-form-duzenleme-odeme` güncellendi |
| 11 | M (`planYenidenBol` koruması) |
| 12, 20, 21 | M (ciro ve kendi çek dağıtımı); U (seçici yok, not, seçenek görünürlüğü) |
| 13 | U (ödeme hatasında kalem yazılmaz) |
| 14 | M |
| 15 | U (aynı bileşen); M (iki yoldan aynı hareketler) |
| 16, 18, 25 | M (kaynak taraması) |
| 17, 28 | U (pencere ve mahsup) |
| 19, 26, 27 | M; U (düğme) |

## 6. Uygulama notları

- **Düzenlemede pasif kararı tek yerde:** `GiderForm`'un 0053'teki eşlemesi kalktı; `duzenlemeOdemeDurumu` hedefe `pasif`/`neden` yazar, plan hatası dalında taksitli hedefi pasif yapar.
- **Çek dağıtımı:** satırın `sira`'sı çek satırında yok sayılır; aday kalanından aynı taksite giden normal satırlar düşülür, böylece 0053 Q3'ün "çek diğer satırlardan sonra kalanı kapatır" kuralı taksit düzeyinde de geçerli. Arayüzde ciro tutarı hedef kalanı eksi aynı hedefteki diğer satırlarla gösterilir.
- **Bozulan testler yalnız R17'nin öngördükleri** (4 dosya, 6 test); çeki tek taksite bağlayan mevcut beklenti çıkmadı.
- **Kanıt:** üç yeni ekran (`gider-formu-0057-taksit-yeni`, `-cek-dagitim`, `-plan-degisti`); `gider-formu-odeme-taksitli`'nin kaldırılan nota kaydıran adımı "Ödeme tarihi"ne çevrildi.
- **Kanıt sonucu:** `0057-piksel-raporu.json` (44 aday ekran, iki tema). 6 ekranda bilinçli fark, TY onayı 2026-10-01; 38 ekran 0 piksel. Görüntü aracı `kalem` prop'undaki `taksitSayisi`'ni yeni kalem formuna almıyor (plan alanı formun durumu): eski `gider-formu-odeme-taksitli` ekranı bu yüzden hiç taksitli çizilmiyordu; üç ekranda taksit sayısı adımla (`doldur:Taksit sayısı=n`) giriliyor.
- **Triyaj (1 bulgu):** taksit sayısı 1 iken eklenen satırın sırası boştu; sayı sonra artırılınca seçici ilk taksiti gösterirken satır hiçbir taksite bağlanmıyor, kayıt "taksite bağlanır" + "kalan 0,00" hatasıyla duruyordu. `satirSiralariniEsle` (saf) + `OdemeGirisi`'nde hedefler değişince uygulanan eşleme ile düzeltildi; motor ve UI testi eklendi (UI testi eşleme kapatılınca kırılıyor).
- **Kapanış:** uygulama commit `73d1bf0`. Taban çekimi (`0057-taban-piksel-raporu.json`) "degisti" kayıtlı 6 ekranı onaylanan görüntülerle karşılaştırdı: 12 görüntü, 0 piksel (triyaj düzeltmesi görünümü değiştirmedi); kayıtlar `ayni`ye çevrildi.
