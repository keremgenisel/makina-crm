# 0127 — Servis formu çıktısında ve Excel'inde kalıbın dönüşü

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-03, uygulama commit `0a2c33d5`; plan turu Karar 16–25, uygulama Karar 26–27, triyaj Karar 28). Kökeni: analist 2026-11-02, QA boşluk analizi 2026-11-03, 15 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/lib/printTemplates.js` (servis formu çıktısına bir satır, bir yeni çeviri anahtarı TR ve EN), `src/components/settings/SettingsTranslations.jsx` (anahtarın Çeviriler ekranına girmesi), `src/components/settings/SettingsExport.jsx` (servis raporuna altı sütun; satır saf `SERVIS_EXPORT_HEAD` / `servisExportRow` olarak dışa çıkarılır, Karar 20), `src/lib/kalipTamiri.js` (çıktı için tek metin yardımcısı). **Test:** yeni `tests/kalip-donusu-0127.test.js` ve **yeni altın fikstür `tests/fixtures/0127-cikti-once.json`** (sevk alanı boş serviste çıktının birebir eski kaldığının kanıtı, `YAZ_0127=1` ile üretilir; C2), ek bloklar `tests/ceviri-kapsam.test.js` ve `tests/print-templates.test.js`; "spec 0127 ile" `tests/ui/ucretsiz-yedek-parca-0095-kiyas.test.jsx` ve `tests/ui/ihrac-kayitli-0114-kiyas.test.jsx` (Karar 17). Altın fikstür spec öncesi servis Excel satırlarını ve Kargo Etiketi verisini de taşır. **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması, göç, izin tanımları, sunucu kuralları ve birleştirme dokunulmaz. |
| **Bağımlı spec'ler** | 0115 (servise giren kalıpların listesi ve çıktıdaki satırı), 0117 (kalıbın dönüşünün beş alanı ve `sevkTarihi`'nin etikete özgü yedeği), 0119 (kalıbı gönderen kişi), 0009 (çeviri sözlüğü ve `transPlace` zinciri; R3 ona dayanır), 0079 (tevkifat bloğunun satır sonunda durma geleneği; R7 ona atıf verir). |
| **Ters çevrilen kriterler** | 0117'nin "etiketin alt bandı iki hücre olduğu için kargo firması ve takip numarası **etikete** basılmaz" kuralı korunur (bu spec etiketi değiştirmez, servis **formu** çıktısına ekler); 0115 AC'lerinin kalıp satırı iddiası aynen geçer. **Plan turunda düzeltildi (Karar 17):** servis dışa aktarmasının sütun sayısını adıyla iddia eden test yok, ama iki kıyas testi (`ui/ucretsiz-yedek-parca-0095-kiyas`, `ui/ihrac-kayitli-0114-kiyas`) servis sayfasını 27 sütunlu altınla **sütun sırasıyla** karşılaştırıyor ve fazladan sütunların boş olmasını istiyor; altı sütun tevkifatın önüne girince 25.–30. konumlar kayar. İki testte servis sayfasının bu konumları karşılaştırmadan önce ayıklanır (0079'un yedek parça sayfasındaki `j !== 8` ayıklamasının emsali), "spec 0127 ile" notuyla. `0079-ekran` kıyası ilk 25 sütunu okuduğu için etkilenmez. Tevkifat sütunlarının **sonda** olması kuralı (0079 R32) korunur. **Servis raporunda ihraç kayıtlı sütunu yoktur** ve eklenmez (ölçüm 11: `IHRAC_EXPORT_HEAD` müşteri, Extra Kalıp ve yedek parça raporlarında var, serviste yok; 0114 ihraç kayıtlıyı servise uygulamıyor), yani sonda duran blok yalnız iki tevkifat hücresidir. |

---

## Intent

Spec 0117 kalıbın nasıl döneceğini kayda yazıyor: teslim şekli, kargo firması, takip numarası, kargo tarihi ve spec 0119 ile kalıbı veren kişi. Ama müşteriye verilen Servis Formu çıktısında bunların hiçbiri yok; çıktı yalnız "Servis gören kalıplar" satırını basıyor. Yani kalıbı teslim alan kişi elindeki kâğıttan kalıbın nasıl geri geleceğini okuyamıyor. Aynı boşluk Excel tarafında da var: Servis Kayıtları raporunun 25 sütununda kalıp tamiriyle ilgili tek bir hücre yok, yani kalıp işleri Excel'de hiç takip edilemiyor. Bu iş bittiğinde çıktıda tek satırlık bir dönüş bilgisi, Excel'de ise altı sütun olur.

---

## Requirements

### A. Servis formu çıktısı

- **R1.** Servis formu çıktısına **tek satır** eklenir: kalıbın dönüşü. Değer dolu alanlardan kurulur: teslim şekli, kargo firması, takip numarası, tarih ve kalıbı veren kişi, aralarında uygulamanın nokta ayracı.
- **R1/2.** Satır **yalnız** kalıp listesi dolu ve bu beş alandan en az biri **kayda yazılıysa** basılır. Kalıbı olmayan serviste ve hiçbir sevk alanı girilmemiş serviste çıktı bugünkü hâliyle birebir aynı kalır.
- **R1/3.** **Kapı saklı alanlara bakar, yardımcıların dönüşüne bakmaz (Karar 1).** Ölçüldü: `sevkTeslimSekli(servis)` her zaman `"Fabrika Teslim"` ya da `"Kargo"` döndürüyor (`kalipTamiri.js:152`) ve `sevkTarihi(servis)` geçersiz ya da boş `kalipKargoTarih`'te **servisin tarihine** düşüyor (`:151`, ölçüm 7); yani o ikisine bakan bir kapı beş alanın ikisini her kayıtta dolu sayar, kalıbı olan **her** serviste satır basar ve C2'nin değişmezi düşer. Kapı `SEVK_ALANLARI.some(a => kayıtta dolu)`'dur (`:119`, tam bu beş alanın listesi; `kalipFabrikaTeslim` yalnız `true` iken dolu sayılır). Kapı geçtikten sonra teslim şekli `sevkTeslimSekli` ile **her zaman** basılır, o noktada anlamlıdır (0117'nin "boş = Kargo" anlamı; Karar 18): yalnız kişi yazılmış serviste satır "Kargo · kişi" olur, gerçek verideki tek kayıt "Fabrika Teslim · BURAK YÜCE" basar.
- **R1/4.** **Satır var olan satırların şeklindedir (Karar 7).** Çıktı `[L.etiket, deger]` çiftleriyle kuruluyor ve `<tr><th>…</th><td>…</td></tr>` olarak basılıyor (0115 testi birebir sabitliyor, ölçüm 13); yeni satır aynı şekli alır ve kalıp satırının hemen ardına girer (`printTemplates.js:324`'ün altı). Çeviri anahtarı **`kalipDonusuLabel`**, TR varsayılanı `"Kalıbın Dönüşü"`, EN varsayılanı `"Mold Return"` (ad `Label` ekiyle, servis bölümünün bütün anahtarlarının deseni).
- **R2.** Satır var olan kalıp satırının hemen **altında** durur: iki satır aynı konuyu anlatıyor (hangi kalıplar, nasıl dönecek) ve ayrılırsa okuyucu ikisini ilişkilendiremez.
- **R3.** **Tek yeni çeviri anahtarı** açılır (satırın etiketi). Teslim şeklinin kendisi yeni anahtar istemez: çıktının onarım yeri sözlüğünde "Kargo" ve "Fabrika Teslim" karşılıkları TR ve EN olarak zaten var ve bugünkü çeviri yardımcısıyla çözülür (ölçüldü). Firma adı, takip numarası, tarih ve kişi adı veridir, çevrilmez.
- **R3/2.** Yeni anahtar Çeviriler ekranının servis bölümüne eklenir ve TR ile EN varsayılanı yazılır; çeviri kapsamı testi bunu zorunlu kılar (ekranda olmayan anahtar kullanıcı tarafından düzenlenemez).
- **R3/3.** **Teslim şeklinin anahtarı bilinçli olarak paylaşılır (Karar 5).** `transPlace` iki çıktıda kullanılıyor: servis formunun onarım yeri satırı (`printTemplates.js:320`) ve **makina geçmişi raporunun** onarım yeri hücresi (`:504`, ölçüm 9). **Plan turunda düzeltildi (Karar 16):** iki çıktı **ayrı çeviri ad alanlarını** okuyor: servis formu `translations.servis`'i (`CustomerDetailModal.jsx:823`, `ServisPanosu.jsx:504`), makina raporu `translations.makina`'yı (`:824`) alıyor ve Çeviriler ekranında `placeKargo`/`placeFabrikaTeslim` iki ayrı bölümde duruyor (`SettingsTranslations.jsx:149-150` servis, `:233-234` makina). Yani kullanıcı **servis** bölümünde `placeFabrikaTeslim`'i düzenlerse değişiklik servis formunun **iki** satırında (onarım yeri ve yeni kalıp satırı) birlikte görünür; makina geçmişi raporu kendi bölümündeki aynı adlı anahtarı okur ve etkilenmez. Ayrı bir "kalıp teslim şekli" değer anahtarı açılmaz.
- **R4.** Metni kuran **tek yardımcı** `kalipTamiri`'ne yazılır; çıktı şablonu kendi birleştirmesini yapmaz (şablonda iş kuralı yazmama kuralı).
- **R4/2.** **Yardımcı çeviri sözlüğünü değil, çözülmüş metni alır (Karar 2).** Ölçüldü: `transPlace` modül içidir (`printTemplates.js:47`, `const`, dışa verilmemiş) ve anahtar eşlemesi `PLACE_KEY_MAP` de öyle (`:42-45`, ölçüm 8); yani `kalipTamiri` sözlüğü (`L`) alsa bile teslim şeklini çeviremez. Şablon `transPlace(L, sevkTeslimSekli(sv))` çağırıp **sonucu** yardımcıya geçirir; `kalipTamiri` sözlüğe ve eşlemeye hiç dokunmaz, böylece "kendi içinde metin çevirmez" kuralı kendiliğinden sağlanır. `transPlace`'i dışa vermek seçenek değildir: `printTemplates`'ın iç sözlüğünü lib'e sızdırır ve C1'in "iki yerde iki kural olmaz" amacına aykırıdır.
- **R4/3.** **Üç yardımcı (Karar 21):** `kalipListesiMetni(servis)` (kalıp satırının ve Excel kalıp hücresinin tek okuma yolu, çıktının bugünkü satırı da ona bağlanır), `kalipDonusuParcalari(servis)` (kapı geçmezse `null`; geçerse `{ teslim, firma, takip, tarih, kisi }`, `teslim` ham Türkçe, `tarih` yalnız takvimde geçerli ham değer) ve `kalipDonusuMetni(servis, teslimMetni)` (parçaları çözülmüş teslim metni ve `fmtTR` tarihiyle ` · ` ayracıyla birleştirir, boş parça atlanır). `gecerliGun` dışa verilmez, aynı modülde kullanılır (Karar 23). Kargo firması ve kişi adı EN çıktıda **latinize edilmez** (ad gibi, `cust.name` ve `sv.tech` emsali; Karar 22).
- **R5.** Tarih **ham `kalipKargoTarih`'ten** okunur ve takvimde geçerliyse çıktının bugünkü tarih biçimiyle basılır; geçersiz ya da boş tarih basılmaz (alan hiç yazılmamış gibi davranır). **`sevkTarihi` kullanılmaz** (Karar 1): o yardımcı etiketin tarihi içindir ve servis tarihine düşmesi 0117'ye özgü bir karardır. Doğrulama için `gecerliGun` modül içidir (`kalipTamiri.js:145`), yani ya dışa verilir ya da yeni yardımcı onu kendi içinde kullanır.

### B. Servis Kayıtları Excel'i

- **R6.** Servis dışa aktarmasına **altı sütun** eklenir ve başlıkları bu sırada yazılıdır (Karar 6): **"Servis Gören Kalıplar", "Kalıp Teslim Şekli", "Kalıp Kargo Firması", "Kalıp Takip No", "Kalıp Kargo Tarihi", "Kalıbı Veren Kişi"**. İlk başlık çıktının çeviri değeriyle aynı sözcükleri taşır ama **Excel başlıkları çevrilmez** (rapor yalnız Türkçe, `exportServices` çeviri sözlüğü almıyor).
- **R6/2.** Kalıp listesi hücresi kalıpların adlarını (ölçüsüyle) uygulamanın nokta ayracıyla tek hücrede yazar; çıktının kalıp satırıyla aynı okuma yolundan gelir (`tamirEtiketIcerigi`, `kalipTamiri.js:240`), ikinci bir çözüm yazılmaz. **Bilinen sınır (Karar 9):** o yardımcı her girişi `ad · Ölçü: <olcu>` yapıyor ve girişler de ` · ` ile birleşiyor, yani ölçülü kalıp varsa değer "A · B · Ölçü: Ø98" olur ve ayracın iki anlamı vardır (0115 testinin birebir iddiası bu, ölçüm 12). Biçimi değiştirmek 0115 AC‑59'u ters çevirir, bu spec'te yapılmaz; hücreyi ayrıştırmak isteyen bu sınırı bilir.
- **R6/3.** **Tarih `fmtTR` ile yazılır (Karar 4).** Dosyanın kendisi tutarsız: `s.date` **ham** yazılıyor (`SettingsExport.jsx:244`), `s.vadeTarihi` ise `fmtTR` ile (`:249`, ölçüm 10). Çek vade tarihinin emsali alınır, geçersiz tarihte hücre boş kalır (R8); `s.date`'in ham kalması bu spec'te dokunulmaz (R9).
- **R6/4.** **Teslim şekli Excel'de çevrilmez (Karar 8).** Hücre `sevkTeslimSekli`'nin ham Türkçe dönüşünü yazar. C1'in kuralı **okuma** yolu içindir; **gösterim** katmanı iki yerde farklıdır (çıktı `transPlace` ile çevirir, Excel çevirmez) ve Excel'e çeviri sözlüğü taşınmaz.
- **R6/5.** **Excel aynı kapıdan geçer (Karar 19):** `kalipDonusuParcalari` `null` ise (kalıp listesi boş ya da hiçbir sevk alanı yazılmamış) beş sevk hücresi boştur; kalıp listesi hücresi listenin doluluğuna bakar. Böylece kalıplı ama sevksiz serviste Excel "Kargo" yazmaz, çıktıyla aynı soruyu cevaplar (C1).
- **R7.** Sütunlar **tevkifat sütunlarının önüne** eklenir: tevkifat hücrelerinin satır sonunda durması raporlarda ortak gelenektir (0079 R32) ve bozulmaz. **Servis raporunda ihraç kayıtlı sütunu yoktur** (ölçüm 11, Karar 3): `IHRAC_EXPORT_HEAD` müşteri (`SettingsExport.jsx:210`), Extra Kalıp (`:282`) ve yedek parça raporlarında var, serviste yok ve eklenmez (0114 ihraç kayıtlıyı servise uygulamıyor). Yani sonda duran blok yalnız `satisTevkifatExportHucreleri`'nin iki hücresidir.
- **R8.** Kalıbı olmayan serviste altı hücre boştur (sıfır ya da tire değil) ve boş **dize** kullanılır, `undefined` değil (Karar 12): `satisTevkifatExportHucreleri` tevkifatsız kayıtta `["", ""]` döndürüyor, gelenek bu; CSV yazıcısı `String(x ?? "")` ile çalışıyor ama XLSX'te `undefined` hücre atlanabilir ve sütun kayar.
- **R9.** Dışa aktarmanın bugünkü **25 sabit sütunu** (artı iki tevkifat hücresi), sıraları ve değerleri dokunulmaz; iş bitince sabit sütun sayısı **31** olur, tevkifat bloğu yine sonda kalır (ölçüm 11).

### C. Değişmeyenler

- **R10.** Kargo/Sevk Etiketi dokunulmaz: altı durumun başlıkları ve alt bandın iki hücresi aynı kalır (0117 ölçümü).
- **R11.** Makina Servis ve Yedek Parça Geçmişi Raporu, pano kartı, servis formu ekranı ve kayıt yolu dokunulmaz.
- **R12.** Yeni alan, yeni izin, yeni veri bölümü, yeni sunucu kuralı ve göç yoktur.
- **R13.** **Uygulamanın ilk adımı Context 6'nın rakamlarını yeniden ölçmektir (Karar 13; plan turunda yapıldı, ölçüm 14).** QA turunda canlı veri bulunamadı (`~/Library/Application Support/makina-crm` yok, proje kökünde `*.db` yok, İndirilenler'de yedek yok; ölçüm 14), bu yüzden 885 servis, "1'inde kalıp listesi var" ve "kargo firması, takip numarası ve tarih hiçbir serviste dolu değil" sınanamadı. Bu rakamlar C2'nin gerekçesi ve AC‑2'nin test verisini belirliyor: kapılar bugünkü veride neredeyse hiç tetiklenmiyor, testler kendi fikstürünü kurar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Alanların okuma yolu `kalipTamiri`'nin yardımcılarıdır ve çıktı ile Excel aynı yoldan okur, iki yerde iki kural olmaz. **İki istisna yazılıdır:** tarih `sevkTarihi` ile değil ham alandan okunur (R5, Karar 1) ve kapı `sevkTeslimSekli`'ne değil saklı alanlara bakar (R1/3). **Gösterim katmanı paylaşılmaz** (Karar 8): çıktı teslim şeklini `transPlace` ile çevirir, Excel ham Türkçe yazar (R6/4).
- **C2.** Sevk alanı girilmemiş serviste çıktı **birebir** eski kalır ve **yeni bir altın fikstürle** sabitlenir (Karar 10): servis formu çıktısının altını bugün hiçbir yerde yok (`tests/fixtures/0115-once.json` yalnız `ekranlar` ve `servisGovdesi` taşıyor, 0115'in çıktı testi `toContain` ile tek satır iddia ediyor, ölçüm 13). Sevk alanı **boş** bir servisin `buildServiceFormHtml` çıktısı spec öncesi koddan üretilip `tests/fixtures/0127-cikti-once.json`'a yazılır (`YAZ_0127=1`, 0092 ve 0121 emsali) ve **iki dilde** karşılaştırılır. `not.toContain(yeni etiket)` ile olumsuz iddia yeterli değildir: satırın boş basılmasını yakalar, çıktının başka yerinin bozulmasını yakalamaz.
- **C3.** Çeviri anahtarı tek ve servis bölümündedir; kapsam testi hem varlığını hem TR ve EN varsayılanını ölçer.
- **C4.** Excel sütunları yalnız sona (tevkifat bloğunun önüne) eklenir; var olan sütunların yeri değişmez.
- **C5.** Gizlilik sınırı değişmez: çıktıya ve Excel'e gider, maliyet ve çalışan bazlı tutar yazılmaz (bu iş yalnız kalıp sevkini yazıyor).

### KAPSAM DIŞI

- **X1.** Kargo etiketine kargo firması ve takip numarasının basılması — *neden:* 0117 ölçtü, etiketin alt bandı iki hücre; başlıkların altı durumda aynı kalması kuralı bozulur.
- **X2.** Etiketin İngilizcesi — *neden:* tamir edilen kalıp yurt içi müşteriye dönüyor; altı durumun başlığı tek şablondan geliyor ve ikinci dil ayrı bir iştir.
- **X3.** Makina geçmişi raporuna aynı satırın eklenmesi — *neden:* o rapor makinanın bütün geçmişini özetliyor; kalıp sevki tek servise ait bir ayrıntı ve raporu şişirir.
- **X4.** Servis kayıtlarının içe aktarılması — *neden:* uygulamada servis içe aktarması yok.
- **X5.** Kalıp sevk alanlarının Makina Servis Geçmişi ekranında gösterilmesi — *neden:* ekranda bugün pano kartı ve servis formu gösteriyor; yeni ekran satırı ayrı bir yerleşim işi.
- **X6.** Değişen parçaların Excel'e eklenmesi — *neden:* ayrı bir kavram ve kendi raporu var (yedek parça satışları ve stok hareketleri); bu spec kalıp sevkine nişanlıdır.

---

## Context

Ölçümler 01.11.2026 yedeğiyle ve bugünkü kaynakla yapıldı.

1. **Çıktıda tek kalıp satırı var:** `printTemplates.js:324` kalıp listesini basıyor, etiketi `atolyeKaliplariLabel` (TR varsayılanı `:88`, EN `:136`, Çeviriler ekranında `SettingsTranslations.jsx:108`, kapsam testi `ceviri-kapsam.test.js:47`). Beş sevk alanının hiçbiri basılmıyor.
2. **Teslim şekli yeni çeviri istemiyor:** çıktının onarım yeri sözlüğünde "Kargo" → `placeKargo` ve "Fabrika Teslim" → `placeFabrikaTeslim` eşlemesi var, TR ve EN karşılıkları yazılı (`:42-45` eşleme, `:120-121` TR, `:167-168` EN; ilk taslak EN satırını `:166` diye yazmıştı) ve `transPlace` Türkçe değeri çeviriye çeviriyor (`:47`). `kalipTamiri`'nin teslim şekli yardımcısı tam bu iki Türkçe değeri döndürüyor, yani zincir hazır (QA turunda doğrulandı, bulgu olmayan ölçüm 15).
3. **Okuma yardımcıları kurulu ama ikisi bu iş için doğrudan kullanılamaz:** tarih ve teslim şekli `kalipTamiri.js:151` ve `:152`'de (ikisi de hiçbir zaman boş dönmüyor, ölçüm 7; bu yüzden R1/3 ile R5 onları kapı ve tarih için dışarıda bırakır), beş alanın adları `:118` (`SEVK_METIN_ALANLARI`) ve `:119` (`SEVK_ALANLARI`; ilk taslak `:117`, `:118` diyordu), kalıp listesinin okunur içeriği `:240`.
4. **Excel'de hiç yok:** servis raporunun başlığı 25 sütun artı tevkifat bloğu (`SettingsExport.jsx:237`); kalıp listesi, teslim şekli, kargo firması, takip numarası, kargo tarihi ve veren kişi yok.
5. **Tevkifat bloğu sonda gelenek:** satır `...SATIS_TEVKIFAT_EXPORT_HEAD` ile bitiyor ve aynı desen müşteri, Extra Kalıp ve yedek parça raporlarında da sonda (0079 R32). Yeni sütunların yeri bu yüzden onun önü.
6. **Bugün veri neredeyse boş, iş ileriye dönük:** 885 canlı servisin **1'inde** kalıp listesi var; o kayıtta teslim şekli Fabrika Teslim ve kalıbı veren kişi yazılı, kargo firması, takip numarası ve tarih **hiçbir serviste** dolu değil. Yani çıktı bugün tek serviste tek satır basar; değeri önümüzdeki sevklerdedir ve C2 sayesinde eski kayıtların çıktısı hiç değişmez.

### QA turu ölçümleri (2026-11-03)

Hepsi bugünkü kaynakla doğrulandı; satır numaraları bu turda yeniden okundu.

7. **İki yardımcı hiçbir zaman boş dönmüyor:** `sevkTeslimSekli(servis)` her zaman `"Fabrika Teslim"` ya da `"Kargo"` döndürüyor (`kalipTamiri.js:152`); `sevkTarihi(servis)` `gecerliGun` sınamasından geçmeyen ya da boş `kalipKargoTarih`'te `servis.date`'e düşüyor (`:151`). `gecerliGun` modül içidir (`:145`, dışa verilmemiş).
8. **`transPlace` ve anahtar eşlemesi modül içi:** `printTemplates.js:47` `const transPlace`, `:42-45` `PLACE_KEY_MAP`; ikisi de dışa verilmemiş.
9. **`transPlace` iki çıktıda kullanılıyor:** servis formunun onarım yeri satırı (`:320`) ve makina geçmişi raporunun onarım yeri hücresi (`:504`). Yani `placeKargo`/`placeFabrikaTeslim` düzenlemesi üç yerde birden görünecek.
10. **Servis raporunda tarih biçimi tutarsız:** `s.date` ham yazılıyor (`SettingsExport.jsx:244`), `s.vadeTarihi` `fmtTR` ile (`:249`).
11. **Sütun sayımı ve tevkifat bloğu:** servis raporunun sabit başlığı **25** sütun (`:237`) ve satır `...satisTevkifatExportHucreleri(...)` ile bitiyor; o fonksiyon **iki** hücre döndürüyor (`satisTevkifat.js:106-109`, tevkifatsızda `["", ""]`). `IHRAC_EXPORT_HEAD` müşteri (`:210`), Extra Kalıp (`:282`) ve `YEDEK_PARCA_EXPORT_HEAD` (`:37`) içinde var, **servis raporunda yok**.
12. **Kalıp hücresinin ayracı iki anlamda:** `tamirEtiketIcerigi` her girişi `ad · Ölçü: <olcu>` yapıyor (`kalipTamiri.js:240`) ve çıktı girişleri de ` · ` ile birleştiriyor; 0115'in testi birebir `"100_ERKEK KALIPLAR REVİZE · HAMBURGER · Ölçü: Ø98"` iddia ediyor (`kalip-tamiri-0115-cikti.test.js:21`).
13. **Çıktının altın dizesi yok ve satır şekli belli:** `tests/fixtures/0115-once.json` yalnız `ekranlar` ve `servisGovdesi` anahtarlarını taşıyor; 0115'in çıktı testi tam belge kıyası değil, `toContain("<tr><th>Servis Gören Kalıplar</th><td>…</td></tr>")` ile tek satır iddia ediyor (`:21`). Yeni satır aynı `<tr><th>…</th><td>…</td></tr>` şeklini alır.
14. **Canlı veri ölçümleri QA turunda yanlış yerde arandı; plan turunda yedekten ölçüldü (Karar 24).** Canlı veritabanı `~/Library/Application Support/Altunmak CRM/data.db`'de (şifreli), yedek İndirilenler'de `altunmak-crm-yedek-2026-11-01.zip`. `veri.json` (salt okunur): **885** canlı servis (çöpte 0), **1**'inde kalıp listesi; o kayıtta `kalipFabrikaTeslim: true` ve `kalipKargoSorumlusu: "BURAK YÜCE"`, kargo firması, takip numarası ve kargo tarihi **hiçbir serviste** dolu değil. Context 6 doğrulandı.
15. **İki bulgu olmayan doğrulama:** Context 2'nin zinciri gerçekten hazır (eşlemede iki Türkçe değer var, `transPlace` onları çeviriyor, `sevkTeslimSekli` tam o ikisini döndürüyor), yani R3'ün "teslim şekli yeni anahtar istemez" kararı doğru; servis raporu `services` olarak **canlı** diziyi alıyor, yani çöpteki servis Excel'e girmez.

### QA turunda verilen kararlar (2026-11-03)

15 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** Kapı saklı alanlara bakar (`SEVK_ALANLARI`), tarih ham alandan okunur; `sevkTarihi` ve `sevkTeslimSekli` kapı ile tarih için kullanılmaz. → R1/2, R1/3, R5, C1
- **Karar 2 (B‑2).** Yardımcı çözülmüş metni alır; `transPlace` dışa verilmez. → R4/2
- **Karar 3 (Ö‑2).** Servis raporunda ihraç kayıtlı sütunu olmadığı yazılır; parantez kalkar. → R7, başlık
- **Karar 4 (Ö‑1).** Yeni tarih sütunu `fmtTR` ile yazılır, geçersizde boş kalır. → R6/3
- **Karar 5 (Ö‑3).** Teslim şeklinin çeviri anahtarı bilinçli paylaşılır ve kapsamı yazılır. → R3/3
- **Karar 6 (Ö‑5).** Altı Excel başlığı adıyla ve sırasıyla yazılır; Excel başlıkları çevrilmez. → R6
- **Karar 7 (Ö‑4).** Satırın HTML şekli, anahtar adı ve iki dildeki varsayılanı yazılır. → R1/4
- **Karar 8 (Ö‑7).** Gösterim katmanı paylaşılmaz: Excel ham Türkçe yazar. → R6/4, C1
- **Karar 9 (Ö‑6).** Kalıp hücresinin ayraç belirsizliği bilinen sınır olarak yazılır. → R6/2
- **Karar 10 (B‑3).** C2 için yeni altın fikstür kurulur ve iki dilde karşılaştırılır. → C2, başlık
- **Karar 11 (K‑1).** Üç satır atfı düzeltilir. → Context 2, Context 3, ölçüm 7
- **Karar 12 (K‑3).** Boş hücreler boş **dize** kullanır. → R8
- **Karar 13 (K‑4).** Canlı veri ölçümleri uygulamanın ilk adımı olur. → R13
- **Karar 14 (K‑2).** Sütun sayısının işten sonraki hâli yazılır. → R9
- **Karar 15 (K‑5).** Bağımlı spec'ler satırına 0009 ve 0079 eklenir. → başlık

### Plan turunda verilen kararlar (2026-11-03)

Takım Yöneticisi planın bütün önerilerini onayladı.

- **Karar 16.** R3/3 ve AC‑18 düzeltildi: servis formu ve makina raporu ayrı çeviri ad alanlarını okur. → R3/3, AC‑18
- **Karar 17.** İki kıyas testi (0095, 0114) servis sayfasını sütun sırasıyla karşılaştırıyor; 25.–30. konumlar ayıklanır, "spec 0127 ile". → başlık
- **Karar 18.** Teslim şekli kapı geçince her zaman basılır; AC‑3'ün örneği düzeltildi. → R1/3, AC‑3
- **Karar 19.** Excel'in sevk hücreleri çıktının kapısından geçer; kalıplı ama sevksiz serviste boş. → R6/5, AC‑10
- **Karar 20.** Servis Excel satırı saf `SERVIS_EXPORT_HEAD` / `servisExportRow` olarak dışa çıkarılır (`yedekParcaExportRow` emsali); çıkarmanın çıktıyı değiştirmediği spec öncesi koddan yakalanan satırlarla ölçülür. → başlık, AC‑11
- **Karar 21.** Üç yardımcının adları ve dönüşleri yazıldı. → R4/3
- **Karar 22.** Kargo firması ve kişi adı EN çıktıda latinize edilmez. → R4/3
- **Karar 23.** `gecerliGun` dışa verilmez. → R4/3, R5
- **Karar 24.** Ölçüm 14 yedekten yapıldı; Context 6 doğrulandı. → ölçüm 14, AC‑19
- **Karar 25.** Altın fikstür tam HTML saklar, `data:` URI'leri iki tarafta da yer tutucuya iner; senaryolar kalıpsız, kalıplı sevksiz, tevkifatlı ve dış servis (TR ve EN), ayrıca beş alanı dolu serviste `tamirEtiketVerisi` (AC‑12). Çeviriler ekranının görüntüsü taban ve sonra çekimiyle ölçülür. → C2, AC‑12

### Uygulamada verilen kararlar (2026-11-03)

- **Karar 26.** Çeviriler ekranının görüntüsü taban ve sonra çekimiyle ölçüldü: yeni anahtar satırı eklenmesine rağmen `ayarlar-ceviri` iki temada **0 piksel** (servis "Bilgi Tablosu" grubu ekranın görüş alanında değil); var olan kanıt kaydı geçerli kalır, yeni kayıt gerekmedi.
- **Karar 27.** Kıyas testi spec öncesinde de var olan API'lerle ayrı dosyadadır (`tests/ui/kalip-donusu-0127-kiyas.test.jsx`, jsdom): Excel satırları `SettingsExport`'un gerçek indirme yolundan yakalanır (0079 emsali), çünkü spec öncesi kodda saf satır fonksiyonu yoktu. Altın üç bölümdür: servis formu çıktıları (sekiz senaryo), Kargo Etiketi verisi, Servis Kayıtları satırları. Ayrı test verisi `tests/fixtures/0127-veri.js` (0115 verisinin üstünde).

### Triyajda verilen karar (2026-11-03)

- **Karar 28.** `SettingsExport.jsx`'te servis bloğu 0068 çek yorumunun üstüne taşındı; 0101 stok yorumu yine kendi kodunun hemen üstünde (yerleşim testiyle sabit). AC‑7'nin testi adıyla (`AC-7:`) ve `kalipDonusuLabel` düzenlemesiyle sabitlendi. Kapanışta: uygulama turunda kararlar eklenirken düşen "Karar kaydı" başlığı geri kondu.

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | İki yardımcı boş dönmüyor, R1/2 ile C2 sağlanamıyor | Bloklayıcı | R1/3, R5, C1 |
| 2 | `transPlace` modül içi, R4 uygulanamaz | Bloklayıcı | R4/2 |
| 3 | C2'nin altın dizesi yok | Bloklayıcı | C2, başlık |
| 4 | Excel'de tarih biçimi tanımsız | Önemli | R6/3 |
| 5 | R7'nin ihraç parantezi serviste yanlış | Önemli | R7, başlık |
| 6 | Çeviri anahtarının paylaşımı yazılmamış | Önemli | R3/3 |
| 7 | Satırın şekli, anahtar adı ve varsayılanları yok | Önemli | R1/4 |
| 8 | Altı Excel başlığı yazılmamış | Önemli | R6 |
| 9 | Kalıp hücresinin ayracı iki anlamda | Önemli | R6/2 |
| 10 | Teslim şekli çıktıda çevrilir, Excel'de çevrilmez | Önemli | R6/4, C1 |
| 11 | Üç satır atfı bir satır kaymış | Küçük | Context 2, Context 3 |
| 12 | Sütun sayısının işten sonraki hâli yok | Küçük | R9 |
| 13 | Boş hücrenin türü yazılmamış | Küçük | R8 |
| 14 | Canlı veri rakamları doğrulanamadı | Küçük | R13 |
| 15 | Bağımlı spec'ler satırı eksik (0009, 0079) | Küçük | başlık |

---

## Acceptance Criteria

- **AC-1.** Kalıbı olan ve sevk alanı yazılı serviste çıktıda kalıp satırının altında dönüş satırı basılır; değer dolu alanlardan kurulur.
- **AC-2.** Kalıbı olmayan serviste ve hiçbir sevk alanı **kayda yazılmamış** serviste çıktı spec öncesiyle birebir aynıdır; `tests/fixtures/0127-cikti-once.json` altınıyla **iki dilde** karşılaştırılır (C2). Teslim şekli ve tarih yardımcıları her zaman değer döndürdüğü için kapı saklı alanlara bakar (R1/3).
- **AC-3.** Yalnız bir alan yazılıysa (ör. yalnız kalıbı veren kişi) satır teslim şekli ve o alanla basılır ("Kargo · kişi", Karar 18); boş alanlar için ayraç bırakılmaz.
- **AC-4.** Fabrika Teslim seçili serviste teslim şekli Türkçe çıktıda "Fabrika Teslim", İngilizce çıktıda karşılığıyla basılır; yeni değer anahtarı açılmaz.
- **AC-5.** Takvimde geçersiz ya da boş kargo tarihi basılmaz ve **servis tarihine düşülmez** (`sevkTarihi` kullanılmaz, R5).
- **AC-6.** Yeni anahtar `kalipDonusuLabel` Çeviriler ekranının servis bölümünde görünür; TR varsayılanı "Kalıbın Dönüşü", EN varsayılanı "Mold Return" (kapsam testi, R1/4).
- **AC-7.** Kullanıcının düzenlediği çeviri çıktıda kullanılır (çeviri zincirinin bugünkü kuralı).
- **AC-8.** Metni kuran yardımcı `kalipTamiri`'ndedir ve **çözülmüş teslim şekli metnini parametre alır**; çıktı şablonu birleştirme yazmaz, `transPlace` ile `PLACE_KEY_MAP` dışa verilmez (kaynak taraması, R4/2).
- **AC-9.** Servis Kayıtları Excel'inde altı yeni sütun R6'nın başlıkları ve sırasıyla, **iki tevkifat hücresinin önünde** bulunur; sabit sütun sayısı 31 olur ve raporda ihraç kayıtlı sütunu yoktur (R7, R9).
- **AC-10.** Kalıbı olan serviste kalıp hücresi dolu, sevk hücreleri yazılı alanlarla dolu (sevk alanı hiç yazılmamışsa beşi boş, R6/5); kalıbı olmayan serviste altısı da boştur.
- **AC-11.** Excel'in bugünkü 25 sabit sütunu, sırası ve değerleri değişmez (`s.date` ham kalır); tevkifat hücreleri satırın sonunda kalır.
- **AC-12.** Kargo etiketinin altı durumunun başlıkları ve hücreleri değişmez.
- **AC-13.** Veri şeması, izin tanımları, sunucu kuralları ve birleştirme değişmez (tarama).

### QA turu kriterleri (2026-11-03)

- **AC-14.** Kapı `SEVK_ALANLARI`'nın saklı değerlerine bakar: beş alanın hiçbiri yazılmamış ama kalıp listesi dolu olan serviste satır **basılmaz** (R1/3).
- **AC-15.** Yeni satır `<tr><th>Kalıbın Dönüşü</th><td>…</td></tr>` şeklindedir ve kalıp satırının hemen ardından gelir (R1/4).
- **AC-16.** Excel'in yeni tarih sütunu `fmtTR` biçimiyle yazılır; geçersiz tarihte hücre boş **dizedir** (R6/3, R8).
- **AC-17.** Excel'in teslim şekli hücresi ham Türkçe değeri yazar (çevrilmez), çıktı aynı alanı `transPlace` ile çevirir (R6/4).
- **AC-18.** Kullanıcı servis bölümünde `placeFabrikaTeslim`'i düzenlediğinde değişiklik servis formunun onarım yeri satırında ve yeni kalıp satırında birlikte görünür; makina geçmişi raporu kendi ad alanını okur ve değişmez (R3/3, Karar 16).
- **AC-19.** Uygulamanın ilk adımında Context 6'nın rakamları yeniden ölçülür ve spec'e yazılır (R13).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Metin kurma saf yardımcıda; şablon ve dışa aktarma yalnız gösteriyor.
- [x] Sevk alanı olmayan veride çıktının birebir aynı kaldığı **yeni** altın fikstürle iki dilde ölçüldü (C2).
- [x] Kapı saklı alanlara bakıyor; `sevkTarihi` ve `sevkTeslimSekli` kapı ile tarih için kullanılmadı (tarama).
- [x] Yardımcı çözülmüş metni alıyor; `transPlace` ve `PLACE_KEY_MAP` dışa verilmedi.
- [x] Altı Excel başlığı R6'nın sırasıyla ve tevkifat bloğunun önünde; sabit sütun sayısı 31.
- [x] Yeni tarih sütunu `fmtTR`, boş hücreler boş dize.
- [x] Context 6'nın rakamları yeniden ölçüldü ve spec'e yazıldı (R13).
- [x] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok.
- [x] Yazdırma çıktısı için TR ve EN çeviri anahtarı eklendi ve Çeviriler ekranında görünüyor.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `0a2c33d5` | Dal `feat/0127-kalip-donusu`, taban `037dbe80`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 4 | QA turu (15 bulgu, Karar 1–15), plan turu (Karar 16–25), uygulama (Karar 26–27), triyaj (Karar 28) |
| **Düzeltme turu sayısı** | 1 | Triyaj: yorum yerleşimi ve AC‑7'nin adlı testi |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Üçüncü madde kapanış notuydu |
| **Regresyon sayısı** | 0 | Tam takım 464 dosya, 6398 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** spec makina geçmişi raporunun servis formuyla aynı çeviri ad alanını okuduğunu varsayıyordu; ikisi ayrı bölümleri okuyor (Karar 16). "Ters çevrilen kriter yok" iddiası tutmadı: iki kıyas testi servis Excel'ini sütun sırasıyla karşılaştırıyordu (Karar 17). AC‑3 ile R1/3 çelişiyordu, teslim şekli kapı geçince her zaman basılır (Karar 18). Servis Excel satırı bileşenin içindeydi; saf fonksiyona çıkarıldı ve çıkarma spec öncesi indirme yolundan yakalanan satırlarla ölçüldü. Çeviriler ekranı yeni anahtara rağmen 0 piksel (Karar 26). Mutasyon ölçümü: uygulamada on, triyajda iki bozma; hepsi test kırdı (ilk turda zsh test listesini tek argüman geçirdiği için sonuçlar boş geldi, yeniden koşuldu).

**Bu spec'ten çıkarılan ders:** her zaman değer döndüren bir okuma yardımcısı (varsayılanlı teslim şekli, yedekli tarih) "alan yazılı mı" kapısı olarak kullanılamaz; kapı saklı alana bakmalı. İkinci ders: satırın başını eski altınla karşılaştıran kıyas testleri, sütunu sona değil ortaya ekleyen her işte kırılır; ters çevrilen kriter sayılırken bu kıyaslar da taranmalı. Üçüncüsü: zsh'de tırnaksız değişken kelimelere bölünmez, mutasyon düzeneğinde `${=T}` ya da dizi kullanılmalı; boş sonuç "geçti" değildir.
