# 0047 Uygulama Planı: Aylık Gider ve Kasa Raporu

| | |
|---|---|
| **Bağlı spec** | `specs/0047-aylik-gider-ve-kasa-raporu.md` (R3, plan onayıyla onaylandı) |
| **Dal** | `feat/0047-gider-kasa-raporu` (`feat/0046-form-odeme` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-30: bütün öneriler (Q1–Q11) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/giderRaporu.js` (yeni) | `giderKasaRaporu(girdi, ay, { kalemListesi })` (yalnız motorları çağırır), `buildGiderKasaRaporuHtml(rapor)` |
| `src/lib/kasa.js` | `hesapBakiyeleri(…, { aralik })` (aralıksız birebir aynı), `hareketOzeti(hareketler, aralik)`, `hesapsizOdemeler` / `hesapsizTahsilatlar`'a isteğe bağlı aralık ve liste |
| `src/lib/cek.js` | `cekDurumuAyinSonunda(cek, tarih)`, `cekAyOzeti(cekler, payments, ay)` |
| `src/components/rapor/GiderKasaRaporuDugmesi.jsx` (yeni) | Paylaşılan düğme, ay alanı, kalem listesi kutusu, yazdırma çağrısı, tek yetki kapısı |
| `src/components/Giderler.jsx`, `Kasa.jsx`, `Finance.jsx` | Bileşeni yerleştirir (Finans `raporAy` ile) |
| `src/App.jsx` | Tek `giderKasaRaporVerisi` memosu, yalnız `kasaYetki` ile |
| `tests/gider-gizlilik.test.js` | Mevcut denetimler aynen; çıktı temelli blok ve yerleşim denetimi eklenir |
| Testler | yeni `gider-kasa-raporu.test.js` (motor genişlemeleri dahil), `ui/gider-kasa-raporu.test.jsx`; `gider-gizlilik.test.js` ek bloğu |
| `scripts/evidence/0009-sayfa.jsx`, `CLAUDE.md` | Belge ve düğmeli ekranlar; gizlilik sınırının yeni tanımı |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Ay sonu kilidi: hareketler `tarih ≤ ay sonu` süzülüp `odemeleriUygula`'dan geçer; avans, çek, kasa, kart blokajı ay sonuna göre |
| Q2 | AC-4 daraltıldı: toplam/KDV/stopaj her zaman aynı; ödenen/ödenmeyen ay kapandıktan sonra ödeme girilmediyse aynı |
| Q3 | Kapı üç ekranda `kasaYetki` |
| Q4 | App'te tek veri memosu, üç ekrana aynı |
| Q5 | Motorda olmayan sayımlar motora (`hareketOzeti`, aralıklı hesapsız listeler, `cekAyOzeti`) |
| Q6 | Personel tek satır; `calisanlar` okunmaz; kalem sayısı yazılmaz |
| Q7 | Ödeme durumu `odemeHatirlatmalari(ay sonu)`; tahsilat bakiyeye giren dört kaynak; tedarikçi borcu motorun kırılımı |
| Q8 | Düğme `ay` prop'u alırsa kendi alanını çizmez (Finans); yoksa varsayılan önceki ay |
| Q9 | Para birimi blokları, açılış/kapalı hesap kuralları, geçmişsiz çek dipnotu |
| Q10 | Belge ve düğmeli ekranlar görüntü aracında; değişenler `degisti` + TY onayı |
| Q11 | Salt okunurluk durum karşılaştırmasıyla test edilir |

## 3. Adım sırası

1. Motor genişlemeleri ve testleri (geriye dönük uyum önce).
2. Rapor kurucusu, HTML, çapraz testler ve çıktı temelli gizlilik testi.
3. Düğme, kapı, App verisi, üç ekran.
4. Arayüz testleri.
5. Görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-3, AC-5, AC-6, AC-8, AC-10, AC-17, AC-18, AC-20, AC-23, AC-32, AC-34, AC-58, AC-59, AC-60 | `gider-kasa-raporu.test` |
| AC-4, AC-9, AC-7, AC-33, AC-30, AC-31 | `gider-kasa-raporu.test` (çapraz ve kilit) |
| AC-11, AC-12, AC-35, AC-36, AC-55, AC-56 | `gider-kasa-raporu.test` (kasa motoru ve kasa bölümü blokları) |
| AC-46, AC-47 | `gider-kasa-raporu.test` (kasa motoru bloğu) |
| AC-13, AC-14, AC-52, AC-53 | `gider-kasa-raporu.test` (kasa motoru bloğu) |
| AC-15, AC-48, AC-49 | `gider-kasa-raporu.test` (çek bloğu) |
| AC-16, AC-37, AC-38, AC-50, AC-51 | `gider-kasa-raporu.test` |
| AC-19, AC-21, AC-22, AC-23, AC-24, AC-25, AC-41, AC-42 | `gider-gizlilik.test` + `gider-kasa-raporu.test` (gizlilik bloğu) |
| AC-1, AC-2, AC-26–AC-29, AC-39, AC-40, AC-43–AC-45, AC-54, AC-57 | `ui/gider-kasa-raporu` |

## 5. Uygulama notları

- Motor genişlemeleri yalnız `kasa.js` ve `cek.js`'e yazıldı; `giderRaporu.js` çağırır ve dizer. Kaynak taraması (`gider-kasa-raporu.test.js` R35/C2) kurucunun motorları çağırdığını ve `calisanlar`/`calisanAd`/`resmiTutar`/`eldenTutar`/`ekOdemeler` okumadığını sabitler.
- Kasa bölümündeki nakit hareket tutarları (hesap giren/çıkan, ayın yöntem kırılımı) çalışan kırılımı değildir: tek çalışanlı ayda personelin ödeme hareketi tutarı yöntem satırında görünebilir. Yasak olan ad, resmi/elden bileşeni, ek ödeme ve kişi bazlı avanstır; çıktı testi bunları denetler.
- Giderler'de rapor düğmesi yalnız başlıktadır; boş durum kutusunun eylemlerine girmez (aynı `eylemDugmeleri` iki yerde çiziliyordu).
- Finans'ta `fin_rapor` izni yoksa Aylık Rapor seçicisi çizilmediği için düğme kendi ay alanıyla çizilir (kapı aynı).
- Görüntü aracı: mevcut ekranlar rapor verisi almadan çizildiği için değişmedi; düğme `giderler-rapor-dugmesi`, `kasa-rapor-dugmesi`, `finans-rapor-dugmesi` ekranlarında, belge `gider-kasa-raporu-belge` ve `-kalemsiz` ekranlarında. "Önce" çekimi için eski kopyaya yer tutucu `giderRaporu.js` kondu (yeni modül orada yok).
- Triyaj (2026-09-30), bulgu 1: hesapsız listede personel ödemeleri ve çalışan avansları tek tek yazılıyordu (tek bir çalışanın elden tutarı tarihiyle kâğıda düşüyordu). İkisi birer toplu satırdır (adet + toplam); R31'e TY onaylı istisna yazıldı. `gider-gizlilik.test.js` AC-24 verisi iki çalışanlı ve hesapsız elden ödemeli, tek tek tutarlar yasaklı.
- Triyaj bulgu 2: `cekAyOzeti` aynı ay içinde iptal edilip portföye dönen ciroyu artık saymaz (iptal ertesi aydaysa ciro sayılır).
- Triyaj bulgu 3: gizlilik testinin ilk tarama bloğu başlığı AC-25 atfını taşır.
- Kanıt incelemesinde: hesapsız listede tutarsız göç hareketi (0024 `tamKapatir`, tutar boş) "₺0" yazıyordu; artık "Tamamı (eski kayıt)" yazar (`gider-kasa-raporu.test.js` AC-37 ek testi).
