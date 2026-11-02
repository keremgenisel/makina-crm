# 0122 — Set içeriğinde bileşen parçası aramayla seçilir

| | |
|---|---|
| **Durum** | Uygulandı, kapanış bekliyor (2026-11-02; plan `specs/0122-uygulama-plani.md`, plan turu Karar 25–32, uygulama Karar 33–35). Kökeni: 2026-11-02. İki karar aynı gün verildi (tıklama satırı hemen ekler, yinelenen parçada bugünkü uyarı korunur). **QA boşluk analizi 2026-11-02, 22 bulgu işlendi**; ikinci karar bu turda ters çevrildi (uyarı yerine önleme, Karar 5). |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/PartManager.jsx` (yalnız `SetIcerigiAlani`'nın seçici satırı), `src/lib/urunAgaci.js` (yer tutucu sabiti ve `setBilesenAdaylari` eklenir, iki ölü sabit kalkar). **Test:** `tests/ui/set-icerigi-0121.test.jsx` (yardımcılar, bir kriterin iddiası ve dört kriterin okuma yolu), yeni `tests/ui/set-aramasi-0122.test.jsx`; `tests/set-icerigi-0121.test.js` dokunulmadan geçer (ölçüm 29). **Kanıt:** `docs/evidence/kanit-eslemesi.json` (yeni kayıtlar eklenir, R15), `scripts/evidence/0009-sayfa.jsx` (yeni `odak:` adımı ve `katalog-parca-0122-panel` ekranı). **Belge:** `CLAUDE.md`, `docs/tasarim-sozlugu.md` (arama seçicisi kuralı ve erişilebilirlik borcu), `specs/README.md` (kuyruk satırı `:31`, paragraf `:52` ve tablo satırı `:203` zaten yazılı, ölçüm 28). **Dokunulmayan dosya adıyla:** `src/components/ui.jsx` (R9, R10, C4). Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme, yazdırma ve dışa aktarma dokunulmaz. |
| **Bağımlı spec'ler** | 0121 (setin içeriği bölümünü, küme kuralını ve metin sabitlerini kuran spec). 0099 ile ortak dosyası var ama kriteri yok: toplam kutusunun tek kaynak kuralı (AC-26) bu işte korunur. |
| **Ters çevrilen kriterler** | Spec 0121'in **bir kriterinin iddiası** değişir: **AC-4** (içerikte olan parça ikinci kez seçilirse "adedini artırın" uyarısı yazar) yerini önlemeye bırakır, çünkü `SearchPick`'in seçim onayı koşulsuz yazılıyor ve uyarıyla aynı anda çelişen iki mesaj çiziliyordu (Karar 5, ölçüm 9). **Dört kriterin yalnız okuma yolu** değişir, iddiası aynı kalır: AC-1/AC-54'ün "Bileşen Ekle düğmesi çizilir" yarısı (düğme kalkıyor), AC-5/AC-6'nın `<option>` listesini okuması (panelden okunur; kümeye "içeriğe zaten eklenmiş parça" şartı eklenir), AC-2/AC-3'ün iki adımlı yardımcıları (`bilesenSec` + `bilesenEkle` tek tıkla birleşir) ve AC-54 taramasının metin listesindeki "Bileşen Ekle". Ölçüldü (ölçüm 30): başka hiçbir test seçiciyi okumuyor, `tests/set-icerigi-0121.test.js` saf motoru sınıyor ve dokunulmadan geçer. |

---

## Intent

Setin içeriği bölümünde bileşen parçası bugün açılır listeden seçiliyor. Katalogda 380 canlı parça var ve hepsi bileşen adayı, yani liste 380 satırlık bir kaydırma listesi: aradığı parçayı bulmak için kullanıcının bütün kataloğu gözle taraması gerekiyor. Uygulamanın öteki beş parça ve kalıp seçicisi yıllardır arama kutusu kullanıyor, bu bölüm tek istisna. Takım Yöneticisi burada da arama kutusu istiyor. Bu iş bittiğinde bileşen adı yazılarak bulunur, tıklanan parça satır olarak düşer, kayıt gövdesi ve bütün set hesapları birebir aynı kalır.

---

## Requirements

### A. Seçici

- **R1.** Bileşen seçicisi `SearchPick` olur: kutuya yazılan metinle aranır, panelde tıklanan parça içerik satırı olarak eklenir. Bugünkü `Select` ve yanındaki "Bileşen Ekle" düğmesi kalkar.
- **R1/2.** Seçicinin **tutamağı yer tutucu metnidir** (R4'ün sabiti): `ui.jsx`'in kutusu erişilebilir ad taşımaz (ölçüm 8) ve `ui.jsx` bu işte donuktur (R10), yani bugünkü `aria-label="Bileşen parçası"` tutamağı kalkar. Kutu `within(screen.getByTestId("set-icerigi")).getByPlaceholderText(SABIT)` ile bulunur, panelin seçenekleri `.sp-option` sınıfıyla okunur, seçim `fireEvent.focus` + `fireEvent.mouseDown` ile sürülür. Üçü de kurulu desen (`tests/ui/parca-suzgeci-0120.test.jsx`, `tests/ui/toplu-yedek-parca-0111.test.jsx`). `ui.jsx`'e etiket eklenmez (X9).
- **R1/3.** Arama kutusu bölümün **tam genişliğini** kaplar: bugünkü iki sütunlu ızgara (`minmax(160px, 2fr) auto`) kalkan düğme içindi, ikinci sütun boş kalırdı. `SearchPick` panelini kendi sarmalayıcısına göre `left: 0; right: 0` ile açtığı için dar bir sütun paneli de daraltır ve 139 karaktere kadar uzayan adlar kırpılır (ölçüm 13).
- **R2.** Aday kümesi **içeriğe zaten eklenmiş parçanın çıkarılması dışında değişmez**: `urunAgaci.setBileseniSecilebilirMi(p, kendiId)` ile süzülen canlı, içeriği olmayan ve parçanın kendisi olmayan parçalar. İki yönlü iç içe set yasağı, çöp süzmesi ve sıra bugünkü hâliyle kalır; kümeyi belirleyen ikinci bir kural ekranda yazılmaz.
- **R2/2.** İçerikte satırı olan parça **panelde listelenmez** (R7'nin önlemesi). Kural `src/lib/urunAgaci.js`'te yeni bir yardımcıya yazılır, `setBilesenAdaylari(parts, kendiId, satirlar)`, ve o yardımcı `setBileseniSecilebilirMi`'yi çağırır; ekran kendi süzmesini yazmaz (C2). Bugünkü aday kümesi bu süzmeyi yapmıyordu (ölçüm 11).
- **R3.** Panel etiketi parçanın **adıdır** (`p.ad`). Koda, modele ya da tipe yer verilmez.
- **R3/2.** Etiket ve anahtar prop'ları emsalin kuralıyla geçilir: `getLabel={p => p.ad}` ve `getKey={p => p.id}`. `SearchPick`'in varsayılan anahtarı etikete eşittir (ölçüm 12), yani anahtar geçilmezse aynı ada sahip iki parça React anahtarını çakıştırır; sekiz çağrının hepsi kimliği geçiyor.
- **R4.** Arama kutusunun yer tutucusu `src/lib/urunAgaci.js`'te yeni bir sabittir ve ekranda yerel kopyası olmaz (0121 AC-54 taraması bu kuralı zaten ölçüyor).
- **R4/2.** Sabit `SET_BILESEN_ARA = "Bileşen ara..."` olur: R1/2 ile tutamak hâline geldiği için öteki çağıranların `"Parça ara..."` metninden ayrı durur, yoksa iki arama kutusunu birlikte çizen bir test sorguyu ayırt edemez. Boş sonuç metni için bölüm prop geçmez, `ui.jsx`'in varsayılanı (`"Bulunamadı."`) kullanılır ve böylece altı çağıranın metni aynı kalır (X8, X11).
- **R5.** Seçicinin **yeri değişmez**: içerik satırlarının altında, toplam kutusunun üstünde, bugünkü kabın içinde. Panel aşağıya mutlak konumla açıldığı için açıkken toplam kutusunu ve ipucuyu örter; seçim yapılınca ya da kutudan çıkılınca kapanır ve altı yeniden görünür.
- **R5/2.** Seçicinin bölüm içindeki **sırası** sabittir ve önüne koşullu bir öğe konmaz: `SearchPick` kendi arama metnini iç durumunda tutuyor, önündeki bir öğe görünüp kaybolursa React bileşeni yeniden kurar ve yazılmış metin silinir (0120 R5/2'nin dersi). Bugünkü yapı (başlık, sonra içerik satırları ya da boş durum, sonra seçici) bu yüzden korunur.
- **R6.** Tıklama satırı **hemen** ekler, adedi "1" başlar. İki adımlı akış (seç, sonra ekle) kalkar; ayrı bir ekleme düğmesi yazılmaz.
- **R6/2.** Boş sorguda panel **bütün adayları** katalog sırasıyla çizer (ölçüm 19); liste ada göre sıralanmaz (X10) ve sonuç sayısı sınırlanmaz. Bu beş kardeş seçicinin davranışıdır; kazanç kullanıcının yazmaya başlamasıyla gelir, listenin kısalmasıyla değil.

### B. Yinelenen parça: uyarı yerine önleme

- **R7.** İçerikte satırı olan parça **panelde hiç listelenmez**, yani ikinci kez tıklanması imkânsızdır (R2/2'nin süzmesi). Bugünkü uyarı akışı korunmaz. Ölçüm 9: `ui.jsx`'in `pick` fonksiyonu seçim onayını (`✓ "<ad>" eklendi`) **koşulsuz** yazıyor ve ebeveynin satırı reddettiğini bilmiyor; onay kutusu da kutunun hemen altında, uyarının üstünde çiziliyor. Uyarı korunsaydı kullanıcı üst üste yeşil "eklendi" ile kırmızı "zaten var" cümlesini görürdü ve `ui.jsx` donuk olduğu için onay bastırılamazdı. Önleme, Takım Yöneticisi'nin 2026-11-02 gerekçesini ("sessiz yoksayma kullanıcıya tıklamanın işlemediğini düşündürür") uyarıdan daha iyi karşılar: tıklanacak bir şey kalmaz. Model kiti seçicisinin sessiz yoksaması bundan ayrıdır, orada öğe listede kalır ve tıklama hiçbir şey yapmaz.
- **R8.** Uyarı durumu (`uyari`) ve onu temizleyen satırlar bileşenden kalkar. `SET_AYNI_PARCA` metni **silinmez**: tek doğrulayıcının (`setIcerigiDogrula`) yinelenen satır hatasıdır ve kaydın biçimini savunmaya devam eder (ölçüm 20).

### C. Yayılma ve temizlik

- **R9.** Ekleme ve düzenleme formları aynı bileşeni çağırdığı için ikisi birlikte değişir; forma özel ikinci bir seçici yazılmaz.
- **R9/2.** İki formun kümesi tek kuraldan gelir: ekleme formu `kendiId` geçmez (yeni parçanın kimliği yoktur) ve geçmemeye devam eder, düzenleme formu `kendiId={editId}` geçer. İkisi de `setBilesenAdaylari`'nı çağırır; forma özel ikinci bir süzme yazılmaz.
- **R10.** `src/components/ui.jsx` dokunulmaz: `SearchPick`'in paneli, arama normalizasyonu, "eklendi" onayı ve odak davranışı bugünkü hâliyle kullanılır. `SearchPick`'in öteki çağıranları da dokunulmaz.
- **R10/2.** Sayım düzeltilir (ölçüm 23): `SearchPick`'in **sekiz çağrısı beş dosyada** duruyor. Katalog seçicisi beş çağrı dört dosyada (`ServiceForm.jsx:413`, `YedekParcaSatisForm.jsx:188` ve `:223`, `PartSaleForm.jsx:194`, `ModelsManager.jsx:239`), müşteri ve bayi seçicisi üç çağrı iki dosyada (`YedekParcaSatisForm.jsx:98` ve `:130`, `TahsisModal.jsx:44`). Bağlam bölümünün ilk yazımı "dört katalog seçicisi" deyip beş atıf sayıyordu ve `TahsisModal`'ı katalog seçicisi sayıyordu; dokunulmazlık taraması dosya değil **çağrı** sayısıyla ölçülür, yoksa `YedekParcaSatisForm`'un iki seçicisi kapsam dışı kalır.
- **R11.** Ölü kalan iki metin sabiti (`SET_PARCA_SEC`, `SET_BILESEN_EKLE`) silinir ve 0121 AC-54 taramasının metin listesi güncellenir: "Bileşen Ekle" listeden çıkar, yeni yer tutucu girer. Kullanılmayan sabit, ileride yanlış yere geri konulan bir metnin kaynağı olur.
- **R11/2.** Temizlik kapsamı: `secim` ve `uyari` durumları ile `ekle` fonksiyonu bütünüyle kalkar, ölü durum bırakılmaz. `Select` içe aktarımı **kalır** (PartManager'da iki kullanımı daha var: hammadde tedarikçisi alanı ve tedarikçi süzgeci, ölçüm 21); yalnız `SET_PARCA_SEC` ve `SET_BILESEN_EKLE` içe aktarım listesinden çıkar. `SET_PARCA_SECILMEDI` da kalır (R8).
- **R12.** Tasarım sözlüğüne arama seçicisi kuralı yazılır: seçenekler bir **katalog** büyüklüğündeyse (onlarca ve üstü, parça, kalıp, müşteri) seçici `SearchPick`'tir; `Select` ile `Segment` arasındaki bugünkü ölçü (0042 R10) kısa listeler için geçerli kalır. Kural yazılmazsa bir sonraki katalog seçicisi yine açılır liste olarak doğar.
- **R12/2.** Kural `### Ne zaman açılır liste? (spec 0042 R10)` alt bölümüne **düz metinle** yazılır, dosya adları ters tikle anılır ve `:satır` taşıyan bir `**Örnek:**` satırı yazılmaz. Ölçüm 18: o alt bölüm `## Segment` bölümünün içindedir ve `tests/tasarim-kaynak.test.js` (AC-20) o bölümdeki her `**Örnek:** `src/...:<satır>`` satırının gösterdiği satırda `<Segment` geçmesini ister. Emsal spec 0096 C14'ün aynı alt bölüme yazılmış istisnasıdır. Kural ayrı bir bölüme taşınmaz: seçici seçen kişi oraya bakar.
- **R13.** Bölümün geri kalanı dokunulmaz: satır biçimi (`{ partId, miktar }`), adet alanı ve hataları, kaldırma düğmesi, doğrulama, kayıt yolu, toplam kutusu ve maliyet zinciri, Set Hazırla penceresi ve stok hareketleri.

### D. Erişilebilirlik, kanıt ve ölçüm (QA turu, 2026-11-02)

- **R14.** Etiketli bir denetim etiketsiz hâle geldiği için borç yazılır: `SearchPick`'in erişilebilir adı yalnız yer tutucudur ve yer tutucu etiket değildir. Sözlüğün **"Erişilebilirlik borcu"** bölümüne (`docs/tasarim-sozlugu.md`) bu, **altı çağıranın ortak borcu** olarak yazılır ve ayrı iş önerilir. Bölüme görünür etiket ya da yeni bir `Field` eklenmez: `BolumBasligi` alanı zaten adlandırıyor; `ui.jsx`'e etiket eklemek altı çağıranı birden etkiler (X9). Ödenmeyen borcu yazmak projenin kurulu usulüdür (0009 X4/X6, 0014 Z4, ölçüm 17).
- **R15.** Kanıt turu üç kuralla yürür. **(a)** Hangi ekranın değiştiği **ölçülür**: on üç `katalog-parca*` ekranının her biri ayrı bir çapaya kaydırıyor ve yalnız ikisi (`katalog-parca-0121-set`, `katalog-parca-0121-bos`) "Setin içeriği"ne kaydırıyor (ölçüm 14); set bölümü `giderYetki`'ye bağlı olmadığı için `katalog-parca-0099-yetkisiz` de bölümü çiziyor. Gerçekten değişen ekranların kaydı `beklenen: "degisti"` ve onay satırıyla, değişmeyenler `ayni` olur. **(b)** Kayıtlar **eklenir, güncellenmez**: bugünkü `katalog-parca*` kayıtları `0121-taban-piksel-raporu.json`'u gösteriyor ve 0121 `specs/done`'da, yani o ölçümün tutanağına dokunulmaz; yeni kayıtlar `docs/evidence/0122-piksel-raporu.json`'u gösterir ve kapanışta `ayni`ye çevrilir (ölçüm 15). **(c)** Panelin açık hâli bir ekranla kayda geçer: kanıt aracına küçük bir `odak:<yer tutucu>` adımı eklenir (`ara:` adımı seçimle paneli kapatıyor, paneli açık bırakan adım yok, ölçüm 16) ve `katalog-parca-0122-panel` ekranı yazılan metinle açık paneli çeker. `ara:` adımı değiştirilmez (X11). Seçim yapan bir ekran eklenirse `✓ "<ad>" eklendi` onayının görüntüde olacağı bilinir: onay iki saniye duruyor, araç çekimden önce 400 ms bekliyor ve zamanlayıcı gerçek (ölçüm 22).
- **R16.** Bağlam bölümünün canlı veri ölçümleri (380 canlı parça, adayların yalnız birinde kod, en uzun ad 139 karakter) bu turda **yeniden doğrulanamadı**: `~/Library/Application Support/makina-crm` yok, proje kökünde `*.db` yok ve İndirilenler'de JSON yedek yok (ölçüm 24). Rakamlar 01.11.2026 yedeğine atıfla durur; uygulamanın **ilk adımı** güncel veriyle yeniden ölçmektir. Rakamlar X3'ün (kod aranmaz) ve Intent'in tek gerekçesidir, bu yüzden kesinlik iddia edilmez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Kaydedilen gövde birebir aynı kalır: aynı parçalar aynı sırayla seçildiğinde yazılan `setIcerigi` bugünkü koddan çıkanla özdeştir.
- **C2.** Küme kuralı tek yerde kalır: `setBileseniSecilebilirMi` ve onu çağıran `setBilesenAdaylari` (R2/2); seçici kendi süzmesini yazmaz.
- **C3.** **Bölümün kendi** metinleri `src/lib/urunAgaci.js`'ten gelir. `SearchPick`'in iki metni bunun dışındadır ve adıyla kabul edilen istisnadır: seçim onayı (`✓ "<ad>" eklendi`) prop değildir, boş sonuç metninin varsayılanı (`"Bulunamadı."`) ise sekiz çağrının hiçbirinde geçilmiyor (ölçüm 10). `ui.jsx` donuk olduğu için ikisi taşınamaz (X8).
- **C4.** Bu iş yalnız bir bölümün seçici satırını değiştirir: hesap, veri, izin ve sunucu tarafına hiçbir satır yazılmaz (tarama ile doğrulanır).
- **C5.** Görsel kanıt R15'in üç kuralıyla alınır: set bölümü hem ekleme hem düzenleme formunda çizildiği için `katalog-parca*` ekranlarının bir bölümü bilinçli değişir, hangileri olduğu ölçülür ve yalnız onların kaydı `degisti` + onay olur. `ayarlar-yedekparca*` liste ekranları 0 piksel fark vermelidir.
- **C6.** C1'in ölçümü için yeni altın dosya yazılmaz: 0121 AC-2 gövdeyi birebir sabitliyor ve saf `tests/set-icerigi-0121.test.js` gövdeyi üreten doğrulayıcıyı dokunulmadan sınıyor (ölçüm 29). İkisi birlikte C1'in kanıtıdır.
- **C7.** `specs/README.md` bu iş için zaten yazılı (kuyruk satırı `:31`, paragraf `:52`, tablo satırı `:203`; ölçüm 28): aynı metin ikinci kez yazılmaz. 0126'nın paragrafındaki 0122 atfı Karar 5'ten etkilenmez, çünkü o atıf yalnız satır içi çözümün Evrak tablosuna kopyalanamamasıyla ilgilidir.

### KAPSAM DIŞI

- **X1.** Hammadde tedarikçisi seçicisi açılır liste kalır — *neden:* tedarikçi listesi kısa, bugünkü ölçü (0042 R10) orada açılır listeyi istiyor.
- **X2.** Set Hazırla penceresine seçici eklenmez — *neden:* orada seçim yapılmıyor, bileşenler setin içeriğinden geliyor.
- **X3.** Arama kodu, modeli ya da parça tipini aramaz — *neden:* 380 adayın yalnız birinde kod dolu, etikete kod eklemek 139 karaktere kadar uzayan adların yanında satırı daha da uzatırdı.
- **X4.** Seçici bölümün üstüne taşınmaz — *neden:* bölümün okuma sırası (içerik, sonra ekleme) korunur ve panel seçimde kapanıyor; yer değişikliği kanıt farkını büyütür, kazancı yok.
- **X5.** Klavyeyle gezinme (ok tuşları, Enter ile seçme) eklenmez — *neden:* `SearchPick` bütün uygulamada aynı davranıyor; klavye desteği altı çağıranı birden etkileyen ayrı iştir.
- **X6.** Tek panelde çoklu seçim yok — *neden:* panel her seçimde kapanıyor, bu bütün uygulamada aynı; adet satır başına giriliyor.
- **X7.** Set rozeti panelde gösterilmez — *neden:* içeriği olan parça aday değil, listede hiç görünmüyor.
- **X8.** `SearchPick`'in iki metni `urunAgaci.js`'e taşınmaz — *neden:* biri prop değil, ikisi de `ui.jsx`'te sabit ve o dosya bu işte donuk (C3).
- **X9.** `SearchPick`'e erişilebilir ad eklenmez — *neden:* altı çağıranı birden etkiler, borç sözlüğe yazılır ve ayrı iş önerilir (R14).
- **X10.** Panelin adayları ada göre sıralanmaz — *neden:* R2 sırayı korur ve beş kardeş seçici de katalog sırasını çiziyor; sıralama altı çağıranı birden ilgilendirir.
- **X11.** Kanıt aracının `ara:` adımı değiştirilmez, yalnız yeni `odak:` adımı eklenir — *neden:* beş çağıranın bugünkü kanıt adımları kaymasın (0117 Karar 51'in dersi).

---

## Context

Ölçümler 01.11.2026 yedeğiyle ve bugünkü kaynakla yapıldı.

1. **Bugünkü seçici 380 seçenek çiziyor.** Katalogda 380 canlı parça var ve hiçbirinde `setIcerigi` yok, yani bugün bütün katalog bileşen adayıdır. Spec 0121'in ön koşulu gereği içerikler elle girilecek; ilk set tanımlanana kadar liste 380 satır kalır.
2. **Kod aramaya yaramaz.** 380 adayın yalnız **1'inde** `kod` alanı dolu. En uzun parça adı 139 karakter, ilk beşi 90 karakterin üstünde.
3. **Bugünkü kod.** Bileşen `PartManager.jsx:185`; aday kümesi `:188`; yinelenen denetimi ve uyarı `:192`; açılır liste `:217` (`aria-label="Bileşen parçası"`); ekleme düğmesi `:221`. İki form aynı bileşeni çağırıyor: `:595` ekleme, `:654` düzenleme.
4. **`SearchPick` hazır ve uygun.** `ui.jsx:162`; arama `aramaNormalize` ile (`:168`, Türkçe harf katlamalı), sonuç sayısı sınırsız, panel kaydırmalı (`maxHeight: 220`), tıklama seçer ve paneli kapatır, kısa bir "eklendi" onayı çizilir.
5. **Emsal: model kiti seçicisi birebir aynı şekle sahip.** `ModelsManager.jsx:239` parça seçimini `SearchPick` ile yapıyor, tıklamada satırı adet "1" ile ekliyor ve yineleneni sessizce yoksayıyor. Öteki katalog seçicileri: `ServiceForm.jsx:413`, `YedekParcaSatisForm.jsx:188` ve `:223`, `PartSaleForm.jsx:194`. Yani katalog seçicisi beş çağrı dört dosyada arama kutusudur ve tek açılır liste istisnası bu bölümdür; `SearchPick`'in üç çağrısı daha var ama onlar müşteri ve bayi seçicisidir (`YedekParcaSatisForm.jsx:98` ve `:130`, `TahsisModal.jsx:44`), toplam sekiz çağrı beş dosya (Karar 24, ölçüm 23).
6. **Sözlükte kural yok.** `docs/tasarim-sozlugu.md:68` yalnız `Segment` ile `Select` arasındaki ölçüyü yazıyor; arama seçicisinin ne zaman kullanılacağı yazılı değil, bu yüzden 0121'de bölüm açılır listeyle doğdu.
7. **Testlerin okuma yolu.** `tests/ui/set-icerigi-0121.test.jsx:47` seçiciyi `getByLabelText("Bileşen parçası")` ile, `:48` düğmeyi adıyla buluyor; AC-5/AC-6 (`:90`) seçeneği `option` listesinden okuyor; AC-54 taraması (`:233`) metin listesinde "Bileşen Ekle"yi arıyor. Bunların dışında seçiciyi okuyan test yok.

### QA turu ölçümleri (2026-11-02)

8. **Arama kutusunun erişilebilir adı yok.** `ui.jsx:175-182` kutuyu çıplak bir `<input className="input">` olarak çiziyor; yalnız `placeholder` taşıyor, `aria-label`, `id` ve `data-testid` yok. Sekiz çağrının hiçbiri etiket geçmiyor, testlerin hepsi `getByPlaceholderText` kullanıyor.
9. **Seçim onayı koşulsuz yazılıyor.** `ui.jsx:169-175` `pick` fonksiyonu `onPick(it)`'ten sonra `setJustAdded(getLabel(it))` çağırıyor, ebeveynin satırı reddettiğini bilmiyor; onay kutusu kutunun hemen altında (`marginTop: 6`), uyarının üstünde.
10. **İki kullanıcı metni `ui.jsx`'te sabit.** Seçim onayı `✓ "<ad>" eklendi` (`:180`) prop değil; boş sonuç metni `emptyText` varsayılanı `"Bulunamadı."` (`:162`, `:172`) prop ama sekiz çağrının hiçbirinde geçilmiyor.
11. **Aday kümesi zaten eklenmiş parçayı süzmüyor.** `PartManager.jsx:188` yalnız `setBileseniSecilebilirMi`'yi uyguluyor, yani ikinci tıklama bugün her zaman mümkün.
12. **`getKey` varsayılanı etikete eşit.** `ui.jsx:162` `getKey = (x) => getLabel(x)`; sekiz çağrının hepsi `getKey={x => x.id}` geçiyor.
13. **Bugünkü seçici kabı iki sütunlu.** `PartManager.jsx:216` ızgarası `minmax(160px, 2fr) auto` ve ikinci sütun yalnız kalkan düğme içindi; `SearchPick` panelini `left: 0; right: 0` ile kendi sarmalayıcısına göre açıyor (`ui.jsx:184`).
14. **On üç `katalog-parca*` ekranı ayrı çapalara kaydırıyor.** `scripts/evidence/0009-sayfa.jsx:904-923`: yalnız `katalog-parca-0121-set` ve `-0121-bos` "Setin içeriği"ne; ötekiler "Hammadde tedarikçileri", "Alış maliyeti", "Maliyet geçmişi", "Parça Tipi" ve "Kullanıldığı Modeller ve Kit Adetleri"ne.
15. **`degisti` kaydı sıfır farkı da kabul ediyor.** `tests/kanit-eslemesi.test.js` yalnız onay biçimini ve spec'in `specs/done`'da olmamasını denetliyor (AC-11b/AC-11c), fark miktarına bakmıyor; yani yanlış kayıt testi kırmaz, sessizce yanlış belge bırakır.
16. **Paneli açık bırakan kanıt adımı yok.** `0009-sayfa.jsx:1593` `ara:` adımı odaklanıp yazıyor ve seçeneğe `mousedown` gönderiyor, yani paneli kapatıyor.
17. **Sözlükte erişilebilirlik borcu bölümü var, `SearchPick` yazılı değil.** `docs/tasarim-sozlugu.md:432` dört borcu sayıyor (`KartBolum` başlığı, `Segment` sekme gezinmesi, iki kontrast), arama kutusunun etiketsizliği listede yok.
18. **Sözlük kuralının yeri biçim denetimine bağlı.** `### Ne zaman açılır liste? (spec 0042 R10)` `:68`, `## Segment` bölümü `:30`-`:85` arası; `tests/tasarim-kaynak.test.js:102-109` (AC-20) o bölümdeki her `**Örnek:**` satırının gösterdiği kaynak satırında `<Segment` arıyor.
19. **Boş sorguda panel bütün adayları çiziyor.** `ui.jsx:168` `filtered = q.trim() ? items.filter(...) : items`; sıra `items`'ın sırasıdır, yani kataloğun.
20. **`SET_PARCA_SECILMEDI` yalnız doğrulayıcıda.** `urunAgaci.js:404`; tıklama her zaman kimlik yazdığı için formda boş `partId` kalmaz, ama `setIcerigiFormu` bozuk bir kayıttan boş kimlik üretebilir.
21. **PartManager'da üç `<Select` var.** `:144` hammadde tedarikçisi alanı, `:217` bu seçici, `:473` hammadde tedarikçisi süzgeci; biri kalkınca ikisi kalır.
22. **Onay kutusu iki saniye duruyor.** `ui.jsx:174` `setTimeout(..., 2000)` gerçek zamanlayıcı; `tests/ui/set-icerigi-0121.test.jsx:18` yalnız `Date`'i taklit ediyor (`toFake: ["Date"]`), kanıt aracı çekimden önce 400 ms bekliyor.
23. **`SearchPick` çağrı sayımı.** Sekiz çağrı beş dosyada: `ServiceForm.jsx:413`, `YedekParcaSatisForm.jsx:98`, `:130`, `:188`, `:223`, `PartSaleForm.jsx:194`, `TahsisModal.jsx:44`, `ModelsManager.jsx:239`. Bağlamın ilk yazımı "dört katalog seçicisi" deyip beş atıf sayıyordu, `TahsisModal`'ı (müşteri seçicisi) katalog sayıyordu ve `YedekParcaSatisForm`'un müşteri ile bayi seçicilerini anmıyordu.
24. **Canlı veri ölçümleri doğrulanamadı.** `~/Library/Application Support/makina-crm` dizini yok, proje kökünde `*.db` yok, İndirilenler'de JSON yedek yok; 380 canlı parça, "yalnız birinde kod" ve 139 karakterlik ad bu turda yeniden ölçülemedi.
25. **Var olan taramalar yeni koda sınır koyuyor.** `tests/kirilim-toplami-0099.test.js:30-31` PartManager'da `reduce(` ve `+=` sayısını sıfırda tutuyor (satır numarası sabitlemiyor, hepsi düzenli ifade); `tests/hammadde-0096.test.js:235` PartManager'ın `<Segment` içermemesini, `:209` form durumundaki dört `.maliyet` okumasını sabitliyor. `parts.filter(...)` üçünü de karşılıyor.
26. **Panel modalda kırpılmıyor.** Set bölümü formun ortasında (altında Parça Tipi, Resim, Kullanıldığı Modeller var, `PartManager.jsx:596-607`), panel 220 piksel yükseklikte ve `zIndex: 30`. 0126'nın Evrak tablosundaki yatay kaydırma sorunu burada yok.
27. **Türkçe katlama doğrulandı.** `utils.js:150` `trLower` İ→i ve I→ı yapıyor, `:156` `aramaNormalize` ardından ç/ğ/ı/ö/ş/ü katlıyor; "ISITICI", "ısıtıcı" ve "isitici" aynı sonucu veriyor (AC-2'nin iddiası tutuyor).
28. **`specs/README.md` zaten yazılı.** Kuyruk satırı `:31`, 0122 paragrafı `:52`, tablo satırı `:203`; üçü de çalışma ağacında duruyor.
29. **C1'in kanıtı yerinde.** `tests/ui/set-icerigi-0121.test.jsx` AC-2 gövdeyi birebir sabitliyor (`[{ partId: 7, miktar: 3 }, { partId: 8, miktar: 1 }]`); saf `tests/set-icerigi-0121.test.js` kalkan iki sabiti hiç anmıyor, dokunulmadan geçer.
30. **Bağlamın kaynak atıfları doğrulandı.** `PartManager.jsx:185`, `:188`, `:192`, `:217`, `:221`, `:595`, `:654` ve `tests/ui/set-icerigi-0121.test.jsx:47`, `:48`, `:93`, `:236` iddia edildiği gibi; seçiciyi okuyan başka test yok.

### QA turunda verilen kararlar (2026-11-02)

Takım Yöneticisi'nin 2026-11-02 istemiyle birlikte verdiği iki karar **Karar 1** (tıklama satırı hemen ekler, iki adımlı akış ve "Bileşen Ekle" düğmesi kalkar) ve **Karar 2** (yinelenen parçada bugünkü uyarı korunur, model kiti seçicisinin sessiz yoksaması kopyalanmaz). QA turunun 22 bulgusu **Karar 3 - 24** olarak onaylandı; **Karar 5, Karar 2'yi ters çevirir.**

- **Karar 3 (Bloklayıcı).** Seçicinin tutamağı yer tutucu sabitidir; panel `.sp-option` ile okunur, seçim `focus` + `mouseDown` ile sürülür ve `ui.jsx`'e etiket eklenmez. *Neden:* arama kutusunun erişilebilir adı yok ve `ui.jsx` donuk, yani yedi kriter bugünkü hâliyle ölçülemezdi; tutamak yazılmazsa uygulayıcı ya yasaklı dosyayı açar ya her kriteri kendi bulduğu yolla ölçer. → **R1/2, AC-17**
- **Karar 4 (Bloklayıcı).** C3 bölümün kendi metinlerine daraltılır; `SearchPick`'in iki metni adıyla kabul edilen istisnadır ve boş sonuç metni varsayılanda bırakılır. *Neden:* seçim onayı prop değil, yani zorunlu kısıt bugünkü hâliyle karşılanamıyordu ve uygulayıcıyı R10'u kırmaya zorluyordu. → **C3, R4/2, X8, AC-22**
- **Karar 5 (Bloklayıcı).** Yinelenen parçada uyarı yerine **önleme**: içerikte satırı olan parça panelde listelenmez, kural `setBilesenAdaylari` ile `urunAgaci.js`'te durur, `SET_AYNI_PARCA` doğrulayıcıda kalır. *Neden:* `pick` onayı koşulsuz yazılıyor, yani uyarı korunsa yeşil "eklendi" ile kırmızı "zaten var" aynı anda çizilirdi ve `ui.jsx` donuk olduğu için bastırılamazdı; önleme Takım Yöneticisi'nin gerekçesini uyarıdan daha iyi karşılar. → **R2/2, R7, R8, C2, AC-19, AC-20**
- **Karar 6 (Önemli).** Etiket ve anahtar prop'ları `getLabel={p => p.ad}`, `getKey={p => p.id}` olarak yazılır. *Neden:* varsayılan anahtar etikete eşit, yani aynı ada sahip iki parça React anahtarını çakıştırır; sekiz çağrının hepsi kimliği geçiyor. → **R3/2, AC-21**
- **Karar 7 (Önemli).** Arama kutusu bölümün tam genişliğini kaplar, iki sütunlu ızgara kalkar. *Neden:* panel kendi sarmalayıcısının genişliğinde açılıyor, dar sütunda 139 karakterlik adlar kırpılırdı; karar yazılmazsa iki makul uygulama iki ayrı kanıt turu demektir. → **R1/3, AC-18**
- **Karar 8 (Önemli).** Hangi kanıt ekranının değiştiği ölçülür; yalnız gerçekten değişenler `degisti` olur. *Neden:* on üç ekranın yalnız ikisi set bölümüne kaydırıyor ve `degisti` kaydı sıfır farkı da kabul ediyor, yani fazla iddia bir sonraki spec'in tabanında gerçek bir farkı gizler. → **R15(a), C5, AC-29**
- **Karar 9 (Önemli).** Kanıt kayıtları eklenir, 0121 kayıtları `ayni` kalır. *Neden:* kapanmış bir spec'in ölçüm tutanağını geriye dönük değiştirmek o turun kanıtını siler. → **R15(b), AC-29**
- **Karar 10 (Önemli).** Kanıt aracına `odak:` adımı eklenir ve `katalog-parca-0122-panel` ekranı açık paneli çeker. *Neden:* işin tek yeni görseli paneldir ve `ara:` adımı onu kapatıyor; kayda geçmezse panelin biçimi, yüksekliği ve örttüğü alan hiçbir turda ölçülmemiş olur. → **R15(c), X11, AC-30**
- **Karar 11 (Önemli).** `SearchPick`'in etiketsizliği sözlüğün "Erişilebilirlik borcu" bölümüne altı çağıranın ortak borcu olarak yazılır, bölüme yeni etiket eklenmez. *Neden:* `ui.jsx` donuk olduğu için borç bu işte ödenemez; ödenmeyen borcu yazmak kurulu usuldür. → **R14, X9, AC-28**
- **Karar 12 (Önemli).** Sözlük kuralı "Ne zaman açılır liste?" alt bölümüne düz metinle yazılır, `:satır` taşıyan `**Örnek:**` satırı yazılmaz. *Neden:* o alt bölüm `## Segment`'in içinde ve biçim denetimi örnek satırında `<Segment` arıyor; AC-16'nın "örnek olarak gösterir" ifadesi uygulayıcıyı tam o tuzağa sürüklüyordu. → **R12/2, AC-27**
- **Karar 13 (Küçük).** Yer tutucu sabiti `SET_BILESEN_ARA = "Bileşen ara..."`. *Neden:* tutamak hâline geldiği için öteki çağıranların `"Parça ara..."` metninden ayrı durmalı. → **R4/2, AC-22**
- **Karar 14 (Küçük).** Boş sorguda panel bütün adayları katalog sırasıyla çizer; sıralama ve sonuç sınırı eklenmez. *Neden:* beş kardeşin davranışı budur; yazılmazsa biri "liste yine 380" diye bulgu açar ya da sıralama ekleyip R2'yi kırar. → **R6/2, X10, AC-23**
- **Karar 15 (Küçük).** `SET_PARCA_SECILMEDI` silinmez. *Neden:* ekrandan ulaşılamaz hâle gelse de tek doğrulayıcının yinelenen satır savunmasıdır ve bozuk bir kayıttan boş kimlik gelebilir. → **R8, R11/2, AC-26**
- **Karar 16 (Küçük).** `secim`, `uyari` ve `ekle` bütünüyle kalkar, ölü durum bırakılmaz. *Neden:* üçü de yalnız iki adımlı akış içindi. → **R11/2, AC-26**
- **Karar 17 (Küçük).** Onay kutusunun iki saniyelik ömrü yazılır. *Neden:* seçim yapan bir kanıt ekranı eklenirse onay her çekimde görüntüde olur; testlerin sahte zamanlayıcısı yalnız `Date`'i taklit ediyor. → **R15(c)**
- **Karar 18 (Küçük).** Seçicinin önüne koşullu öğe konmaz, bugünkü sıra korunur. *Neden:* 0120 R5/2'nin dersi, önündeki koşullu öğe bileşeni yeniden kurar ve yazılmış arama metnini siler. → **R5/2, AC-32**
- **Karar 19 (Küçük).** Ekleme formu `kendiId` geçmez ve iki form aynı yardımcıyı çağırır. *Neden:* 0121 AC-5 yalnız düzenleme formunu ölçüyordu, AC-10 yalnız kutunun çizildiğini; kümenin de tek kuraldan geldiği ölçülmeli. → **R9/2, AC-24**
- **Karar 20 (Küçük).** `Select` içe aktarımı korunur. *Neden:* PartManager'da iki kullanımı daha var; "kullanılmıyor" diye düşürülürse iki alan birden kırılır. → **R11/2, AC-26**
- **Karar 21 (Küçük).** Canlı veri ölçümleri yeniden doğrulanamadı; uygulamanın ilk adımı yeniden ölçmektir. *Neden:* rakamlar X3'ün ve Intent'in tek gerekçesi, doğrulanmadığı yazılmazsa kesin ölçüm gibi okunur. → **R16**
- **Karar 22 (Küçük).** `specs/README.md`'de iş kalmadı, atıf "zaten yazılı" diye işaretlenir. *Neden:* aynı metin ikinci kez yazılırdı. → **C7**
- **Karar 23 (Küçük).** C1 için yeni altın dosya yazılmaz, ölçüm 0121 AC-2 ile saf teste bağlanır. *Neden:* 0121'in kıyas deseni taklit edilip gereksiz bir `0122-once.json` üretilirdi. → **C6**
- **Karar 24 (Küçük).** Çağıran sayımı düzeltilir: sekiz çağrı beş dosya; dokunulmazlık taraması çağrı sayısıyla ölçülür. *Neden:* bağlamın ilk yazımı "dört" deyip beşi sayıyordu, `TahsisModal`'ı katalog seçicisi sanıyordu ve iki çağrıyı hiç anmıyordu, yani tarama dosya sayısıyla yazılsa iki seçici kapsam dışı kalırdı. → **R10/2, AC-25**

### Plan turunda verilen kararlar (2026-11-02)

Takım Yöneticisi planın bütün önerilerini 2026-11-02'de onayladı.

- **Karar 25.** R16'nın ölçüm yolu düzeltilir: uygulamanın verisi `~/Library/Application Support/Altunmak CRM/data.db`'dedir ama şifreli ve uygulama açıkken kullanılıyor; gerçek veritabanı açılmaz. Ölçüm en güncel yedekten salt okunur yapılır: İndirilenler'deki tek yedek `altunmak-crm-yedek-2026-11-01.zip` (ölçüm 24 yalnız düz JSON arıyordu, yedek ZIP içinde `veri.json`). Sonuç: 380 parça, 380'i canlı, 1'inde kod, en uzun ad 139 karakter, hiçbirinde içerik yok; ilk altı ad uzunluğu 139, 94, 93, 92, 90, 90 (ölçüm 2'nin "ilk beşi 90'ın üstünde" ifadesi: dördü üstünde, beşincisi tam 90). Daha yeni yedek olmadığı için rakamlar 01.11.2026 tarihlidir. → **R16**
- **Karar 26.** AC-14 ve AC-25'teki "yedi" "sekiz" olur: bugün sekiz çağrı var, işten sonra dokuz. Tarama sekiz çağrının satır metnini birebir, toplamı dokuz ve `PartManager.jsx`'teki sayıyı bir olarak sabitler. → **AC-14, AC-25**
- **Karar 27.** `ui.jsx`'in değişmediği dosya özetiyle (SHA) sabitlenmez (paylaşılan dosyaya dokunan her sonraki işi kırar, 0107 dersi): test `SearchPick` imza satırını ve kutunun `aria-label` taşımadığını sabitler; dosyanın bütünüyle değişmediği kapanışta `git diff --quiet origin/main -- src/components/ui.jsx` ile ölçülür ve plana yazılır. → **AC-14**
- **Karar 28.** AC-15 taraması iki yeni adın (`setBilesenAdaylari`, `SET_BILESEN_ARA`) `src` ve `electron` altında yalnız `urunAgaci.js` ile `PartManager.jsx`'te geçmesiyle ölçülür; değişen dosya listesi kapanışta `git diff --stat` ile plana yazılır. Altın fikstür yazılmaz. → **AC-15**
- **Karar 29.** Hangi kanıt ekranının değiştiği tahmin edilmez: on yedi `katalog-parca*` ve `ayarlar-yedekparca*` ekranı bugünkü kodla taban olarak çekilir, sonra çekimiyle karşılaştırılır, yalnız fark verenler `degisti` + onay alır. `bayi-yedek-parca-formu` kapsam dışıdır. → **R15(a), AC-29**
- **Karar 30.** AC-32'nin yapısal dayanağı (içerik dolu/boş iki dalın aynı konumda `div` olması) testle ve mutasyonla ölçülür: yazılmış ama seçilmemiş metin son satırın silinmesinden sonra kutuda kalır. → **AC-32**
- **Karar 31.** Panel ekranının adım sırası `baslik:Düzenle` → `kaydir:Setin içeriği` → `odak:Bileşen ara...=<yazı>`; panel modalda kırpılırsa bulgu olarak yazılır. → **R15(c), AC-30**
- **Karar 32.** Spec 0121'in kapanmış test dosyası kurulu usulle güncellenir: değişen her kriterde "spec 0122 ile" notu, AC-4 dışındaki iddialar aynı. → **Ters çevrilen kriterler**

### Uygulamada verilen kararlar (2026-11-02)

- **Karar 33.** R15(a)'nın beklentisi ölçümle düzeltildi: taban ile sonra çekimi karşılaştırılınca **on dört** `katalog-parca*` ekranının hepsi değişti (yalnız ikisi değil). Ölçüm 14 ekranların ayrı çapalara kaydırdığını doğru saptamıştı ama set bölümü düzenleme ve ekleme penceresinde bütün çapaların görüş alanındadır; seçici satırı 1-2 piksel kısaldığı ve düğme kalktığı için altındaki her şey kayar (fark 4.245 ile 274.963 piksel arası). Dört `ayarlar-yedekparca*` liste ekranı 0 piksel. Kayıt: on dört ekran ve yeni `katalog-parca-0122-panel` `degisti` + onay, dört liste ekranı `ayni` (rapor `0122-piksel-raporu.json`). → **R15(a), C5, AC-29**
- **Karar 34.** R5/2'nin gerekçesi mutasyonla inceltildi: seçicinin **önüne** `{kosul && <Öğe />}` biçiminde konan koşullu öğe seçiciyi yeniden kurmaz (React `false` deliğinde konumu korur, ölçüldü); yazılmış metni silen, seçicinin **üst kabının ya da konumunun dala göre değişmesidir** (ör. dolu ve boş dallarda ayrı kaplar). AC-32 bu mutasyonu yakalar. Kural metni değişmez (koşullu öğe konmaz), gerekçe daralır. → **R5/2, AC-32**
- **Karar 35.** Panel ekranı (`katalog-parca-0122-panel`) iki adaylı fikstürde "r" yazılmış açık paneli çizer; panel modalda kırpılmıyor, Parça Tipi ve Resim satırlarını örtüyor (R5'in beklediği). Çekimde `adimUyarilari` yok. → **R15(c), AC-30**

### Karar kaydı

| Bulgu | Derece | Karar | Nereye işlendi |
|---|---|---|---|
| Arama kutusunun tutamağı tanımsız | Bloklayıcı | 3 | R1/2, AC-17 |
| C3 karşılanamıyor (`ui.jsx`'in iki metni) | Bloklayıcı | 4 | C3, R4/2, X8, AC-22 |
| Yinelenen tıklamada çelişen iki mesaj | Bloklayıcı | 5 | R2/2, R7, R8, C2, AC-19, AC-20 |
| `getLabel` / `getKey` yazılmamış | Önemli | 6 | R3/2, AC-21 |
| Seçicinin genişliği ve kabı tanımsız | Önemli | 7 | R1/3, AC-18 |
| C5 fazla iddia ediyor | Önemli | 8 | R15(a), C5, AC-29 |
| Kanıt kayıtları güncellenemez | Önemli | 9 | R15(b), AC-29 |
| Panelin açık hâli kayda geçmiyor | Önemli | 10 | R15(c), X11, AC-30 |
| Erişilebilir ad kalkıyor | Önemli | 11 | R14, X9, AC-28 |
| Sözlük kuralının yeri testi kırabilir | Önemli | 12 | R12/2, AC-27 |
| Yer tutucunun metni ve sabit adı yok | Küçük | 13 | R4/2, AC-22 |
| Boş sorguda bütün adaylar | Küçük | 14 | R6/2, X10, AC-23 |
| `SET_PARCA_SECILMEDI`'nin akıbeti | Küçük | 15 | R8, R11/2, AC-26 |
| Kalkan durumlar yazılmamış | Küçük | 16 | R11/2, AC-26 |
| Onay kutusunun ömrü | Küçük | 17 | R15(c) |
| Seçicinin sırası korunmalı | Küçük | 18 | R5/2, AC-32 |
| Ekleme formunun kümesi ölçülmüyor | Küçük | 19 | R9/2, AC-24 |
| `Select` içe aktarımı | Küçük | 20 | R11/2, AC-26 |
| Ölçümler doğrulanamadı | Küçük | 21 | R16 |
| README'de iş kalmadı | Küçük | 22 | C7 |
| C1 için altın dosya gerekmez | Küçük | 23 | C6 |
| Çağıran sayımı yanlış | Küçük | 24 | R10/2, AC-25 |

---

## Acceptance Criteria

- **AC-1.** Set içeriği bölümünde arama kutusu çizilir; açılır liste ve "Bileşen Ekle" düğmesi ekranda yoktur.
- **AC-2.** Kutuya yazılan metin adında geçen parçaları listeler; Türkçe harf farkı (İ/ı, ş/s) sonucu değiştirmez.
- **AC-3.** Panelde tıklanan parça içerik satırı olarak eklenir, adedi "1" gelir ve panel kapanır.
- **AC-4.** İki bileşen seçilip kaydedilen parça set olur ve kayıt `[{ partId, miktar }]` satırlarını bugünkü sırayla taşır (0121 AC-2 ile aynı gövde).
- **AC-5.** Panelde içeriği olan parçalar, çöpteki parça, parçanın kendisi ve **içeriğe zaten eklenmiş parça** listelenmez; sıra 0121 AC-5/AC-6 ile aynıdır.
- **AC-6.** İçeriğe eklenen parça panelden **düşer**: aynı parça ikinci kez tıklanamaz, bir satır kaldırılınca parça panele geri gelir.
- **AC-7.** Ekranda yinelenen parça uyarısı yoktur; `SET_AYNI_PARCA` yalnız doğrulayıcının hata metni olarak kaynakta durur.
- **AC-8.** Adet hataları, kaldırma düğmesi ve bileşen adlarının ham diziden çözülmesi değişmez (0121 AC-3, AC-7, AC-8 dokunulmadan geçer).
- **AC-9.** Toplam kutusu, maliyet kaynağı ibaresi ve "TL fiyatı toplamına eşitle" düğmesi değişmez; `setOzeti` yine pencere başına tek çağrıdır (0099 AC-26 ve 0121 AC-51 dokunulmadan geçer).
- **AC-10.** Hem ekleme hem düzenleme formunda arama kutusu çizilir ve ikisi aynı bileşenden gelir (kaynakta tek `SearchPick` çağrısı).
- **AC-11.** İçeriği boş parçada bölüm, açıklama satırı ve arama kutusu çizilir; dokunulmadan kaydedilen parçada `setIcerigi` alanı oluşmaz.
- **AC-12.** Yer tutucu metni `urunAgaci.js`'ten gelir; `PartManager.jsx` içinde düz metin olarak geçmez.
- **AC-13.** `SET_PARCA_SEC` ve `SET_BILESEN_EKLE` kaynakta hiç geçmez.
- **AC-14.** `src/components/ui.jsx` bu işte değişmez ve `SearchPick`'in öteki **sekiz çağrısının** satırları aynı kalır (kaynak taraması; plan turu Karar 26 ile "yedi" düzeltildi).
- **AC-15.** Veri şeması, izin tanımları, sunucu kuralları ve birleştirme kuralları değişmez (tarama).
- **AC-16.** Tasarım sözlüğünde katalog büyüklüğündeki listeler için `SearchPick` kuralı yazılıdır ve bu bölümü düz metinle örnek gösterir (dosya adı ters tikle, `:satır` taşıyan `**Örnek:**` satırı olmadan; AC-27).

### QA turu kriterleri (2026-11-02)

- **AC-17.** Arama kutusu `within(getByTestId("set-icerigi")).getByPlaceholderText(SET_BILESEN_ARA)` ile bulunur, panelin seçenekleri `.sp-option` ile okunur ve seçim `focus` + `mouseDown` ile yapılır; `aria-label="Bileşen parçası"` kaynakta hiç geçmez.
- **AC-18.** Arama kutusu bölümün tam genişliğindedir; `minmax(160px, 2fr) auto` ızgarası seçici satırında kalmaz.
- **AC-19.** İçerikte satırı olan parça panelde listelenmez ve bu süzme `urunAgaci.setBilesenAdaylari`'ndan gelir; `PartManager.jsx` ikinci bir süzme yazmaz (kaynak taraması).
- **AC-20.** Bir parça seçildikten sonra ekranda ne uyarı ne çelişen bir onay kalır: tek mesaj `SearchPick`'in "eklendi" onayıdır ve satır gerçekten eklenmiştir.
- **AC-21.** Seçici `getLabel={p => p.ad}` ve `getKey={p => p.id}` ile çağrılır; aynı ada sahip iki aday panelde iki ayrı satır olarak çizilir ve tıklanan doğru parçayı ekler.
- **AC-22.** Yer tutucu `urunAgaci.SET_BILESEN_ARA` sabitidir (`"Bileşen ara..."`), `PartManager.jsx` içinde düz metin olarak geçmez ve bölüm `emptyText` prop'u geçmez.
- **AC-23.** Kutuya hiç yazmadan odaklanınca panel bütün adayları katalog sırasıyla listeler; ada göre sıralama yoktur.
- **AC-24.** Ekleme formu `kendiId` geçmez, düzenleme formu geçer; iki form da adayları aynı yardımcıdan alır (kaynakta tek çağrı).
- **AC-25.** `SearchPick`'in sekiz çağrısı beş dosyadadır; bu işte yalnız `PartManager.jsx`'teki yeni çağrı eklenir (toplam dokuz çağrı altı dosya), öteki sekiz çağrının satırları değişmez (çağrı sayısıyla ölçülür; plan turu Karar 26).
- **AC-26.** `PartManager.jsx`'te `secim`, `uyari` ve `ekle` kalmaz; `Select` içe aktarımı ve iki kullanımı durur; `urunAgaci.SET_PARCA_SECILMEDI` ve `SET_AYNI_PARCA` kaynakta durur.
- **AC-27.** Sözlüğün `## Segment` bölümünde `:satır` taşıyan yeni bir `**Örnek:**` satırı yoktur ve `tests/tasarim-kaynak.test.js` dokunulmadan geçer.
- **AC-28.** Sözlüğün "Erişilebilirlik borcu" bölümünde `SearchPick`'in etiketsizliği altı çağıranın ortak borcu olarak yazılıdır ve ayrı iş önerilir.
- **AC-29.** Kanıt eşlemesine `0122-piksel-raporu.json`'u gösteren yeni kayıtlar eklenir; yalnız gerçekten değişen ekranlar `degisti` + onay taşır ve 0121/0099/0097 kayıtları `ayni` kalır.
- **AC-30.** `katalog-parca-0122-panel` ekranı açık paneli çizer; kanıt aracının `ara:` adımı değişmez ve rapor satırında `adimUyarilari` yoktur.
- **AC-31.** `PartManager.jsx`'te `reduce(` ve `+=` sayısı sıfır, `<Segment` yok; `tests/kirilim-toplami-0099.test.js` ve `tests/hammadde-0096.test.js` dokunulmadan geçer.
- **AC-32.** Seçicinin önünde koşullu çizilen bir öğe yoktur: içerik satırları eklenip kaldırılırken kutuya yazılmış arama metni silinmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap yok: bu iş yalnız bir seçicinin kipini değiştirir, saf motora satır yazılmaz (açıkça yazıldı).
- [ ] Kaydedilen gövdenin birebir aynı kaldığı ölçüldü (C1).
- [ ] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok; **salt arayüz işi olduğu açıkça yazıldı.**
- [ ] Bölümün kullanıcıya görünen bütün metinleri Türkçe ve `urunAgaci.js`'te; `ui.jsx`'in iki metni istisna olarak yazılı (C3).
- [ ] Seçicinin tutamağı ve testlerin sürüş yolu spec'teki gibi (yer tutucu, `.sp-option`, `focus` + `mouseDown`); `ui.jsx`'e etiket eklenmedi.
- [ ] Yinelenen parça **önlenerek** çözüldü: aday süzmesi `urunAgaci.js`'te, ekranda uyarı durumu yok, `SET_AYNI_PARCA` doğrulayıcıda duruyor.
- [ ] Arama kutusu tam genişlikte; `getLabel`/`getKey` emsalin kuralıyla geçildi.
- [ ] Kalkan durumlar ve sabitler temizlendi (`secim`, `uyari`, `ekle`, iki metin sabiti); `Select` içe aktarımı ve `SET_PARCA_SECILMEDI` korundu.
- [ ] `SearchPick`'in öteki yedi çağrısı ve `src/components/ui.jsx` değişmedi (çağrı sayısıyla ölçüldü).
- [ ] Var olan taramalar dokunulmadan geçti: `kirilim-toplami-0099` (`reduce(`/`+=` sıfır), `hammadde-0096` (`<Segment` yok), `tasarim-kaynak` (Segment bölümünde `:satır`lı örnek yok).
- [ ] Sözlüğe hem arama seçicisi kuralı (açılır liste alt bölümünde, düz metin) hem erişilebilirlik borcu yazıldı.
- [ ] Bağlamın canlı veri ölçümleri güncel veriyle **yeniden ölçüldü** (R16) ve rakamlar düzeltildi ya da doğrulandı.
- [ ] Görsel kanıt alındı; hangi ekranların değiştiği **ölçüldü**, yalnız onların kaydı `beklenen: "degisti"` ve onay satırıyla **eklendi** (0121 kayıtları `ayni` kaldı), `ayarlar-yedekparca*` ekranları 0 piksel fark verdi.
- [ ] Kanıt aracına `odak:` adımı ve `katalog-parca-0122-panel` ekranı eklendi; `ara:` adımı değişmedi ve raporda `adimUyarilari` yok.
- [ ] Spec 0121'in **AC-4'ü** önlemeye çevrildi (iddiası değişti, gerekçesi spec'te yazılı) ve **dört kriteri** yeni okuma yoluyla güncellendi, iddiaları korundu.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` ve `docs/tasarim-sozlugu.md` güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
