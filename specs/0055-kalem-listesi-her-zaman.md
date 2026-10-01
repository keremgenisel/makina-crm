# 0055 — Rapordaki Kalem Listesi Seçeneği Kalksın, Liste Hep Gelsin

| | |
|---|---|
| **Durum** | Taslak |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Aylık Gider ve Kasa Raporu düğmesi (Finans, Giderler, Kasa), rapor motoru |
| **Bağımlı spec'ler** | 0016 (boş durum kuralı) · 0047 (Aylık Gider ve Kasa Raporu) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 10 bulgu işlendi, 3'ü bloklayıcıydı. Bayrak kalkınca boş ayda **boş tablo** çizileceği bulundu (R2), 0047'nin iki kabul kriterinin hâlâ kaldırılan davranışı istediği görüldü (R7), motordan kaldırılacak üçüncü yer (dönüş nesnesi) eklendi (R3). R7–R10 ve AC-9…AC-16 eklendi.<br>**R2 (2026-10-01, plan onayı):** boş ayda gider bölümü zaten bütünüyle "Bu ayda kayıt yok" satırına iniyor (kalemsiz ay = `gr.bos`), yeni "kalem yok" metni açılmaz; R2'nin içerik koşulu savunma dalı olarak aynı satırı kullanır ve AC-9 buna göre yeniden yazıldı (Q1, R11). 0047'deki analist notu (R32) bu spec'in commit'ine alınır (Q2). Kanıt kapsamı ve AC-7 ölçüsü planda (Q3, Q4). |

---

## Intent

Aylık Gider ve Kasa Raporu düğmesinin yanında bir **"Kalem listesi"** onay kutusu var; işaretliyken
rapora o ayın kalemleri tek tek ekleniyor, kapalıyken eklenmiyor. 0047'de belgenin uzamasına karşı
konmuştu.

Kullanımda karşılığı çıkmadı: liste zaten raporun en çok işe yarayan bölümü ve kutu her açılışta
işaretli geliyor. Kullanıcıya her yazdırmada bir karar daha sorduruyor, hiçbir şey kazandırmıyor.

Başarı şu demek: kutu ekrandan kalkıyor, rapor her zaman kalem listesiyle çıkıyor.

---

## Requirements

- **R1.** "Kalem listesi" onay kutusu üç ekrandan da (Finans, Giderler, Kasa) kaldırılır.
- **R2.** Rapor **her zaman** kalem listesini içerir. **Boş ayda boş tablo çizilmez:** bugün
  `giderRaporu.js:69-70` `let kalemler = null; if (kalemListesi) { … }` diyor ve HTML `:187`
  `G.kalemler ? … : ""` ile çiziyor; bayrak kalkınca `kalemler` **her zaman dizi** olur ve boş ayda `[]`
  truthy olduğu için başlık ile boş tablo basılır. Koşul **içeriğe** bakar:
  `G.kalemler.length ? tablo(...) : <p class="bos">Bu ayda kalem yok.</p>` (0047'nin diğer bölümlerinde
  kullanılan `bos` deseni, 0016 liste birliği).
- **R3.** Seçenek motordan da kaldırılır ve **dört yer** birden temizlenir: ekrandaki kutu, bileşendeki
  durum, fonksiyonun üçüncü argümanı ve motordaki koşul. **Dördüncüsü atlanmamalı:**
  `giderRaporu.js:148` dönüş nesnesinde `kalemListesi` alanını da taşıyor (HTML onu kullanmıyor, yani ölü
  alan olarak kalır). Üçüncü argüman tamamen kalkar (`giderKasaRaporu(girdi, ay)`), çünkü içinde başka
  seçenek yok.
- **R4.** Listenin içeriği, sırası ve sütunları değişmez: `giderRaporu.js:188`'deki
  `["Tarih", "Tür", "Açıklama", "Tedarikçi", "Tutar", "Durum"]` dizisi aynen kalır ve tarihsiz personel
  satırı **"Ay geneli"** basılır (`:82`, `:188`).
- **R5.** Personel gizliliği aynen sürer: çalışan adı ve çalışan bazlı tutar listede yoktur, personel
  kalemleri tek satırda toplanır.
- **R6.** Raporun diğer bölümleri ve rakamları değişmez.

### QA turunda eklenenler (R1)

- **R7.** **0047'nin iki kabul kriteri güncellenir.** `specs/done/0047-aylik-gider-ve-kasa-raporu.md:143`
  R32 **zaten** üstü çizili ve bu spec'e atıf yapıyor, ama `:379` **AC-39** ("Kalem listesi kutusu
  kapatıldığında belge o bölüm olmadan üretilir") ve `:405` **AC-57** ("kutu her açılışta varsayılan açık
  gelir") olduğu gibi duruyor. İkisine de R32'deki **aynı tarihli not** düşülür (0020'nin
  "spec-atiflari TASINACAK" deseni); aksi hâlde iki tamamlanmış spec birbirini çürütür ve kriter → test
  eşlemesi tutmaz.
- **R8.** **Yürürlük öncesi ayda** kalem listesi bölümü de açıklama satırıyla geçilir, boş tablo çizilmez
  (0047 R45'in `yururlukOncesi` durumu; R2 ile aynı kural).
- **R9.** **Güncellenecek ve eklenecek testler adıyla yazılıdır:** `tests/gider-kasa-raporu.test.js:173`
  ve `:176` bugün `kalemListesi: false` ile iki iddia taşıyor ve kaldırılır;
  `tests/ui/gider-kasa-raporu.test.jsx` kutuyu hiç denetlemediği için AC-1…AC-3 için **yeni** iddia
  yazılır (üç ekranda kutunun yokluğu).
- **R10.** **Görsel kanıt:** rapor düğmesinin yanındaki kutu kalktığı için üç ekranın görünümü bilerek
  değişiyor ve 0047'nin kanıt raporu bu ekranları kapsıyor. `docs/evidence/0055-*.jpg` (üç ekranda kutusuz
  düğme) eklenir ve `docs/evidence/kanit-eslemesi.json`'da ilgili dosyaların kaydı `beklenen: "degisti"` +
  `onay` (`Takım Yöneticisi · YYYY-AA-GG · spec 0055 R1`) taşır; spec `done`'a taşınırken `ayni`ye
  çevrilir (0009/0011 kuralı).

### F. Plan onayında eklenenler (R2)

- **R11.** **Boş ay bugün de doğru (Q1).** Kalemsiz ayda motor `bos: true` döndürür (`gider.js`: `bos: kalemler.length === 0`)
  ve belge bütün gider bölümünü tek "Bu ayda kayıt yok" satırına indirir; kalem listesine sıra gelmez. Bu davranış korunur.
  R2'nin içerik koşulu (`G.kalemler.length`) savunma dalı olarak yine eklenir ve aynı `KAYIT_YOK` satırını kullanır; aynı
  belgede iki ayrı "yok" cümlesi olmaz.

---

## Constraints

- **C1.** Bu iş yalnız bir seçeneği kaldırır; hiçbir hesap, tutar ya da kayıt değişmez.
- **C2.** Yeni alan, yeni izin ve sunucu değişikliği yoktur.
- **C3.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Listenin sayfalanması, kısaltılması ya da bir eşikten sonra özetlenmesi — *neden:* R2; uzun ay
  uzun belge demektir ve bu kabul edildi.
- **X2.** Raporun başka bölümlerinin isteğe bağlı hâle gelmesi — *neden:* talep yok; aynı hatayı ikinci
  kez yapmayalım.
- **X3.** Ay seçicinin değişmesi — *neden:* o kutu kalıyor.

---

## Context

- **Bugünkü hâl.** `src/components/rapor/GiderKasaRaporuDugmesi.jsx` içinde `kalemListesi` durumu
  (varsayılan `true`) ve bir onay kutusu var; değer `giderKasaRaporu(veri, ay, { kalemListesi })` ile
  motora gidiyor, `src/lib/giderRaporu.js` de listeyi yalnız açıkken kuruyor (`if (kalemListesi)`) ve
  HTML'de `G.kalemler ? … : ""` ile çiziyor.
- **0047 R32 geri alınıyor.** O gün "kırk kalemlik ayda belge uzar, kullanıcı kapatabilsin" diye
  konmuştu. Kullanımda görülen şu: kutu hep açık kalıyor ve liste raporun asıl işe yarayan bölümü.
  Kullanılmayan bir seçenek, kodda bir dal ve ekranda bir soru demek; ikisi de bedava değil.
- **Dar iş.** Kaldırılan şey bir bayrak: kutu, durum, parametre, motordaki koşul ve dönüş nesnesindeki
  alan. Rakamlara, gizliliğe ve belgenin kalanına dokunmuyor.
- **Tek yan etki boş ay.** Bayrak bugün iki işi birden yapıyor: listeyi kurup kurmamak **ve** HTML'de
  bölümün çizilip çizilmemesini belirlemek (`G.kalemler` null olduğunda bölüm hiç basılmıyor). Bayrak
  kalkınca ikinci iş sahipsiz kalır; R2 onu içerik koşuluna devrediyor. Bu, işin tek davranış değişikliği
  olan yeri, bu yüzden kendi kabul kriteri var (AC-9).

---

## Acceptance Criteria

- **AC-1.** Giderler ekranında rapor düğmesinin yanında "Kalem listesi" kutusu yoktur.
- **AC-2.** Kasa ekranında da yoktur.
- **AC-3.** Finans ekranında da yoktur.
- **AC-4.** Kalemi olan ayda üretilen rapor kalem listesi bölümünü içerir.
- **AC-5.** Listenin sütunları ve sırası bu işten önceki hâliyle aynıdır.
- **AC-6.** Personel kalemleri listede tek satırda toplanır; çalışan adı geçmez.
- **AC-7.** Raporun diğer bölümleri ve rakamları bu işten önce ve sonra aynıdır. **Ölçü:**
  `tests/gider-kasa-raporu.test.js`'deki mevcut beklenen değerler **değiştirilmeden** geçer ve aynı ay için
  önceki/sonraki iki belge yalnız kalem listesi bölümünde farklıdır.
- **AC-8.** Rapor üreten fonksiyon seçenek parametresi almaz (`giderKasaRaporu(girdi, ay)`) ve dönüş
  nesnesinde `kalemListesi` alanı yoktur.
- **AC-9.** Hiç kalemi olmayan bir ayın raporunda kalem listesi başlığı ve **boş tablo** basılmaz; gider bölümü
  "Bu ayda kayıt yok" satırını gösterir (R2 ile R11; boş ayda yeni bir "kalem yok" metni açılmaz).
- **AC-10.** Yürürlük ayından önceki bir ay seçildiğinde kalem listesi bölümü de açıklama satırıyla geçilir
  (0047 R45).
- **AC-11.** Listedeki personel satırının tarihi "Ay geneli" basılır.
- **AC-12.** `tests/gider-kasa-raporu.test.js` içinde `kalemListesi` adı hiç geçmez.
- **AC-13.** `tests/ui/gider-kasa-raporu.test.jsx` üç ekranda da kutunun yokluğunu denetler (AC-1…AC-3).
- **AC-14.** `specs/done/0047-aylik-gider-ve-kasa-raporu.md` AC-39 ve AC-57 tarihli notla bu spec'e
  devredilmiştir; iki belge birbiriyle çelişmez.
- **AC-15.** `docs/evidence/0055-*.jpg` görüntüleri üç ekranı kutusuz gösterir ve
  `docs/evidence/kanit-eslemesi.json`'daki ilgili kayıtlar `beklenen: "degisti"` + `onay` taşır.
- **AC-16.** `CLAUDE.md`'nin 0047 bölümündeki "kalem listesi kutusu her açılışta açık" cümlesi
  "kalem listesi her raporda vardır" olarak güncellenmiştir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Seçenek dört yerden de kalktı (kutu, durum, parametre, motor koşulu) ve dönüş nesnesindeki
      `kalemListesi` alanı silindi; ölü dal kalmadı (R3, AC-8).
- [ ] Boş ay ve yürürlük öncesi ay açıklama satırıyla geçiliyor, boş tablo basılmıyor (R2, R8, AC-9, AC-10).
- [ ] `tests/gider-kasa-raporu.test.js:173` ve `:176` kaldırıldı; dosyada `kalemListesi` adı kalmadı (R9).
- [ ] `tests/ui/gider-kasa-raporu.test.jsx`'e üç ekran için kutunun yokluğu iddiası eklendi (R9).
- [ ] `specs/done/0047-aylik-gider-ve-kasa-raporu.md` AC-39 ve AC-57'ye R32'dekiyle aynı tarihli not
      düşüldü (R7).
- [ ] Görsel kanıt üretildi (`docs/evidence/0055-*.jpg`) ve `kanit-eslemesi.json` kayıtları
      `beklenen: "degisti"` + onay ile güncellendi; `done`'a taşınırken `ayni`ye çevrilecek (R10).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` 0047 bölümündeki "kalem listesi kutusu her açılışta açık" cümlesi güncellendi (AC-16).
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
