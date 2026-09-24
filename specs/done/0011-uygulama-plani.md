# 0011: Uygulama Planı, Uyarı Şeridine Serbest İçerik

| | |
|---|---|
| **Bağlı spec** | `specs/done/0011-uyari-seridi-serbest-icerik.md` (R1 plan onayıyla, R2 onay sonrası) |
| **Durum** | Tamamlandı. 2026-09-24: S1–S10 kullanıcı tarafından onaylandı; spec R1 ve R2 ile güncellendi; kod commit `907a280` (dal `feat/0011-uyari-seridi-serbest`, push ve sürüm yok). SCORECARD dolduruldu, spec ve plan `specs/done/`'a taşındı. |
| **Önkoşul** | 0009 (commit `6a5b32f` + `5217b19`, dal `feat/0009-tasarim-sozlugu`, `main`'e alınmadı) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar S1–S10) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Bileşen | `UyariSeridi({ aile = "bilgi", baslik, metin, testId })`; tek kök `div` (`role="status"`, `data-testid={testId}`, zemin/kenarlık aileden, 10 köşe, `10px 14px` dolgu, 13 punto); içinde kalın başlık (`color` = ailenin 700 tonu) + isteğe bağlı açıklama satırı (`n700`, `marginTop 2`) | `src/components/tasarim.jsx:99-111` |
| **Çağrı sayısı** | Spec "yedi" diyor; kodda **altı** çağrı var, hepsi `Giderler.jsx`'te: tür tanımsız (bilgi), üretim sonucu (başarı/bilgi), geçersiz aralık (uyarı), hatırlatma kapsamı (uyarı), kapsam dışı (uyarı), mükerrer tanım (uyarı) | `Giderler.jsx:183, 184, 186, 190, 205, 206` |
| İlk tüketici (0010) | Müşteriler gruplu görünüm kutusu: `bluBg` zemin, `bluBr` kenarlık, 10 köşe, `10px 14px`, 13 punto, **metin rengi `blu800`**, cümle ortasında `<b>`, `marginBottom 12`; `role` yok | `Customers.jsx:498-501` |
| Uygulamadaki desen | Renkli zeminli serbest metin kutularında metin rengi **ailenin 800 tonu** (5 yer: `amb800` ×3, `blu800`, `grn800`) | `src/components` taraması |
| Tema | `blu800`, `amb800`, `grn800` tanımlı. Kontrast (aydınlık / karanlık): `blu800/bluBg` 8.01 / 6.09, `amb800/ambBg` 6.84 / 8.69, `grn800/grnBg` 7.34 / 10.58; hepsi iki temada da WCAG AA (4.5) üstünde | `src/lib/theme.js` |
| **0009 testlerinin kısıtı** | `tasarim-kaynak.test.js` `tasarim.jsx`'te `data-testid={testId}` ifadesini **tam 4 kez** bekliyor. Şeride ikinci bir `return` dalı eklemek bu sayıyı 5 yapar ve mevcut testi kırar (C3). `tasarim-kontrast.test.js` bileşenin token çiftlerini sabit listeyle ölçüyor; yeni çiftler ancak **yeni** bir test dosyasında ölçülebilir | `tests/tasarim-kaynak.test.js:75`, `tests/tasarim-kontrast.test.js` |
| Sözlük örnek denetimi | 0009 AC-20 testi, sözlükteki her `**Örnek:** \`src/…:satır\`` satırının gerçekten `<UyariSeridi` içerdiğini denetliyor. Serbest içeriğin henüz gerçek bir kullanımı yok (ilki 0010) | `tests/tasarim-kaynak.test.js` |
| Görüntü aracı | `scripts/evidence/0009-*` var ve kararlı; ama altı çağrıdan yalnız **ikisini** kapsıyor (tür tanımsız, mükerrer). Üretim sonucu, geçersiz aralık, hatırlatma kapsamı ve kapsam dışı şeritleri hiçbir ekranda çizilmiyor | `scripts/evidence/0009-sayfa.jsx` |

---

## 1. Mimari özet

- **Tek bileşen, tek kök** (R6, S5). `UyariSeridi({ aile, baslik, metin, testId, children })`:
  - Kök `div` aynı kalır: `role="status"`, `data-testid={testId}`, zemin, kenarlık, köşe, dolgu ve punto.
  - Yalnız **iç kısım** dallanır. `children` verildiyse serbest içerik çizilir (metin rengi ailenin 800 tonu, S2). Verilmediyse bugünkü kalın başlık ve açıklama satırı **birebir** çizilir.
- **İki biçim birlikte verilirse** (R4) `children` kazanır; `baslik` ve `metin` çizilmez.
- `AILELER` tablosuna ailenin serbest metin rengi dördüncü değer olarak eklenir; ilk üç değer ve kullanımları değişmez.
- Sözlük belgesinin `UyariSeridi` bölümüne "Serbest içerik" alt başlığı eklenir: ne zaman kullanılır, ne zaman kullanılmaz, varsayılan biçim.

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/tasarim.jsx` | `UyariSeridi`: `children` prop'u, iç dallanma; `AILELER`'e 800 tonu. Başka bileşene dokunulmaz |
| `docs/tasarim-sozlugu.md` | `UyariSeridi` bölümüne serbest içerik kuralı (R5); `children` alanı |
| `CLAUDE.md` | Tasarım sözlüğü satırında `UyariSeridi`'nin serbest içerik biçimi (tek ifade) |
| `scripts/evidence/0009-sayfa.jsx` | Altı çağrının hepsini çizen ekranlar: mevcut iki ekrana ek 4 ekran + bir "serbest içerik örneği" ekranı (yalnız "sonra") |
| `scripts/evidence/0009-birlestir.cjs` | Çıktı önekini (`0009`/`0011`) parametre yapmak (S7) |
| `docs/evidence/0011-*.jpg` + `0011-piksel-raporu.json` (yeni) | Yan yana önce/sonra görüntüleri, piksel raporu |
| `specs/0011-…md` | Plan onayıyla "Onaylandı" + revizyon (çağrı sayısı, kanıt biçimi) |
| Testler (yeni): `tests/ui/uyari-seridi-serbest.test.jsx`, `tests/uyari-seridi-sozluk.test.js`, `tests/uyari-seridi-kontrast.test.js` | bkz. §5. **Mevcut test dosyalarına dokunulmaz** (C3) |

---

## 3. Adım sırası

1. **Dal:** `feat/0009-tasarim-sozlugu`'nun ucundan `feat/0011-uyari-seridi-serbest` (S10).
2. **Güvenlik ağı (kod değişmeden):**
   1. Görüntü aracına altı çağrıyı kapsayan ekranlar eklenir.
   2. Aracın kararlılığı ölçülür: kod değişmeden iki çekim, 0 fark.
   3. **Önce** görüntüleri alınır.
3. **Bileşen:** `UyariSeridi` değişikliği + `ui/uyari-seridi-serbest.test.jsx`. Testin ilk parçası (AC-2), değişiklikten **önce** bugünkü çıktının HTML'ini sabitler.
4. **Kontrast** (`uyari-seridi-kontrast.test.js`) ve **sözlük** (`docs/tasarim-sozlugu.md` + `uyari-seridi-sozluk.test.js`).
5. **Sonra** görüntüleri, piksel karşılaştırması (hedef: altı çağrının hepsi iki temada 0 fark), yan yana JPEG'ler.
6. Tam paket (`npm test`, `npm run lint`, `npm run build`); `git diff --name-status -- tests` yalnız yeni dosyalar (C3).

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**S1. Serbest içerik hangi prop'la verilecek?**
*Öneri:* `children`: `<UyariSeridi aile="bilgi">Firmaya göre gruplu görünüm: <b>{n} firma</b> …</UyariSeridi>`.
*Gerekçe:* React'ın doğal biçimi; vurgu `<b>` ile cümlenin içinde kalır (AC-1). Ayrı bir `icerik` prop'u da olurdu ama
JSX'i prop değerine koymak okunaklılığı düşürür. `HataMetni` ve `Ipucu` da içeriği `children` ile alıyor, sözlük tutarlı kalır.

**S2. Serbest içeriğin metin rengi. (Spec bunu söylemiyor, 0010'u doğrudan etkiliyor.)**
Bugünkü biçimde başlık ailenin 700 tonunda, açıklama nötr `n700`. Serbest içerik tek bir cümle olduğu için bunlardan birini ya
da üçüncü bir rengi seçmek gerekiyor.
*Öneri:* **ailenin 800 tonu** (`blu800` / `amb800` / `grn800`), cümlenin tamamında; `<b>` aynı rengi miras alır.
*Gerekçe:*
- Uygulamada renkli zeminli serbest metin kutularının beşi zaten bu deseni kullanıyor.
- İlk tüketici olan Müşteriler kutusu bugün tam olarak `blu800` ile çiziliyor. 0010 R10 "bugünkü cümlesini bugünkü biçimiyle" gösterilmesini istiyor.
- `n700` seçilirse Müşteriler cümlesi maviden griye döner. 700 tonu seçilirse ton hafifçe değişir.
- Üç renk de iki temada AA'yı geçiyor.

Bu karar spec'e bir cümle olarak eklenmeli (R1'e).

**S3. "Serbest içerik verildi" ne demek?**
*Öneri:* `children` React'ın çizeceği bir değerse (`null`, `undefined`, `false`, `""` dışında) serbest biçim. Aksi hâlde bugünkü biçim.
*Gerekçe:* Koşullu çağrılar (`{kosul && <b>…</b>}`) boş değer üretebilir; boş `children` yüzünden bugünkü biçim kaybolmamalı
(R2). `0` gibi sayılar çizilebilir değer sayılır (React'ın kendi kuralı).

**S4. Spec'te çağrı sayısı yanlış: yedi değil altı.**
*Öneri:* Context, AC-2 ve DoD "altı" olarak düzeltilir (onay öncesi revizyon). *Gerekçe:* AC-2'nin testi ve görsel kanıtı sayıya
bağlı; yanlış sayı eksik kapsama ya da boş yere aranan bir yedinci çağrı demek.

**S5. Mevcut 0009 testleriyle çakışma (C3).**
`tasarim-kaynak.test.js` `data-testid={testId}`'yi tam dört kez sayıyor. *Öneri:* kök `div` tek kalır, yalnız içi dallanır (§1).
*Gerekçe:* Hem C3'ü korur (mevcut test değişmeden geçer) hem de görünüm kaymasını en aza indirir: kabın stili tek yerde
yazılı, iki biçim onu paylaşıyor. İkinci bir `return` dalı AC-17 sayımını kırardı ve stil kopyası doğururdu (R6'nın ruhu).

**S6. AC-2 (altı çağrı aynı görünür) nasıl kanıtlanacak?**
*Öneri:* üç katman.
1. **DOM birebirliği:** yeni testte bugünkü biçimin her aile için ürettiği `innerHTML` değişiklikten **önce** metin olarak sabitlenir; sonra aynı çıkmalı. Bir dolgu, renk ya da öğe sırası değişse test kalır.
2. **Ekran düzeyi:** mevcut `giderler.test.jsx` vb. değişmeden geçer.
3. **Piksel:** altı çağrının hepsi iki temada önce/sonra 0 fark. Bugünkü araç yalnız ikisini çiziyor; dört ekran eklenir (üretim sonucu, geçersiz aralık, hatırlatma kapsamı, kapsam dışı). Bunun için aracın tıklama adımlarına bir "alan doldurma" adımı eklenir (geçersiz tarih aralığı için).

*Gerekçe:* spec'in tuzağı "sessiz görünüm kayması"; DOM karşılaştırması ucuz ve her test koşusunda çalışır, piksel kanıtı bir kez alınır.

**S7. Görüntü aracı ve kanıt biçimi.**
*Öneri:*
- 0009 aracına ekran eklenir ve birleştirme betiğine çıktı öneki parametresi verilir; ayrı bir 0011 aracı yazılmaz.
- Kanıt 0009'daki gibi yan yana küçültülmüş JPEG + piksel raporu olur. Spec DoD'deki `0011-*.png` ifadesi `*.jpg` olarak düzeltilir, "doğrulamak için aracı yeniden çalıştırın" notu eklenir (0009 triyaj bulgu 3'ün dersi).
- "Önce" görüntüleri kod değişmeden alınır; araç çizilemeyen ya da boş ekranı zaten hata sayıyor.

*Gerekçe:* aynı araç iki spec'te tutarlı sonuç verir; kopya araç sözlüğün kendi derdini (kopya) araca taşır. 0009 kanıtı ve
`tasarim-kaynak` eşlemesi etkilenmez (0009 piksel raporu değişmez).

**S8. Sözlükte serbest içerik için "Örnek" satırı.**
0009 AC-20 testi her `**Örnek:**` satırının gerçek bir `<UyariSeridi` satırını göstermesini istiyor; serbest içeriğin henüz
gerçek kullanımı yok.
*Öneri:* serbest içerik alt bölümü `**Örnek:**` satırı taşımaz; onun yerine "İlk kullanım: spec 0010 (Müşteriler gruplu görünüm
şeridi)" yazılır. 0010 bu satırı gerçek bir `**Örnek:**` ile değiştirir. *Gerekçe:* uydurma bir örnek yazılamaz, sahte bir
kullanım da eklenemez (X3, X4). Aynı notu 0010'a bırakmak sözlüğü gerçeğe bağlı tutar.

**S9. Yeni testler nereye?**
*Öneri:* üç yeni dosya (§2). *Gerekçe:* `tasarim.test.jsx`, `tasarim-kaynak.test.js` ve `tasarim-kontrast.test.js` mevcut test
dosyaları; C3 onlara dokunmayı yasaklıyor. AC-8 (ikinci şerit tanımı yok) mevcut `tasarim-kaynak` "tek tanım" testiyle zaten
kanıtlı; yeni dosyada ayrıca `role="status"` ve aile tablosu için tek tanım taraması yapılır.

**S10. Hangi dala?**
*Öneri:* `feat/0009-tasarim-sozlugu`'nun ucundan yeni dal `feat/0011-uyari-seridi-serbest`. *Gerekçe:* 0011, 0009'a bağlı ve
0009 henüz `main`'de değil. Ayrı dal, 0011'i ayrı gözden geçirmeye ve ayrı birleştirmeye izin verir.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` biçiminde.

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `ui/uyari-seridi-serbest.test.jsx` | `children` ile "… <b>12 firma</b> (15 makina kaydı) …": `textContent` birebir, `b` öğesi yerinde ve kalın, metin rengi ailenin 800 tonu |
| AC-2 | `ui/uyari-seridi-serbest.test.jsx` + mevcut `ui/giderler`, `ui/tasarim` + görüntü | Üç aile ve açıklamalı/açıklamasız bugünkü biçimin `innerHTML`'i değişiklik öncesi sabitlenen metinle birebir aynı; mevcut testler değişmeden geçer; altı çağrı iki temada 0 piksel fark (S6) |
| AC-3 | `ui/uyari-seridi-serbest.test.jsx` | Serbest içerikte `role="status"` ve verilen `testId`; `testId` verilmeyince `data-testid` yok |
| AC-4 | `ui/uyari-seridi-serbest.test.jsx` | Üç ailede serbest içerikli ve başlıklı şeridin kök zemin ve kenarlık stili birebir aynı |
| AC-5 | `ui/uyari-seridi-serbest.test.jsx` | `aile="kirmizi"` ve `aile={undefined}` serbest içerikle hata vermez, bilgi zemini + `blu800` metin |
| AC-6 | `ui/uyari-seridi-serbest.test.jsx` | `baslik`, `metin` ve `children` birlikte: yalnız `children` metni var, başlık ve açıklama metni yok |
| AC-7 | `uyari-seridi-sozluk.test.js` | Sözlüğün `UyariSeridi` bölümünde "Serbest içerik" alt başlığı, "ne zaman kullanılır", "ne zaman kullanılmaz" ve varsayılanın başlık + açıklama olduğu cümlesi; `children` alanı anlatılmış |
| AC-8 | mevcut `tasarim-kaynak.test.js` ("tek tanım") + `uyari-seridi-sozluk.test.js` | `UyariSeridi` yalnız `tasarim.jsx`'te; `src`'de başka hiçbir dosya `role="status"` ile aile renk tablosunu (`bluBg`+`ambBg`+`grnBg`) birlikte tanımlamaz |
| AC-9 | tam paket + DoD | `npm test` yeşil; `git diff --name-status -- tests` yalnız yeni dosyalar |
| AC-10 | `uyari-seridi-kontrast.test.js` | Karanlık temada 800 tonu / aile zemini kontrastı AA (4.5) ya da aydınlığın %95'i (0009 R3 kuralı), kenarlık/zemin ≥ 1.15; token'lar tanımlı ve kaynakta kullanılıyor. Görsel: serbest içerik örneği ekranı (aydınlık/karanlık) kanıt klasöründe |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| S1 | Prop | `children` |
| S2 | Serbest içerik rengi | Ailenin 800 tonu (`blu800`/`amb800`/`grn800`); spec R1'e cümle |
| S3 | "Verildi" tanımı | Çizilebilir `children` (`null`/`undefined`/`false`/`""` dışında) |
| S4 | Çağrı sayısı | Spec'te 7 → 6 (Context, AC-2, DoD) |
| S5 | Yapı | Tek kök, iç dallanma (mevcut 0009 testleri değişmeden geçer) |
| S6 | AC-2 kanıtı | DOM birebirliği + mevcut testler + altı çağrının piksel kanıtı |
| S7 | Araç ve biçim | 0009 aracına ekran; JPEG + piksel raporu; DoD `*.jpg` |
| S8 | Sözlük örneği | "İlk kullanım: spec 0010" notu; gerçek örnek 0010'da |
| S9 | Testler | Üç yeni dosya, mevcutlara dokunulmaz |
| S10 | Dal | `feat/0009`'dan `feat/0011-uyari-seridi-serbest` |

---

## 7. Uygulama notları (2026-09-24)

- **Dal:** `feat/0011-uyari-seridi-serbest` (`feat/0009-tasarim-sozlugu` ucundan).
- **Güvenlik ağı önce kuruldu:**
  - Görüntü aracına altı çağrının dört eksiğini çizen ekranlar eklendi:
    - üretim sonucu, bilgi ve başarı (iki ekran);
    - geçersiz aralık;
    - hatırlatma kapsamı;
    - kapsam dışı.
  - Aracın yeni adım türleri: `doldur:etiket=değer` (kontrollü alan) ve `~metin` (başlangıçla tıklama).
  - Araç artık her ekranda çizilen `role="status"` şeritlerinin metnini rapora yazıyor (`seritler`), böylece hangi çağrının hangi ekranda kapsandığı raporda belgeli.
  - Önce görüntüleri kod değişmeden alındı. Serbest içerik örneği `EKRAN_ATLA` ile atlandı, yalnız "sonra"da var.
  - Birleştirme betiğine çıktı öneki parametresi eklendi (`0011`); önce görüntüsü olmayan ekran tek başına konuyor.
- **AC-2 HTML sabitlemesi:** bugünkü biçimin `innerHTML`'i (üç aile + tanımsız aile, açıklamalı ve açıklamasız, varsayılan
  ve kimliksiz çağrı) değişiklikten önce bileşenden alınıp `ui/uyari-seridi-serbest.test.jsx`'e sabitlendi; sonrası birebir aynı.
- **Uygulama:**
  - Kap tek. Serbest biçimde kaba yalnız `color` (ailenin 800 tonu) eklenir, bugünkü biçimin stil nesnesi aynen korunur.
  - `AILELER`'e dördüncü değer eklendi.
  - `data-testid={testId}` sayısı 4 kaldı, 0009 testi değişmeden geçiyor.
- **Görsel sonuç:**
  - Araç 49 ekran × 2 tema = 98 görüntü çekti.
  - Önce görüntüsü olan 96'sının hepsinde 0 piksel fark, çizim hatası yok.
  - Altı çağrının yedi durumu iki temada kapsandı (üretim sonucunun bilgi ve başarı hâli ayrı sayılıyor).
  - Depoya uyarı şeridi içeren 9 ekran ve serbest içerik örneği (toplam 20 görüntü) yan yana JPEG olarak kondu: `docs/evidence/0011-*.jpg` + `0011-piksel-raporu.json` (2.1 MB).
- **Sözlük:** `UyariSeridi` bölümüne "Serbest içerik (spec 0011)" alt başlığı eklendi (kural, ne zaman kullanılır/kullanılmaz,
  yok sayma davranışı, "ilk kullanım: spec 0010"). `**Örnek:**` satırı taşımıyor (S8), 0009'un örnek denetimi etkilenmedi.
- **Testler (yeni, mevcutlara dokunulmadı):**
  - `ui/uyari-seridi-serbest.test.jsx`: AC-1…6, S3.
  - `uyari-seridi-kontrast.test.js`: AC-10.
  - `uyari-seridi-sozluk.test.js`: AC-7, AC-8, R4, S8 ve AC-2 görsel kanıt.
- **Sonuç:** `npm test` 182 dosya / 1979 test yeşil (Electron testleri dahil), `npm run lint` 0 hata, `npm run build` başarılı.

---

## 8. Revizyon R2 (2026-09-24, onay sonrası; 0010'un önünü açmak için)

Uygulama sonrası 0010 taslağıyla karşılaştırmada iki çakışma bulundu ve kullanıcı onayıyla bu işte çözüldü.

**1. 0009'un kanıt testi sonraki dönüşümleri kilitliyordu.**
- Sorun: `tests/tasarim-kaynak.test.js`, `tasarim.jsx`'i kullanan dosyaların listesini test içindeki sabit eşlemeyle birebir karşılaştırıyor ve her ekranı **0009'un** raporunda arıyordu. 0010'da `Customers.jsx` sözlüğü kullanmaya başladığında test kalacaktı. Düzeltmek için mevcut bir test dosyasını değiştirmek gerekecekti, oysa 0010 C4 bunu yasaklıyor.
- Çözüm:
  - Eşleme veri dosyasına taşındı: `docs/evidence/kanit-eslemesi.json` (dosya → [{rapor, ekran}]).
  - Test onu okur, kural aynı; tek değişen mevcut test dosyası budur (spec C3'ün R2 istisnası).
  - 0011'in kendi beş ekranı da 0011 raporuyla eşlemeye eklendi; eşleme artık birden fazla spec raporunu taşıyor.
  - Koruma elle denendi: kaydı silinen dosya ve olmayan ekran ikisi de testte kalıyor.
- Sonraki dönüşüm (0010) kendi raporunu üretip kaydını JSON'a ekler; test dosyasına dokunmaz.
- **Ek (aynı tur):** 0010 bilinçli bir görünüm değişikliği (yeni tasarım). İlk hâliyle kural her kayıtta 0 fark istediği için
  0010'u yine test dosyasına dokunmaya zorlayacaktı. Kayda `beklenen` alanı eklendi:
  - `"ayni"` (varsayılan): 0 piksel fark.
  - `"degisti"`: fark serbest, ama çizim hatası yok, JPEG depoda ve `onay` gerekçesi zorunlu. Onaysız "değişti" kaydının testte kaldığı elle denendi.

**2. Sözlük notu 0010'a iş bırakıyordu.**
- Sorun: "Gerçek kullanım gelince buraya örnek eklenir" cümlesi, 0010'un "sözlüğe dokunulmadı" DoD'siyle çelişiyordu.
- Çözüm: not kalıcı hâle getirildi ("İlk kullanım: spec 0010 …"). Sözlüğün ortak kurallarına kanıt eşlemesinin nasıl ekleneceği yazıldı.

**Testler:** `uyari-seridi-sozluk.test.js` AC-11 ve AC-12 (yeni test dosyası); `tasarim-kaynak.test.js` AC-12 bloğu JSON'dan okuyor.

**Sonuç:** 182 dosya / 1981 test yeşil, lint 0 hata.

---

## 9. Analist incelemesi sonrası (2026-09-24)

Analist R2'yi kabul etti ve iki kural ekledi:
- **AC-11b:** `onay` biçimi `Takım Yöneticisi · YYYY-AA-GG · spec <no> <madde>`, yalnız Takım Yöneticisi açar.
- **AC-11c:** `degisti` kalıcı değildir; spec `done`'a taşınırken kayıtlar `ayni`ye çevrilir.

Ayrıca `specs/done/0009`'a bir iz notu düştü ve 0010 buna göre güncellendi:
- dal kararı;
- `0010a`/`0010b` raporları;
- eşleme kaydı;
- AC-25 (`role="status"` bilerek kabul);
- AC-26 (öğe düzeyinde görünüm testi).

**Uygulama:** iki kural yeni `tests/kanit-eslemesi.test.js` ile denetleniyor (mevcut testlere dokunulmadı):
- Eşlemedeki her kayıt denetleniyor: `onay` biçimi ve geçerli tarih; `done`'daki bir spec'e ait `degisti` kaydı kalamaz.
- Bugün eşlemede `degisti` kaydı olmadığı için kural örnek kayıtlarla ayrıca sınanıyor (doğru ve yanlış biçimler, geçersiz tarih, done'daki spec).
- Sözlük, eşleme açıklaması ve `CLAUDE.md` iki kuralı anlatıyor.

**Sonuç:** 183 dosya / 1985 test yeşil, lint 0 hata.
