# 0016 Uygulama Planı: Liste, Boş Durum ve Uyarı Birliği

| | |
|---|---|
| **Bağlı spec** | `specs/done/0016-liste-bos-durum-ve-uyari-birligi.md` (R3, plan onayıyla onaylandı) |
| **Durum** | Tamamlandı. 2026-09-25: G1–G14 ve H1–H9 kullanıcı tarafından onaylandı; spec R3, R4, R5 ile güncellendi; Aşama 1 commit `d749f0a`, Aşama 2 commit `745a028` (dal `feat/0016-liste-bos-durum`, push ve sürüm yok). SCORECARD dolduruldu, spec ve plan `specs/done/`'a taşındı (§9). |
| **Önkoşul** | 0009 (sözlük), 0011 (serbest içerik, kanıt eşlemesi), 0014 (taban raporu yöntemi), 0015 (dal tabanı) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar G1–G14) içerir. Envanter Ek A'dadır.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu |
|---|---|
| `BosDurum` | `baslik`, `metin`, `eylemler`, `testId`. Açıklama satırı **her zaman** çiziliyor (`metin` boşken de boş bir `div`). Tek kullanıcısı Giderler; orada `metin` hep dolu. |
| `UyariSeridi` | Üç aile: bilgi, uyari, basari. **Kırmızı aile yok** (sözlük: "Hata (kırmızı) ailesi yoktur"). Kapsamda dört kırmızı mesaj kutusu var (Ek A.2). |
| `KartBolum` kart | Başlık `etiket` (12 punto gri büyük harf) ya da `baslik` (15 punto koyu + `altBaslik`). **Katlanma yalnız `ayar` varyantında.** Kap bir `div`. |
| Tablo boşken | Müşteriler (`Customers.jsx:619`), Bayiler (`SimpleDealers.jsx:425`) ve Makina Stoğu (`MakinaStokTab.jsx:213`) boş metni tablonun **altına** koyuyor; tablo ve başlık satırı boşken de çiziliyor. Evrak, Notlar, Parça Stoğu, Üretim zaten tablonun yerine koyuyor. Finans'ta boş durum tablo içi satır (`<tr><td colSpan>`). |
| `Pagination` | `total` 0 iken hiçbir şey çizmez (`ui.jsx:428-430`). Tablo kalkınca sayfalama zaten görünmüyor; X6 etkilenmez. |
| Ayrım bugün | Var: Evrak (teklif/proforma ve fatura), Notlar, Makina Stoğu, Parça Stoğu, Yedek Parça Satışı (üç durum), Müşteri dosyaları. Yok: Müşteriler, Bayiler, bayi detayı, Finans, Analiz. |
| Analiz testleri | `analiz.test.jsx:99,123,131,143` kutuları başlıktan `closest("section")` ile buluyor; `:140-144` `within(panel).getByText("Veri yok.")`; `:154` boş aralık metnini desenle arıyor. Kutular `<section>` kalmalı (C3). |
| Tablo sorgulayan testler | `suzgec-musteri-bayi` (`tbody tr`), `customers-giris-no`, `customers-fiyat-sutunlari` (`thead th`); hepsi dolu listeyle çalışıyor, tablo boşken kaldırılınca etkilenmez. |
| Metin sorgulayan testler | Kapsamdaki boş durum metinlerinden yalnız Analiz'in "Veri yok." ve boş aralık metni sorgulanıyor; gruplu görünüm şeridi `suzgec-musteri-bayi:72,74` ve `uyari-seridi-serbest:23,49` ile (tam `textContent`). |
| `tasarim-kaynak` | `data-testid={testId}` sayısı 4 sabit; `role="status"` yalnız listeli gider dosyalarında; `1.5px dashed …` boş durum stili KAPSAM dosyalarında yasak. `tasarim.test` AC-16 tanımsız aile için `"kirmizi"` kullanıyor, yeni bir `hata` ailesiyle çakışmaz. |

---

## 1. Mimari özet

- **Boş durum:** kayıt bulunmayan her liste `BosDurum` çizer, tablo ve başlık satırı hiç çizilmez (R1). Ayrım bugün varsa iki
  (ya da üç) başlık korunur; yoksa tek metin başlık olur (R2). Müşteriler ayrım kazanır (R6). Kutuda düğme yok (C6).
- **Uyarı:** mesaj niteliğindeki satır içi renkli kutular `UyariSeridi`'ye geçer, metin aynı (R4). Mesaj olmayan renkli
  kutular (kimlik etiketi, özet paneli, düğmeli şerit) dokunulmaz ve sözlükte borç olarak yazılır (G5).
- **Bölüm:** liste kapları ve okuma bölümleri `KartBolum` `kart` ile çerçevelenir (R5); detay bölümleri `baslik`, liste
  ekranı üstündeki kartlar `etiket` başlığı (R9, G8).
- **İki aşama (R8, G2):** Aşama 1 = müşteri detay modalı **dışında** her şey (Müşteriler listesi dahil). Aşama 2 = müşteri
  detay modalı ve `customers/detail/`. Her aşama ayrı commit, ayrı kanıt ve ayrı AC-11 onayı.

---

## 2. Değişecek ve eklenecek dosyalar

### Sözlük

| Dosya | Değişiklik |
|---|---|
| `src/components/tasarim.jsx` | `BosDurum`: `metin` boşsa açıklama satırı çizilmez (G1). `UyariSeridi`: `hata` ailesi (G4). Aşama 2: `KartBolum` `kart` varyantına katlanma ve başlık yanı eylem yuvası (G10). |
| `docs/tasarim-sozlugu.md` | BosDurum ne zaman/ayrım kuralı; `hata` ailesi; liste kabı olarak `KartBolum`; bilinen borç güncellemesi |

### Aşama 1

| Dosya | Değişiklik |
|---|---|
| `Customers.jsx` | Liste kabı `KartBolum`; boşken tablo yok, `BosDurum` iki durumlu (R6, G3); gruplu görünüm şeridi `UyariSeridi` serbest içerik (0011'in ilk kullanımı) |
| `SimpleDealers.jsx` | Liste kabı; "Bayi bulunamadı." kutuya; bayi detayındaki üç geçmiş bölümü `KartBolum` `baslik` + boş durumları (AC-10) |
| `stock/MakinaStokTab.jsx`, `stock/PartStokTab.jsx`, `stock/YedekParcaSatisTab.jsx`, `stock/UretimFormu.jsx` | Liste kapları, boş durumlar (ayrımlar korunur), Parça Stoğu'nun iki stok mesajı ve Üretim'in "dönem sonlandırılmış" mesajı `UyariSeridi` |
| `Finance.jsx` | "Veri yok" / "Kayıt bulunamadı" tablo içi satırları kutuya (G6); başlıklı tablo kartları `KartBolum` `etiket` |
| `Documents.jsx` | Teklif/proforma ve fatura liste kapları, boş durumlar (ayrım korunur) |
| `Notes.jsx` | Liste kabı, "Eşleşen not yok." / "Henüz not yok…" kutuya; "Not seçilmedi" kartı `BosDurum` (G11) |
| `Analiz.jsx` | Kutular `KartBolum` (dış `<section>` korunur, G9); `S.bos` metinleri ve boş aralık kutusu `BosDurum` |

### Aşama 2

| Dosya | Değişiklik |
|---|---|
| `customers/CustomerDetailModal.jsx` | Görüşmeler bölümü, "Maliyet ve Kâr" dışındaki okuma bölümleri `KartBolum` `baslik`; "Henüz görüşme kaydı yok." kutuya; Yeni Sahip penceresindeki iki mesaj `UyariSeridi` |
| `customers/detail/MachineTimeline.jsx`, `CustomerFilesSection.jsx`, `OwnershipSection.jsx`, `PaymentSection.jsx` | Bölüm çerçevesi ve boş durum (AC-9); dosyaların çevrimdışı uyarısı ve ödemenin farklı para birimi uyarısı `UyariSeridi` |

### Kanıt ve test

| Dosya | Değişiklik |
|---|---|
| `scripts/evidence/0009-sayfa.jsx` | DoD ekran anahtarları + G7'deki ekler |
| `docs/evidence/0016-*`, `kanit-eslemesi.json` | Aşama başına önce/sonra raporu, `degisti` kayıtları; `done`'da taban raporu |
| `tests/fixtures/0016-bos-durum-metinleri.json` | Dönüşümden önce yakalanan boş durum ve uyarı metinleri (dosya → metinler) |
| Testler (yeni) | bkz. §5 |
| `CLAUDE.md` | Sözlük satırı |

---

## 3. Adım sırası

1. **Dal:** `feat/0015-form-birligi` ucundan `feat/0016-liste-bos-durum`.
2. **Envanter** (kod değişmeden): Ek A'nın yeniden taranması, metin fixture'ı.
3. **Davranış testleri önce, eski kodda yeşil** (0014/0015 yöntemi): her ekranda hangi durumda hangi boş metin çıkıyor, liste
   içeriği, sırası, sayfalaması ve süzgeci. Mevcut `suzgec-*`, `sekme-stok-evrak`, `analiz` testleri gate'e alınır.
4. **Önce görüntüleri:** ekran anahtarları düzeneğe eklenir, kararlılık ölçülür, çekim yapılır.
5. **Sözlük:** `BosDurum` isteğe bağlı açıklama, `UyariSeridi` `hata` ailesi, birim ve kontrast testleri. Giderler'in bütün
   ekranları 0 fark olmalı (BosDurum değişikliğinin kanıtı).
6. **Aşama 1 ekranları**, en küçükten: Notlar → Evrak → Stok (dört alt sekme) → Finans → Analiz → Bayiler (liste + detay) →
   Müşteriler listesi. Her birinden sonra o ekranın testleri.
7. Kaynak taramaları, tam paket, görüntüler, **AC-11 onayı (Aşama 1)** → `degisti` kayıtları → **Aşama 1 commit'i** (siz
   söyleyince).
8. **Aşama 2:** önce görüntüleri (müşteri detayı), sözlük eki (G10), detay bölümleri, testler, görüntüler, AC-11 onayı →
   **Aşama 2 commit'i**.
9. `done`: taban raporları, kayıtlar `ayni`, SCORECARD.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**G1. Müşteriler dışındaki ekranların açıklama satırı yok (R6 ↔ X3).**
R6 "altına kısa bir açıklama satırı eklenir; açıklamalar bu spec'te ekran ekran sabitlenir" diyor, ama yalnız Müşteriler'in
açıklaması yazılı.
*Öneri:* diğer ekranlarda açıklama **eklenmez**; `BosDurum`'un açıklama satırı isteğe bağlı olur (boşsa çizilmez). Bugünkü
metin iki cümleyse ("Henüz not yok. 'Yeni Not' ile başlayın.") ilk cümle başlık, kalanı açıklama olur; **yeni kelime yok**.
*Gerekçe:* X3 yeni metni yasaklıyor, geliştiricinin metin yazması da R6'ya aykırı. Cümle bölmek metni değiştirmez.
Giderler her zaman açıklama verdiği için görünümü değişmez (0 fark kanıtı).

**G2. "İki PR" bu depoda.**
Push ve PR akışı yok; teslim dal üzerinde commit.
*Öneri:* R8'in iki PR'ı = aynı dalda iki ayrı commit, her biri kendi kanıtı ve AC-11 onayıyla; ikisi bitmeden `done` yok.
*Gerekçe:* R8'in amacı (gözden geçirilebilir boyut, ayrı onay) korunur.

**G3. Müşteriler'de "hiç kayıt yok" açıklaması yazılı değil.**
R6: "yeni müşteri eklemeye yönlendiren kısa bir cümle".
*Öneri:* "Yeni müşteri eklemek için “Yeni Müşteri” düğmesini kullanın." Metni sizin (ya da analistin) onaylaması gerekiyor.
"Hiç kayıt yok" = canlı müşteri listesi boş; arama **veya süzgeç pili** sonucu boşsa "Müşteri bulunamadı." (R6 ikisini birlikte sayıyor).
*Gerekçe:* geliştirici metin yazmamalı (R6); sabitlenmeden kodlanamaz.

**G4. Kırmızı mesajlar için şeritte aile yok (R4 ↔ sözlük).**
Kapsamda dört kırmızı mesaj var: Parça Stoğu "n parça tükendi", müşteri ödeme bölümünün farklı para birimi borç uyarısı,
Yeni Sahip penceresindeki devir borç uyarısı (Aşama 2) ve bayi detayının borç paneli (G5'e göre mesaj değil).
*Öneri:* `UyariSeridi`'ye **`hata`** ailesi eklenir (`red700`/`redBg`/`redBr`/`red800`), sözlüğe yazılır; alan hatası yine `HataMetni`.
*Gerekçe:* C2 sözlüğe eklemeye izin veriyor. Kırmızıyı amber `uyari`'ya çevirmek anlamı düşürür; borç olarak bırakmak R4'ü karşılamaz.

**G5. Hangi renkli kutu "mesaj"?**
49 renkli zeminli satırın çoğu rozet, düğme ya da vurgulu satır.
*Öneri:* 0015 Ek A yöntemi: adlandırılmış liste (Ek A.2). Mesaj **değil** sayılanlar ve gerekçeleri:
- bayi detayındaki "🏭 FABRİKA — Ana üretici" / "ANLAŞMALI SERVİS" şeritleri: kayıt türü etiketi;
- bayi borç paneli: tutar ve kayıt listesi taşıyan özet;
- Evrak "CRM'e Kaydet" bandı: düğme taşıyor (0011: serbest içerik düzen kapısı değil).

Bunlar sözlükte bilinen borç olarak yazılır.
*Gerekçe:* ölçülemez "renkli kutular şeride" kuralı ancak listeyle denetlenir.

**G6. Finans kapsamda mı?**
Başlık tablosu ve R10'un "yedi ekran"ı Finans'ı sayıyor, DoD'nin ekran anahtarlarında Finans yok.
*Öneri:* dahil. Model Bazlı ve Satış Yapan Bazlı tablolarının "Veri yok" satırı ve Anlaşmalı/Kredi Kartı pencerelerinin
"Kayıt bulunamadı" satırı kutuya geçer, tablo boşken çizilmez; ek ekran anahtarı `finans-bos`.
*Gerekçe:* "yedi ekran" ancak Finans'la yedi eder; anahtar eksiği DoD'deki bir unutma gibi duruyor.

**G7. Ek ekran anahtarları.**
`stok-bos` tek anahtar ama Stok'un dört alt sekmesinin dördünün de boş durumu var.
*Öneri:* `stok-bos` (makina) + `stok-bos-parca`, `stok-bos-yedek`, `stok-bos-uretim`; `finans-bos` (G6); aramalı boş
hâller için `evrak-bos-arama`, `notlar-bos-arama`; uyarılar için `stok-parca-uyari`, `bayi-detay`. Giderler ekranları
aynı rapora 0 fark beklentisiyle girer (G1).
*Gerekçe:* C7 her dönüştürülen ekranın görüntü aracında olmasını istiyor.

**G8. Hangi kart hangi başlığı alır (R9)?**
*Öneri:* bugünkü başlıklara göre:
- Finans'ın başlıklı tablo kartları (13 punto gri) → `etiket`;
- Analiz kutuları (15.5 punto koyu, liste değil, rapor kutusu) → **`baslik`**, sağdaki kısa ipucu (`S.hint`) `altBaslik`'e iner;
- detay bölümleri (bayi ve müşteri) → `baslik`;
- başlıksız liste kapları (tablo sarmalayıcıları) → başlıksız `kart`, `style={{ padding: 0, overflow: "auto" }}`.

*Gerekçe:* R9 "liste üstündeki kartlar etiket" diyor. Analiz'i etiket yapmak koyu rapor başlıklarını küçük gri büyük harfe
çevirir; Analiz bir liste değil, rapor ekranı. Karar sizde; ters karar yalnız `baslikStili` değişikliğidir.

**G9. Analiz testleri `<section>` arıyor.**
*Öneri:* her kutu ızgara hücresi olarak düz bir `<section style={{ gridColumn }}>` kalır, içinde `KartBolum`
(`style={{ height: "100%" }}`, satırdaki kutular eşit boyda kalsın). Test dosyasına dokunulmaz.
*Gerekçe:* C3. `KartBolum`'a element seçeneği eklemek sözlüğü yalnız bir test için genişletir.

**G10. Müşteri detayının katlanan bölümleri (Aşama 2).**
Görüşmeler ve Dosyalar katlanıyor, Makina Geçmişi başlığının yanında düğmeler var; `KartBolum` `kart` ikisini de desteklemiyor.
*Öneri:* Aşama 2'de sözlüğe iki ek: `kart` varyantına `collapsible`/`defaultOpen` (`ayar`'daki mekanik) ve başlık satırının
sağına `eylemler` yuvası. Aşama 2 başlarken kısa bir plan eki (dosya:satır envanteri) sunarım.
*Gerekçe:* yerel başlık bloğu bırakmak AC-6'yı karşılamaz; ekrana özel varyant C2 ile yasak.

**G11. Notlar'daki "Not seçilmedi" kartı.**
Kayıt yokluğu değil seçim yokluğu, ama bugün zaten başlık + açıklama biçiminde.
*Öneri:* `BosDurum` olur (metinler aynı; 📝 simgesi düşer). *Gerekçe:* ekranın ikinci bir "boş kutu" görünümü kalmasın.

**G12. "Tablo çizilmez" yeni davranış mı (R1 ↔ C1)?**
*Öneri:* görünüm değişikliği sayılır; liste mantığına dokunulmaz, yalnız çizim koşulu değişir. Sayfalama zaten 0'da yok.
Yeni test bunu dönüşümden sonra ayrıca doğrular.

**G13. Büyük boş kutunun dar yerlerde görünümü.**
`BosDurum` 32 piksel dolgulu kesikli kutu; Notlar'ın dar liste paneli ve bayi detayının bölümleri içinde iri durabilir.
*Öneri:* bileşen değişmez; karar görüntüde (AC-11). *Gerekçe:* boyut varyantı yeni yapı taşı sorusu.

**G14. Bilinen borç ve test istisnası.**
`tasarim-kaynak` AC-18 borç listesinde yazılı adları arıyor (ör. "Customers.jsx"). Customers'ın gruplu şeridi ödenirse ad yine
"Firmaya Göre Grupla" borcu için listede kalır; bu yüzden test istisnası **beklemiyorum**. Çıkarsa 0015'teki gibi size sorarım.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>`. "Davranış testi" = eski kodda yeşil yazılıp sonra da yeşil kalan test.

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `tests/liste-kaynak.test.js` + `ui/bos-durum.test.jsx` | Fixture'daki her boş metin aynı dosyada bir `<BosDurum` öğesinin `baslik`/`metin`'i içinde; kapsam dosyalarında `textAlign: "center", color: "var(--n400` boş satır kalıbı yok; boş listede `table` ve `thead` yok |
| AC-2 | `ui/bos-durum.test.jsx` (davranış) | Ayrımlı ekranlarda iki durum iki metin; ayrımsızlarda tek metin; Müşteriler'de yeni ayrım (bu tek yeni-kod testi) |
| AC-3 | aynı | Hangi durumda hangi başlığın çıktığı eski kodla aynı (Evrak, Notlar, Stok üç sekme, müşteri dosyaları) |
| AC-4 | aynı | Her boş durum kutusunda (`testId`'li) düğme sayısı 0 |
| AC-5 | `tests/liste-kaynak.test.js` + `ui/uyari-seritleri.test.jsx` (davranış) | Ek A.2 listesindeki metinler `<UyariSeridi` içinde, metin aynı, `role="status"`; kapsam dosyalarında listede olmayan mesaj kutusu kalıbı yok |
| AC-6 | `tests/liste-kaynak.test.js` | Ek A.3'teki bölümler `KartBolum` ile, başlık biçimi G8'e göre; kapsam dosyalarında yerel büyük harfli bölüm başlığı yalnız adlandırılmış istisnalarda |
| AC-7, AC-8 | mevcut `suzgec-musteri-bayi`, `sekme-stok-evrak`, `suzgec-notlar`, `analiz` + `ui/bos-durum.test.jsx` | Sıra, sayfa, süzgeç ve arama sonuçları eski kodla aynı |
| AC-9 | `ui/musteri-detay-bolumler.test.jsx` (Aşama 2, davranış) | Geçmiş, ödeme, dosya, görüşme bölümleri boşken kutu; doluyken olay sırası ve özetleri eskiyle aynı |
| AC-10 | `ui/bayi-detay-bolumler.test.jsx` (davranış) | Servis, yedek parça, Extra Kalıp bölümleri boşken kutu; doluyken sıra ve sayfa aynı |
| AC-11 | `tests/liste-kontrast.test.js` + görüntü | `hata` ailesi ve `BosDurum` başlığı karanlıkta 0009 ölçüsüyle; iki temada önce/sonra, karar sizde (aşama başına) |
| AC-12 | tam paket | `git diff --name-status -- tests` yalnız yeni dosyalar |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| G1 | Diğer ekranlarda açıklama | Eklenmez; açıklama satırı isteğe bağlı; iki cümleli metin bölünür |
| G2 | İki PR | Aynı dalda iki commit, aşama başına kanıt ve onay |
| G3 | Müşteriler "hiç kayıt yok" açıklaması | "Yeni müşteri eklemek için “Yeni Müşteri” düğmesini kullanın." (onayınız) |
| G4 | Kırmızı mesajlar | `UyariSeridi`'ye `hata` ailesi |
| G5 | Mesaj sınıflaması | Ek A.2 listesi; kimlik etiketi, özet paneli, düğmeli bant borç |
| G6 | Finans | Kapsamda, `finans-bos` anahtarı |
| G7 | Ekran anahtarları | DoD + stok alt sekmeleri, aramalı boş hâller, uyarılar |
| G8 | Başlık biçimi | Finans `etiket`, Analiz ve detaylar `baslik`, tablo kapları başlıksız |
| G9 | Analiz `<section>` | Dış `<section>` kalır, içinde `KartBolum` |
| G10 | Katlanan bölümler | Aşama 2'de `kart`'a katlanma + eylem yuvası; Aşama 2 başında plan eki |
| G11 | "Not seçilmedi" | `BosDurum` |
| G12 | Tablo boşken | Çizilmez; görünüm değişikliği sayılır |
| G13 | Kutu boyutu | Değişmez; görüntüde karar |
| G14 | Test istisnası | Beklenmiyor; çıkarsa sorulur |

## 7. Uygulama notları (Aşama 1, 2026-09-25)

- **Davranış testleri önce, eski kodda yeşil:** `ui/bos-durum` (14), `ui/bayi-detay-bolumler` (3), `ui/uyari-seritleri` (2).
  Dönüşümden sonra aynı dosyaya yeni davranış denetimleri eklendi (Müşteriler ayrımı, boşken tablo yok, kutuda düğme yok).
  Metinler cümle cümle desenle sorgulanıyor; G1'deki cümle bölme bu yüzden testleri kırmadı.
- **Fixture:** `tests/fixtures/0016-metinler.json` dönüşümden önceki metinleri tutuyor. Envanterde eksik kalan iki metin
  (Analiz "Parça yok.", Kalıp Üretim'in ikinci cümlesi "\"Yeni Form\" ile başlayın.") uygulama sırasında bulundu ve
  eklendi; ikisi de dönüşümden önce kodda vardı.
- **Kalıp Üretim** boş durumunda bugün bir simge ve iki satır vardı; simge düştü, iki cümle başlık ve açıklama oldu. "Dönem
  sonlandırılmış" mesajı şeridin başlık biçiminde (serbest içerik yalnız cümle içi vurgu için).
- **Finans** kart başlıkları `etiket` biçiminde; başlığın içindeki gri ek ("(gelir ≈ TL)") büyük harfe dönmesin diye
  `textTransform: "none"` taşıyor. Tablo, kartın dolgusu içinde duruyor (başlık dolgusuz kalmasın).
- **Analiz** kutularında ipucu (`S.hint`) `altBaslik` oldu; kutu içi boş durumlar kesikli kutu. Kalıp kutularının mavi
  kenarlığı düştü (kartın `style`'ı yalnız yerleşim içindir). Yerel `S.panel/phead/h2/hint/bos` kaldırıldı.
  **Erişilebilirlik:** kutu başlıkları `h2` idi, `KartBolum` `div` çiziyor; sözlükte borç olarak yazıldı.
- **Üçüncü C3 istisnası (spec R4, TY onayı):** `form-kaynak.test.js`'in (0015) bayi büyük harf sayısı 5 → 2. 0015 dersindeki
  "borcun var olmasını kilitleyen testleri baştan tara" uyarısı bu kez de yakalanmadı; plan §4'e (G14) yazılan tarama yalnız
  `tasarim-kaynak`'ı kapsamıştı.
- **Görüntü ortamı:** ilk "önce" çekimi macOS'un kaydırma çubuğu durumu farklıyken yapıldı; tam boy ekranlarda (Giderler,
  Ayarlar) çubuk görünüyordu ve koddan bağımsız fark üretti. Kaynak değişiklikleri geri alınarak "önce" yeniden çekildi
  (`once2`), karşılaştırma onunla yapıldı: Giderler ve Ayarlar ekranları 0 fark (BosDurum değişikliğinin kanıtı).
- **Kanıt:** `docs/evidence/0016-piksel-raporu.json` + 56 JPEG (28 ekran × 2 tema). Değişen ekranların kayıtları `degisti` +
  `Takım Yöneticisi · 2026-09-25 · spec 0016 AC-11`; Giderler ve Stok yedek parça süzgeç ekranları `ayni`. Form ekranlarının
  (0015) arkasındaki liste de değiştiği için o görüntüler de farklı; 0015 kayıtları kendi taban raporunu gösterdiği için etkilenmez.
- **Son durum:** 205 dosya, 2215 test (tek kırmızı işten bağımsız tarih bombası `makina-odeme`), lint 0 hata, build başarılı.
  `git diff --name-status -- tests`: yeni dosyalar + `form-kaynak.test.js` (R4 istisnası).

## 8. Uygulama notları (Aşama 2, 2026-09-25)

- **Davranış testi önce, eski kodda yeşil:** `ui/musteri-detay-bolumler` (9): başlıklar ve sayılar, olay sırası (olaylar
  **eskiden yeniye**; test ilk yazımda ters varsayıyordu, eski koda göre düzeltildi), katlanma (tıklama, görüşme odağı),
  başlık yanı düğmeler, boş metinler, mesaj metinleri. Dönüşümden sonra 3 denetim eklendi (düğmesiz boş kutular, H2 yazımı,
  mesaj aileleri). Türkçe "İ/ı" yüzünden `/i` bayrağı kullanılamadı; iki yazım alternatifle kabul edildi.
- **Sözlük eki (B.4):** `KartBolum` `kart` varyantına katlanma (iç ya da denetimli `acik`/`onAcikDegis`) ve `eylemler`.
  `tasarim-kaynak` bileşenlerdeki `data-testid={testId}` sayısını 4'e sabitlediği için yeni kol ayrı kap değil, mevcut tek
  kabı kullanıyor; ayar varyantının yerel `acik` değişkeni `ayarAcik` oldu (yeni özellikle çakışıyordu). Yeni özellikler
  verilmediğinde `baslik` çıktısı değişiklik öncesiyle birebir (birim testi).
- **Görüşmeler** denetimli: `acik={gorusmelerAcik || !!gorusmeForm}`, tıklama bugünkü gibi `gorusmelerAcik`'i çevirir.
  "takip bekliyor" rozeti başlığın içinde. **Dosyalar** kendi `acik`'ini verir (süzgeç `useEffect`'i aynen açar); kap `div`'i
  `ref` için kalır. **Makina Geçmişi** ikonsuz, "n olay" alt başlık. **Sahiplik Geçmişi** beyaz kart.
- **Mesajlar:** farklı para birimi borcu şeridin başlık biçiminde (vurgu yok); çevrimdışı dosya uyarısı ve Yeni Sahip'in iki
  mesajı serbest içerik (cümle içi kalın parçalar). Kaynak taramasında React parçası kapanışı `</>` öğe kapanışı sanılıyordu;
  yardımcı düzeltildi.
- **Adlandırılmış istisna:** detay penceresindeki "Sandık Etiketi" formunun üç büyük harf başlığı (form; sözlükte borç).
- **Görüntü aracı:** Aşama 2'nin ilk "önce" çekiminde kaydırma çubuğu durumu yine değişti (bu kez tersine; pencere içi kaydırma
  çubukları da). Araca Electron'un `hide-scrollbars` anahtarı eklendi (`0009-ekran.cjs`; adı ve öneki değişmedi, C7); çekim
  artık ortamdan bağımsız: iki ardışık çekim 182/182 ekranda 0 fark. Önceki çekimlerle karşılaştırılmaz; Aşama 2'nin önce/sonra
  görüntüleri bu anahtarla çekildi.
- **Kanıt:** `docs/evidence/0016-asama2-piksel-raporu.json` + 14 JPEG. Müşteri detayını gösteren 6 ekran değişti (detayın
  üstünde açılan servis ve kalıp formları dahil); 176 diğer ekran 0 fark. Kayıtlar `degisti` + TY onayı; `done`'da
  `0016-taban` raporuyla `ayni`ye çevrilecek (Aşama 1 ve 2 birlikte).
- **Son durum:** 206 dosya, 2247 test (tek kırmızı işten bağımsız tarih bombası `makina-odeme`), lint 0 hata, build başarılı.
  `git diff --name-status -- tests` (Aşama 2): yeni dosyalar + bu işin kendi testleri (`liste-kaynak`, `sozluk-0016`, fixture).

## 9. Done'a taşıma (2026-09-25, AC-11c)

- İki aşamanın 34 `degisti` kaydı `ayni`'ye çevrildi, `onay` alanları kaldırıldı.
- Onaylanan yeni görünümü taban alan **`0016-taban-piksel-raporu.json`** üretildi: bugünkü kod, Aşama 2'nin onaylı "sonra"
  çekimiyle (`hide-scrollbars`, iki aşamanın kodu) karşılaştırıldı; 182 ekranın hiçbirinde fark yok. Rapor kayıtlı 28 ekranı
  (× 2 tema) taşıyor; yan yana JPEG'ler `docs/evidence/0016-taban-*.jpg`.
- Aşama 1'in onaylı görüntüleri (`0016-*`) aracın kaydırma çubuğu anahtarından önce çekildi; taban, aynı kodun anahtarla
  çekilmiş görüntüsüdür (kod aynı, yalnız çekim ortamı sabitlendi). Önce/sonra raporları (`0016-*`, `0016-asama2-*`) kanıt
  olarak kalıyor.

---

## Ek A. Envanter (2026-09-25, dönüşüm öncesi satır numaraları)

### A.1 Boş durumlar

| Yer | Bugünkü metin | Ayrım | Aşama |
|---|---|---|---|
| `Customers.jsx:619` | Müşteri bulunamadı. (tablonun altında) | yok → R6 ile kazanılır | 1 |
| `SimpleDealers.jsx:425` | Bayi bulunamadı. (tablonun altında) | yok | 1 |
| `SimpleDealers.jsx:556, 642, 685` | Kayıt bulunamadı. (bayi detayı, üç bölüm) | yok | 1 |
| `stock/MakinaStokTab.jsx:213` | Stokta makina yok. / Aramanıza uyan makina yok. (tablonun altında) | var | 1 |
| `stock/PartStokTab.jsx:159, 236` | Henüz yedek parça tanımı yok. Ayarlar → Yedek Parça'dan ekleyin. / Arama sonucu bulunamadı. | var | 1 |
| `stock/YedekParcaSatisTab.jsx:322` | Aramanıza uyan satış yok. / Tahsisi eksik satış yok. / Henüz yedek parça satışı yok. "Yeni Satış" ile ekleyin. | var (üç) | 1 |
| `stock/UretimFormu.jsx:497` | Henüz üretim formu oluşturulmadı. | yok | 1 |
| `Finance.jsx:673, 694` | Veri yok | yok | 1 |
| `Finance.jsx:736, 774` | Kayıt bulunamadı (Anlaşmalı, Kredi Kartı pencereleri) | yok | 1 |
| `Documents.jsx:862, 972` | Henüz teklif/proforma yok. / Henüz fatura yok. / Arama sonucu bulunamadı. | var | 1 |
| `Notes.jsx:139` | Eşleşen not yok. / Henüz not yok. 'Yeni Not' ile başlayın. | var | 1 |
| `Notes.jsx:194` | Not seçilmedi / Soldan bir not seçin… (G11) | yok | 1 |
| `Analiz.jsx:343` | Seçili tarih aralığında analiz edilecek servis, yedek parça veya kalıp kaydı yok. | yok | 1 |
| `Analiz.jsx:356, 389, 401, 415, 419, 428, 442, 475, 484, 493` | Parça hareketi yok. / Servis kaydı yok. / Veri yok. / Bu aralıkta kalıp yok. | yok | 1 |
| `customers/CustomerDetailModal.jsx:896` | Henüz görüşme kaydı yok. | yok | 2 |
| `customers/detail/MachineTimeline.jsx:84` | Bu makinaya ait kayıt bulunmuyor. | yok | 2 |
| `customers/detail/CustomerFilesSection.jsx:132` | Bu kayda ait dosya yok. / Henüz dosya yok. PDF, resim… | var | 2 |

**Değil:** form içi boş satırlar (`UretimFormu.jsx:375` üretim formu düzenleyicisi, `Documents.jsx:1308` Evrak formu,
`MakinaStokTab.jsx:287` stok formu; 0015'in konusu), `Documents.jsx:949` özet penceresindeki meta satır, "tarih yok" / "Model yok"
gibi hücre içi yer tutucular, Ayarlar ve Giderler (X5; Giderler zaten `BosDurum`).

### A.2 Mesaj kutuları

| Yer | Metin (baş) | Aile | Aşama |
|---|---|---|---|
| `Customers.jsx:493` | Firmaya göre gruplu görünüm: **n firma** … | bilgi (serbest içerik) | 1 |
| `stock/PartStokTab.jsx:136` | {n} parça tükendi | hata (G4) | 1 |
| `stock/PartStokTab.jsx:141` | {n} parçada stok azaldı (5 veya altı) | uyari | 1 |
| `stock/UretimFormu.jsx:341` | Bu dönem sonlandırılmış. Düzenleyebilir ama yeni kalıp ekleyemezsiniz. | uyari | 1 |
| `customers/detail/PaymentSection.jsx:57` | Ayrıca farklı para biriminden ödenmemiş … borcu var … | hata | 2 |
| `customers/detail/CustomerFilesSection.jsx:120` | Sunucu bağlantısı yok: dosya listesi görünür ama **ekleme, açma ve indirme** … | uyari (serbest içerik; ⚠ simgesi düşer) | 2 |
| `customers/CustomerDetailModal.jsx:1094` | Mevcut sahip **sahiplik geçmişine** taşınacak … | bilgi (serbest içerik) | 2 |
| `customers/CustomerDetailModal.jsx:1099` | Bu makinenin devredilmeden önce **…** ödenmemiş bakiyesi var … | hata (serbest içerik) | 2 |

**Değil (borç):** `SimpleDealers.jsx:439, 444` kayıt türü etiketi, `SimpleDealers.jsx:454` borç özet paneli,
`Documents.jsx:824` "CRM'e Kaydet" bandı (düğmeli). Rozet, hap ve düğme stilleri (kalan ~40 satır) mesaj değil.

### A.3 Bölümler

| Yer | Bugün | Olacak | Aşama |
|---|---|---|---|
| `Customers.jsx:502`, `SimpleDealers.jsx:365`, `stock/MakinaStokTab.jsx:185`, `stock/PartStokTab.jsx:162`, `Documents.jsx:861, 968`, `Notes.jsx:136`, `stock/UretimFormu.jsx:501` | tablo/liste kapları (gölgeli ya da kenarlıklı, başlıksız) | başlıksız `kart` | 1 |
| `Finance.jsx:659, 678` | Model Bazlı Satış, Satış Yapan Bazlı (13 punto gri) | `kart` + `etiket` | 1 |
| `Finance.jsx:644` | Son 12 Ay Satış Geliri Trendi | `kart` + `etiket` | 1 |
| `Analiz.jsx:353-437, 473-497` | 10 kutu (`S.panel` + `S.h2`) | `<section>` + `kart` + `baslik` (G8, G9) | 1 |
| `SimpleDealers.jsx:551, 637, 680` | Servis Geçmişi (n), Yedek Parça Geçmişi (n), Sattığı Extra Kalıplar (n) (çerçevesiz büyük harf) | `kart` + `baslik` | 1 |
| `customers/CustomerDetailModal.jsx:857, 1016`, `customers/detail/MachineTimeline.jsx:72`, `CustomerFilesSection.jsx:93`, `OwnershipSection.jsx:15` | Görüşmeler, İşlemler, Makina Geçmişi, Dosyalar, Sahiplik Geçmişi | `kart` + `baslik` (G10) | 2 |

**Değil:** özet ve istatistik kutucukları (Finans `AdetCard`/`MultiCard`, Analiz `Tile`, Makina Stoğu model kutucukları,
Parça Stoğu "Dashboard" kutucukları, müşteri ödeme bölümünün üç kartı, bilgi kutucukları): `StatCard` ailesi, sözlükte
`KartBolum` "ne zaman kullanılmaz" maddesi. Yedek Parça Satışı'nın kayıt kartları: liste öğesi. Finans'ın çerçevesiz ara
başlıkları ("Adetler", "Gelir & Tahsilat"): kart değil, sayfa ara başlığı; bugünkü hâliyle kalır. Maliyet ve Kâr kutusu
(`CustomerDetailModal.jsx:994`): Giderler'in bileşeni, gider perdesi arkasında, X5 benzeri kapsam dışı.

---

## Ek B. Aşama 2 plan eki: müşteri detay penceresi (2026-09-25, dönüşüm öncesi satır numaraları)

Aşama 1 commit `d749f0a`. Bu ek Aşama 2'nin dosya:satır envanterini, sözlük ekini (G10) ve yeni kararları (H1–H9) içerir.
Kapsam: `customers/CustomerDetailModal.jsx` okuma bölümleri + "Yeni Sahip" penceresinin iki mesajı, `customers/detail/`
altındaki dört bileşen. Detay penceresinin diğer formları (ödeme, görüşme formu, sahip düzenleme) Aşama 2'nin konusu değil.

### B.0 Kodda doğrulanan dayanaklar

| Konu | Bulgu |
|---|---|
| Katlanan bölümler **dışarıdan açılıyor** | Görüşmeler: `gorusmelerAcik` durumu pencerede (`:443`), Anasayfa odağı (`focusGorusmeId`) açıyor, `gorusme-odak` testi bunu sınıyor. Dosyalar: `acik` bileşende (`CustomerFilesSection.jsx:21`), `dosyaFiltre` gelince `useEffect` açıyor (`:29`). Sözlükteki katlanma ise yalnız iç durumlu (`defaultOpen`). |
| Başlık yanında düğmeler | Görüşmeler "Yeni Görüşme" (`:868`); Dosyalar bağ seçici + "Dosya Ekle"; Makina Geçmişi "Yazdır" / "E-posta Gönder" (`MachineTimeline.jsx:78-80`). `KartBolum`'da başlık yanı yuvası yok. |
| Başlık metnini tam arayan test | `customer-files-section.test.jsx:24` `getByText("Dosyalar (2)")`: başlık öğesinin **kendi metin düğümleri** tam olarak bu olmalı; ok simgesi ayrı öğede kalmalı. |
| Kaynak okuyan testler | Bu beş dosyayı okuyan testler yalnız `kalip-borc-atfi` (fonksiyon adları), `form-kaynak` (yalnız `HataMetni` içe aktarımı), `liste-kaynak` (bu işin). **Borcun var olmasını kilitleyen test yok** (0015/0016 dersi: bu kez işin başında tarandı). |
| Bileşeni tek başına süren testler | `machine-timeline-odak`, `-kk`, `-files`, `dis-firma-servis-kalip` (`MachineTimeline`), `customer-files-section`; pencereyi süren `gorusme-odak`, `taksit-odeme-odak`, `customer-maliyet-kutusu`, `customers-*`. |

### B.1 Bölümler

| Yer | Bugün | Olacak |
|---|---|---|
| `CustomerDetailModal.jsx:808` | "BU FİRMANIN MAKİNALARI (n)" (büyük harfle yazılmış, çerçevesiz; yan gezinme listesi) | `BolumBasligi` (H3), kart yok |
| `:857` | Görüşmeler (n), katlanır, sağda "Yeni Görüşme", başlıkta "takip gecikti" rozeti | `kart` + `baslik`, katlanır (denetimli, H1), eylem yuvası; rozet başlığın içinde |
| `:1000` | "KALIPLAR (n)" (büyük harfle yazılmış), kalıp çipleri | `kart` + `baslik` "Kalıplar (n)" (H2) |
| `:1015` | "İşlemler" (büyük harf, alt çizgili), düğme satırı | `kart` + `baslik` |
| `detail/OwnershipSection.jsx:15` | Sahiplik Geçmişi (amber zeminli kutu) | `kart` + `baslik`; amber zemin düşer, satır renkleri kalır |
| `detail/MachineTimeline.jsx:72` | Makina Geçmişi (ikon + "n olay" hapı, gri zemin), sağda Yazdır / E-posta | `kart` + `baslik`, ikon düşer, "n olay" `altBaslik`, düğmeler eylem yuvası |
| `detail/CustomerFilesSection.jsx:93` | Dosyalar (n), katlanır, sağda bağ seçici + "Dosya Ekle" | `kart` + `baslik`, katlanır (denetimli), eylem yuvası |

**Değil:** ödeme bölümünün üç kartı ve bilgi kutucukları (`StatCard` ailesi), "Maliyet ve Kâr" kutusu (Giderler'in bileşeni,
gider perdesi arkasında; sözlükte borç olarak kalır), görüşme formu kutusu (form).

### B.2 Boş durumlar

| Yer | Metin | Ayrım |
|---|---|---|
| `CustomerDetailModal.jsx:896` | Henüz görüşme kaydı yok. | yok |
| `detail/MachineTimeline.jsx:84` | Bu makinaya ait kayıt bulunmuyor. | yok |
| `detail/CustomerFilesSection.jsx:132` | Bu kayda ait dosya yok. / Henüz dosya yok. + "PDF, resim veya Office belgesi ekleyebilirsiniz (dosya başına en fazla 20 MB)." | var (süzgeçli / süzgeçsiz); ikinci cümle açıklama (G1) |

### B.3 Mesajlar

| Yer | Metin (baş) | Aile |
|---|---|---|
| `detail/PaymentSection.jsx:57` | Ayrıca farklı para biriminden ödenmemiş … borcu var … | hata |
| `detail/CustomerFilesSection.jsx:120` | Sunucu bağlantısı yok: … **ekleme, açma ve indirme** … | uyari (serbest içerik; ⚠ simgesi düşer) |
| `CustomerDetailModal.jsx:1094` | Mevcut sahip **sahiplik geçmişine** taşınacak … | bilgi (serbest içerik; bugün gri metin, amber zemin) |
| `CustomerDetailModal.jsx:1099` | Bu makinenin devredilmeden önce **…** ödenmemiş bakiyesi var … | hata (serbest içerik) |

### B.4 Sözlük eki (G10)

`KartBolum` `kart` varyantına:
- `collapsible` + `defaultOpen` (iç durum) **ya da** denetimli `acik` + `onAcikDegis` (verilirse durum dışarıdadır). Başlık
  tıklanınca açılır/kapanır; ok (▸/▾) başlığın **solunda** ayrı öğe (bugünkü detay alışkanlığı; başlık metni kendi öğesinde
  kalır, `getByText("Dosyalar (2)")` bozulmaz). Kapalıyken yalnız başlık satırı çizilir.
- `eylemler`: başlık satırının sağında düğmeler (satır sarar). Tıklaması katlanmayı tetiklemez.
- Yeni özellikler verilmediğinde `KartBolum`'un bugünkü çıktısı **birebir aynı** (birim testi: `etiket` ve `baslik` HTML'i).

### B.5 Kararlar

**H1. Katlanma denetimli olmalı.** Görüşme odağı ve dosya süzgeci bölümü dışarıdan açıyor.
*Öneri:* B.4'teki `acik`/`onAcikDegis`; Görüşmeler pencerenin `gorusmelerAcik`'ini, Dosyalar kendi `acik`'ini verir.
*Gerekçe:* iç durumlu katlanma bu iki akışı kırar (`gorusme-odak` testi).

**H2. Büyük harfle yazılmış başlık metinleri.** "KALIPLAR" ve "BU FİRMANIN MAKİNALARI" kaynakta büyük harfle yazılmış;
`baslik` biçimi büyük harfe çevirmediği için 15 punto büyük harf olarak kalırlardı.
*Öneri:* "Kalıplar (n)" ve "Bu Firmanın Makinaları (n)" yazılır. Büyük harf bugün görünüm kararıydı (başka başlıklarda
`textTransform` ile yapılıyor); kelimeler aynı, R6'nın "metin değişmez" kuralı harf büyüklüğünü kapsamaz sayılır.
Bu iki metni arayan test yok. *Gerekçe:* aksi hâlde aynı pencerede iki farklı başlık görünümü kalır. Kabul etmezseniz metin
büyük harf kalır, görünüm bağırır.

**H3. Makinalar kenar çubuğu kart olmaz.** Firma makinaları arasında geçiş yapan dar bir gezinme listesi.
*Öneri:* başlığı `BolumBasligi`, liste olduğu gibi. *Gerekçe:* 220 piksellik kolonda kart içinde kart kalabalık yapar; R9
"detay bölümleri" okuma bölümlerini kastediyor.

**H4. Makina Geçmişi ikonu ve "n olay" hapı.** `kart` ikonsuz (sözlük).
*Öneri:* ikon düşer, "n olay" alt başlık olur (metin aynı). *Gerekçe:* sözlük dışında yerel başlık bırakmamak.

**H5. Sahiplik Geçmişi'nin amber zemini.** *Öneri:* beyaz kart; satırlardaki amber ve kırmızı metin renkleri kalır (içerik R9).
*Gerekçe:* bölüm çerçevesi tek biçim.

**H6. "Yeni Sahip" penceresindeki bilgi kutusu** bugün gri metin + amber zemin. *Öneri:* `bilgi` ailesi (mavi); metin ve
kalın kısımlar aynı. *Gerekçe:* amber "uyarı"dır, bu bir bilgilendirme.

**H7. Ekran anahtarları.** DoD'deki `musteri-detay` (Yeni Sahip penceresi açık: iki mesaj) ve `musteri-detay-bos` (olaysız
makina, Görüşmeler ve Dosyalar açık: boş kutular) + `musteri-detay-bolumler` (iki makinalı firma, servis ve kalıp olayları,
sahiplik geçmişi, açık görüşmeler ve dosyalar, farklı para birimi borcu, çevrimdışı dosya uyarısı). Önce görüntüleri kod
değişmeden, aynı oturumda çekilir (Aşama 1'deki kaydırma çubuğu dersi).

**H8. Testler.** Önce eski kodda yeşil:
`ui/musteri-detay-bolumler.test.jsx` (davranış): bölüm başlıkları ve sayılar; olay sırası; Görüşmeler ve Dosyalar'ın
açılıp kapanması, odak ve süzgeçle açılması; boş metinler (ayrım dahil); Makina Geçmişi ve İşlemler düğmeleri ve sırası;
sahiplik satırları; ödeme ve Yeni Sahip mesaj metinleri. Sonra: `ui/sozluk-0016` (B.4 birim testi), `liste-kaynak`
`ASAMA = 2` (fixture'daki Aşama 2 metinleri + detay başlık kalıpları), `ui/bos-durum`'a detay kutularında düğme yok denetimi.
Gate (C3): `gorusme-odak`, `taksit-odeme-odak`, `customer-maliyet-kutusu`, `customer-files-section`, `machine-timeline-*`,
`dis-firma-servis-kalip`, `customers-*`, `kalip-borc-capraz`, `evrak-finans-capraz`, `dealers-kalip-satisi`,
`gider-yetkisiz-gorunum`, `settings-trash`, `backup-encrypt`, `form-*`.

**H9. Boş kutuların boyutu.** Katlanan bölümlerin içindeki `BosDurum` 32 piksel dolgulu; G13 gibi karar görüntüde (AC-11).

| # | Karar | Öneri |
|---|---|---|
| H1 | Katlanma | Denetimli `acik`/`onAcikDegis` (sözlük eki) |
| H2 | Büyük harfle yazılmış başlıklar | "Kalıplar (n)", "Bu Firmanın Makinaları (n)" |
| H3 | Makinalar kenar çubuğu | Kart yok, `BolumBasligi` |
| H4 | Makina Geçmişi ikonu, "n olay" | İkon düşer, alt başlık |
| H5 | Sahiplik Geçmişi zemini | Beyaz kart, satır renkleri kalır |
| H6 | Yeni Sahip bilgi kutusu | `bilgi` ailesi |
| H7 | Ekran anahtarları | `musteri-detay`, `musteri-detay-bos`, `musteri-detay-bolumler` |
| H8 | Testler | Davranış testi önce eski kodda; `ASAMA = 2` |
| H9 | Kutu boyutu | Görüntüde karar |
