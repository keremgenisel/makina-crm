# 0136 uygulama planı: üretilmiş makinanın maliyeti donar

Spec: `specs/done/0136-uretilmis-makinanin-maliyeti-donar.md` (QA turu 35 bulgu, plan turu Karar 36–47). Dal `feat/0136-maliyet-donar` (`../wt0136`), taban main `d26752b7`. Plan Takım Yöneticisi'nin 2026-11-08 onayıyla; on bir önerinin hepsi kabul edildi.

## 1. Dosyalar

**Yeni**
- Testler: `tests/donan-maliyet-0136.test.js` (motor, kapanış, okuma, anahtar çözümü, sapma, taramalar), `tests/donan-maliyet-0136-kiyas.test.jsx` (`tests/fixtures/0136-once.json`, `0136-veri.js`, spec öncesi koddan, `YAZ_0136=1`), `tests/donan-maliyet-0136-cagri.test.jsx` (çağrı sayacı, jsdom: AC-80 ekranda ölçülür), `tests/ui/donan-maliyet-0136.test.jsx` (gerçek Makina Maliyeti), `tests/ui/donan-maliyet-0136-app.test.jsx` (gerçek App).

**Değişen**
- `src/lib/makinaStandartMaliyet.js`: `partiKapanisGoruntusu(veri, parti, bugun, { katalog, modeller, partiPay })` (R20); tarihli direkt maliyetin ortak yardımcısı (parti hesabı ile görüntü aynı hesabı kullanır); `partiHesabi` görüntüyü okur (R6, R7, R10–R10/8); Üretim Partileri'nin hücrelerine donmuş değeri bindiren `partiGosterimi`; opt-in `partiMaliyetSapmalari` (R21). `partiGenelPaylari` değişmez (C6/2).
- `src/lib/uretimPartisi.js`: `partiKapanisUygula` beşinci parametre görüntü (yaz, koru, sil, reddet); `partiDogrula` gelecek bitiş (R3/2); `kapanisMaliyetiOf`, `partiDondurmaDurumu` (R2/2); ekran metinleri.
- `src/components/MakinaMaliyeti.jsx`: `kapanisGoruntusu` geri çağırımı (Karar 36), Üretim Partileri'ne sapma girdisi.
- `src/components/gider/UretimPartileri.jsx`: kapanma tarihi, kapanıştaki adet, dondurulmadı ibaresi, donmuş hücreler, yeniden açma onayı, gelecek bitiş hatası, genişleyen sapma kutusu.
- `src/components/maliyet/PartiHesabi.jsx`: şerit, dondurulmamış satırın nedeni, katsayı ipucu, tedarik notu, planlanan adetler kapısı.
- `electron/db.cjs`: `uretim_partileri.kapanisMaliyeti` TEXT JSON (dört nokta, koşullu okuma).
- `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs`, `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md`, `specs/done/0002-…`, `specs/done/0022-…` (C1 atfı).

Yeni veri bölümü, eylem izni, sunucu kuralı ve birleştirme kuralı yok.

## 2. Adım sırası

0. Taban: spec öncesi kodla kıyas altını (görüntüsüz veri: açık, 0090 ay havuzlu kapanmış, 0090 öncesi kapanmış, partisiz makina; parti hesabı, parti payı, kâr özeti, iki ekranın metni, sapma kutusu) ve görsel taban.
1. Saf motor ve kapanış; kıyas yeşil.
2. Veri: `db.cjs`, roundtrip, temiz kurulum.
3. Ekranlar.
4. Ters çevrilen eski testler ("spec 0136 ile"), taramalar.
5. Görsel kanıt, tam takım ve Electron, mutasyon, sürüm notu, CLAUDE.md, 0002/0022 atfı.

## 3. Kararlar

Spec'in "Plan turu kararları" tablosu (Karar 36–47): kapanış geri çağırımı payı yeni kayıtla kurar; model yoksa isteğe bağlı `neden`; AC-67 "dondurma bölüşmeyi değiştirmez"; kıyas motorda birebir, ekran metninde yeni ibareler ayıklanır; sapma kümesi görüntüde çözülebilen anahtarlar ve planlar; gelecek bitiş için bugün isteğe bağlı parametre; AC-19 tamamen donmuş partide; iki tarih; kapıların kapsamı; sapma tek `useMemo`'da; ikinci arama `sourceStockId`; görüntüsüz veride sapma kutusunun metni bugünkü gibi.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1–AC-4, AC-7, AC-46, AC-47, AC-50, AC-56 | saf (görüntü, kapanış yolu) |
| AC-5, AC-55, AC-6 | saf, ekran |
| AC-8–AC-11, AC-48, AC-49, AC-75, AC-76 | saf, ekran |
| AC-12–AC-18, AC-20–AC-22, AC-64–AC-66 | saf |
| AC-19, AC-82 | çağrı sayacı |
| AC-23–AC-27, AC-58–AC-63 | saf |
| AC-28, AC-30, AC-31, AC-32, AC-38, AC-79 | kıyas |
| AC-29, AC-68–AC-71 | ekran |
| AC-33–AC-37, AC-77, AC-78, AC-81 | saf, ekran |
| AC-80 | çağrı sayacı |
| AC-39–AC-41 | saf, ekran |
| AC-42–AC-44 | db-roundtrip, db-clean-install |
| AC-45, AC-51, AC-52, AC-85 | saf (taramalar) |
| AC-53, AC-54 | saf, ekran |
| AC-57, AC-72–AC-74 | ekran |
| AC-67 | saf (Karar 38) |
| AC-83 | saf, App |
| AC-84 | saf (sürüm notu taraması) |

## 5. Görsel kanıt

Dondurulmuş parti (iki ekran), dondurulmamış kapanmış parti, açık parti, sapma kutusu, yeniden açma onayı, pasif planlanan adetler düğmesi, gelecek bitiş hatası; değişen eski ekranlar `degisti` + onay, kapanışta `ayni`.

## 6. Sürüm notu

Önce sunucu PC, sonra bütün istemciler güncellenmeli; güncelleme bitene kadar parti kapatılmamalı (güncellenmemiş sunucu yeni alanı düşürür ve donmuş partiler birden "dondurulmadı" olur; eski istemcinin kapanışı maliyet görüntüsü yazmaz). Bu sürümden sonra kapatılan partilerin maliyeti donar; önceden kapanmış partiler donmaz ve "dondurulmadı" ibaresi taşır, dondurmak için parti yeniden açılıp kapatılır. Bilinen sınırlar: müşteri kaydı silinip stoğa dönen makina dondurulmamış sayılır (X10), modeli katalogda olmayan makina satır üretmez (X9), iki bilgisayar aynı anda çalışırken çakışma birleştirmesinde kapanış kaybolabilir, parti yeniden kapatılır (X13).

## 7. Uygulamada bulunanlar

Spec'in "Uygulamada verilen kararlar" tablosu (Karar 48–51): sapma satırının işareti motordan (0090 AC-51 taraması ekranda `Math` yasaklıyor), kapanış bildirimi ve onay düğmesinin metni, Karar 44'ün dört eski testin partisini açığa çevirmesi, AC-41'in taramayla ölçümü. Kıyas altını (`0136-once.json`) spec öncesi koddan; ekran metninde ayıklanan yeni ibareler dörde çıktı (planlanan adetler kapısının nedeni de kapanmış partide çizildiği için). Kanıt: `maliyet-*`/`*parti*` adlı 40 ekran taban ve yeni kodla çekildi; 7 eski ekran bilinçli değişti (kapanma tarihi, "dondurulmadı", şerit, pasif düğme), 7 yeni ekran eklendi, kalan 26 ekran 0 piksel. Mutasyon ölçümü on iki noktada (görüntünün okunması, kapanışa geçirilmesi, payın yeni kayıtla kurulması, hücrelerin bindirilmesi, ikinci arama, plan haritası, sapma döngüsü ve direkt toplamı, yeniden açma onayı, plan düğmesi, gelecek bitiş); hepsi en az bir testle yakalandı. İlk turdaki ikinci arama mutasyonu yanlış yere (sapma döngüsüne) uygulanmıştı; doğru yere uygulanınca AC-23 yakaladı.

**Triyaj (2026-11-08):** (1) testler pay toplamını, satırın toplam maliyetini ve özetin standart toplamını da karşılaştırır; planlı donmuş partinin direkt sapması ve durumu "tamam" olmayan donmuş partinin pay durumu sınandı (kaçan üç bozma artık yakalanıyor); (2) Karar 52, aralığı değişen donmuş partide onay ve "yeniden donduruldu" bildirimi; (3) sapma girdisi `useMemo`'da, AC-80 yeniden çizimde sayacın artmadığını ölçer, aralığı aynı düzenlemede görüntü hesaplanmaz; (4) Karar 53, nötr satır nedeni (kanıtta `maliyet-0136-parti-donmus` yeniden çekildi).
