# 0150 Uygulama planı: sipariş listesinde işlemler, toplu fiyat kipi düğmeleri kalkar

| | |
|---|---|
| **Spec** | `specs/0150-siparis-listesinde-islemler.md` (Onaylandı, 2026-11-20) |
| **Onay** | Takım Yöneticisi, 2026-11-20 ("tüm önerilerini onaylıyorum, spece işle, planı yaz ve uygula") |
| **Dal** | `feat/0150-siparis-islemler` (main `e9dfbb4a` üstünde) |
| **Durum** | Uygulandı, commit bekliyor |

## 1. Dosyalar

- **Motor `src/lib/siparisIhtiyaci.js`:** yeni sabitler (tablo başlığı, sütunlar dışındaki metinler, tutar nedeni, işlemler toplamı,
  tedarikçisiz işlem ibaresi), `tedarikciSecenekleri` işlem tedarikçilerini de verir ve `HAMMADDE_SUZGEC_NEDENI` bunu söyler; işlem
  satırları tek kurucuda hazırlanıp iki yapıya yazılır (pencere `bolumler[].islemler` ve `belirtilmemis.islemler`; belge
  `belge[].islemler`, `islemToplamK`, `islemTutarsizSayi`); belge bölümünün süzgecine "yalnız işlem" dalı; `bosDurumNedeni`.
- **Belge `src/lib/siparisRaporu.js`:** `BELGE_SUTUNLARI.islem` ve `belgeSutunlari` dalı, işlemler tablosu ve kendi toplamı (grup
  tablolarından sonra, fark notundan önce), `basilacakBolumler` işlem satırını da sayar, parça satırı olmayan bölümde bölüm toplamı
  yok, elle notunun koşulu işlem satırlarını da kapsar.
- **Pencere `src/components/stock/SiparisPenceresi.jsx`:** kart süzgeci, işlemler tablosu (para yok), belirtilmemiş kutusunun koşulu
  ve işlem tablosu.
- **B `src/components/PartManager.jsx`:** toplu kip bloğu, onay, ölü kod ve altı içe alma silinir; `lib/parcaFiyati.js` dokunulmaz (X5).
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` (`katalog-parca-0133-toplu` silinir; yeni işlem ekranları), `docs/evidence/0150-*`,
  `kanit-eslemesi.json`.
- **Testler:** `tests/siparis-islem-0150.test.js` (S: motor, belge, taramalar), `tests/ui/siparis-islem-0150.test.jsx` (U: pencere),
  `tests/ui/toplu-kip-kalkar-0150.test.jsx` (B), kıyas ayıklaması `tests/fixtures/0150-ayikla.js`; "spec 0150 ile" güncellenen eski
  testler §4'te.

## 2. Adım sırası

1. Motor ve saf testler. 2. Belge kurucusu. 3. Pencere. 4. B parçası. 5. Eski testler (ayıklama, ters çevirmeler); hızlı ve Electron
takımı, lint, tsc. 6. Kanıt (eski kodla iki çekim, yeni kodla bir çekim). 7. Belgeler (`CLAUDE.md`, `specs/README.md`, 0149'un notları).

## 3. Kararlar (hepsi 2026-11-20'de onaylandı)

| No | Konu | Karar |
|---|---|---|
| P1 | Patlatılmamış set | Hiçbir set işlem satırı üretmez (R3/5). |
| P2 | Hatalı parçanın işlemi pencerede | Çizilmez; belge sayacı artar (R10/2, R3/3). |
| P3 | Düzenlenmiş parçanın işlemi pencerede | "DÜZENLENDİ" rozeti (R10/2). |
| P4 | Seçici kümesi | Canlı, set olmayan parçaların işlem tedarikçileri (R5/3). |
| P5 | Tutarsız sayacı metni | Var olan `tutarsizMetni`. |
| P6 | Bölüm toplamı ölçütü | Parça satırı yoksa yazılmaz (R9/4). |
| P7 | "Karma" fikstürü | Belge kıyası birebir; motor kıyası `islemler` ayıklamasıyla; `siparis-0143-pencere` değişti. |
| P8 | `PartManager` kanıtı | Yalnız gerçekten farklı kayıtlar "değişti"; oynama eski kodun iki çekimiyle ayıklanır. |
| P9 | Onay satırı | `Takım Yöneticisi · 2026-11-20 · spec 0150 R11`, kapanışta "aynı". |
| P10 | Tutar | Kuruşa çevrilen birim × parça adedi; boş tutar nedenli ve toplam dışı, 0 toplama girer. |

## 4. Kriter ↔ test

S = `siparis-islem-0150.test.js`, U = `ui/siparis-islem-0150.test.jsx`, B = `ui/toplu-kip-kalkar-0150.test.jsx`, K = var olan kıyaslar.

| AC | Test |
|---|---|
| 1, 2, 3 | U |
| 4, 5, 6, 7, 8 | S |
| 9, 10, 11 | S + U |
| 12, 13, 14 | S |
| 15, 16 | S + U |
| 17, 18, 28 | S + U |
| 19 | K: (a) 0140, 0142, 0144, 0147 yalnız ayıklamayla; (b) 0139, 0141, 0143 belge HTML'i birebir |
| 20–24 | B |
| 25, 26 | S + U |
| 27, 29–38, 40 | S |
| 39 | U |
| 41, 43 | B (mutasyonla) |
| 42 | `kanit-eslemesi` testi |
| 44 | `ui/cok-kelimeli-arama-0149` |

## 5. Uygulamada verilen kararlar

| No | Konu | Karar |
|---|---|---|
| P11 | AC-8 ve AC-19 (b) ölçümü | Aynı veriyi "işlemsiz" hâliyle kıyaslamak yanlıştı: işlem kalemi hazır parçanın maliyetini de değiştiriyor. İkisi spec öncesi koddan üretilmiş altınla (`tests/fixtures/0150-once.json`, `YAZ_0150=1`) ölçülür: işlem kalemli katalogda bölüm toplamları ve "Bölüm toplamı" satırı, yalnız tedarikçisiz işlemli katalogda iki nüshanın belge HTML'i birebir. |
| P12 | Eski kıyaslar | Yalnız iki kıyas yeni alan yüzünden kırıldı (0141, 0142); `0150-ayikla.js` yalnız `islemler`, `islemToplamK`, `islemTutarsizSayi`'yı düşürür. 0143, 0144, 0147 kıyasları dokunulmadan yeşil (AC-19 a). |
| P13 | Ters çevrilen testler | `ui/parca-fiyati-0133` (beş toplu kip testi), `-app` (iz kaydı), `ui/maliyet-kalemleri-0135` (AC-118'in onay yarısı), `ui/cok-kelimeli-arama-0149` (AC-33'ün toplu kip yarısı), `siparis-raporu-0144` (sütun nesnesine `islem`); hepsi "spec 0150 ile" notlu. |
| P14 | Kanıt | Eski kodun iki çekimi 0 fark (oynama yok). 136 görüntü değişti: `PartManager` kökenli katalog ekranları (toplu kip bloğu kalktı, liste yukarı kaydı), bütün sipariş penceresi ekranları (seçici ibaresi uzadı, 16.849 piksel), üç yeni pencere, bir katalog (kat yok) ve iki belge ekranı; var olan sipariş belgesi ekranları 0 fark. Eşlemede eski kayıtlar korunur, değişen her ekrana bir "değişti" kaydı eklenir (114 kayıt, beş dosya); `katalog-parca-0133-toplu`'nun dört kaydı silindi. `siparis-0140-malzemeler`, `-parca-ihtiyaci`, `siparis-0142-olcu`, `siparis-0143-pencere` adımları 2026-11-15'ten beri hedefsiz (bilinen borç, bu işte dokunulmadı). |
| P15 | Mutasyon | Eski `PartManager` geri konunca B testinin dördü, motorda set ve eski katalog süzgeci kaldırılınca A testlerinin sekizi kırıldı. |
| P16 | Yan bulgu | `0133-app` testinde `within` ve `Settings` toplu kip testi silinince kullanılmaz kaldı; içe alma temizlendi. |
| P17 | Triyaj bulgu 1 (TY kararı: ibare) | Belge bölümü kilitleyen hatalı parçaların kimliğini tutar (`hataliParcalar`, parça ve işlem yolu); motor seçimde görünmeyenleri `gizliHatalar` olarak (ad, satırın kartı, metin) döndürür, pencere `siparis-gizli-hata` şeridinde söyler. Test: S ve U "R10/3" blokları (AC-45); kıyas ayıklaması iki alanı da düşürür. |
| P18 | Triyaj bulgu 2 | `tikla:` adımı `CokluSecim`'in onay kutusunu taşıyan etiketi bulamıyor ve uyarısız kart başlığına tıklıyordu; adım `etiket:Kaplamacı` oldu, ekran yeniden çekildi (Kaplamacı işaretli, tek kart). Ders: `tikla:` yalnız çocuksuz metin öğesine tıklar; denetimli giriş için `etiket:` kullanılır, adımın "bulundu" olması doğru öğeye tıklandığını kanıtlamaz. Test U "triyaj (bulgu 2)". |
| P19 | Triyaj bulgu 3 | AC-42 adlı test `ui/toplu-kip-kalkar-0150`'de; AC-44 `ui/cok-kelimeli-arama-0149`'daki testin adında. |
