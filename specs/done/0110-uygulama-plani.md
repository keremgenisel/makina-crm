# 0110 uygulama planı

Spec: `specs/done/0110-kalip-durumu-gecmisi-susar.md` (QA turu ve plan turu Karar 17–24). Dal `feat/0110-kalip-durumu`, taban `69bc571`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/musteriDurumu.js` | `kalipDurumuTuret`: işaret ve damga ikisi de boşsa `teslim` (R1, R1/3); `kalipPili(durumlar)` tek parametre, payda gösterilebilir küme, türdeş kümede sayı yok (R8–R10, Karar 17, 18); `satirDurumu` tek argüman. `kalipBekliyorMu` ve `uretimFormHaritasi` dokunulmadı (C4, C5) |
| `src/components/customers/CustomerDetailModal.jsx` | Kalıp kartı `d7aacc0^:1088-1102` hâline döndü; yedi içe aktarma kalktı (R13/2 listesi); `durumBaglami` prop'u, varsayılanı ve iletme satırı durur |
| `scripts/evidence/0009-sayfa.jsx` | Yeni ekranlar `musteri-detay-0110-kalip` (Karar 19), `musteri-formu-0110-teslim` ve `musteri-detay-0110-cizelge` (triyaj bulgu 1: türetilen etiket metni formda ve çizelgede) |
| `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0110-*` | On bir kayıt `degisti` + onay: yedi eski ekranın sekiz kaydı (`musteri-detay-0106-kalip` iki dosyada) ve üç yeni ekran; iş raporu `0110-piksel-raporu.json`, taban `0110-taban-piksel-raporu.json` (son kodla, 36 görüntü, 0 fark) |
| Yeni testler | `tests/kalip-durumu-0110.test.js` (saf, taramalar), `tests/ui/kalip-durumu-0110.test.jsx` (gerçek `Customers`) |
| "spec 0110 ile" güncellenen testler | `tests/extra-kalip-isareti-0107.test.js`, `tests/musteri-durumu-0106.test.js`, `tests/ui/musteri-durumu-0106.test.jsx`, `tests/ui/extra-kalip-isareti-0107.test.jsx`, `tests/ui/makina-durumu-ondoldur-0109.test.jsx` |
| `CLAUDE.md` | 0110 bölümü; 0106 bölümünün pil ve kalıp kartı cümleleri (Karar 22) |
| `specs/README.md` | 0110 satırı ("Uygulandı, kapanış bekliyor"; kapanışta commit atfıyla "Tamamlandı") ve "Teslim edildi'ye geçiş elle" açık bulgusu (X2, triyaj bulgu 3) |

Dokunulmayanlar (ölçüldü): `tests/uretim-formu-bagi-0108.test.js`, `tests/ui/uretim-formu-bagi-0108.test.jsx`, `tests/tasarim-kontrast.test.js`, `electron/db.cjs`, `electron/serverAuth.cjs`, `src/lib/merge.js`, `src/lib/kilitAlanlari.js`.

## 2. Sıra

1. Yeni ekran araca eklendi, değişen ve 0 piksel beklenen on altı ekran spec öncesi kodla çekildi.
2. Kütüphane, kalıp kartı, içe aktarmalar; lint sıfır hata.
3. Ters çevirmeler (§4), `tests/spec-atiflari.test.js` `TASINACAK` (kapanışta boşalır), yeni saf ve UI testleri; mutasyonlar: R1/3 dalı silinince AC-3, AC-24, AC-25, AC-30 kırılır; eski kart geri konunca AC-17 ve AC-21; eski kütüphane geri konunca AC-6, AC-9, AC-10, AC-24, AC-26.
4. Kanıt: `is ↔ eski` (sekiz değişen ekran, sekiz 0 piksel), son kodla taban; plan turu Karar 24.
5. Belgeler, tam takım, lint, tip denetimi.

## 3. Kararlar

Plan turu kararları spec'te Karar 17–24.

## 4. Ters çevrilen beklentiler (AC-23, Karar 23: yirmi iki beklenti, beş dosya)

| Dosya | Beklenti |
|---|---|
| `tests/musteri-durumu-0106.test.js` (10) | AC-7; AC-12'nin dördüncüsü; AC-13'ün ikincisi; AC-18 (girdi elle `bekliyor`); AC-19'un üçü; AC-21'in ikincisi; AC-40/AC-42 küme beklentisi; AC-29 pil metni. Ayrıca `:126` yardımcısı tek argümana indi (AC-15) |
| `tests/ui/musteri-durumu-0106.test.jsx` (7) | AC-17/AC-22 pil metni; AC-40'ın ikisi; triyaj bulgu 3'ün detay yarısı; AC-14/AC-13'ün üçüncü seçici etiketi; AC-38'in detay yarısı (blok yeniden yazıldı); AC-39'un detay satırı |
| `tests/ui/extra-kalip-isareti-0107.test.jsx` (3) | AC-28'in iki yarısı (form metni, detay öğesi); AC-26 |
| `tests/ui/makina-durumu-ondoldur-0109.test.jsx` (1) | AC-20 |
| `tests/extra-kalip-isareti-0107.test.js` (1) | Kanıt kayıtları bloğunun ilk testi: üç kayıt artık 0110 raporlarında (plan turu Karar 24); 0107 tabanının 0 farkı aynen |

Spec'in listesinden düşenler (R1/3 sonrası kırılmıyor): 0106 saf AC-11'in üçü, Karar 31'in ilki, 0108 UI AC-29.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-6, AC-30 | `kalip-durumu-0110` türetme blokları; AC-6'nın yazma yarısı ui AC-6/AC-14 ve AC-19 |
| AC-7 | `tests/uretim-formu-bagi-0108.test.js` dokunulmadan yeşil + saf AC-7 (C4 gövde taraması) |
| AC-8 | 0108'in getirme, sayaç ve başlangıç tarihi testleri dokunulmadan yeşil |
| AC-9–AC-16 | saf pil blokları; AC-9, AC-10, AC-12, AC-14 ayrıca ui liste blokları |
| AC-17–AC-21, AC-27, AC-29 | ui "detay penceresinin kalıp kartı" |
| AC-22, AC-31 | kanıt raporları + `kanit-eslemesi.test.js` |
| AC-23 | §4 |
| AC-24, AC-25 | saf çapraz bloklar + ui AC-24; 0108 UI AC-29 dokunulmadan yeşil |
| AC-26 | ui AC-26 |
| AC-28 | saf tarama + 0106 UI AC-29 (casus) dokunulmadan yeşil |
| AC-32 | `tasarim-kontrast.test.js` dokunulmadan yeşil |

## 6. Sürüm notu

- Eski kalıplar (üretim formuna gönder işareti ve üretim formu bağı olmayan) artık "Teslim edildi" sayılır ve müşteri listesindeki kalıp pilinden düşer; pil yalnız açık işi sayar, bütün açık kalıplar aynı aşamadaysa sayı yazmaz ("KALIP ÜRETİMDE 1/6" yerine "KALIP ÜRETİMDE").
- Yeni eklenen kalıp, üretim formuna gönder işaretlenene kadar Teslim edildi türetir; işaret konulunca Sipariş verildi olur.
- Müşteri detay penceresinin kalıp kartı eski sade hâline döndü; kalıp durumu artık orada görünmez. Müşteri kalıbının durumu müşteri formundan ("Düzenle"), Extra Kalıp'ınki makina geçmişinden değiştirilir.
