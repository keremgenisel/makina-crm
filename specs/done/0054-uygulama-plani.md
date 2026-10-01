# 0054 Uygulama Planı: Ek Ödeme Maaştan Ayrı Bir Ödeme Hedefi

| | |
|---|---|
| **Bağlı spec** | `specs/0054-ek-odeme-ayri-odeme-hedefi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0054-ek-odeme-hedefi` (`feat/0053-odeme-satiri` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q9) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/gider.js` | `HEDEF.EK_RESMI`/`EK_ELDEN`, `HEDEF_SIRASI` (R14); `personelHedefKirilimi` dört hedef + ayırma yapısı (R18, Q2); `personelCokHedef` (R15); `personelAyrimi` (taraf başına bölünmezlik, R21); `hedefToplamKurus`, `satirsizHedefler`, `odemeSatirlariKur` (yeni kapı, `vadeOf`, ek hedef satırları; R6, R17); `personelBolunmezMi` R21 koşuluyla; `borcOzeti` dört kırılım (R20). `personelIkiHedef` aynen (R15). |
| `src/components/gider/GiderAlanlari.jsx` | `HEDEF_AD`, `hedefAdi(hedef, dav, cokHedef)` dört ad (R16); `hedefEtiketi` ve `OdemeSatirlari` `cokHedefliMi`; `eldenHedefliMi \|\| personelIkiHedef` kalkar. |
| `src/lib/formOdemesi.js` | `formOdemeHedefleri` çok hedef ölçütü; `CIRO_YALNIZ_ANA_NEDENI` ek hedefler (R22). |
| `src/components/gider/OdemeGirisi.jsx`, `OdemeKayitPenceresi.jsx`, `Giderler.jsx`, `GiderForm.jsx` | "çok hedefli mi" tek kaynaktan; GiderForm "Elden vadesi" kapısı elden maaşına (Q3). |
| `src/lib/kasa.js`, `src/components/gider/EkstrePenceresi.jsx` | Ekstre hedef adı tek kaynaktan (R20). |
| Testler | Yeni `tests/ek-odeme-hedefi.test.js`, `tests/ui/ek-odeme-hedefi.test.jsx`; `gider-gizlilik` (R19), `db-roundtrip.cjs`, `db-clean-install.cjs` (AC-21), `gider-kasa-raporu` (AC-34); ad beklentileri güncellenen 0042/0048/0051/0053 testleri (Q5). |
| Kanıt, belge | `scripts/evidence/0009-sayfa.jsx` iki ekran (Q9), `kanit-eslemesi.json`, `CLAUDE.md`. |

## 2. Kararlar

- **Q1 / R21.** Bölünmezlik taraf başına: o taraftaki ödeme almış satırların tutarı yeni maaş hedefini aşıyorsa ek ödeme ayrılmaz.
- **Q2.** Bölünmez tarafta ek ödeme maaş hedefinin içinde; tutarlar `personelHedefKirilimi`'nin ayırma yapısından.
- **Q3.** "Elden vadesi" yalnız elden maaşı > 0 ve başka hedef varken; `personelIkiHedef` motorda değişmez.
- **Q4 / R22.** Ek ödeme hedeflerinde çek yok, neden tek sabitten.
- **Q5.** Çok hedefli bütün personel kalemlerinde adlar "Maaş (resmi)" vb.; eski "Resmi"/"Elden" beklentileri "spec 0054 R16 ile güncellendi" notuyla.
- **Q6.** Satırsız kalem dört hedefi `HEDEF_SIRASI` ile; dağıtım değişmez.
- **Q7.** Satırlı kalem ilk kayıtta `eskiHedef` yoluyla dört satıra geçer.
- **Q8.** Gizlilik: R19 adları + 0047 çıktı karşılaştırması.
- **Q9.** Kanıt yalnız değişen ekranlarla çekilir; rapor yazıldığı denetlenir.

## 3. Adım sırası

1. Motor (gider.js) ve motor testleri. 2. Ad çözümü. 3. Form, pencere, ekstre. 4. DB ve gizlilik. 5. Mevcut testlerin güncellenmesi, UI testleri. 6. Kanıt, `CLAUDE.md`, TY onayı.

## 4. Kriter ↔ test eşlemesi

Onaylanan planın tablosu: `tests/ek-odeme-hedefi.test.js` (AC-1–8, 10, 12–14, 16–18, 20, 22–24, 26, 27, 29, 30, 32, 33), `tests/ui/ek-odeme-hedefi.test.jsx` (AC-5, 6, 7–11, 15, 25, 27, 28), `gider-gizlilik.test.js` (AC-19, AC-31), `db-roundtrip.cjs`/`db-clean-install.cjs` (AC-21), `gider-kasa-raporu.test.js` (AC-34).

## 5. Uygulama notları

- **Ayırma yapısı (Q2):** `personelHedefKirilimi`'nin üçüncü parametresi `{elden, ekResmi, ekElden}`; eski boolean çağrılar (`true` hepsi ayrı, `false` hepsi ANA) çalışmaya devam eder. Ayrılmayan bileşen kendi tarafının maaş hedefine katılır, toplam değişmez.
- **R21 koşulu `personelAyrimi`'de:** tarafın ödeme almış satır tutarları > yeni maaş hedefi ise o tarafın ek ödemesi ayrılmaz. Elden tarafı bölünmezse (0042 Q4) elden maaşı ve elden ek ödemesi ANA'da kalır, bu durumda koşul ANA'nın maaş+elden maaşına bakar. Ek hedef satırı zaten varsa ayrım korunur (yeniden kayıtta geri birleşmez).
- **Elden vadesi kapısı form içinde (Q3):** `personelIkiHedef` motorda değişmedi; GiderForm elden maaşı > 0 ve başka bir hedef varken alanı çizer.
- **Kırılımın yapısı kalemden:** 0048 durum kutusu `kalemPersonelAyrimi` ile okur, yani kayıtlı satırlar hangi hedefleri taşıyorsa kırılım onlarla gösterilir.
- **Testler:** `gider-gizlilik` AC-19'da iki ödeme aynı yöntemle verildi; ayrı yöntemler 0047'nin yöntem kırılımında tutarı tek satır yazar (toplam yazdırılabilir, test verisinin yapısı).
- **Kanıt:** `0054-piksel-raporu.json` (34 aday ekran, iki tema). 12 ekranda bilinçli fark (adlar, ek hedef, elden vadesi kapısı), TY onayı 2026-10-01; 22 ekran 0 piksel. İki yeni ekran: `gider-formu-0054-ek-hedef`, `giderler-0054-ek-pencere`. `gider-formu-0053-personel-elden` ve `gider-formu-odeme-personel`'in adımları yeni etiketlere ("Maaş (elden) ödendi" vb.) güncellendi.
- **Kapanış:** uygulama commit `6cdc177`. Taban çekimi (`0054-taban-piksel-raporu.json`) "degisti" kayıtlı 8 ekranı onaylanan görüntülerle karşılaştırdı: 16 görüntü, 0 piksel; kayıtlar `ayni`ye çevrildi.
