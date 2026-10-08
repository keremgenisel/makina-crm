# 0076 Uygulama Planı: Kısmen İndirilebilen Gider ve İndirilemeyen KDV (binek araç)

| | |
|---|---|
| **Bağlı spec** | `specs/0076-kisitli-gider-ve-indirilemeyen-kdv.md` (R2, plan onayıyla) |
| **Dal** | `feat/0076-kisitli-gider` (`feat/0078-cop` `8017fb0` üstünde) |
| **Onay** | Takım Yöneticisi, 2026-10-08: bütün öneriler (Q1–Q11) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Maliyet tarafının bütün rakamları `gider.js`'in modül içi `kovaKurus`'undan türer: dönem raporu kovaları, makina
  maliyeti (`kalemKovalariKurus`), 0072 dağıtımı (`dagitimPaylari`) ve 0022 parti payları. Taban tek yerde değişince
  hepsi doğru rakamı alır; `makinaMaliyeti.js`'in hesabı değişmez.
- Ödeme tarafı `odenecekKurus` = `kalemKurus − stopaj − tevkifat + kdv` üzerinden kuruludur; `kalemKurus` matrah kaldığı
  için borç, hatırlatıcı, açık kalemler, ekstre ve Kasa dokunulmaz.
- `kalemTutari`'nın dış tüketicileri: `DonemRaporu` (liste), `giderRaporu.js` (0047 KALEMLER), `MakinaModelGorunumu`,
  `aramaGider.js` (R21: matrah kalmalı). Bu yüzden `kalemTutari` anlamı değişmez; maliyet tüketicileri yeni
  `kalemGiderTutari`'ya açıkça geçer.
- KDV karşılaştırma kartı Finans ile paylaşılır (Q6 → R24/3).
- 0059'un altın HTML'i Aylık Faaliyet Raporu'dur, gider raporunun altın HTML'i yoktur (Q1 → R39).
- Kutu normal kalemin formuna eklendiği için kutu kapalıyken de normal form ekranları kutu satırı kadar değişir (0075
  §6 dersi); C3'ün 0 piksel ölçütü kira, personel, SGK formları ve rakam ekranlarıdır.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/gider.js` | `kisitliGiderMi`, `varsayilanIndirilebilirOran`, `kisitOranOf`, `kisitHesabi`, `giderKurus` / `kalemGiderTutari`, `kisitDogrula`, `kisitEtkiliMi`, `kisitliRozetMetni`, `KKEG_ETIKETI`, `VERGI_MATRAHI_NOTU`; `kovaKurus` tabanı (model sınırı matrah); `hesaplaGiderRaporu` (toplam/tür/tedarikçi gider tutarı, indirilecek KDV, `kisitli`); `giderKalemDogrula`; `tekrarlayanUret`; model uyarısı metni |
| `src/lib/makinaMaliyeti.js` | `kisitliVar` işareti, `KISITLI_NOTU` / `KISITLI_STANDART_NOTU`; özet ve detay taşır |
| `src/lib/giderRaporu.js` | KALEMLER gider tutarı; KDV kutusunda kısıt satırları; gider bölümü dipnotu |
| `electron/db.cjs` | `GIDER_KISIT_COLUMNS`, `kisitYaz` / `kisitOku`, iki tablo × dört nokta |
| `src/components/GiderForm.jsx` | kutu, oran, özet satırları, bilgi notu |
| `src/components/gider/GiderAlanlari.jsx` | `KisitAlani` (kalem ve tanım formu ortak), model ipucu metni |
| `src/components/gider/DonemRaporu.jsx` | tutar sütunu, rozet, KDV hücresi, alt toplam, metinler |
| `src/components/Giderler.jsx` | kart etiketleri, başlık cümlesi + not, KDV kartına `kisitli` |
| `src/components/gider/KdvKarsilastirmaKarti.jsx` | `kisitli` prop'u |
| `src/components/gider/MakinaMaliyetDetay.jsx`, `MakinaKarliligi.jsx` | `MaliyetNotlari` `kisitliVar` |
| `src/components/gider/MakinaModelGorunumu.jsx` | satırlar `kalemGiderTutari` |
| `src/components/settings/SettingsGider.jsx` | varsayılan oran alanı |
| `src/components/settings/SettingsGiderTanimlari.jsx` | kutu, oran (boş serbest), liste ibaresi, doğrulama |
| Testler | yeni `kisitli-gider-0076`, `ui/kisitli-gider-0076`, `gider-kasa-raporu-0076`, fikstür `0076-veri.js` + `0076-bayraksiz-once.json`; ek bloklar ve metin güncellemeleri §5 |
| Kanıt | görüntü aracında `kisitli-*` ekranları, `0076-taban-piksel-raporu.json`, `0076-piksel-raporu.json`, `kanit-eslemesi.json` |

## 3. Kararlar (Q1–Q11, TY onayı)

- **Q1:** vergi matrahı notu 0047'de her zaman basılır; altın HTML (faaliyet raporu) etkilenmez.
- **Q2:** model kovası `min(model satırları, matrah)`; fark ortak kovaya.
- **Q3:** AC-36 kanıtı spec'ten önceki kodla üretilmiş motor çıktısı (`0076-bayraksiz-once.json`).
- **Q4:** KKEG matrahında indirilebilir kısım yuvarlanır, artık KKEG'de.
- **Q5:** tedarikçi "Harcama" başlığı ve Makina ve Model kalem satırları gider tutarına geçer.
- **Q6:** KDV kartının kısıt satırları yalnız Giderler'de, tam ay dışında da.
- **Q7:** maliyet notu koşullu (`kisitliVar`).
- **Q8:** listenin KDV alt toplamında ikinci rakam yalnız kısıtlı kalem varken.
- **Q9:** sürüm notunda karışık sürüm uyarısı.
- **Q10:** R22'nin değiştirdiği metinleri arayan testler "spec 0076 R22" notuyla güncellenir.
- **Q11:** kanıtta ortak fikstüre dokunulmaz, kısıtlı veri ayrı `kisitli-*` ekranlarında.

## 4. Adım sırası

1. Dal; "önce" motor çıktısı (`0076-bayraksiz-once.json`); spec revizyon 2; bu plan.
2. Motor (`gider.js`), sonra `makinaMaliyeti.js`; motor testleri ve sıfır fark testi.
3. `db.cjs` (iki tablo); roundtrip ve temiz kurulum (Electron).
4. `giderRaporu.js`; 0059 ayıklama satırı ve 0076 rapor testi.
5. Arayüz: Ayarlar oranı, kalem formu, tanım formu, Dönem Raporu, Giderler, KDV kartı, maliyet notları, Makina ve Model.
6. Metin testleri (R22), kaynak taramaları.
7. Tam takım (Electron dahil), lint, taban ve sonra kanıtı, kanıt eşlemesi, CLAUDE.md.

## 5. Kriter ↔ test

M = `tests/kisitli-gider-0076.test.js`, U = `tests/ui/kisitli-gider-0076.test.jsx`, R = `tests/gider-kasa-raporu-0076.test.js`.

| AC | Test |
|---|---|
| AC-1, 2, 3, 5 | U |
| AC-4 | M (`kisitDogrula`), U (neden metni) |
| AC-6 | M (`kisitliGiderMi`), U (kira, personel, SGK formunda kutu yok) |
| AC-7 | M, U |
| AC-8 | U (`SettingsGider`) |
| AC-9, 10, 12 | M |
| AC-11 | M (kaynak taraması) |
| AC-13, 14, 26 | M (`hesaplaGiderRaporu`) |
| AC-15 | M (dört atama türü, dört kova = toplam) |
| AC-16 | `makina-maliyeti.test.js` ek blok (gerçek ve standart), U (not) |
| AC-17 | `gider-dagitim-0072.test.js` ek blok |
| AC-18 | U (alt toplam dahil; `sayfalama-0062`'nin alt toplam testi R22 metniyle güncellendi) |
| AC-19, 20, 21 | M |
| AC-22 | `ui/genel-arama-0026` ek blok |
| AC-23, 24 | M, `gider-kdv-capraz` ek blok, `ui/finance-gider-kdv` ek blok |
| AC-25 | U, R, `donem-raporu-yerlesim` (Electron, dokunulmadan) |
| AC-27, 28, 42, 44 | U, R |
| AC-29, 30, 31 | U, M |
| AC-32, 33, 37 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-34 | M (`tekrarlayanUret`), U (tanım formu ve listesi) |
| AC-35 | M |
| AC-36 | M (`0076-bayraksiz-once.json`), `gider-kasa-raporu-0059` (altın HTML aynı, JSON'da `delete y.gider.kisitli`) |
| AC-38 | M (tarama: `serverAuth.cjs`, `merge.js`) |
| AC-39, 40, 41 | M, U |
| AC-43 | U |
| AC-45 | R |

## 6. Uygulama notları

- **"Önce" fotoğrafı:** `tests/fixtures/0076-veri.js` bayraksız veri kümesi (her atama türü, kira, personel, SGK, tevkifat,
  dağıtım, parti, KDV dâhil); motor çıktıları kod değişmeden önce `0076-bayraksiz-once.json`'a yazıldı. Maliyet motorunun
  `kisitliVar` işareti ve raporun `kisitli` alanı yalnız kısıtlı kalem varken eklenir, böylece bu karşılaştırma ayıklamasız
  `toEqual` ile yapılır.
- **Q1 çözüldü:** 0059'un altın HTML'i faaliyet raporudur; gider raporunun HTML'i altın dosyada yok. Dipnot 0076 rapor testinde
  denetlenir.
- **Ayarlar formu varsayılanı yazar:** Gider Ayarları kaydı `indirilebilirOran`'ı (dokunulmamışsa 70) yazar (`hatirlatmaEsikGun`
  ve deneme dönemi deseni); `ui/gider-settings` AC-33'ün tam nesne beklentisi bu alanla güncellendi.
- **Tasarım sözlüğü atıfları:** `Giderler.jsx` ve `DonemRaporu.jsx`'e eklenen satırlar dört dosya:satır atfını kaydırdı;
  yeniden eşlendi.
- **Mutasyon:** kova tabanı, indirilecek KDV, model sınırı ve yuvarlama satırları tek tek bozuldu, her biri test düşürdü;
  roundtrip testi okuma tarafı bozulunca düştü.
- **Kanıt aracı:** tam çekim 10 dakika sınırını aştığı için `0009-ekran.cjs`'e `EKRAN_PARCA` ve `EKRAN_SEC` eklendi; taban
  `8017fb0` çalışma ağacından, yeni ekranlar dahil aynı sayfayla (eski kod kısıtlama alanlarını yok sayar) çekildi.
  Sonuç: 638 görüntünün 229'u değişti (115 ekran). Değişenler R22'nin başlık cümlesi (iki satıra çıktı, bütün Giderler
  ekranları ~63 px uzadı), normal kalem formuna eklenen kutu satırı (0075 §6 emsali; formun alt kenarında 4–10 px kalan
  düzenleme ekranları dahil), 0047 gider bölümünün dipnotu (R26) ve yeni `*-0076` ekranlarıdır. İlk turda değişmiş görünen
  stok ve servis formu ekranları (83/249 px) iki ağaçta aynı turda yeniden çekildi, 0 piksel (gürültü). Taban raporu
  (`0076-taban-piksel-raporu.json`) değişen 230 görüntüyü bugünkü kodla onaylı "sonra"ya karşı ölçer: 0 fark. Menü
  ekranı (`uygulama-menu-kasali`) aynı kodla çekimden çekime 0–37 px oynadı; aynı turda yeniden çekildi.
- **Triyaj (2026-10-08):** Gider Ayarları formunun ilk durumuna oran alanı eklenirken satır sonu yorumu
  `hesapsizBaslangic` alanını yuttu; başka bir alan kaydedilince 0051'in başlangıç tarihi silinirdi. Satır ayrıldı,
  `ui/gider-settings`'e dolu ayarla tam nesne testi eklendi (mutasyonla ölçüldü). Spec durumu "Onaylandı, uygulanıyor"
  yapıldı (`kisitli-gider-0076` belge durumu testi). Görsel kanıt üretildi ve kanıt eşlemesine `degisti` kayıtları eklendi.

## 7. Sürüm notu

> **Binek araç giderlerinde kısıtlama.** Gider formunda "Gider kısıtlaması uygulanıyor (binek araç)" kutusunu
> işaretleyin; oran Ayarlar › Giderler › Gider Ayarları'ndaki varsayılandan gelir (%70) ve kalemde değiştirilebilir.
> Uygulama indirilecek KDV'yi bu oranla hesaplar (Finans'taki KDV Karşılaştırması artık doğru ödenecek KDV'yi verir),
> indirilemeyen KDV'yi giderin tutarına ve makina maliyetine katar ve muhasebeciye verilecek KKEG rakamını gösterir.
> Tedarikçiye ödenecek tutar değişmez. Geçmiş bir kalemi işaretlerseniz o ayın ortak gideri ve o ayda üretilen
> makinaların **maliyeti, kârlılığı ve fiyat önerisi** değişir; etki yalnız işaretlenen kalemlerin aylarıyla sınırlıdır.
> Gider ekranlarındaki "KDV hariç" ibareleri kaldırıldı, çünkü kısıtlı kalemlerde toplam indirilemeyen KDV'yi de içerir.
> **Önce sunucu bilgisayarını, sonra bütün istemcileri güncelleyin; güncelleme bitene kadar kutuyu işaretlemeyin**
> (güncellenmemiş sunucu kısıtlama alanlarını kaydetmez, güncellenmemiş istemci onları tanımaz).
