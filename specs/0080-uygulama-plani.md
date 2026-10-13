# 0080 Uygulama Planı: Gider kalemleri ve tedarikçiler listelerinde sayfalama kalkar

Spec: `specs/0080-gider-ve-tedarikci-listelerinde-sayfalama-kalkar.md` (revizyon 2). Dal `feat/0080-sayfalama-kalkar`
(main `5d684bf` üstünde). Plan Takım Yöneticisi tarafından 2026-10-13'te onaylandı (bütün öneriler kabul).

## 1. Kodda bulunanlar (spec'e ek)

- `DonemRaporu.jsx:284` dilimleme `usePagination(cizim, 10, anahtar)`, çubuk `:458`; satır başına `makinaGideriCoz` `:295`.
- `Tedarikciler.jsx:58` `usePagination(sirali, 10)`, çubuk `:99`; boş dal `:67` ayrı.
- `Giderler.jsx:318` ve `:355` `donemAnahtari` KalemListesi'ne geçer; tanım `:99`, Makina ve Model `:374`.
- `makinaCozucuOlustur` (`gider.js:833`) yinelenen kimlikte `makinaGideriCoz`'dan ayrılır (Map son yazılanı tutar); `kaynakMap`
  ilkini tutar, yani stoktan satılan makinanın takibi aynıdır.
- `kanit-eslemesi.test` yalnız kaydın kendi raporundaki ekranın varlığına bakar; araçtan silinen `-sayfa2` ekranları eski
  raporlarla eşlenmiş kayıtları kırmaz.
- Tasarım sözlüğü `:121` `DonemRaporu.jsx:71` örneği import satırı kalkınca kayar.

## 2. Dosyalar

**Kaynak:** `src/components/gider/DonemRaporu.jsx`, `src/components/gider/Tedarikciler.jsx`, `src/components/Giderler.jsx`.

**Testler:** `tests/sayfalama-0062.test.js` (`LISTELER` yedi satır), `tests/ui/sayfalama-0062.test.jsx` (ters çevrilen
bloklar silinir, atıf yorumu), `tests/ui/kdv-dahil-0071.test.jsx` (AC-23 sayfa yarısı kalkar), `tests/ui/kutu-duzeni-0067.test.jsx`
(birebir prop metni + neden), yeni `tests/sayfalama-kalkar-0080.test.js`, yeni `tests/ui/sayfalama-kalkar-0080.test.jsx`, yeni
fikstür `tests/fixtures/0080-atama-once.json`, `scripts/tests/donem-raporu-yerlesim.cjs` + `scripts/tests/layout/donem-raporu.jsx`.

**Kanıt ve belgeler:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0080-*`,
`docs/tasarim-sozlugu.md`, `CLAUDE.md`.

**Dokunulmaz:** `src/lib/gider.js` ve bütün motorlar, `electron/*`, `src/lib/merge.js`, `src/hooks/usePagination.js`, `ui.jsx`
`Pagination`, kalan yedi sayfalanan dosya.

## 3. Kararlar (TY onayı, 2026-10-13)

- **P1.** 0062'nin ters çevrilen UI blokları (AC-5/31/44, AC-17/32/18, AC-29/14, AC-28, AC-15, AC-8/16) 0062 dosyasından silinir;
  ters hâlleri 0080 AC adlarıyla yeni dosyada. 0071 AC-23 yerinde, adına "spec 0080 ile kısmen geri alındı" yazılır.
- **P2.** R10 eşitliği yinelenen kimlik dışında birebir; bilinen sınır, çözücüye dokunulmaz. Fikstürde yinelenen kimlik yok.
- **P3.** AC-15 eşiği ölçümden sonra: gözlenenin yaklaşık üç katı, en az 10 sn.
- **P4.** Dokunulmayan dosyaların kanıtı: §6'da `git diff --stat`, testte bu dosyalarda "0080" geçmediği.
- **P5.** 0062 adlı tam liste ekranları kalır (bundan sonra bütün satırlar), dört yeni `giderler-0080-*` ekranı.
- **P6.** AC-19 yatay kaymayı bilgi olarak basar; `belgeTasma` iddiası korunur.
- **P7.** Sözlükte "Sayfalama" kuralına istisna maddesi.
- **P8.** Sıra 0080 → 0081 → 0082.

## 4. Adım sırası

1. Spec revizyonu, bu plan.
2. Kod değişmeden "önce" fikstürü: `YAZ_0080=1` ile atama hücreleri, alt toplam ve başlık sayısı (eski kodda bütün sayfalar
   gezilerek toplanır). Görsel kanıt tabanı için worktree.
3. `DonemRaporu.jsx` (çözücü, dilimleme, prop), `Tedarikciler.jsx`, `Giderler.jsx`.
4. Eski testlerin güncellenmesi, yeni testler, mutasyon ölçümü (çubuk geri, `makinaGideriCoz` geri, prop geri).
5. AC-15 ve AC-19 ölçümleri; sayılar spec Context'ine.
6. Görsel kanıt, kanıt eşlemesi, sözlük, CLAUDE.md, `npm test` (Electron dahil), `npm run lint`.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1…AC-10 | `ui/sayfalama-kalkar-0080` (aynı adlı `it` blokları) |
| AC-11 | `sayfalama-0062.test.js` `LISTELER` yedi satır (11 çağrı, 7 dosya; adında "spec 0080 AC-11") + 0062 UI'nin kalan blokları |
| AC-12, AC-13 | `sayfalama-kalkar-0080.test.js` kaynak taramaları |
| AC-14 | `sayfalama-0062.test.js` 0062 AC-24 testi (adında "spec 0080 AC-14") |
| AC-15 | `ui/sayfalama-kalkar-0080` jsdom vekil süre ölçümü |
| AC-16 | tarama (`sayfalama-kalkar-0080.test.js`) + ekran (`0080-atama-once.json` ile birebir) |
| AC-17 | tarama + `kutu-duzeni-0067` AC-5/28 + 0062 AC-7 |
| AC-18 | `ui/kdv-dahil-0071` AC-23 (adında "spec 0080 AC-18", ön koşullu) |
| AC-19 | `donem-raporu-yerlesim.test.js` (Electron) |
| AC-20 | tarama (`0009-sayfa.jsx`) + `0080-piksel-raporu.json` + `kanit-eslemesi` |

## 6. Sapmalar ve notlar

- **Dokunulan kaynak dosyalar (P4, `git diff --stat main -- src electron`):** `src/components/Giderler.jsx`,
  `src/components/gider/DonemRaporu.jsx`, `src/components/gider/Tedarikciler.jsx`. `electron/`, `src/lib/`, `src/hooks/`
  değişmedi.
- **Mutasyon ölçümü:** (1) kalem listesine sayfalama geri → AC-1…AC-7, AC-12, AC-13, AC-16 düşer; (2) satır başına
  `makinaGideriCoz` geri → yalnız AC-16 taraması düşer (çıktı aynı olduğu için ekran yarısı geçer, beklenen); (3)
  `donemAnahtari` KalemListesi'ne geri → AC-17; (4) Tedarikçiler'e sayfalama geri → AC-8, AC-9, AC-12, AC-13.
- **AC-15 ölçüm tuzağı:** ilk koşuda süzgeç 10 sn çıktı; ölçüm aralığındaki `getByLabelText` 1.200 satırlık DOM'u tarıyordu.
  Süzgeç ölçümden önce `querySelector` ile bulunur (testte yorumlu).
- **AC-19 düzeneği:** aynı dosyaya `hash` ile gitmek sayfayı yeniden yüklemiyor (yalnız parça değişir); `?uzun=1` sorgusu
  kullanıldı. Uzun düzenek App'in 236 px kenar çubuğu kadar sol boşluk taşır (0067 ölçümleri boşluksuz düzenekte aynen).
- **Sözlük atıfları:** `Giderler.jsx` yorum satırı eklendiği için 281/308/342'ye, `DonemRaporu.jsx` import satırı kalktığı
  için 70'e kaydı.
