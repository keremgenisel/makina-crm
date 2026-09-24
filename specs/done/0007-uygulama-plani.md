# 0007: Uygulama Planı, Bayi Aracılığıyla Kalıp Satışı ve Borç Atıfı

| | |
|---|---|
| **Bağlı spec** | `specs/done/0007-bayi-araciligiyla-kalip-satisi.md` (R1, plan onayıyla onaylandı) |
| **Durum** | Tamamlandı. 2026-09-24: K1–K12 kullanıcı tarafından onaylandı; spec R1 ile güncellendi; kod ve düzeltme turu 1 commit `98e8f8b` (branch `feat/0001-gider`, push ve sürüm yok). SCORECARD dolduruldu, spec ve plan `specs/done/`'a taşındı. |
| **Önkoşul** | 0006 (Extra Kalıp ortak yolu `lib/kalipSatisi.js`, bayi adı kaskadı) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar K1–K12) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Kalıp borç yüklemi | `isPartSaleBorcluMu(ps) = !satisTahsilEdildi(ps)`; **ücretsiz (`ucretsizMi`) ve satış yapan firmaya bakmaz** | `utils.js:656` |
| Müşteri borcu (Müşteriler) | `customerHasAnyDebt`, müşterinin her ödenmemiş `partSales` kaydını (tür ayırmadan, ücretsiz dahil) borç sayar | `utils.js:701-709`, `Customers.jsx:98` |
| Anasayfa | Borçlu firma sayısı: bütün ödenmemiş `partSales` müşteriye; "Borçlu Bayi/Servis" haritası: Kalıp + satış yapan firma fabrika değilse o firmaya, **"Diğer" ise `satisFirmaAd`**. Aynı kalıp **iki listede birden** | `Dashboard.jsx:88-100, 128-135` |
| Bayiler | Bayi borcu: Kalıp + satış yapan firma fabrika değilse **`satisFirma` adına** ("Diğer" satışı "Diğer" adlı hayali bir firmaya düşer, hiçbir bayiyle eşleşmez); ücretsiz kalıbın tutarını KDV'siz de olsa sayar | `SimpleDealers.jsx:85-95` |
| Aylık rapor | Ödenmemiş her kalıp alacağı **müşteriye** yazılır (`ekleAlacak(customerId)`); müşteri dışı borçlular için ad anahtarlı yol (`ekleAlacakAd`, `b:`/`x:`) yedek parçada zaten var | `aylikRapor.js:410-424` |
| Beşinci yer: müşteri detayı | Müşteri detay modalındaki borç toplamı da bayinin sattığı ödenmemiş kalıbı müşteriye yazıyor (spec dört yer sayıyor) | `deriveCustomerDetail.js:195` |
| Emsal | Servis: anlaşmalı firmanın parça borcu `isParcaBorcluAnlasmaliFirmaya`; fabrika tespiti `isAltuntasServisi` (fabrika adı **veya** eski varsayılan "Altuntaş Makina" metni) | `utils.js:575, 630` |
| Form | `PartSaleForm` müşteri/makina seçici, "Satış Yapan Firma" seçicisi taşıyor; **müşteri seçilmemişse kaydetme sessizce hiçbir şey yapmıyor** | `PartSaleForm.jsx:42-95`, `CustomerDetailModal.jsx:376-379` |
| Kayıt yolu | Ortak alanlar ve ekleme `lib/kalipSatisi.js`'te (0006); **kredi kartı komisyon hesabı hâlâ `CustomerDetailModal.savePartSale` içinde** | `CustomerDetailModal.jsx:393-410` |
| Bayi modalı | "Sattığı Kalıplar" `partSales` prop'undan canlı türetiliyor; "Yedek Parça Satışı" düğmesi `:734`; `setPartSales` 0006 ile geliyor | `SimpleDealers.jsx:150-154, 734` |
| Sunucu | `BOLUM_SEKMELERI.partSales` = customers, stock, settings, servis, evrak; **"dealers" yok**. `customers` listesinde "dealers" var | `serverAuth.cjs` |

---

## 1. Mimari özet

- **Tek saf fonksiyon** `utils.kalipBorcTarafi(ps, factoryName)` →
  `null` (borç yok: silinmiş, tahsil edilmiş veya ücretsiz) ·
  `{ tip: "musteri", customerId }` (satış yapan boş/fabrika) ·
  `{ tip: "bayi", ad }` (satış yapan bir bayi adı) ·
  `{ tip: "disFirma", ad }` ("Diğer"; ad = `satisFirmaGoster`).
  Yalnız `tur === "Kalıp"` kayıtlarına uygulanır; diğer türler (eski "Parça"/"YedekParca") bugünkü gibi müşteride kalır.
- **Beş tüketici** bu fonksiyonu kullanır: `customerHasAnyDebt` (Müşteriler süzgeci ve satır vurgusu), Anasayfa (borçlu firma
  sayısı/listesi + Borçlu Bayi/Servis), Bayiler (bayi borcu), aylık rapor (alacak atıfı + borçlu firma sayısı), müşteri detayı
  borç toplamı (K4). Hiçbiri kendi kuralını yazmaz.
- **Bayi modalından kayıt:** aynı `PartSaleForm`, aynı kayıt yolu. `savePartSale`'in ekleme kolu (kredi kartı dahil)
  `lib/kalipSatisi.js`'e taşınır; müşteri detayı ve bayi modalı onu çağırır (C2).

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/utils.js` | `kalipBorcTarafi`, `fabrikaSatisiMi(ad, factoryName)` (K1); `customerHasAnyDebt` kalıp kolunu fonksiyona bağlar |
| `src/lib/kalipSatisi.js` | `kalipSatisiEkle(pkForm, deps)` → `{ ok, kayitlar }` \| `{ hata }`: doğrulama (müşteri, en az bir kalıp), kredi kartı komisyonu, `kalipSatisOrtak` + `yeniKalipSatislari`. `CustomerDetailModal`'dan taşınır |
| `src/components/customers/CustomerDetailModal.jsx` | Ekleme kolu `kalipSatisiEkle`'yi çağırır (davranış aynı; düzenleme kolu yerinde kalır) |
| `src/components/customers/detail/deriveCustomerDetail.js` | Müşteri borç toplamı kalıp kolunda `kalipBorcTarafi` (K4) |
| `src/components/PartSaleForm.jsx` | Müşteri seçilmemişse alanın altında uyarı (AC-5); kaydetmede neden gösterilir |
| `src/components/SimpleDealers.jsx` | Detay modalında **"Bayi Aracılığıyla Kalıp Satışı"** düğmesi (`cust_kalip_add`); `PartSaleForm` satış yapan = bu bayi ön seçili; kaydet `kalipSatisiEkle`; bayi borç haritası kalıp kolu `kalipBorcTarafi` |
| `src/components/Dashboard.jsx` | Borçlu firma sayısı/listesi ve Borçlu Bayi/Servis haritası kalıp kolları `kalipBorcTarafi` |
| `src/lib/aylikRapor.js` | Kalıp alacağı: müşteri → `ekleAlacak`; bayi → `ekleAlacakAd("b:"+bayiId)` (adla bulunur; yoksa `x:`+ad); dış firma → `ekleAlacakAd("x:"+ad)` (K3) |
| `electron/serverAuth.cjs` | `BOLUM_SEKMELERI.partSales` listesine `"dealers"` (K9) |
| `src/App.jsx` | `SimpleDealers`'a `kalipDefs`, `calisanlar` (varsa eksik), `appSettings` iletimi |
| `CLAUDE.md` | Borç atıfı kuralı, servis emsaline atıf, davranış değişikliği notu |

Yeni kalıcı alan **yok** (C1); DB, merge, izin tanımları değişmez.

---

## 3. Adım sırası

1. **Saf kural:** `kalipBorcTarafi` + birim testleri (AC-6, 11–15).
2. **Tüketiciler:** `customerHasAnyDebt`, Dashboard, SimpleDealers borç haritası, aylık rapor, müşteri detayı; çapraz test
   (AC-7–10, 16, 18).
3. **Kayıt yolu:** `kalipSatisiEkle` çıkarımı; müşteri detayı testleri kilit (C2).
4. **Bayi modalı:** düğme, form, kaydet, "Sattığı Kalıplar"ın canlı güncellenmesi (AC-1–5, 17); sunucu eşlemesi + e2e.
5. **Doğrulama:** tam paket, lint, build, CLAUDE.md, sürüm notu metni.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**K1. "Fabrika mı?" tespiti.** Bayiler ve Anasayfa yalnız güncel fabrika adıyla karşılaştırıyor. Fabrika adı Ayarlar'dan
değiştirilmişse eski kayıtlardaki varsayılan "Altuntaş Makina" bir bayi gibi görünür ve borç hayali bir "Altuntaş Makina"
firmasına düşer. *Öneri:* Servis emsali `isAltuntasServisi` ile aynı kural: boş, güncel fabrika adı **veya** "Altuntaş Makina"
→ müşteri borcu (R7).

**K2. Ücretsiz kalıp (R8, AC-14) bugün her yerde borç dışı değil.** Spec "bugünkü davranış korunur" diyor, ama
`customerHasAnyDebt`, Anasayfa ve aylık rapor ödenmemiş ücretsiz kalıbı borç sayıyor (yalnız görüntüleme onu 0 gösteriyor).
*Öneri:* `kalipBorcTarafi` ücretsiz kaydı borçsuz sayar ve her tüketici bunu kullanır. Sonuç: ücretsiz işaretli ama ücret alanı
dolu eski kayıtlar borçlu listelerinden ve toplam alacaktan çıkar. Bu R9'un "toplam değişmez" kuralına tek istisnadır ve
yanlış sayılan bir tutarın düzelmesidir; PR notunda yazılır. Finans ekranının toplam alacağı (dört ekran dışında) da aynı
fonksiyonla hizalanır ki iki toplam ayrışmasın.

**K3. Aylık raporda bayi anahtarı.** Yedek parça bayi borcunu `b:`+bayi kimliğiyle tutuyor, kalıp ise yalnız ad taşıyor.
*Öneri:* Kalıbın satış yapan adı bayilerde aranır; bulunursa `b:`+kimlik (aynı bayinin yedek parça ve kalıp borcu tek satırda,
borçlu firma sayısı doğru); bulunamazsa ve "Diğer" ise `x:`+ad (yedek parça dış firmasıyla aynı anahtar). Yeni anahtarlama
icat edilmez.

**K4. Beşinci tüketici: müşteri detayı.** Spec dört yer sayıyor, ama müşteri detay modalındaki borç toplamı aynı kalıbı
müşteriye yazıyor; kullanıcı müşteriyi borçlu listesinde görmez ama detayında borçlu görür. *Öneri:* Detayın borç toplamı da
aynı fonksiyonu kullanır; kalıp satırı makina geçmişinde görünmeye ve ödendi düğmesi çalışmaya devam eder (kayıt değişmez).

**K5. Diğer kalıp türleri.** Anasayfa bugün her ödenmemiş `partSales`'i (eski "Parça" kayıtları dahil) müşteriye yazıyor.
*Öneri:* Atıf yalnız `tur === "Kalıp"` için; diğer türler bugünkü gibi müşteride (C7'deki eski Evrak kayıtlarına dokunulmaz).

**K6. Kayıt yolunun tekliği (C2).** Kredi kartı komisyonu hâlâ müşteri detayının içinde. Bayi modalı ayrıca yazarsa iki yol
ayrışır. *Öneri:* Ekleme kolunun tamamı `kalipSatisiEkle`'ye taşınır; iki ekran da onu çağırır. Taslak (useFormDraft) yalnız
müşteri detayında kalır; bayi modalında taslak yok (kısa form, yeni bir anahtar gereksiz).

**K7. Müşterisiz kayıt (AC-5).** Bugün sessizce hiçbir şey olmuyor. *Öneri:* Formda müşteri alanının altında "Kalıbın
gideceği müşteriyi ve makinayı seçin" uyarısı; kaydet bu durumda nedeni bildirim olarak söyler. İki ekran için de geçerli.

**K8. Bayi modalında fatura tipi.** Müşteri detayı fatura tipini müşterinin satış tipinden alıyor; bayi modalında müşteri
formdan sonra seçiliyor. *Öneri:* Varsayılan "Faturalı Yurtiçi" (fatura bayiye kesiliyor); kullanıcı formda değiştirebilir.

**K9. Yalnız Bayiler sekmeli kullanıcı.** `partSales` bölümünde "dealers" yok; bu kullanıcı butona basınca kayıt 403 alır.
*Öneri:* `BOLUM_SEKMELERI.partSales`'e "dealers" eklenir (Servis kiosk ve Evrak'la aynı emsal); kayıt düzeyindeki
`cust_kalip_add` denetimi aynen kalır. Düğme `cust_kalip_add`'e bağlıdır (R11); yeni izin yok.

**K10. Davranış değişikliğinin duyurulması (C5).** *Öneri:* Ekranda kalıcı bir açıklama eklenmez; sürüm notu metni plan ve
CLAUDE.md'de hazırlanır, sürüm yayını (yalnız açık talimatla) sırasında kullanılır. Anasayfa'nın Borçlu Bayi/Servis penceresi
zaten bu kalıpları gösterdiği için kullanıcı rakamın nereye gittiğini görebilir.

**K11. "Diğer" firmanın Bayiler ekranında görünmemesi.** Dış firma bir bayi değil; Bayiler listesinde karşılığı yok. *Öneri:*
Borcu Anasayfa'nın Borçlu Bayi/Servis penceresinde ve aylık raporda (`x:` anahtarıyla) görünür; Bayiler ekranı yalnız kayıtlı
bayileri gösterir. AC-11 bu iki yerle kanıtlanır.

**K12. Spec durumu ve görsel kanıt.** *Öneri:* Önceki spec'lerdeki gibi planın onayı spec onayı sayılır; görsel kanıt alınmaz.

---

## 5. Kabul kriteri ↔ test eşlemesi

`U` = `tests/kalip-borc-atfi.test.js` (saf kural, aylık rapor, `kalipSatisiEkle`, kaynak taraması), `C` = `tests/ui/kalip-borc-capraz.test.jsx`
(Müşteriler, Anasayfa, Bayiler, aylık rapor ve müşteri detayı aynı veriyle), `D` = `tests/ui/dealers-kalip-satisi.test.jsx` (bayi modalı).
Çapraz test 0007 kodu geri alınarak çalıştırıldı: kural değişikliği testleri kırıldı, değişmemesi gerekenler (AC-13, AC-15) geçti.

| Kriter | Test | Kanıt |
|---|---|---|
| AC-1, AC-2 | D | düğme görünür, form açılır, satış yapan = bu bayi |
| AC-3 | D | müşteri/makina seçilip kaydedilince kayıt o müşteride, `kaliplar`'da ve makina geçmişi olayında |
| AC-4 | D | "Sattığı Kalıplar" aynı render'da yeni kaydı gösterir |
| AC-5 | D | müşterisiz kayıt yok, uyarı ve bildirim |
| AC-6 | U + C | bayi borcu (Bayiler ve Anasayfa Borçlu Bayi) tutarı içerir |
| AC-7 | C | Müşteriler borç süzgecinde yok, satır vurgusuz |
| AC-8 | C | Anasayfa borçlu firma sayısı/listesi dışında |
| AC-9 | U | aylık rapor alacağı bayi satırında (`b:` anahtarı), müşteride değil |
| AC-10 | U | kural öncesi ve sonrası toplam alacak eşit (ücretsiz istisnası K2 ayrıca) |
| AC-11 | U + C | "Diğer" → kayıttaki ad, Anasayfa ve rapor `x:` satırı; müşteri borçsuz |
| AC-12, AC-13 | U | boş ve fabrika (güncel ad ve eski varsayılan, K1) → müşteri |
| AC-14 | U + C | ücretsiz → hiçbir tarafta borç yok |
| AC-15 | U + C | ödendi → bayi borcundan düşer |
| AC-16 | C + mevcut `documents-bayi-alici` (R19 kaskadı) | ad değişince aynı tutar aynı bayide |
| AC-17 | D | `cust_kalip_add` yoksa düğme yok |
| AC-18 | C | aynı veri: Müşteriler, Anasayfa, Bayiler, aylık rapor (ve müşteri detayı) aynı borçluyu gösterir |
| DoD C3 | U | beş tüketicinin kalıp kolu `kalipBorcTarafi`'na bağlı (çıktı eşliği + kaynak taraması) |
| DoD C2 | U + mevcut `dis-firma-servis-kalip` | müşteri detayı ve bayi modalı aynı `kalipSatisiEkle` çıktısı |
| DoD K9 | `server-authz.test.js` + `server-security.cjs` | yalnız Bayiler sekmeli, `cust_kalip_add`'li kullanıcının kalıp kaydı 200; izinsiz 403 |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| K1 | Fabrika tespiti | Boş, güncel fabrika adı veya "Altuntaş Makina" → müşteri (servis emsali) |
| K2 | Ücretsiz kalıp | Her yerde borçsuz; eski ücretli-ücretsiz kayıtların toplamdan çıkması belgelenir |
| K3 | Rapor anahtarı | Bayi adla bulunursa `b:`+kimlik, değilse `x:`+ad |
| K4 | Müşteri detayı | Beşinci tüketici olarak aynı kural |
| K5 | Diğer türler | Yalnız Kalıp; eski türler müşteride |
| K6 | Kayıt yolu | Ekleme kolunun tamamı `kalipSatisiEkle`'ye; bayi modalında taslak yok |
| K7 | Müşterisiz kayıt | Form uyarısı + bildirim |
| K8 | Fatura tipi | Varsayılan "Faturalı Yurtiçi", değiştirilebilir |
| K9 | Bayiler sekmeli kullanıcı | `partSales`'e "dealers"; izin `cust_kalip_add` |
| K10 | Duyuru | Sürüm notu metni hazırlanır; ekranda kalıcı açıklama yok |
| K11 | "Diğer" firmanın yeri | Anasayfa Borçlu Bayi/Servis + aylık rapor |
| K12 | Spec onayı ve görsel kanıt | Plan onayı spec onayı; görsel kanıt yok |

---

## 7. Uygulama notları (2026-09-24)

- **Tek kural:** `utils.kalipBorcTarafi` + `partSaleMusteriBorcuMu` + `fabrikaSatisiMi`. Bağlanan yerler: `customerHasAnyDebt`
  (Müşteriler), `Dashboard` (borçlu firma + Borçlu Bayi/Servis), `SimpleDealers` (bayi borcu), `aylikRapor` (alacak + borçlu firma
  sayısı), `deriveCustomerDetail` (müşteri detayı borç toplamı ve devir öncesi borç işareti), `Finance` (toplam alacak, K2).
- **Tek kayıt yolu:** `lib/kalipSatisi.kalipSatisiEkle` (doğrulama + kredi kartı + ortak alanlar); `CustomerDetailModal` ekleme kolu
  ve `SimpleDealers` "Bayi Aracılığıyla Kalıp Satışı" onu çağırır. Düzenleme kolu `kalipKartHesabi`'ni paylaşır.
- **Form:** müşteri seçilmemişse uyarı; satış yapan firma bloğu, fabrika dışı ön seçimde müşteri seçilmeden de görünür.
- **Sunucu:** `BOLUM_SEKMELERI.partSales` += "dealers".
- **Sürüm notu metni (C5, yayında kullanılacak):** "Bayi veya anlaşmasız bir firma aracılığıyla satılan Extra Kalıpların ödenmemiş
  bedeli artık yalnız o firmanın borcu olarak görünür; müşteri bu bedelden dolayı borçlu listelerinde yer almaz. Bu nedenle bazı
  müşteriler borçlu listelerinden çıkabilir; toplam alacak değişmez. Ücretsiz işaretli kalıplar hiçbir yerde borç sayılmaz.
  Bayi kartına 'Bayi Aracılığıyla Kalıp Satışı' düğmesi eklendi."
- **Görsel kanıt:** K12 gereği alınmadı.

## 8. Düzeltme turu 1 (2026-09-24, birleşmeden önce gerçek kullanımda bulundu; spec R2, R16, AC-19, AC-20)

- **Bulgu:** geçmişi olmayan düz bayide modal dar varyantta (520 px) açılıyordu; dördüncü buton ("Bayi Aracılığıyla Kalıp Satışı")
  eklenince eylem satırı taşıp "Yedek Parça Satışı"nı modalın dışına itiyordu (tıklanamıyordu).
- **Düzeltme:** dar varyant 760 px (dört buton, etiketler kısaltılmadan tek satır); eylem satırına `flexWrap: "wrap"` (hiza yine sağ).
  Yalnız genişliği artırmak **dar pencerede yetmiyor**: modal pencereyle daraldığında satır yine taşıp ilk butonları kırpıyordu; bu,
  satır kayması olmadan çalıştırılarak testte gösterildi (700 ve 480 px'de FAIL).
- **Test:** `tests/bayi-modal-layout.test.js` + `scripts/tests/bayi-modal-layout.cjs` + `scripts/tests/layout/bayi-modal.*`: gerçek
  `SimpleDealers` + `ui.css` vite ile paketlenir, Electron'da 1280/900/700/480 px pencerede dört ve üç butonla ölçülür (taşma,
  kesik etiket, tıklanabilirlik, 900 px ve üstünde tek satır, sağa yaslı hiza). jsdom yerleşim hesaplamadığı için Electron testi
  (CI `electron` işi, `ELECTRON_TESTLERI`). Eski kodda 1280 px'de bile FAIL verdiği görüldü.
- **SCORECARD notu (0007 kapanırken):** birleşmeden önce yakalandığı için "kaçan hata" değil, **düzeltme turu 1** sayılır.
