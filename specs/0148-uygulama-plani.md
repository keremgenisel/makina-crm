# 0148 Uygulama planı: fiyatı girilmemiş malzeme eksik sayılmaz

| | |
|---|---|
| **Spec** | `specs/0148-fiyatsiz-malzeme-eksik-sayilmaz.md` (Onaylandı, 2026-11-16) |
| **Onay** | Takım Yöneticisi, 2026-11-16 ("planı yaz ve uygula") |
| **Dal** | `feat/0148-fiyatsiz-malzeme` (main `14a4b07b` üstünde) |
| **Durum** | Uygulandı, commit bekliyor |

## 1. Dosyalar

- **Motor `src/lib/malzeme.js`:** `malzemeEksikleri(m)` özgül ağırlık denetiminden sonra fiyat kümesinin eksiklerini yalnız küme "fiyatı hiç girilmemiş" değilse ekler. Ölçüt yeni saf yardımcı `fiyatGirilmemisMi(k)` = kilo fiyatı yok **ve** bant yok (R1). Para birimi tanınmıyorsa ölçütten bağımsız neden yazılır (AC-9). `malzemeEksikMi` ve `eksikMalzemeSayisi` değişmez; onu çağırdıkları için kendiliğinden daralırlar (C2).
- **`kumeEksikleri` değişmez:** parçanın malzeme kalemi ve tarihli kümeler onu okur (maliyet "girilmedi", sipariş nedenleri, C1, AC-11, AC-12).
- **Liste `MalzemeManager.jsx`:** kod değişmez (motoru çağırıyor). Fiyat hücresi (`kumeOzeti`) değişmez (R4).
- **Testler:** yeni `tests/malzeme-eksik-0148.test.js` (motor, çapraz ölçüm, kaynak taraması) ve `tests/ui/malzeme-eksik-0148.test.jsx` (gerçek panel: rozet, neden satırı, başlık, boş durum, çöp).
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` yeni ekran `katalog-malzeme-0148` (fiyatsız, fiyatsız ve özgülsüz, dövizli fiyatsız, kursuz dövizli, bantlı lama eksikli malzemeler); `docs/evidence/0148-*`; `kanit-eslemesi.json` kaydı.
- **Belgeler:** `CLAUDE.md` 0132 bölümünün sonuna 0148 notu, `specs/README.md`.

## 2. Kararlar

| No | Konu | Karar | Gerekçe |
|---|---|---|---|
| P1 | Ölçütün yeri | `malzemeEksikleri` içinde; `kumeEksikleri` dokunulmaz | `kumeEksikleri` parça kalemlerinin maliyet nedenini de veriyor; orada fiyatsızlık gerçek bir neden (C1). |
| P2 | Para birimi tanınmayan fiyatsız kayıt | Rozet alır ("para birimi tanınmıyor") | AC-9 "bugünkü rozetini korur" der; para birimi kaydın bozuk olduğunu gösterir, fiyatın yokluğundan bağımsız. |
| P3 | Dövizli fiyatsız kaydın Fiyat hücresi | Değişmez ("kur girilmedi") | R4 hücrenin değişmemesini ister; AC-10 TL fiyatsız kaydı ölçer. |
| P4 | Kanıt eşlemesi | Var olan malzeme ekranlarında fiyatsız kayıt yok, 0 fark beklenir; yeni ekran `beklenen: "degisti"` + TY onayıyla, kapanışta `ayni` | `tasarim-kaynak` kuralı. |

## 3. Kriter ↔ test

M = `malzeme-eksik-0148.test.js`, U = `ui/malzeme-eksik-0148.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 3, 4 | U: rozet yok, neden satırı yok, başlık sayısına girmez, yalnız bu türdeyse başlık malzeme sayısı; M: motor boş dizi |
| 5 | M + U: yalnız özgül ağırlık nedeni |
| 6, 7, 9 | M + U: bugünkü neden aynen |
| 8 | M + U: dövizli, fiyatsız, kursuz kayıt rozetsiz |
| 10 | U: Fiyat hücresi "fiyat girilmedi" |
| 11 | M: parça maliyeti `null`, `malzemeOzeti` eksik nedeni `EKSIK_KILO` |
| 12 | M: sipariş fiyatlı nüshası satır nedeni ve tutarsız sayısı aynen |
| 13 | U: boş durum |
| 14 | M + U: çöpteki malzeme sayıya girmez |
| C2 | M: tarama, `src/` altında eksiklik ölçütünü yalnız `malzeme.js` yazar, liste motoru çağırır |
