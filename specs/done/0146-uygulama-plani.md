# 0146 Uygulama planı: kalıp durumları penceresi ve makina teslimiyle toplu teslim

| | |
|---|---|
| **Spec** | `specs/done/0146-musteri-detayinda-kalip-teslimi.md` (revizyon 4) |
| **Onay** | Takım Yöneticisi, 2026-11-16 (bütün öneriler onaylandı, spec'e Plan kararı 25–28 olarak işlendi) |
| **Dal** | `feat/0146-kalip-durumlari` (`bd433d59` üstünde; sipariş belgesi sadeleştirmesi önce commit edilip main'e alındı) |
| **Durum** | Tamamlandı: commit `02bae06f` (2026-11-16). Kanıt `0146-piksel-raporu.json`: 45 müşteri ekranından yalnız makina kalıbı olan iki detay ekranı (`musteri-detay-0110-kalip`, `musteri-detay-0115`) bilinçli değişti, dört yeni ekran (`musteri-detay-0146-*`), öteki ekranlar 0 piksel. Taban turunda iki aydınlık kare (`musteri-detay`, `musteri-detay-0111-toplu-fabrika`) açılış adımı uygulanmadan çekilmişti (karanlıkları doğru); ikisi eski kodla yeniden çekildi ve 0 fark verdi. Mutasyon: kapanma kapısı (iki yol), bayat plan, ayna ölçütü, hazır kapsamı ve özetin teslimi gizlemesi testlerle yakalandı; bayat plan mutasyonu ilk turda kaçtı, AC-30 testi güncelleyicinin gördüğü kayıtla sınanacak biçimde daraltıldı. |

## 1. Dosyalar

- **Kütüphane `src/lib/musteriDurumu.js`** (import yok, saat yok, setter yok; 0106 AC-42): `extraSatistanMi(k, i, uzunluk, satisAdedi)`
  (A-R8, kartın bugünkü ölçütü), `makinaKaliplari(musteri, { satisAdedi, harita })` → `[{ i, kalip, turetilen, durum }]`,
  `kalipOzetMetni(liste)` → metin ya da `null`, `teslimToplamaPlani(musteri, yeniDeger, { satisAdedi, harita })` → `null | { sayi, kaliplar }`;
  sabitler `KALIP_DURUMLARI_BASLIGI`, `extraKalipListeIbaresi(n)`, `TESLIM_ONAYI`.
- **Yeni `src/components/customers/detail/KalipDurumlari.jsx`:** `KalipDurumuSatiri`, `KalipDurumlariPenceresi`, `TeslimOnayi`; denetimli,
  `setCustomers` çağırmaz (Plan kararı 28).
- **`src/components/customers/CustomerDetailModal.jsx`:** tek durum `kalipPenceresi` (`null | "liste" | { onay: n }`), makina seçicisinin
  `onChange`'i (önce makina, sonra plan), kabulde tek `setCustomers` ve yeniden hesap, kalıp seçimi `durumYaz` ile o konuma, kartın satır içi
  ölçütü `extraSatistanMi` çağrısı, kapanma kapısı (`Modal` `onClose` ve "Kapat" düğmesi), pencere ve onay detay `Modal`'ından sonra kardeş.
- **Testler:** yeni `kalip-durumlari-0146` (saf, taramalar), `ui/kalip-durumlari-0146` (gerçek `Customers` + detay),
  `ui/kalip-durumlari-0146-app` (gerçek App gövdesi); `musteri-durumu-0106` (`EKRANLAR` listesine ekleme), `scripts/tests/server-security.cjs`
  (`kalipDurumcu`, `kalipDurumsuz`).
- **Kanıt ve belgeler:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0146-*`, `CLAUDE.md`,
  `specs/README.md`.

## 2. Adım sırası

1. Taban raporu: bütün `musteri-detay-*` ekranları son kodla; kalıplı (değişecek) küme burada kesinleşir.
2. Kütüphane ve saf testler.
3. `KalipDurumlari.jsx`.
4. Detay penceresi bağlantısı; UI ve gerçek App testleri.
5. Sunucu ucu (`server-security.cjs`).
6. Taramalar (0106 ekran listesi, AC-20, AC-21).
7. Kanıt: yeni ekranlar, eşleme kayıtları.
8. Tam takım (Electron dahil), lint, tip denetimi.
9. Belgeler, sürüm notu.

## 3. Kararlar (onaylı öneriler)

| No | Konu | Karar | Spec |
|---|---|---|---|
| 25 | `teslimToplamaPlani` imzası | `{ satisAdedi, harita }`; harita türetilmiş "Hazır" için gerekli | B-R1/2 |
| 26 | AC-32 ile B-R2 çelişkisi | Kalıpların hepsi tek çağrıda; makina durumu seçim anında ayrı çağrıyla | AC-32 |
| 27 | İbare metni | "… bu listede ve özette yoktur; … yönetilir ve Teslim Bekleyenler süzgecine girer." | A-R5/2, AC-27 |
| 28 | Sabitler, Escape, yazım yeri, ibare | `TESLIM_ONAYI` tek nesne; Escape onayda "Yalnız makina"; yazımlar detayda; ibare `Ipucu` | B-R2/2, C3 |
| 29 | Özet örneklerinin sırası | Kural kazanır: "1 Üretimde · 2 Hazır" (uygulamada bulundu) | A-R3, AC-2 |
| 30 | AC-28 uygulamada | App canlı satışları verir, sonuç oluşmaz; yardımcı düzeyinde ölçülür, sürüm notundan çıkar | AC-28 |
| — | Dal | Sipariş işi önce commit edilip main'e alındı, 0146 main'den | — |

## 4. Kriter ↔ test

S = `kalip-durumlari-0146.test.js`, U = `ui/kalip-durumlari-0146.test.jsx`, A = `ui/kalip-durumlari-0146-app.test.jsx`.

| AC | Test |
|---|---|
| 1, 23 | U: satır, düğme, kimlikler, pencere başlığı |
| 2, 24 | S: `kalipOzetMetni` örnekleri; U: ekrandaki metin |
| 3 | S + U: ayna-yalnız kayıtta satır yok, hepsi teslimde satır var |
| 4 | U: izinsiz kullanıcıda düğme yok, özet var; `isCustomer=false`'ta satır yok |
| 5, 27 | U: ayna satır listede yok, ibare; S: ibare tek sabit |
| 6, 7 | U: seçim yalnız o konuma; "Otomatik (…)" alanı siler |
| 8 | U: kart DOM'u aynı, kartta combobox ve düğme yok; 0110 UI testleri dokunulmadan yeşil |
| 9 | U: pencere kabı stili (`maxWidth` 560px, `maxHeight` 90vh, `overflowY` auto) |
| 9/2 | S: liste yalnız pencerede (kaynak); kanıt: 15 kalıplı ekran |
| 10–13, 29 | U: onay, kabul, ret, hazırsız kayıt; onay açıkken seçici "Teslim edildi" |
| 11 (süzgeç) | U: gerçek `Customers`'ta Teslim Bekleyenler, Extra Kalıp'lı ve Extra Kalıp'sız kayıt |
| 14, 15 | S: plan yalnız hazır ve ayna dışı; U: Extra Kalıp kaydı değişmez |
| 16 | U: teslimden hazıra onay yok |
| 17, 35 | S: saflık, 0106 durum dizesi taraması, yeni dosyada `MAKINA_DURUMU.TESLIM` yok |
| 18 | S: `src/components`'te `partSaleId` + satış sayısı ifadesi yok; dört kullanımın çapraz testi |
| 19, 37 | U: Escape yalnız üsttekini kapatır; pencere açıkken "Kapat" detayı kapatmaz; S: iki kapı kaynakta |
| 20 | S: ızgara bloğu dilimi; 0106 ve 0110 form testleri yeşil |
| 21 | S: anlamsal tarama |
| 22 | `server-security.cjs`: 200 ve 403 |
| 25, 26 | S + U: numaralar 1, 3, 4, 5; erişilebilir adlar benzersiz |
| 28 | S: çöpteki Extra Kalıp satışıyla son kalıp düşer |
| 30 | U: onay açıkken kayıt değişir, kabulde yalnız hâlâ hazır olan yazılır |
| 31 | U: onay metinleri; "Evet, Sil" ve çöp ikonu yok |
| 32 | A: kabulde tek `setCustomers`, gövdede iki kalıp teslim |
| 33 | U: müşteri formunda onay yok |
| 34 | S: dosya yerleri; 0110 AC-17 yeşil |
| 36 | S: tek durum alanı; U: onay açıkken pencere açılmaz |

## 5. Ters çevrilen kriterler

(Uygulamada da ölçüldü: 0106 ve 0110'un bütün testleri dokunulmadan yeşil; 0106'nın ekran listesine yalnız yeni dosya eklendi.)

Yok (ölçüm: 0110 AC-17 ve 0110 UI testinin combobox sayımı pencere kapalıyken doğru kalır). 0106'ya yalnız ekran listesi eklemesi.

## 6. Sürüm notu

Kalıpların durumu artık müşteri detayında makina durumunun altındaki "Kalıp Durumları" penceresinden değiştirilebilir; makina "Teslim
edildi" yapılınca hazır bekleyen kalıplar için onay sorulur ("Yalnız makina" seçilirse yalnız makina durumu yazılır). Extra Kalıp
satışlarının durumu bugünkü gibi Makina Geçmişi'ndeki satırından yönetilir. Yalnız Extra Kalıp satışı olan kayıtta bu satır çizilmez.
