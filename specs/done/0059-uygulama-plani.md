# 0059 Uygulama Planı: Gider ve Kasa Raporu Aylık Rapor Diliyle

| | |
|---|---|
| **Bağlı spec** | `specs/done/0059-gider-kasa-raporu-detay-ve-tasarim.md` (R2, plan onayıyla) |
| **Dal** | `feat/0059-rapor-detay` (`feat/0063-tahsilat-hesap` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q14) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- `hedefEtiketi` `hedefAdi`, `PERSONEL_AD`, `HEDEF_AD` ve `tl2`'ye dayanıyor; zincir bütünüyle taşınmalı (R31).
- Hatırlatıcı satırı tür ve tarih taşımıyor; kimlikle ay sonu kalem haritasından çözülür (R35).
- Faaliyet raporu iki şerit (`bolum`, `kutu`) ve yerel `rozet`, `gun`, `detayTablo` kullanıyor; `olusturmaTarihi`
  `new Date()` okuyor, byte eşitliği zaman sabitlenerek ölçülür.
- `tests/gider-kasa-raporu.test.js` işaretlemeye bağlı iddialar taşıyor (`<h3>Kalem listesi`, `<h4>TRY</h4>`, `class="r"`).
- 0047 gizlilik çıktı testi belgenin her yerinde "Resmi" / "Elden" ve küçük tutarları yasaklar; yeni metinler bunlardan kaçınır.
- Spec 0060 aynı belgeye ve `hedefAdi`'ye dokunacak; 0059 önce gelir.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/raporSunumu.js` (yeni) | Belge kabuğu, `bolum`, `kutu`, `st`, geçen ay eki, `altBaslik`, `detayTablo`, `rozet`, `gun`, `sayi`; veri alanı adı ve React yok |
| `src/lib/printTemplates.js` | Faaliyet yardımcıları ortak modülden; çıktı birebir aynı |
| `src/lib/giderRaporu.js` | Önceki ay iç çağrısı, detay verileri, HTML ortak modülle |
| `src/lib/kasa.js` | `hareketOzeti(..., { liste: true })` |
| `src/lib/cek.js` | `cekAyOzeti(..., { liste: true })` |
| `src/lib/odemeYontemi.js` | Hedef ad zinciri (R31) |
| `src/components/gider/GiderAlanlari.jsx` | Yeniden dışa verir |
| `tests/fixtures/0059-*` | Altın çıktılar (HEAD) |
| `tests/gider-kasa-raporu-0059.test.js` (yeni), `tests/gider-gizlilik.test.js`, `tests/gider-kasa-raporu.test.js`, `tests/ui/gider-kasa-raporu.test.jsx` | Testler |
| `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0059-*`, `CLAUDE.md` | Kanıt ve belge |

## 3. Kararlar

Q1 R31 · Q2 R32 · Q3 R33 · Q4–Q6 R34 · Q7 R35 · Q8 R36 · Q9 R37 · Q10 R38 · Q11 R39 · Q12–Q13 R40 · Q14 R41.

## 4. Adım sırası

1. Altın çıktılar (HEAD). 2. Motor genişlemeleri. 3. Etiket zinciri lib'e. 4. Ortak modül + faaliyet dönüşümü.
5. `giderKasaRaporu` veri. 6. Gider HTML. 7. Gizlilik ve eski testler. 8. Kanıt, TY onayı. 9. `CLAUDE.md`, tam takım, lint.

## 5. Kriter ↔ test eşlemesi

`R` = `tests/gider-kasa-raporu-0059.test.js`, `G` = `tests/gider-gizlilik.test.js` (0059 bloğu),
`U` = `tests/ui/gider-kasa-raporu.test.jsx` (0059 bloğu), `E` = `ek-odeme-hedefi`, `kasa-0051` testleri.

| AC | Test |
|---|---|
| AC-1, 2, 3 | R |
| AC-4 | G |
| AC-5 | R (altın HTML) |
| AC-6, 7, 8, 21, 22 | R + U |
| AC-9, 31 | R |
| AC-10, 27 | R |
| AC-11, 29 | R |
| AC-12 | R |
| AC-13, 26 | R |
| AC-14, 19 | R (altın JSON) |
| AC-15, 30 | R |
| AC-16, 17, 18, 32 | G |
| AC-20 | R |
| AC-23, 24 | R + E |
| AC-25 | R |
| AC-28 | R |

## 6. Uygulama notları

- **Altın çıktılar** (`tests/fixtures/0059-aylik-faaliyet.html`, `0059-gider-rapor-once.json`) değişiklikten önce HEAD koduyla,
  sabit sistem saatiyle (faaliyetin `olusturmaTarihi` `new Date()` okuyor) ve ortak `tests/fixtures/0059-veri.js` verisiyle
  üretildi; geçici üretici test silindi.
- Faaliyetteki `kutu` yardımcısı tanımlı ama hiç kullanılmıyordu; asıl koyu şeritli kutu `bolum`. Ortak modüle `bolum`
  taşındı, ölü `kutu` silindi (çıktı birebir aynı).
- `tests/ui/kasa-0051.test.jsx` AC-16/AC-30 tanımın yerini `GiderAlanlari.jsx`'te arayan bir kaynak taramasıydı; R31 ile
  tanım `odemeYontemi.js`'e indiği için o dosyaya bakar ve `GiderAlanlari.jsx`'in yeniden dışa verdiğini doğrular
  ("spec 0059 R31 ile güncellendi"). Spec AC-24'ün "değişmeden geçer" ifadesinin tek istisnası; davranış testleri değişmedi.
- 0047 ve 0055 testlerinin işaretlemeye bağlı iddiaları (`<h3>`, `class="r"`, başlık metinleri) yeni dile göre güncellendi
  ("spec 0059 R33 ile güncellendi"); rakam iddiaları dokunulmadan geçti. Üst başlık ayı "Eylül 2026 dönemi" olarak kaldı.
- Ağustos kaleminin `toplam`'ı KDV hariçtir (4.000); geçen ay eki bu rakamı yazar.
- Vadesiz stopaj satırı hatırlatıcıya girmez (0021 R13); "Vergi dairesi" satırının testi stopaja vade verilmiş bir kopyayla.
- `ayAdi` ay adını `new Date(y, m - 1, 1)` ile üretir; saat okumaz. AC-20 taraması argümansız `new Date()`, `Date.now`,
  `yerelBugun`, `today(` arar.
- **Triyaj (2026-10-01):** (1) kalemi kalıcı silinmiş ödeme ödeme tablosunda tarihli satır olarak basılmaz, "Silinmiş kalem
  ödemeleri · n adet" toplu satırına iner (personel kalemi çöpten kalıcı silinince kişinin tutarı kâğıda düşüyordu); 0047'nin
  hesapsız listesi R13 gereği aynen kaldı. (2) Tedarikçi altındaki kalemler tedarikçi kimliğiyle gruplanır (aynı adlı iki
  tedarikçi tek tabloda karışıyordu). (3) `hedefEtiketi` tutar biçimini parametre alır; rapor `fmtCur` (kuruşsuz), ekranlar
  `tl2`. (4) Önceki ay iç çağrısı detay listesi kurmaz. (5) `cekAyOzeti`'nde `ekle` çek ve tarihi parametreyle alır, elde
  kovası liste almaz; `hareketOzeti` tahsilat satırı ham kaydı ve hesap nesnesini taşımaz (`hesapId`, `hesapAd`).
  (6) Hesapsız çek hareketinde hesap sütunu yöntemin kendisidir ("Çek (ciro)", R36). (7) AC-1 başlık listesi ve AC-12
  satırları tam eşitlikle. Kanıtın üç rapor ekranı yeniden çekildi.
- **Kapanış:** taban `0059-taban-piksel-raporu.json` (3 rapor ekranı × 2 tema, 0 piksel).
