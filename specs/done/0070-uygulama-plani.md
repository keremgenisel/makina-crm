# 0070 Uygulama Planı: Çalışan Maliyetinde Yol Parası ve SGK

| | |
|---|---|
| **Bağlı spec** | `specs/done/0070-calisan-yol-parasi-ve-sgk.md` (R2, plan onayıyla) |
| **Dal** | `feat/0070-sgk-yol` (`feat/0071-kdv-dahil` `cf2ca23` üstünde, R26) |
| **Onay** | Takım Yöneticisi, 2026-10-06: bütün öneriler (Q1–Q10) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Kira stopajı kalemi satırlı yapar ve vadesi `stopajVade` form alanından satıra yazılır (sütun değil); SGK aynı yolu izler
  (Q2 → R20, R14 revizyonu, AC-5).
- `hedefAdKaydi` personel tablosunda bulamadığı hedefi genel tabloya düşürür; SGK genel tabloda "SGK'ya" çıkar (R9 doğrulandı).
- Borç özeti ("Kime Ne Kadar Borçluyuz") dönemden bağımsızdır; R15'in "o dönem" kapsamı satırdaki tutarla çelişirdi (Q4).
- 0071'in "Tutar girilmedi" ölçütü ödenecek tutardı; bu iş personelde ödenecek tutarı toplam − SGK yapıyor (Q3 → R27).
- Mahsup kipinin taksit seçicisi kalemin bütün hedeflerini listeler (Q5 → R28).

## 2. Dosyalar

- Motor: `src/lib/gider.js` (HEDEF.SGK, SGK sabiti, toplam/ödenecek, yol parası elden tarafında, SGK hedefi ve satırı,
  doğrulama, üretim, borç özeti, `sgkOzeti`, rozet ölçütü yardımcısı), `src/lib/odemeYontemi.js` (ad tablosu),
  `src/lib/acikKalemler.js`, `src/lib/odemeHatirlatma.js`, `src/lib/kasa.js` (ekstre, mahsup reddi),
  yeni `src/lib/sgkOdeme.js` (`sgkAylari`, `sgkToplamOdeme`), `src/lib/giderRaporu.js` (SGK kutusu, SGK ödemeleri satırı).
- Veritabanı: `electron/db.cjs` (`GIDER_SGK_YOL_COLUMNS`).
- Arayüz: `src/components/settings/CalisanManager.jsx`, `src/components/GiderForm.jsx`, `src/components/gider/DonemRaporu.jsx`
  (borç özeti SGK satırı ve düğmesi, tür kırılımı sütunları, personel satırı, rozet ölçütü), `src/components/gider/OdemeGirisi.jsx`
  (yol parası ipucu, mahsupta SGK yok), yeni `src/components/gider/SgkToplamOdeme.jsx`, `src/components/Giderler.jsx` (pencere).
- Testler: `tests/calisan-sgk-0070.test.js` (ad tablosu, ekstre ve toplu ödeme dahil), `tests/ui/calisan-sgk-0070.test.jsx`,
  `tests/gider-kasa-raporu-0070.test.js`, ek bloklar `gider-gizlilik`, `db-roundtrip.cjs`, `db-clean-install.cjs`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0070-*`, `kanit-eslemesi.json`. Belgeler: `CLAUDE.md`.

Değişmeyenler: `serverAuth.cjs`, `merge.js`, izinler, `odemeDogrula` / `cokluOdemeDogrula` / `odemeGirisiHazirla` imzaları (C6).

## 3. Kararlar

Q1 → R26 · Q2 → R20, R14, AC-5 · Q3 → R27, AC-41 (0071 R11 notu) · Q4 → R15, AC-33 · Q5 → R28, AC-42 · Q6 → R29, AC-43 ·
Q7 → R23, AC-40, DoD · Q8 → R30 · Q9 → R31, AC-44 · Q10 → R32, AC-45.

## 4. Adım sırası

1. Taban çekimi ayrı çalışma ağacından (`cf2ca23`, başka iş koşmadan).
2. Motor: toplam, hedefler, satırlar, doğrulama, üretim; `gider.test.js` ve `makina-maliyeti.test.js` dokunulmadan yeşil.
3. Borç zinciri, ekstre, mahsup, rapor; toplu ödeme sarmalayıcısı; motor testleri.
4. Veritabanı iki sütun; roundtrip ve temiz kurulum.
5. Arayüz: çalışan kartı → gider formu → kalem listesi ve borç özeti → pencere.
6. Gizlilik, tam takım, Electron testleri, lint; görsel kanıt, `CLAUDE.md`.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–4, 24, 25 | `ui/calisan-sgk-0070` (çalışan kartı) |
| AC-26, 27, 28 | `ui/calisan-sgk-0070` (gider formu notu, tanım formu, yol parası ipucu) |
| AC-5 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-6–9, 36, 38 | `calisan-sgk-0070` (motor); `gider.test.js`, `makina-maliyeti.test.js` dokunulmadan |
| AC-10–13, 29, 30 | `calisan-sgk-0070` (hedefler, satır, vade, kaynak taraması) |
| AC-14, 15 | `calisan-sgk-0070` (ad tablosu) + `ui/calisan-sgk-0070` (blok adı, çek nedeni) |
| AC-31 | `calisan-sgk-0070` (ekstre) |
| AC-16, 17, 32 | `calisan-sgk-0070` + `ui/calisan-sgk-0070` |
| AC-18, 19, 20, 33, 34 | `calisan-sgk-0070` (`sgkToplamOdeme`, `sgkAylari`) + `ui/calisan-sgk-0070` (pencere, kilit, Kasa satırları) |
| AC-35 | kaynak taraması + mevcut ödeme testleri dokunulmadan |
| AC-21, 22, 37, 45 | `gider-gizlilik` 0070 bloğu (çıktı temelli), `gider-kasa-raporu-0070` (kutu basılır / basılmaz) |
| AC-23, 43 | `ui/calisan-sgk-0070` (personel ayrıntısı) |
| AC-39 | kaynak taraması (sunucu ve merge dosyalarında yeni ad yok) |
| AC-41, 42 | `calisan-sgk-0070` + `ui/calisan-sgk-0070` |
| AC-44 | `gider-kasa-raporu-0070` (SGK ödemesi yapılmış ay: "SGK ödemeleri · n adet", "Personel ödemeleri"ne karışmaz) |
| Triyaj (satırsız SGK, karışık sürüm) | `calisan-sgk-0070` (toplu ödeme reddi, mahsup sınırı, sürüm notu) |

## 6. Uygulama notları

- **Hatırlatıcıda SGK toplu satırı (uygulamada bulundu, R17 gereği):** hatırlatıcının bölüm satırları kurum hedeflerini kalem
  kalem çiziyordu; SGK böyle kalsa rapordaki "vadesi yaklaşan / geçmiş" tablosu her çalışanın SGK'sını tutarıyla basardı.
  SGK bölüm başına tek toplu satırdır (`bolumSatirlari` `tur: "sgk"`); rapor ve Anasayfa penceresi aynı satırı çizer. Kart kalem
  sayar (bir kalem iki satırdan gelse de bir kez).
- **SGK kalemi satırlı doğar:** SGK > 0 ise `odemeSatirlariKur` ANA satırı ve tek SGK satırı kurar; yalnız SGK'lı kalemde ANA tutarı
  sıfır olduğu için yalnız SGK satırı vardır. Satırsız eski kalemde SGK yoktur; `satirsizHedefler` yine de SGK'yı tanır.
- **Rozet ölçütü (Q3):** `gider.tutarGirilmediMi` (kalem tutarı sıfır); 0071 spec'inin R11'ine not düşüldü.
- **Yol parası ipucu:** yeni kalemde editöre kalem verilmediği için form `yolParasiVar` bildirir; pencerede kalemden okunur.
- **Okuma:** boş `sgkTutar` / `yolParasi` blob'a yazılmaz (0071 `kdvYonu` deseni).
- **Güncellenen eski testler (spec atfıyla):** `ek-odeme-hedefi` AC-22 (hedef sırası), `ui/gider-ek-odeme` AC-10 (personel ayrıntısı
  sütunları), `ui/gider-form` AC-57 (SGK notu), `ui/gider-perdesi` AC-5 (ipucu metni), `ui/tahsilat-hesap` AC-17 (gider tarafı
  seçici listesi), `gider-kasa-raporu-0059` AC-14 (yeni `sgk` alanı), `db-roundtrip` reopen sayısı; `docs/tasarim-sozlugu.md`
  `Giderler.jsx` satır atıfları kaydı.
- **Karışık sürüm (triyaj):** güncellenmemiş sunucu PC `sgkTutar` / `yolParasi` sütunlarını bilmez, alanları sessizce düşürür;
  güncellenmemiş istemci SGK ve yol parasını toplama katmaz, düzenlemede SGK satırını kurmaz (satırsız SGK kalemi doğar) ve eski
  "(SGK dahil)" etiketini gösterir. Göç bunu çözemez; sürüm notu §7 (0071 §7 emsali). Satırsız SGK kalemi toplu ödemede
  reddedilir (`SGK_SATIRSIZ_HATASI`) ve mahsup sınırı SGK kalanını dışarıda bırakır.
- **Görsel kanıt (`docs/evidence/0070-piksel-raporu.json`):** "önce" `cf2ca23` (ayrı çalışma ağacı), 278 ekran × 2 tema; "sonra"
  283 ekran (5 yeni `0070` ekranı); 566 görüntünün 528'i 0 piksel. Değişenler çalışan kartı (dört sütun, dört giriş), personel
  gider formları (SGK ve yol parası alanları, notun yeni metni, SGK hedefi) ve personel ayrıntısı (iki yeni sütun). Kanıt eşlemesinde
  `degisti` + TY onayı (CalisanManager, GiderForm, DonemRaporu, SgkToplamOdeme).
  - İki servis formu ekranının (`servis-formu-tahsilat-hesap`, `-neden`) ilk tabanı, taban çekimi sırasında koşulan testlerin yüküyle
    kararsız çizilmişti (249 piksel); `cf2ca23`'ten yeniden çekildi, sonrayla 0 piksel (`not` alanı).
  - SGK fikstürünün tarihi görüntü aracının sabit bugününden (2026-09-23) önceye çekildi; gelecek tarihli kalem borç kapsamına
    girmediği için SGK satırı ve pencere ilk çekimde görünmüyordu.
- **Taban:** ayrı çalışma ağacından (`cf2ca23`).

## 7. Sürüm notu metni

> **Spec 0074 ile değişti:** bu metnin SGK kısmı yayınlanmadı (0070 hiçbir sürümde çıkmadı); yerini `specs/done/0074-uygulama-plani.md` §7 aldı. Yol parası cümlesi geçerlidir.

"Çalışan kartına ve personel giderine SGK ve yol parası alanları eklendi. SGK artık personel giderinin içinde ayrı bir ödeme
olarak izlenir; ayın bütün SGK borcunu Giderler'deki borç özetinden 'SGK'yı Öde' ile tek işlemde ödeyebilirsiniz. Yol parası
çalışana elden tutarla birlikte ödenir. ÖNEMLİ: önce sunucu bilgisayarı, sonra bütün istemciler güncellenmelidir; güncelleme
bitene kadar SGK ve yol parası girmeyin. Güncellenmemiş sunucu bu iki alanı kaydetmez (tutar ve borç değişir); güncellenmemiş
istemci onları toplama katmaz ve kalemi düzenlerse SGK satırını kurmaz."
