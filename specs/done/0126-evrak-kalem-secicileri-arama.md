# 0126 — Evrak kalem seçicileri aramayla, set satırı tanınır

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-03, uygulama commit `5e133186`; plan turu Karar 17–28, uygulama Karar 29–31, triyaj Karar 32). Kökeni: analist 2026-11-02, QA boşluk analizi 2026-11-03, 16 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/Documents.jsx` (satır tablosundaki parça ve kalıp seçicileri), yeni `src/components/documents/KalemSecPenceresi.jsx` (seçim penceresi, Karar 18), `src/components/stock/SetRozeti.jsx` (var olan salt okunur içerik satırı yeniden kullanılır; set etiket ekinin tek kaynağı, Karar 18). **Test:** yeni `tests/ui/evrak-secici-0126.test.jsx`, `tests/evrak-secici-0126.test.js` (taramalar), altın `tests/fixtures/0126-govde-once.json`; ters çevrilen `tests/ui/documents-kalip-secici.test.jsx` (Karar 17); AC‑6 dosya listesi genişleyen `tests/urun-agaci-0087.test.js`. **Kanıt:** `scripts/evidence/0009-sayfa.jsx` (yeni ekranlar ve büyüyen `EvrakEkrani` fikstürü; bugünkü fikstür bu iki hücreyi hiç çizmiyor, ölçüm 11) ve `docs/evidence/kanit-eslemesi.json` (yeni ekranların kayıtları; **var olan altı Evrak kaydı `ayni` kalır**, C4). **Belge:** `CLAUDE.md`, `docs/tasarim-sozlugu.md` (0122'nin yazdığı arama seçicisi kuralına pencere istisnası). **Dokunulmayan dosya adıyla:** `src/components/ui.jsx`. Veri şeması, belge alan listeleri, çeviri anahtarları, yazdırma çıktısı, izin tanımları, sunucu kuralları ve birleştirme dokunulmaz. |
| **Bağımlı spec'ler** | 0122 (aynı kusurun set bölümündeki düzeltmesi ve tasarım sözlüğüne yazılacak kural), 0121 (setin içeriği ve salt okunur içerik satırı), 0006 (belgenin satır kalemlerini CRM kaydına çeviren spec ve kalıp rolü seçicisi, Ö‑5), 0130 (Context 6'nın ikinci pencere emsali), 0050 (pencere boyutu kuralı; R1/3 ondan bilinçli sapar). |
| **Ters çevrilen kriterler** | **Bir test (plan turu, Karar 17):** `tests/ui/documents-kalip-secici.test.jsx` (commit `cd876e3c`) kalıp seçicisinin `SELECT` olduğunu, seçenek listesini ve "Kalıp ara..." yer tutucusunun **yokluğunu** iddia ediyor; üçü de bu işle ters döner ve dosya "spec 0126 ile" yeniden yazılır ("seçim satıra yazılır" ve "eski kalıp adı kaybolmaz" iddiaları yeni yolda korunur). QA turundaki "yok" ölçümü bu dosyayı kaçırmıştı. **Uygulamada iki tarama daha (Karar 29, 30):** 0121 AC‑43 (`ui/set-uretimi-0121`: Documents `SetRozeti` modülünü anmaz) ve 0122 AC‑14/AC‑25 (`ui/set-aramasi-0122`: `SearchPick` dokuz çağrı, altı dosya); ikisi de "spec 0126 ile" notuyla güncellendi. `evrak-uretim` ve `ui/evrak-crm-kaydet` kayıt gövdesini ölçüyor ve seçim yolu değiştiğinde de aynı gövdeyi üretir. |

---

## Intent

Evrak'ta teklif satırına yedek parça eklemek için 380 seçenekli bir açılır liste, kalıp eklemek için 81 seçenekli bir başkası açılıyor. Bu, spec 0122'nin set bölümünde düzelttiği kusurun en büyük örneği ve üstelik en kötü yerde: seçici 170 piksel genişliğinde bir tablo hücresinin içinde. Teklifi yazan kişi aradığı parçayı gözle taramak zorunda. İkinci eksik, spec 0121'in setleri burada hiç tanınmıyor: set tek kalem olarak satıra giriyor ama içinde ne olduğu görünmüyor, oysa parçanın seçildiği öteki iki yerde (servis formu, yedek parça satışı) salt okunur içerik satırı var. Bu iş bittiğinde kalem seçimi arama kutusuyla yapılır ve seçilen setin içeriği satırın altında okunur.

---

## Requirements

### A. Seçim penceresi

- **R1.** Satırdaki parça ve kalıp açılır listeleri yerini **"Seç" düğmesine** bırakır; düğme bir pencere açar ve pencerenin içinde arama kutusu (`SearchPick`) durur. Seçim yapılınca pencere kapanır ve satır bugünkü gibi dolar.
- **R1/2.** Pencere yolu bilinçli bir sapmadır, gerekçesi ölçülmüştür: satır tablosu yatay kaydırmalı bir kabın içinde duruyor (`overflowX: "auto"`, `Documents.jsx:1310`) ve arama kutusunun aşağı açılan paneli o kapta **kırpılır**; ayrıca sütun 170 piksel (`:1314`), yani kutu ile panel hücreye sığmaz. 0122'nin satır içi arama kutusu bu yüzden buraya kopyalanamaz. **Bu daha önce denenip geri alınmış:** kalıp seçicisinin üstündeki yorum (`:1425-1426`) "aramalı açılır liste satır tablosunun kabında kırpılıyordu (liste satırın dışına taşamıyordu)" diyor (ölçüm 9), yani gerekçe kaynakta yazılı tarihsel bir kayıttır.
- **R1/3.** **Pencerenin kendisi de kırpmasın (Karar 2).** `Modal`'ın gövdesi iki varyantta da `overflowY: "auto"` taşıyor (`ui.jsx:456` footer'lı, `:465` düz) ve `SearchPick`'in paneli `position: absolute`, `zIndex: 30`, `maxHeight: 220` (`:188`); yani aynı kırpma pencerede tekrar edebilir. Pencere **footer'sız ve `overflowVisible`** açılır (`maxWidth` **600**, Karar 21: "Stoğa Parça Ekle" emsali ve uzun etiket 520'ye sığmaz; **`wide` değil**) ve `SearchPick` gövdenin en üstünde tek öğe olur, böylece 220 piksellik panel kırpılmadan açılır. Uygulamada tek `overflowVisible` emsali "Stoğa Parça Ekle"dir (`PartStokTab.jsx:263`, ölçüm 10). 0050'nin "Sınıf 1 yalnız `wide`" kuralı **veri girme ve tablo** pencereleri içindir; bu bir seçim penceresidir ve ayrım tasarım sözlüğüne de yazılır. İşin tek amacı kırpmayı aşmak olduğu için pencere yapılandırması kriterle ölçülür (AC‑12).
- **R2.** Pencere iki kalem türü için **tek bileşendir** ve hangi katalogdan seçildiğini başlığında yazar. İki ayrı pencere yazılmaz: aynı davranışın iki kopyası ileride birbirinden ayrılır.
- **R2/2.** **Pencere kimlik türünü bilmez (Karar 4).** İki işleyicinin değer türü farklı: `pickKalip(rowId, kalipAd)` **adı** alıyor (`<option value={k.ad}>`, `:1431`), `pickPart(rowId, partId)` **kimliği** alıyor (`value={String(p.id)}`, `:1455`); satırda saklanan alanlar da farklı (`selectedKalip` ad, `selectedPart` kimlik dizgesi, ölçüm 12). Pencere `onPick(kayit)` ile **kaydın kendisini** döndürür, dönüşümü çağıran yapar: kalıpta `pickKalip(rowId, k.ad)`, parçada `pickPart(rowId, String(p.id))`. Türe özel bilgi pencereye gömülürse iki kopya yazma baskısı geri döner, ki R2'nin gerekçesi bu.
- **R3.** Düğmenin üstünde seçili kalemin adı durur (bugün açılır listenin seçili değeri bunu gösteriyordu); seçili kalem yoksa düğme "Seç" der.
- **R3/2.** **Ad satırın kendi verisinden okunur, katalogdan çözülmez (Karar 6).** Kalıpta `row.selectedKalip` doğrudan basılır; parçada katalogdan çözülür, bulunamazsa satırın alt kalemindeki `makinaAdi` (zaten kayıtlı) kullanılır. Gerekçe ölçüldü (ölçüm 13): bugünkü kalıp seçicisi tanımlarda **olmayan** eski kalıp adını ayrı bir `<option>` ile koruyor (`:1430`, yorumu da bunu söylüyor) ve `pickPart` bulunamayan kimlikte satırı **hiç değiştirmiyor** (`:696` `if (!part) return r;`). Katalogdan çözülürse kataloğu terk etmiş kalemin adı düğmenin yanında kaybolur. **Parçada katalogdan çözülen ad Türkçe `p.ad`'dır (Karar 25):** ekran Türkçedir, belge dili EN olsa da düğmenin yanı Türkçe ad yazar; alt kalemin `makinaAdi` yedeği belgenin dilindedir.
- **R3/3.** **Temizleme pencerenin dışındadır (Karar 11).** `SearchPick` kontrolsüzdür ve yalnız ekler, temizleme affordance'ı yok (ölçüm 14). Temizleme adın yanındaki ayrı bir düğmeyle yapılır ve `pickKalip(rowId, "")` / `pickPart(rowId, "")` çağırır; bu bugünkü boş seçeneğin aynısıdır (satırın alt kalemini kaldırır). **Düğme yalnız seçili kalem varken çizilir; erişilebilir adları "Kalıp seçimini kaldır" ve "Parça seçimini kaldır" (Karar 26).**
- **R3/4.** **Kalıp hücresi ikinci bir seçici daha taşır ve o dokunulmaz (Karar 9).** `type === "kalip" && form.type === "teklif"` dalında aynı hücrede "Kalıp rolü" seçicisi var (Makinayla verilir / Extra Kalıp, `:1434-1446`, 0006 E1 kuralı). Hücrenin sırası: tür seçici (`idx === 0`), "Seç" düğmesi ve seçili ad, sonra kalıp rolü seçicisi. Hücre bugünden uzun olur, bu kabul edilir (yerleşim X2 ile kapsam dışı).
- **R3/5.** **Makina satırındaki kalıp ve parça slotları da aynı yoldan geçer (Karar 27):** satırın slot dizisi tek kod yolundan çizildiği için pencere orada da çıkar; tutarlılık için kabul edilir.
- **R3/6.** **Seçim penceresinde Escape yalnız pencereyi kapatır (Karar 19).** `Modal` Escape'i `window` üzerinde dinliyor (`ui.jsx:442`) ve Evrak formu da bir `Modal` (`Documents.jsx:1067`); iç içe iki pencerede Escape iki dinleyiciyi birden çalıştırır ve formun `onClose`'u (`setForm(null)`) kaydedilmemiş belgeyi kapatırdı. Formun `onClose`'u seçim penceresi açıkken hiçbir şey yapmaz (dış dinleyici önce kayıtlı olduğu için önce çalışır ve o anda pencere hâlâ açıktır). Documents içinde çözülür, `ui.jsx` dokunulmaz.
- **R3/7.** **Pencere açılınca arama kutusu odak alır ve liste açık gelir (Karar 24).** `SearchPick` kendiliğinden odak almaz ve ona `autoFocus` eklemek `ui.jsx`'e dokunmak olurdu; pencere kendi gövdesindeki kutuya odak verir, panel `onFocus` ile açılır. Kullanıcı ikinci kez tıklamaz.
- **R4.** Pencerede liste bugünkü kümedir: parça için canlı parça kataloğu, kalıp için canlı kalıp tanımları. Süzme, sıralama ve seçim sonrası satır doldurma kuralları değişmez.
- **R4/2.** **Çağrı var olan iki emsali birebir izler (Karar 10).** İki kataloğun arama kutusu biçimi **hâlihazırda kurulu** (ölçüm 15): kalıp için `PartSaleForm.jsx:194` (`getLabel={d => d.ad}`, yer tutucu "Kalıp ara..."), parça için `YedekParcaSatisForm.jsx:188` ile `:223` (`getLabel = p => parcaAdi(p) + (p.kod ? " · " + p.kod : "")`, "Parça ara..."); `ServiceForm.jsx:413` ise `getLabel={p => p.ad}` kullanıyor, kod göstermiyor (plan turu ölçümü). **Parçada YedekParcaSatisForm'un biçimi izlenir (Karar 20):** Evrak'ta parça kodla da aranabilmeli ve satış formu en yakın emsaldir; R5'in rozet metni bu etiketin sonuna eklenir. Pencere bunları kopyalar. **`getKey` kalıpta `k => k.id ?? k.ad`'dir (Karar 5):** Documents bugün `key={k.id ?? k.ad}` kullanıyor (`:1431`) ve kalıp tanımının `id`'si olmayabilir (kanıt fikstüründeki kalıp `{ ad: "Hamburger" }`, ölçüm 11); `PartSaleForm`'un `getKey={d => d.id}` satırı bu spec'te dokunulmaz ama `id`'siz iki kalıpta anahtar çakıştırır (ölçüm 15). Yedinci çağıran kendi biçimini uydurursa altısıyla ayrışır, ki C2'nin amacı bu.

### B. Set tanınır

- **R5.** Pencerenin listesinde set olan parça **rozet metniyle** görünür (bileşen sayısıyla), böylece seçen kişi tek kalemin bir set olduğunu seçmeden önce görür. **Görsel rozet çizilemez ve çizilmez (Karar 1):** `SearchPick`'in liste satırı yalnız `{getLabel(it)}` basıyor, düz metin, zengin satır yuvası yok (`ui.jsx:190-192`, ölçüm 8) ve R10 `ui.jsx`'i dokunulmaz sayıyor. Bu yüzden rozet **etikete metin olarak** girer: etiket R4/2'nin parça biçimi (ad · kod), setse sonuna `" · " + setRozetMetni(n)` (Karar 20). **Ek `SetRozeti.jsx`'ten gelir (Karar 18):** 0087 AC‑6 taraması Documents.jsx'te (ve satış ekranlarında) `urunAgaci` sözcüğünü yasaklıyor; `SetRozeti.jsx` `setRozetMetni`'yi zaten içe alıyor ve eki kuran tek fonksiyonu dışa verir, metin yine tek yerde kalır. Yan etki kabul edilir: `SearchPick` etiket üzerinden süzdüğü için "set" yazınca bütün setler eşleşir. `SearchPick`'e `renderItem` eklemek R10'u ters çevirir ve altı çağıranı etkiler, yapılmaz. Listede `set-rozeti` öğesi **yoktur** (AC‑5 buna göre).
- **R6.** Seçilen parça setse satırın altında **salt okunur içerik satırı** durur; bileşenler canlı katalogdan okunur, kaydı bulunamayan bileşen okunur ibareyle yazılır. Bu satır 0121'in servis formu ve yedek parça satışında kullandığı bileşenin aynısıdır (`stock/SetRozeti.jsx:16` `SetIcerikSatiri`), ikinci bir kopya yazılmaz.
- **R6/2.** **Satırın "altı" hücrenin içidir (Karar 7).** İçerik satırı **parça slotunun kendi hücresinde**, düğmenin ve adın altında çizilir; yeni bir `<tr>` eklenmez. Gerekçe ölçüldü (ölçüm 16): satırlar `visibleSlots.map` ile **slot başına bir `<tr>`** çiziliyor ve silme hücresi `rowSpan={totalSpan}` taşıyor (`totalSpan = visibleSlots.length`, `:1348`, `:1457`), yani fazladan bir `<tr>` tablonun hizasını bozar. 170 piksellik hücrede metnin çok satıra sarması kabul edilir (`SetIcerikSatiri` `whiteSpace: "normal"`); `colSpan`'li ek satır `totalSpan`'i büyütmeyi gerektirir ve yerleşim X2 ile kapsam dışı.
- **R6/3.** **Setin kendisi katalogda bulunamazsa içerik satırı çizilmez (Karar 8, bilinen sınır).** `SetIcerikSatiri({ part, parts })` **parça kaydını** istiyor, kimliği değil (`SetRozeti.jsx:16`) ve Documents `parts` olarak canlı diziyi alıyor; çöpe atılmış bir set satırda duruyorsa `parts.find` boş döner. R6'nın "kaydı bulunamayan bileşen" kuralı setin **bileşenleri** içindir ve kütüphanede çözülüdür; setin kendisinin bulunamaması ayrı hâldir, ad R3/2'nin alt kalem yedeğinden gelir. Spec 0123 bileşenin kalıcı silinmesini engelliyor ama setin kendisinin çöpe atılmasını engellemiyor.
- **R7.** İçerik **yalnız ekranda** durur: belgenin kendisine, yazdırma çıktısına ve CRM kaydına hiçbir şey yazılmaz (0121'in kuralı: içerik hiçbir çıktıya girmez).

### C. Değişmeyenler

- **R8.** Satır modeli, alt kalemler, fiyat ve iskonto hesabı, belge alan listeleri, yazdırma şablonları ve çeviri anahtarları dokunulmaz.
- **R9.** "CRM'e Kaydet" yolu değişmez: set satırı bugünkü gibi tek yedek parça satışı üretir ve stoktan setin kendi adedi düşer.
- **R10.** Yeni izin, yeni veri bölümü, yeni sunucu kuralı yoktur. `ui.jsx` dokunulmaz.
- **R11.** **Uygulamanın ilk adımı Context 4'ün üç rakamını yeniden ölçmektir (Karar 12).** QA turunda canlı veri bulunamadı (`~/Library/Application Support/makina-crm` yok, proje kökünde `*.db` yok, İndirilenler'de yedek yok; ölçüm 17), bu yüzden 54 belge, 17 parça satırı ve 60 kalıp satırı sınanamadı. Rakamlar kararı değiştirmiyor ama "kalıp seçimi günlük kullanımda, parça seçimi seyrek" cümlesi işin önceliğinin gerekçesi.

---

## Constraints

### Uyulması zorunlu

- **C1.** Kaydedilen belge gövdesi birebir aynı kalır: aynı kalem seçildiğinde satır ve alt kalemler bugünkü koddan çıkanla özdeştir.
- **C2.** Pencere tek bileşendir ve iki tür için parametreyle çalışır (tarama).
- **C3.** İçerik satırı var olan bileşenden gelir; Evrak kendi içerik çözümünü yazmaz (tarama).
- **C4.** **Görsel kanıt yeni ekranlarla alınır; var olan altı kayıt `ayni` kalır (Karar 3).** Ölçüldü (ölçüm 11): altı Evrak kaydının ekranları (`evrak-sekme`, `evrak-bos`, `evrak-bos-arama`, `evrak-musteri`, `evrak-bayi`) `T0()` fikstürünü kullanıyor ve `T0()`'ın tek satırı `pickTip: "makina"` (`0009-sayfa.jsx:363`), yani **model** seçicisi çiziliyor, parça ve kalıp seçicileri hiç çizilmiyor; üstelik `EvrakEkrani` `parts={[]}` geçiyor (`:368`). Bu hâlde altı ekran **0 piksel** fark verir, yani `beklenen: "degisti"` işaretlenemez. Kanıt aracına **yeni ekranlar** eklenir: `pickTip: "parca"` satırlı belge (set olan ve set olmayan parça), `pickTip: "kalip"` satırlı belge, pencerenin açık hâli ve içerik satırı. Fikstür de büyür: içeriği olan bir parça kataloğu ve **`id`'li** kalıp tanımı. Yeni ekranların kayıtları `kanit-eslemesi.json`'a eklenir.
- **C5.** `SearchPick`'in "✓ eklendi" onayı 2 saniye yaşıyor (`ui.jsx:174`) ama pencere seçimde kapandığı için (R1) **hiç görünmez**; bu bilinçlidir ve 0122'nin "onay ile uyarı çelişir" dersi burada geçerli değildir (çelişecek bir uyarı yok, pencere kapanıyor). Onay metni ya da süresi değiştirilmez (`ui.jsx` dokunulmaz, R10).

### KAPSAM DIŞI

- **X1.** Model seçicisinin değişmesi — *neden:* model listesi kısa (katalogdaki canlı modeller) ve bugünkü ölçü (0042 R10) orada açılır listeyi istiyor.
- **X2.** Satır tablosunun yerleşiminin yenilenmesi (sütun genişlikleri, yatay kaydırma) — *neden:* ayrı ve büyük bir iş; bu spec yalnız iki hücredeki seçim yolunu değiştirir.
- **X3.** Pencerede çoklu seçim (bir açılışta birden çok kalem eklemek) — *neden:* satır başına tek kalem seçiliyor, çoklu seçim satır modelini değiştirir.
- **X4.** Setin belgede patlatılması (bileşenlerin ayrı kalem olarak yazılması) — *neden:* 0121 setin tek kalem olduğuna karar verdi; patlatma fiyat ve stok zincirini değiştirir.
- **X5.** Serbest metin kalemlerinin aramayla seçilmesi — *neden:* onların kataloğu yok, kullanıcı adı kendisi yazıyor.
- **X6.** Satır içi arama kutusu — *neden:* R1/2'de ölçülen kırpma ve genişlik; istenirse ayrı bir yerleşim işiyle denenebilir.
- **X7.** Yurt dışı fatura formunun (`documents/FaturaFormModal.jsx:157-175`) parça ve kalıp açılır listeleri (Karar 23) — *neden:* aynı kusur orada da duruyor ama ayrı bir bileşen ve kendi yerleşimi var; bu spec Evrak'ın satır tablosunu söylüyor. Ayrı iş.

---

## Context

Ölçümler 01.11.2026 yedeğiyle ve bugünkü kaynakla yapıldı.

1. **Bugünkü seçiciler düz açılır listedir:** parça `Documents.jsx:1452` (`parts.map` ile 380 seçenek; `:1451` tür koşulu), kalıp `:1427` (81 seçenek; `:1431` seçenek döngüsü). İkisi de "Ürün Seç" sütununda ve sütunun genişliği **170 piksel** (`:1314`). İlk taslak iki atfı bir satır kaydırmıştı (ölçüm 8).
2. **Kırpma ölçüldü:** tablo `overflowX: "auto"` taşıyan bir kabın içinde (`:1310`). Mutlak konumlu bir sonuç paneli bu kapta kırpılır, yani 0122'nin satır içi çözümü burada çalışmaz; pencere yolu bu yüzden önerildi.
3. **Seçim işleyicileri hazır:** `pickKalip` (`:679`) ve `pickPart` (`:693`) satırın alt kalemlerini kuruyor; boş değer alt kalemi kaldırıyor. Pencere bu iki işleyiciyi aynen çağırır, kayıt yolu değişmez.
4. **Kitle:** 54 canlı belgede parça kalemi taşıyan 17 satır, kalıp kalemi taşıyan 60 satır var. Yani kalıp seçimi günlük kullanımda, parça seçimi daha seyrek ama ikisi de canlı. (Plan turunda 01.11.2026 yedeğiyle doğrulandı; ölçüm 17.)
5. **İçerik satırı hazır:** `stock/SetRozeti.jsx:16` `SetIcerikSatiri` bileşeni servis formunda (`ServiceForm.jsx:447`) ve yedek parça satış formunda (`YedekParcaSatisForm.jsx:182`, `:218`) kullanılıyor. Evrak parçanın seçildiği üçüncü yer ve 0121 onu kapsamadı.
6. **Pencere emsali var, iki tane:** 0121'in Set Hazırla ve 0130'un Seti Parçala penceresi `wide` ölçüsünde ve ikisi de kendi içinde tablo taşıyor. **Bu pencere onlardan ayrılır (Karar 21):** tablo taşımaz, tek bir arama kutusudur ve paneli kırpılmasın diye `overflowVisible` açılır (R1/3, Karar 2); ölçü "Stoğa Parça Ekle"nin 600'üdür.
7. **Katalog seçicisi gelenegi:** uygulamada altı dosyada arama kutusu var (servis formu, yedek parça satışı, Extra Kalıp, model kiti, tahsis ve 0122 ile gelen parça kartının set bölümü); kural tasarım sözlüğüne 0122 R12 ile yazıldı ve Evrak onun dışında kalan son yerdir, yani bu iş yedinci çağıranı ekler.

### QA turu ölçümleri (2026-11-03)

Hepsi bugünkü kaynakla doğrulandı; satır numaraları bu turda yeniden okundu.

8. **Rozet `SearchPick` ile çizilemez ve atıflar kaymış:** `ui.jsx:190-192` liste satırı yalnız `{getLabel(it)}` basıyor (düz metin, zengin satır yuvası yok). Satır atıfları düzeltildi: parça seçicisi `:1452`, kalıp seçicisi `:1427`; doğru çıkanlar `:1310`, `:1314`, `:679`, `:693`.
9. **Kırpma daha önce denenmiş ve geri alınmış:** kalıp seçicisinin üstündeki yorum (`Documents.jsx:1425-1426`) "Yedek parça seçicisiyle aynı yerel liste: aramalı açılır liste satır tablosunun kabında kırpılıyordu (liste satırın dışına taşamıyordu). Tanımlarda olmayan eski kalıp adı seçenek olarak korunur." diyor.
10. **`Modal` gövdesi de kırpar:** iki varyantta da `overflowY: "auto"` (`ui.jsx:456` footer'lı, `:465` düz); `SearchPick`'in paneli `position: absolute`, `zIndex: 30`, `maxHeight: 220` (`:188`). Tek `overflowVisible` emsali `PartStokTab.jsx:263` ("Stoğa Parça Ekle"); o varyant `maxHeight`'i de düşürüyor.
11. **Kanıt fikstürü bu iki hücreyi hiç çizmiyor:** altı Evrak kaydının ekranları `evrak-sekme`, `evrak-bos`, `evrak-bos-arama`, `evrak-musteri`, `evrak-bayi` (dördü `ayni`, ikisi `beklenen` anahtarı olmadan, yani varsayılan 0 piksel); hepsi `T0()`'ı kullanıyor ve `T0()`'ın tek satırı `pickTip: "makina"` (`0009-sayfa.jsx:363`). `EvrakEkrani` `parts={[]}` ve `kalipDefs={[{ ad: "Hamburger" }]}` geçiyor (`:368`), yani parça listesi boş ve kalıbın `id`'si yok.
12. **İki işleyicinin değer türü farklı:** `pickKalip(rowId, kalipAd)` adı alıyor (`:679`), `pickPart(rowId, partId)` kimliği alıyor (`:693`); satırda `selectedKalip` ad, `selectedPart` kimlik dizgesi.
13. **Kataloğu terk etmiş kalemin korunması:** kalıp seçicisi tanımlarda olmayan adı ayrı bir `<option>` ile koruyor (`:1430`); `pickPart` bulunamayan kimlikte satırı hiç değiştirmiyor (`:696` `if (!part) return r;`) ve `pickKalip` bulunamayan adda `makinaAdi`'yı adın kendisiyle yazıyor, kod ve tanımı boşaltıyor (`:683-687`).
14. **`SearchPick` kontrolsüz ve yalnız ekler:** iç durumu `q`/`open`/`justAdded`, dışarıdan değer almıyor, temizleme affordance'ı yok; onay `setTimeout(…, 2000)` ile 2 saniye yaşıyor (`ui.jsx:174`).
15. **İki kataloğun arama kutusu biçimi zaten kurulu:** kalıp `PartSaleForm.jsx:194` (`getLabel={d => d.ad}`, `getKey={d => d.id}`, "Kalıp ara..."), parça `YedekParcaSatisForm.jsx:188` ve `:223` (`getLabel` ad + kod, "Parça ara..."); `ServiceForm.jsx:413` yalnız `p.ad` (plan turunda düzeltildi, Karar 20). Altı dosya sayımı (Context 7) doğru; Evrak yedinci çağıranı ekler.
16. **Tablonun `rowSpan` aritmetiği:** satırlar `visibleSlots.map` ile slot başına bir `<tr>` çiziliyor (`:1413`), silme hücresi `rowSpan={totalSpan}` taşıyor (`:1457`) ve `totalSpan = Math.max(visibleSlots.length, 1)` (`:1348`). Hücre 170 piksel, `SetIcerikSatiri` `whiteSpace: "normal"` ile blok çiziyor (`SetRozeti.jsx:20`).
17. **Canlı veri ölçümleri QA turunda doğrulanamadı; yanlış yere bakılmıştı (Karar 22).** Canlı veritabanı `~/Library/Application Support/Altunmak CRM/data.db`'de (şifreli), yedek İndirilenler'de `altunmak-crm-yedek-2026-11-01.zip`. Uygulamanın ilk adımında bu yedekten (`veri.json`, salt okunur) ölçüldü: **54** canlı belge, **17** parça satırı (17'si katalogdan seçili), katalogdan kalıp seçilmiş **60** satır (kalıp türlü satır 93, 33'ünde kalıp katalogdan seçilmemiş), 380 canlı parça, 81 kalıp tanımı (hepsinin `id`'si var), canlı veride **set yok**. Context 4'ün üç rakamı doğrulandı.
18. **Bir bulgu olmayan doğrulama:** `pickKalip` ve `pickPart` gerçekten satırın alt kalemlerini kuruyor ve boş değer alt kalemi kaldırıyor, yani C1'in "gövde birebir aynı" iddiası pencere bu iki işleyiciyi aynen çağırdığı sürece tutar. Test tutamakları da hazır: `data-testid="set-rozeti"` ve `"set-icerik-satiri"` (`SetRozeti.jsx:10`, `:20`), ama içerik satırı birden çok satırda çizileceği için testler `getAllByTestId` kullanır.

### QA turunda verilen kararlar (2026-11-03)

16 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** Rozet etikete metin olarak girer; `ui.jsx` dokunulmaz, listede görsel rozet olmaz. → R5, AC‑5
- **Karar 2 (B‑2).** Pencere footer'sız ve `overflowVisible` açılır, `SearchPick` gövdenin en üstünde; `wide` değil. → R1/3, AC‑12
- **Karar 3 (B‑3).** Var olan altı kanıt kaydı `ayni` kalır; kanıt aracına yeni ekranlar ve büyüyen fikstür eklenir. → C4, başlık
- **Karar 4 (Ö‑1).** Pencere kaydı döndürür, kimlik dönüşümünü çağıran yapar. → R2/2
- **Karar 5 (Ö‑2).** Kalıpta `getKey = k => k.id ?? k.ad`. → R4/2
- **Karar 6 (Ö‑3).** Ad satırın kendi verisinden okunur; parçada alt kalemin `makinaAdi` yedeği. → R3/2
- **Karar 7 (Ö‑4).** İçerik satırı parça slotunun hücresinin içinde; yeni `<tr>` yok. → R6/2
- **Karar 8 (Ö‑6).** Setin kendisi bulunamazsa içerik satırı çizilmez, bilinen sınır. → R6/3
- **Karar 9 (Ö‑5).** Kalıp rolü seçicisi dokunulmaz; hücrenin sırası yazılır. → R3/4
- **Karar 10 (Ö‑7).** Çağrı var olan iki emsali birebir izler. → R4/2
- **Karar 11 (K‑4).** Temizleme pencerenin dışında, ayrı düğmeyle. → R3/3
- **Karar 12 (K‑5).** Canlı veri ölçümleri uygulamanın ilk adımı olur. → R11
- **Karar 13 (K‑1).** İki satır atfı düzeltilir. → Context 1, ölçüm 8
- **Karar 14 (K‑2).** Testler `getAllByTestId` kullanır; AC‑5 listede rozet öğesi aramaz. → AC‑5, AC‑6
- **Karar 15 (K‑3).** Onayın hiç görünmemesi bilinçli olarak yazılır. → C5
- **Karar 16 (K‑6).** Bağımlı spec'ler satırına 0130 ve 0050 eklenir. → başlık

### Plan turunda verilen kararlar (2026-11-03)

Takım Yöneticisi planın bütün önerilerini onayladı.

- **Karar 17.** `documents-kalip-secici` testi ters çevrilir (başlık düzeltildi).
- **Karar 18.** Pencere yeni dosyadadır (`documents/KalemSecPenceresi.jsx`); set etiket eki `SetRozeti.jsx`'ten gelir, çünkü 0087 AC‑6 satış ekranlarında `urunAgaci` adını yasaklar; yeni dosya AC‑6 listesine eklenir. → R5, AC‑21
- **Karar 19.** Escape koruması formun `onClose`'unda. → R3/6, AC‑18
- **Karar 20.** Parça etiketi YedekParcaSatisForm biçimi (ad · kod) + set eki; ölçüm 15'in ServiceForm atfı düzeltildi. → R4/2, R5, AC‑21
- **Karar 21.** Pencere genişliği 600; Context 6 Karar 2'ye uyduruldu. → R1/3
- **Karar 22.** Ölçüm 17 düzeltildi, R11'in ölçümü yedekten yapıldı. → ölçüm 17
- **Karar 23.** Yurt dışı fatura formu kapsam dışı. → X7
- **Karar 24.** Pencere açılınca kutu odak alır. → R3/7, AC‑19
- **Karar 25.** Düğmenin yanında katalogdan çözülen parça adı Türkçe `p.ad`. → R3/2
- **Karar 26.** Kaldır düğmesi yalnız seçiliyken, türünü söyleyen adla. → R3/3, AC‑20
- **Karar 27.** Makina satırının kalıp ve parça slotları da pencereyle. → R3/5
- **Karar 28.** Kanıt fikstürü yeni `katalog` prop'uyla büyür; var olan çağrılar değişmez, altı ekran aynı girdiyle çizilir; yine de taban ve sonra çekimi yapılır. → C4, AC‑16

### Uygulamada verilen kararlar (2026-11-03)

- **Karar 29.** 0121 AC‑43'ün "Evrak seçicisinde rozet yok" taraması daraltıldı: Documents `SetRozeti` modülünden içerik satırını ve etiket ekini alır (R5, R6), görsel rozet (`<SetRozeti`, `set-rozeti`) ve içerik çözümü (`setIcerigi`) yine yasak.
- **Karar 30.** 0122 AC‑14/AC‑25'in sayımı 10 çağrı, 7 dosyaya çıktı; seçim penceresinin çağrısı ayrıca tek sayılır, öteki sekiz çağrı birebir aynı kalır.
- **Karar 31.** Tam takımda bu işten bağımsız bir kırık bulundu: `set-icerigi-0121-kiyas` aylık raporun `olusturmaTarihi`'ni (bugün) altınla karşılaştırıyordu ve ertesi gün kırıldı (main'de de kırık). Saat altının üretildiği güne (02.11.2026) sabitlendi, 0079 ve 0095 kıyaslarının emsali; altın yenilenmedi.

### Triyajda verilen karar (2026-11-03)

- **Karar 32.** Düğme yanındaki parça adının son yedeği (katalogda ve alt kalemde ad yoksa) Documents'ta düz yazılmaz: `SetRozeti.jsx` `urunAgaci`'nın `SET_ICERIGI_YER_TUTUCU`'sunu `PARCA_YER_TUTUCU` adıyla dışa verir (0087 AC‑6). Formun kapanışında seçimi düşüren efektin gerekçesi koda yazıldı ve davranış testiyle sabitlendi (seçim açıkken form Vazgeç'le kapanırsa belge yeniden açılınca pencere açılmaz).

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | Rozet `SearchPick` ile çizilemez, R10 ile çelişiyor | Bloklayıcı | R5, AC‑5 |
| 2 | Pencerenin `Modal` yapılandırması yok, kırpma tekrar edebilir | Bloklayıcı | R1/3, AC‑12 |
| 3 | Kanıt fikstürü iki hücreyi hiç çizmiyor, C4 ölçülmemiş | Bloklayıcı | C4, başlık |
| 4 | İki seçicinin değer türü farklı | Önemli | R2/2 |
| 5 | Kalıpta `getKey` tuzağı (`id` olmayabilir) | Önemli | R4/2 |
| 6 | Düğmenin yanındaki adın kaynağı yazılmamış | Önemli | R3/2 |
| 7 | İçerik satırının yeri tanımsız, `rowSpan` bozulur | Önemli | R6/2 |
| 8 | Setin kendisi bulunamazsa ad ve içerik kaybolur | Önemli | R6/3 |
| 9 | Kalıp hücresindeki ikinci seçici anılmamış | Önemli | R3/4 |
| 10 | Seçici biçiminin emsali anılmamış | Önemli | R4/2 |
| 11 | İki satır atfı bir satır kaymış | Küçük | Context 1 |
| 12 | Test tutamakları çoğul olacak | Küçük | AC‑5, AC‑6 |
| 13 | "✓ eklendi" onayı hiç görünmez | Küçük | C5 |
| 14 | Temizleme yolunun yeri yazılmamış | Küçük | R3/3 |
| 15 | Canlı veri rakamları doğrulanamadı | Küçük | R11 |
| 16 | Bağımlı spec'ler satırı eksik (0130, 0050) | Küçük | başlık |

---

## Acceptance Criteria

- **AC-1.** Parça kalemi olan satırda açılır liste yoktur; "Seç" düğmesi vardır ve pencere açar.
- **AC-2.** Pencerede yazılan metin parça adına göre arar; tıklanan parça satıra girer ve pencere kapanır.
- **AC-3.** Aynı akış kalıp kalemi için de çalışır ve pencere hangi katalogdan seçildiğini başlığında yazar.
- **AC-4.** Seçili kalemin adı düğmenin yanında **satırın kendi verisinden** görünür (kataloğu terk etmiş kalıp adı ve kataloğu terk etmiş parçanın alt kalem adı dahil, R3/2); ayrı temizleme düğmesi satırın alt kalemini kaldırır (bugünkü boş seçenek davranışı, R3/3).
- **AC-5.** Pencerenin parça listesinde set olan parça **rozet metniyle** ve bileşen sayısıyla görünür (etikette `setRozetMetni`); listede `set-rozeti` öğesi **yoktur** ve `ui.jsx` değişmez (R5).
- **AC-6.** Set seçilince **parça slotunun hücresinde** salt okunur içerik satırı çizilir (yeni `<tr>` yok, `rowSpan` değişmez); kaydı bulunamayan **bileşen** okunur ibareyle yazılır, **setin kendisi** canlı katalogda yoksa satır hiç çizilmez (R6/2, R6/3). Birden çok satırda çizilebildiği için test `getAllByTestId` kullanır.
- **AC-7.** Belge kaydedilince gövde bugünkü koddan çıkanla özdeştir; içerik belgeye yazılmaz.
- **AC-8.** Yazdırma çıktısı değişmez (set satırı yine tek kalem, içerik basılmaz).
- **AC-9.** "CRM'e Kaydet" set satırından bugünkü gibi tek yedek parça satışı üretir ve stoktan setin adedi düşer.
- **AC-10.** Pencere tek bileşendir ve içerik satırı var olan bileşenden gelir (kaynak taraması).
- **AC-11.** `ui.jsx`, belge alan listeleri, çeviri anahtarları, izin tanımları ve sunucu kuralları değişmez (tarama).

### QA turu kriterleri (2026-11-03)

- **AC-12.** Pencere footer'sız ve `overflowVisible` ile açılır, `wide` değildir ve `SearchPick` gövdenin en üstündedir; arama paneli pencerede kırpılmaz (tarama ve davranış, R1/3).
- **AC-13.** Pencere kaydın kendisini döndürür; kalıpta ad, parçada kimlik dizgesi çağıranda dönüştürülür ve iki işleyici bugünkü imzalarıyla çağrılır (R2/2).
- **AC-14.** Kalıp listesinin anahtarı `k.id ?? k.ad`'dır: `id`'si olmayan iki kalıp tanımı aynı anahtarı almaz (R4/2).
- **AC-15.** Kalıp hücresinde "Kalıp rolü" seçicisi yerinde ve davranışı aynı; hücre sırası tür seçici, "Seç" ve ad, kalıp rolü (R3/4).
- **AC-16.** Var olan altı Evrak kanıt ekranı **0 piksel** fark verir ve kayıtları `ayni` kalır; yeni ekranlar (parça satırı, set, kalıp satırı, açık pencere) kendi kayıtlarıyla eklenir (C4).
- **AC-17.** Uygulamanın ilk adımında Context 4'ün üç rakamı yeniden ölçülür ve spec'e yazılır (R11).

### Plan turu kriterleri (2026-11-03)

- **AC-18.** Seçim penceresinde Escape yalnız pencereyi kapatır; belge formu açık kalır ve yazılmış alanlar durur (R3/6).
- **AC-19.** Pencere açılınca arama kutusu odaktadır ve liste görünür (R3/7).
- **AC-20.** Kaldır düğmesi yalnız seçili kalem varken çizilir ve erişilebilir adı türünü söyler (R3/3, Karar 26).
- **AC-21.** Parça etiketi `ad · kod` biçimindedir ve kodla aranır; set eki `SetRozeti.jsx`'ten gelir ve Documents ile pencere dosyası `urunAgaci` adını anmaz (0087 AC‑6 genişler; R4/2, R5).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kaydedilen belge gövdesinin birebir aynı kaldığı ölçüldü (C1).
- [x] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok; **salt arayüz işi olduğu açıkça yazıldı.**
- [x] Kullanıcıya görünen bütün metinler Türkçe.
- [x] Görsel kanıt **yeni ekranlarla** alındı (pencere, set rozet metni, içerik satırı, boş durum); var olan altı Evrak kaydı `ayni` kaldı ve 0 piksel ölçüldü (C4).
- [x] Pencere footer'sız ve `overflowVisible`; arama paneli pencerede kırpılmıyor.
- [x] Rozet etikete metin olarak girdi; `ui.jsx` dokunulmadı (tarama).
- [x] Ad satırın kendi verisinden okunuyor; temizleme ayrı düğmeyle.
- [x] İçerik satırı parça slotunun hücresinde; `rowSpan` aritmetiği değişmedi.
- [x] Kalıp rolü seçicisi yerinde; kalıp anahtarı `id ?? ad`.
- [x] Context 4'ün üç rakamı yeniden ölçüldü ve spec'e yazıldı (R11).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` ve `docs/tasarim-sozlugu.md` güncellendi.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `5e133186` | Dal `feat/0126-evrak-secici`, taban `45df963`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 4 | QA turu (16 bulgu, Karar 1–16), plan turu (Karar 17–28), uygulama (Karar 29–31), triyaj (Karar 32) |
| **Düzeltme turu sayısı** | 1 | Triyaj: yer tutucu metni tek kaynağa bağlandı, seçimin sıfırlanması davranış testiyle sabitlendi |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Öteki üç madde bilgi ve kapanış notuydu |
| **Regresyon sayısı** | 0 | Tam takım 462 dosya, 6382 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** spec "ters çevrilen kriter yok" diyordu; üç çıktı (`ui/documents-kalip-secici` plan turunda, 0121 AC‑43 ve 0122 AC‑14/AC‑25 taramaları uygulamada). Spec'in hiç anmadığı bir risk vardı: `Modal` Escape'i `window`'da dinlediği için iç içe pencerede Escape kaydedilmemiş belgeyi de kapatırdı (R3/6). QA'nın "canlı veri yok" ölçümü yanlış dizine bakmıştı, yedek İndirilenler'deydi. 0087 AC‑6 Documents'ta `urunAgaci` adını yasakladığı için set metinleri `SetRozeti.jsx` üzerinden geldi. Tam takım bu işten bağımsız bir tarih kırığı buldu (0121 kıyası, Karar 31). Mutasyon ölçümü: uygulamada on, triyajda iki bozma; hepsi test kırdı (anahtar mutasyonu ilk denemede kaçtı, iddia "unique key" uyarısını da kapsayacak şekilde düzeltildi).

**Bu spec'ten çıkarılan ders:** iç içe `Modal`'da Escape iki dinleyiciyi birden çalıştırır; yeni bir pencere başka bir pencerenin üstünde açılıyorsa dış pencerenin kapatma işleyicisi korunmalıdır. İkinci ders: "ters çevrilen kriter yok" iddiası ancak kriter metinleriyle değil, bileşeni seçen testlerin ve paylaşılan bileşen sayımlarının taranmasıyla doğrulanabilir. Üçüncüsü: altın dosyaya giren her zaman damgası (`olusturmaTarihi`) testi ertesi gün kırar; kıyas testleri saati altının günüyle sabitlemeli.
