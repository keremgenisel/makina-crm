# 0149 Uygulama planı: aramada kelimeler ayrı ayrı aranır

| | |
|---|---|
| **Spec** | `specs/done/0149-cok-kelimeli-arama.md` (Onaylandı, 2026-11-20) |
| **Onay** | Takım Yöneticisi, 2026-11-20 ("tüm önerilerini onaylıyorum, spece işle, planı yaz ve uygula") |
| **Dal** | `feat/0149-cok-kelimeli-arama` (main `ff1a8612` üstünde) |
| **Durum** | Tamamlandı: commit `fbf0c56f` |

## 1. Dosyalar

- **Tek kural `src/lib/utils.js`:** `aramaKelimeleri(sorgu, normalize = aramaNormalize)` (boşluklardan böler, boş kelimeyi atar),
  `kelimelerEslesir(kelimeler, degerler, normalize = aramaNormalize)` (her kelime değerlerin en az birinde; değerler kayıt başına
  bir kez normalleştirilir), neden satırı için `eksikKelimeler` ve `nedenAlani`. `aramaNormalize` değişmez.
- **Ortak katman:** `hooks/useFilteredList.js` (sorgu render başına bir kez; `searchFn(item, sorgu)` ikinci parametre `{ kelimeler }`),
  `ui.jsx` `SearchPick` / `SearchSelect` (kelimeler render başına bir kez), `tasarim.jsx` `CokluSecim`.
- **Genel arama ve gider:** `GlobalSearch.jsx` (kayıt düzeyi, R9 kapısı, neden satırları saf yardımcılara), `lib/aramaGider.js`
  (`aramaSorgusu` `kelimeler` taşır, metin kayıt düzeyinde, tarih ve tutar dalları ham sorguyla tek alanda).
- **Çağıranlar:** `Customers`, `Documents` (beş arama), `ModelsManager`, `stock/PartStokTab`, `ServiceForm`, `PartSaleForm`,
  `SimpleDealers` (üç liste), `stock/YedekParcaSatisTab`, `Analiz`, `settings/SettingsSahipsiz`; kendi normalleştiricisiyle `Notes`,
  `Finance` (iki), `stock/UretimSatirEkleModal` (iki), `gider/DonemRaporu`, `tasarim.jsx` `CokluSecim`.
- **Testler:** `tests/cok-kelimeli-arama-0149.test.js` (saf, neden, üst küme, ölçümler, taramalar), `tests/ui/cok-kelimeli-arama-0149.test.jsx`
  (kutular), `tests/ui/cok-kelimeli-arama-0149-casus.test.jsx` (kelime üretimi casusu, gerçek palet),
  `tests/ui/cok-kelimeli-arama-0149-ekranlar.test.jsx` (kendi eşleşmesini yazan her ekran, iki kelime ayrı alanlarda; triyaj).
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` dokuz ekran (parça kataloğu, müşteri listesi, palet × boş, tek, iki kelime).

## 2. Kararlar

| No | Konu | Karar |
|---|---|---|
| P1 | `CokluSecim` envanterde yoktu | Kapsama alınır, normalleştiricisi değişmez (spec R6/2). |
| P2 | Kaynak taraması | İki parça: envanter dosyaları yardımcıyı çağırır; yorumsuz kodda normalleştirici ile `.includes(` aynı ifadede yasak, istisnalar tam yollu ve sayılı; mutasyonla ölçülür. |
| P3 | Neden satırının "başlık"ı | Bugün nedensiz geçen alan kümesi (spec R2/3). |
| P4 | Parti dönemi | Tarih dalı tek alanda ham sorguyla, metin dalı kelime kuralıyla (spec R7/3). |
| P5 | Palet kanıt adımı | Var olan `baslik:` + `doldur:` deseni. |
| P6 | Ölçüm eşikleri | Yerel ölçümün yaklaşık beş katı; rakamlar §4'te. |
| P7 | Üst küme testi | Eski tek parça kural yalnız testte kopya; fikstürden alt dize sorgularla eski ⊆ yeni. |
| P8 | Kanıt eşlemesi | İki kelimeli yeni ekranlar `degisti` + TY onayı, kapanışta `ayni`. |
| P9 | Sınırlı seçiciler | Kesme ve sıralama aynen. |

## 3. Kriter ↔ test

S = `cok-kelimeli-arama-0149.test.js`, U = `ui/cok-kelimeli-arama-0149.test.jsx`, A = `ui/cok-kelimeli-arama-0149-casus.test.jsx`.

| AC | Test |
|---|---|
| 1, 3, 4 | U: parça kataloğu |
| 2 | S + A (gerçek palet) |
| 5 | S: eski ve yeni kural tek kelimede; U: servis formu, Extra Kalıp formu, Sahipsiz Kayıtlar kırpma düzeltmesi |
| 6, 29 | S |
| 7, 30 | U + S |
| 8 | S |
| 9 | U: Customers |
| 10, 11 | U: servis formu parça araması, Evrak seçim penceresi |
| 12, 13, 14, 31, 32 | S: aramaGider |
| 15, 22 | S + U |
| 16 | S: iki yönlü tarama, mutasyonla ölçüldü |
| 17, 34 | S: mutlak eşikli ölçümler |
| 18 | U |
| 19, 20, 21 | S |
| 23 | U: envanter kutuları; E (`-ekranlar`): her ekran ayrı iki kelimeli sorgu, alan düşürme mutasyonuyla ölçüldü |
| 24 | U: İşlem Geçmişi ve Kullanıcı Geçmişi, sahte köprü |
| 25 | U |
| 26 | S + U |
| 27 | A (casus) |
| 28 | S |
| 33 | U: parça kataloğu (toplu kip düğmesi ve Fiyat Listesi çıktısı) |
| 35 | var olan `ui/parca-suzgeci-0120` |
| 36 | kanıt raporu |

## 4. Uygulamada verilen kararlar

| No | Konu | Karar |
|---|---|---|
| P10 | Tarama sonucu | Spec'in andığı istisna adayları (`benzerKayitBul`, tedarikçi süzgeci) eski deseni kullanmıyor; istisna listesi boş. Palet vurgusu `indexOf` ile tek parça kalır (çok kelimede vurgu yok, X4). |
| P11 | Kırpma | Finans'ın iki araması da sorguyu kırpmıyordu; kırpma artık yardımcıda olduğu için onlarda da "ayna " çalışır (üst küme yönünde). |
| P12 | Eski testler | Hiçbir eski test kırılmadı (R3/2 triyajı gerekmedi); yalnız sözlükte üç dosya:satır atfı kaydı (`Notes.jsx`, `PartSaleForm.jsx` iki). |
| P13 | Kanıt | `katalog-parca-0125-suzgec` bilinçli değişti (başlangıç araması "Ayna dişlisi" set parçasını da buluyor). Ayarlar ekranları çalıştırmadan çalıştırmaya 46–352 piksel oynuyor; eski kodun iki çekimi de oynadı, yeni kod taze eski çekimle 0 fark (iki tek haneli oynama dışında). Ölçümler: saf yardımcı ~470 ms (eşik 3000), genel arama ~17 ms (eşik 500). |
