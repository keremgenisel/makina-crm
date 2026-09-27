# 0021 Uygulama Planı: Gider Taksitlendirme ve Vergi Ödemesi Takibi

| | |
|---|---|
| **Bağlı spec** | `specs/0021-gider-taksitlendirme.md` (R2, plan onayıyla onaylandı) |
| **Durum** | Uygulandı, commit bekliyor. 2026-09-27: T1–T12 onaylandı; spec R2; görünüm Takım Yöneticisi tarafından onaylandı. Dal `feat/0021-gider-taksit`. |
| **Önkoşul** | 0001 (gider motoru), 0003 (ödeme hatırlatıcısı), 0020 (dal tabanı) |

---

## 0. Kodda doğrulanan dayanaklar (2026-09-27)

| Konu | Bulgu |
|---|---|
| Ödenecek tutar | `gider.js` `odenecekKurus = kalemKurus − stopaj + KDV`; stopaj hiçbir borçta yok. |
| Vade | `vadesiGectiMi(k, bugun)` doğrudan `k.odendi` ve `k.sonOdemeTarihi` okuyor; borç özeti, hatırlatıcı, dönem raporu süzgeci ve tedarikçi kırılımı paylaşıyor. |
| Borç özeti | Üç tür: `tedarikci`, `secilmemis`, `calisanlar`; toplam = satırların toplamı. "Tedarikçilere açık borç" kartı ayrı hesap (`tedarikciKirilimi.tedarikciBorcu`). |
| Hatırlatıcı | `odemeHatirlatmalari` kalem dolaşır; `!k.sonOdemeTarihi` kalemi kapsam dışı bırakır. |
| Sunucu | `ALAN_IZINLERI.giderler = [odendi → gider_odeme]`, alan değeri `stableStringify` ile karşılaştırılıyor. |
| DB alt satır | `yedek_parca_tahsis` ve `gider_model_satirlari`'nda satıra id verilmiyor: `db.cjs` yorumu, rowid çakışmasının bütün kayıt işlemini geri aldığını anlatıyor. |
| Merge | Model satırları kalemin içinde taşınıyor; kalem id eşlemesi `giderRef`. |

## 1. Kararlar

| No | Karar |
|---|---|
| T1 | Hedef başına ödeme satırları (`taksitler`), yalnız taksitli kalemde ve stopajlı kirada; satırı olan kalemde `odendi`/`odemeTarihi`/`sonOdemeTarihi` türetilip yazılır; tek saf hesap `odemeHedefleri`. |
| T2 | Satır kimliği `taksit_id` sütununda; SQLite birincil anahtarı rowid. |
| T3 | Sunucu satır bazında: satır `odendi`/`odemeTarihi` değişimi veya ödenmiş yeni satır → `gider_odeme`. |
| T4 | Vade = ilk vadenin günü + n ay, ay sonuna kırpılır. |
| T5 | Taksitsiz kirada listede iki anahtar; eski satırsız kirada stopaj durumu kalemi izler; stopaj vadesi varsayılansız. |
| T6 | Hatırlatma kartı kalem sayar (en acil kova); pencere hedef başına. |
| T7 | Dönem raporunun "ödenmemiş gider" kartı değişmez. |
| T8 | Kırılan mevcut testler tek tek onaya gelir. |
| T9 | AC-14 bilgi satırı kira ve normal formda. |
| T10 | Taksit sayısı 1 planı kaldırır. |
| T11 | Tutar değişimi: ödenmiş toplamın altı hata; kalan var satır yoksa bir satır eklenir; kalan sıfırsa ödenmemişler düşer. |
| T12 | Komisyon anlık görüntüsü uygulanmaz; adlandırma tahsilatla uyumlu. |

## 2. Adım sırası

1. Koruma testleri (AC-10, AC-11, AC-16; taksitsiz kalemde hatırlatıcı ve vade aynı).
2. Motor: `gider.js`, `odemeHatirlatma.js`.
3. DB: `gider_taksitleri` (beşli kural), `db-roundtrip`, `db-clean-install`.
4. Sunucu: `serverAuth.cjs` satır denetimi; `server-authz`, `server-security.cjs`.
5. Merge ve çöp kutusu testleri.
6. Arayüz: form (`OdemePlaniAlani`), liste (rozet, kira anahtarları, `OdemePlaniPenceresi`), borç özeti, Anasayfa hatırlatma.
7. Tam koşu, lint; kırılan testlerin istisna listesi.
8. Görsel kanıt, TY onayı.
9. Belgeler.

## 3. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-3 | `gider-taksit.test.js` (plan, kuruş artığı, ay sonu kırpması) |
| AC-4, AC-5 | `gider-taksit.test.js` + `ui/gider-taksit` (durum, rozet) |
| AC-6, AC-25 | `gider-taksit.test.js` + `ui/gider-taksit` (kalem çevirme etkisiz, türetilen alanlar) |
| AC-7 | `gider-taksit.test.js` (borç özeti ve tedarikçi borcu kalan) |
| AC-8, AC-9, AC-24 | `odeme-hatirlatma.test.js` ek blok + `ui/dashboard-odeme-hatirlatma` ek blok |
| AC-10, AC-11, AC-16 | `gider-taksit.test.js` (rapor, KDV, kova, maliyet aynı) |
| AC-12, AC-13, AC-15, AC-21 | `gider-taksit.test.js` + `ui/gider-taksit` |
| AC-14, AC-19 | `ui/gider-taksit` |
| AC-17, AC-22, AC-23 | `gider-taksit.test.js` |
| AC-18 | `ui/settings-trash` ek blok + `db-roundtrip` |
| AC-20 | `server-authz` + `server-security.cjs` + `ui/gider-taksit` |
| C8 | `db-roundtrip.cjs`, `db-clean-install.cjs`, `merge.test.js` |

## 4. Uygulama notları (2026-09-27)

- **Motor:** `gider.js` taksit bölümü (`HEDEF`, `satirliMi`, `ayEkleGun`, `esitBol`, `taksitPlaniOlustur`, `planYenidenBol`, `odemeHedefleri`, `hedefGecti`, `odemeDurumu`, `taksitDurumuTuret`, `taksitIsaretle`, `hedefIsaretle`, `hedefDurumuDegistir`, `odemeSatirlariKur`); `giderKalemDogrula` plan alanlarını satıra çevirir, `tekrarlayanUret` stopajlı kirayı iki hedefle üretir, `borcOzeti` ve tedarikçi borcu hedef bazında, `odemeDurumuDegistir`/`odendiIsaretle` satırlı kalemde kalemi çevirmez. `odemeHatirlatma.js` hedef başına satır, kart kalem sayar.
- **T8:** stopajlı ödenmemiş kira içeren mevcut borç testi yokmuş; mevcut testlerin hiçbiri kırılmadı, istisna gerekmedi.
- **Kanıt:** 222 çekim; değişen yalnız gider ekranları (`0021-piksel-raporu.json`, 20 JPEG). Evrak ekranlarındaki 83 piksellik fark bu işin "önce" çekiminin tek seferlik farkıdır: "sonra" görüntüsü 0020'nin onaylı çekimiyle bayt bayt aynı, rapora alınmadı. Yeni ekranlar: `gider-formu-taksit`, `gider-formu-kira-stopaj`, `giderler-taksit-liste`, `giderler-taksit-borc`, `giderler-odeme-plani`, `anasayfa-hatirlatma-taksit`. Kasıtlı değişen mevcut ekranlar: `gider-formu`, `gider-formu-personel(-makina)` (taksit alanı, stopaj bilgi satırı), `giderler-uretim-basari` (üretilen kira iki hedefli, R8).
- **Belgeler:** `CLAUDE.md` 0021 bölümü; tarihli notlar `specs/done/0001` X10 (analistin commit edilmemiş değişikliğinden ayrı bölüm), `specs/done/0003` R7; sözlük satır numaraları (Giderler.jsx 179/196/220); `tests/spec-atiflari.test.js` `TASINACAK` listesine 0021 dosyaları (done'a taşınınca çıkarılacak).

## 5. Triyaj düzeltmeleri (2026-09-27)

- **Bulgu 1:** satırsız ödenmiş eski kira ilk düzenlemede ödenmiş satırlarla doğuyordu, sunucu bunu "ödenmiş yeni satır" sayıp `gider_edit` kullanıcısını reddediyordu; ayrıca ana vade siliniyordu. `taksitOdemesiDegistiMi` eski kalemi alır: satırsız kalemden eski durumla aynı doğan satırlar değişiklik değildir. Tohum satırın vadesi planın vadesinden (eski `sonOdemeTarihi`). Testler `gider-taksit` + `server-authz`.
- **Bulgu 2:** ana hedefte ödenmiş satır varsa satırlar korunur (`anaGerekli`); stopaj sıfıra çekilince kiraya verene ödeme kaybolmaz, kalan ödenmemiş satır olur. Test `gider-taksit`.
- **Bulgu 3:** taksit sayısı 1–60 tam sayı (`taksitSayisiCoz`); önizleme ve kayıt aynı kuraldan. Testler `gider-taksit` + `ui/gider-taksit`.
- **Bulgu 4:** sunucu yeni kalem ödenmiş doğarsa (`odendi` ya da ödenmiş satır) `gider_odeme` ister. Test `server-authz`.
- **Bulgu 5:** `anaGerekli` sadeleşti; "ödenmiş taksit sayısının altına" mesajı tek yerde (`planYenidenBol`), kaynak taraması testi.
