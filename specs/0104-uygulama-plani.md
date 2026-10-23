# 0104 uygulama planı: serisiz stok satırı düşülürken seri numarası girilebilir

Spec: `specs/0104-serisiz-dusumde-seri-numarasi.md` (revizyon 4). Plan Takım Yöneticisi tarafından 2026-10-23'te onaylandı;
onaylanan öneriler spec'e "Plan turu kararları" (Karar 27–35) olarak işlendi.

Çalışma kopyası `../wt0104`, dal `feat/0104-serisiz-seri`, taban `origin/main` `d9033b6` (0103 sonrası).

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/customers/CustomerAddEditForm.jsx` | serisiz dalda `aria-label="Seri numarası"` girişi, Karar 1 metni, R18 ipucusu (Karar 29, 30); seri bekleyen düzenlemede stok seçicisi yalnız `sourceStockId` yokken, varsa düz giriş `_manualSerial` işaretler (R16, Karar 27); manuel ipucusu Karar 5; model değişiminde serisiz seçim sıfırlanır (Karar 28) |
| `src/components/Customers.jsx` | serisiz dalda satır bulunamazsa yalnız bildirim (R17/b, Karar 34) |
| `scripts/evidence/0009-sayfa.jsx` | `secenek:` adımı (Karar 31), stoklu fikstür, `musteri-formu-0104-stok` |
| `docs/evidence/kanit-eslemesi.json` + `0104-taban-*`, `0104-*`, `0104-kapanis-*` | Karar 9 |
| `CLAUDE.md` | 0100 bölümünün satış formu cümlesi |
| `specs/README.md` | kapanışta (Karar 35) |

Testler: yeni `tests/ui/serisiz-seri-0104.test.jsx`, `tests/serisiz-seri-0104.test.js`; `tests/ui/stok-durumu-0100-app.test.jsx`
(AC-27).

## 2. Adım sırası

1. AC-6'nın tam nesne testi eski kodla, yeşil (Karar 32).
2. Görsel taban eski kodla (altı müşteri formu ekranı ve müşteri detayı; yeni ekran tabana girmez).
3. Form; `Customers.jsx` bildirimi.
4. Testler, mutasyonla ölçüm.
5. Görsel kanıt, kanıt eşlemesi, CLAUDE.md.
6. `npm run lint`, `npm test` (Electron dahil).

## 3. Kriter ↔ test eşlemesi

`ekran` = `tests/ui/serisiz-seri-0104.test.jsx`, `app` = `tests/ui/stok-durumu-0100-app.test.jsx`,
`tarama` = `tests/serisiz-seri-0104.test.js`.

| AC | Test |
|---|---|
| 1–15, 17–19, 22–26, 29 | ekran |
| 16, 27 | app |
| 20, 21, 30 | tarama (+ `parti-duzeltme-0103` dokunulmadan) |
| 28 | `kanit-eslemesi` + `tasarim-kaynak` |

## 4. Sürüm notu

Stoktan seri no'suz satışta seri numarası artık satış anında girilebilir ve o satış partiye, üretim tarihine ve stok
satırına kendiliğinden bağlanır.

Stoktan eklenen satışlar artık partiye ve üretim tarihine bağlanıyor; eski kayıtların partisi müşteri düzenlemesinden düzeltilebilir.
(Karar 36: bu sürümden önce stoktan eklenen satışlarda stok satırı düşülüyor ama kayda stok bağı, parti ve üretim tarihi
girmiyordu; Parti Üretim Panosu'nun Satıldı sayısı ve maliyet hesabı geçmişe dönük etkilenmiş olabilir.)

Bu sürümden önce stoktan seri no'suz satılıp hâlâ "seri no bekleyen" duran kayıtlarda numarayı "Manuel gir" ile yazın, stoktan
yeniden düşmeyin: o satışın stoğu zaten düşülmüştür ve veri bunu ayırt etmiyor (form bu kipte uyarı gösterir).

Yeni alan ve yeni veri bölümü yok; güncelleme sırası serbest.
