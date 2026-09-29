# 0041 Uygulama Planı: Bir Giderin Birden Çok Ödeme Yöntemiyle Ödenmesi

| | |
|---|---|
| **Bağlı spec** | `specs/0041-gider-coklu-odeme-yontemi.md` (R2, plan onayıyla onaylandı) |
| **Dal** | `feat/0041-coklu-odeme` (`feat/0043-mali-isler` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-29: bütün öneriler (Q1–Q11) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/odemeYontemi.js` (yeni) | Saf motor: `hareketPaylari`, `yontemKirilimi`, `donemYontemKirilimi`, `cokluOdemeDogrula` |
| `src/lib/kasa.js` | `anaPaylari` → `hareketPaylari` (ana hedef süzgeciyle); ekstre davranışı aynı; `odemeDogrula` dokunulmaz |
| `src/components/gider/OdemeKayitPenceresi.jsx` | Çok satırlı "Ödeme" kipi, kırılım özeti, göç notu, göç hareketinde kapattığı tutar, ciro bilgi satırı; `onKaydet(kayitlar[])` |
| `src/components/Giderler.jsx`, `src/components/Dashboard.jsx` | Dizi kaydı; Giderler kırılımları `useMemo` ile hesaplayıp listeye ve karta verir |
| `src/components/gider/DonemRaporu.jsx` | `:251`/`:273` türetilen yönteme; yeni "Ödeme Yöntemi Kırılımı" kartı |
| `src/components/GiderForm.jsx`, `settings/SettingsGiderTanimlari.jsx` | "Varsayılan ödeme yöntemi" etiketi ve ipucu |
| `scripts/evidence/0009-sayfa.jsx` | Yeni ekranlar |
| Testler | yeni `odeme-yontemi.test.js`, `ui/gider-coklu-odeme.test.jsx`; güncelleme `gider-gizlilik`, `ui/cek-ciro`, ilgili gider testleri |

DB, sunucu, birleştirme ve izin değişmez (C2, C5).

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Kırılım bütün hedefleri sayar; ekstre ana hedefte kalır; tek fonksiyon `hareketPaylari(k, hareketler, turMap, { yalnizAna })` |
| Q2 | Tutarlı hareketin payı tutarıdır; motor yalnız tutarsız göç hareketi olan kalemde sırayla yeniden çalışır |
| Q3 | Dönem kırılımı = dönemin kalemlerine yapılan ödemeler (ödeme tarihinden bağımsız) |
| Q4 | Dönem kartında personel ödemeleri ayrıntı kapalıyken tek satır |
| Q5 | Kalem ayrıntısı = ödeme penceresi (kayıtlı ödemeler + kırılım özeti) |
| Q6 | Yeni satır: ilk satırın taksiti, o taksidin kalan tutarı, kalemin varsayılan yöntemi, son kullanılan hesap |
| Q7 | Motor hedef anahtarıyla hata verir, adı pencerenin `satirAdi`'sı yazar (parametre) |
| Q8 | Her satır bugünkü `odemeDogrula`'dan geçer; iki katman üstüne eklenir |
| Q9 | Vade etiketi (`Çek vadesi`/`Son ödeme`) kalemin alanını okumaya devam eder |
| Q10 | Değişen mevcut ekranlar `kanit-eslemesi.json`'da TY onayıyla `degisti` |
| Q11 | Pencere 760 piksel, satır alanları dar pencerede alt alta |

## 3. Adım sırası

1. Motor ve `kasa.anaPaylari` bağlantısı; motor testleri (ekstre testleri değişmeden geçer).
2. `cokluOdemeDogrula` ve testleri.
3. Ödeme penceresi, Giderler ve Dashboard kaydı.
4. Dönem Raporu satırı, kartı ve kırılım kartı.
5. Etiketler.
6. Tam test ve lint, görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` |
| AC-3 | `odeme-yontemi.test` (üç durum) + `ui/gider-coklu-odeme` (hedef adıyla hata) |
| AC-4, AC-5, AC-16, AC-17 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` |
| AC-6 | `ui/gider-coklu-odeme` |
| AC-7, AC-8 | `ui/gider-coklu-odeme` |
| AC-9, AC-18, AC-19 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` (göç notu) |
| AC-10 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` |
| AC-11 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` + `kasa.test` |
| AC-12 | `ui/gider-coklu-odeme` |
| AC-13, AC-14 | mevcut `odeme-hatirlatma`, `gider.test`, `makina-maliyeti` + kaynak taraması (`odeme-yontemi.test`) |
| AC-15 | `ui/gider-form` |
| AC-20, AC-21 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` |
| AC-22–AC-25 | `odeme-yontemi.test` + `ui/gider-coklu-odeme` |
| AC-26 | `ui/gider-coklu-odeme` |
| AC-27 | `gider-gizlilik.test.js` |

## 5. Uygulama notları

- **Katman yerleşimi:** yöntem kırılımı ve hareket payları `src/lib/odemeYontemi.js`'de; çok satırlı doğrulama (`cokluOdemeDogrula`, `COKLU_ODEME_MAX_SATIR`) `odemeDogrula`'nın yanında `kasa.js`'de, çünkü `kasa.js` artık `hareketPaylari`'nı içe aktarıyor ve ters yön döngü kurardı.
- **Katman 2 ve 3:** aynı taksit sınırı (katman 2) yalnız taksitli kalemde uygulanır; taksitsiz kalemde hedef kalemin kendisidir ve sınır katman 3'ün mesajıyla ("Satırların toplamı kalemin kalanını aşıyor") verilir. AC-3'ün üç durumu böyle ayrı ayrı sınandı.
- **Tarih:** pencere tarihi satır doğrulamasına yer tutucuyla gider, hata yalnız pencere düzeyinde bir kez yazar (satır hatalarına tarih karışmaz).
- **Erişilebilir adlar:** ilk satır eski adları taşır ("Ödeme tutarı", "Ödeme yöntemi", "Hesap", "Taksit", "Açıklama"), sonraki satırlar numaralıdır ("Ödeme tutarı 2"); mevcut testler değişmeden geçti.
- **Görsel kanıt:** `docs/evidence/0041-piksel-raporu.json` (300 çekimden 27 ekran × 2 tema değişti, 273 çekim 0 piksel). Yeni ekranlar: `giderler-karma-yontem`, `giderler-yontem-kirilimi`, `giderler-coklu-odeme`, `giderler-coklu-odeme-hata`. TY onayı 2026-09-29; `kanit-eslemesi.json`'da 46 kayıt `degisti`, done'a taşınırken `0041-taban` raporuyla `ayni`ye çevrilecek.
- **Testler:** `odeme-yontemi.test.js` (20), `ui/gider-coklu-odeme.test.jsx` (12), `gider-gizlilik` AC-27, `ui/gider-form` AC-15; tam paket 236 dosya / 2658 test yeşil, lint 0 hata (67 uyarı, değişmedi).
- **Triyaj (2026-09-29):** (1) hızlı yol yalnız tutarlar toplamı motorun kapanan tutarına eşitse kullanılır, fazla ödenmiş kalemde motor yoluna düşülür (kırılım = ekstre = motor); (2) hareketler `hareketGruplari` ile bir kez gruplanır, dönem kırılımı `useMemo`'da (3.000 kalem × 30.000 hareket: gruplamasız 4,2 sn, gruplu < 1,5 sn testi); (3) AC-13 ve AC-14 davranış testleri (iki satırlı ödeme sonrası borç özeti ve hatırlatıcı; yöntemden bağımsız makina maliyeti); (4) katman 3'ün taksitli dalı kaldırıldı, neden yorumda.
