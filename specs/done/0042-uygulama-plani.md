# 0042 Uygulama Planı: Personel Ödemesinin İki Hedefe Ayrılması ve Yöntem Seçicinin Açılır Listeye Taşınması

| | |
|---|---|
| **Bağlı spec** | `specs/done/0042-odeme-hedefleri-ve-yontem-secici.md` (R2, plan onayıyla onaylandı) |
| **Dal** | `feat/0042-personel-hedef` (`feat/0041-coklu-odeme` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-29: bütün öneriler (Q1–Q11) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/gider.js` | `HEDEF.ELDEN`; `personelHedefKurus`, `personelIkiHedef`; `hedefToplamKurus`, `odemeSatirlariKur` (ELDEN tek satır, `plan.eldenVade`), `odemeHedefleri` ve `odemeleriUygula` hedef listesi (satırsız dal dahil), `odemeDurumu`; `borcOzeti` personel tekilleştirme ve resmi/elden kırılımı |
| `src/lib/odemeHatirlatma.js` | Personel satırı kalem sayar |
| `src/lib/kasa.js` | `calisanEkstresi` personelde bütün hedefler |
| `src/components/gider/GiderAlanlari.jsx` | `HEDEF_AD.ELDEN`, `hedefAdi(hedef, dav, kalem)`, satır tablosunda ELDEN |
| `src/components/GiderForm.jsx` | Elden vadesi, bölünmeme ipucu, yöntem `Select` |
| `src/components/settings/SettingsGiderTanimlari.jsx` | Yöntem `Select` |
| `src/components/gider/DonemRaporu.jsx`, `gider/OdemeHatirlatma.jsx` | Borç ayrıntısında resmi/elden; hatırlatıcı kalem sayısı |
| `docs/tasarim-sozlugu.md` | "Ne zaman açılır liste?" kuralı |
| `scripts/tests/db-roundtrip.cjs` | `hedef: "elden"` roundtrip |
| `scripts/evidence/0009-sayfa.jsx` | Yeni ekranlar |
| Testler | yeni `personel-hedef.test.js`, `ui/personel-hedef.test.jsx`; güncelleme `gider-gizlilik`, `ui/gider-coklu-odeme`, `ui/gider-form`, `ui/gider-settings`, `kasa.test`, `odeme-hatirlatma`, `ui/dashboard-odeme-hatirlatma` |

DB şeması, sunucu, izin ve merge değişmez (C7).

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Satırsız personel okuma anında iki hedef (ANA resmi, ELDEN elden, vadesiz); dağıtım hedef listesiyle, önce resmi |
| Q2 | "Resmi" yalnız iki hedefli personelde; tek hedefli "Çalışana" |
| Q3 | Satırlı personelde kaleme bağlı hareket hedef sırasıyla (resmi → elden); kira değişmez |
| Q4 | Ödeme almış ana satırı olan, elden satırsız eski personel kalemi bölünmez; formda ipucu |
| Q5 | Boş elden vadesi = resmi vadesi |
| Q6 | Hatırlatıcı sayısı ve borç özeti kalem listesi kalem kimliğiyle tekil |
| Q7 | Mahsup hedefi mevcut taksit seçicisi; yalnız test |
| Q8 | Gizlilik deseni `HEDEF.ELDEN`, `"elden"`, `hedefAdi`, `personelHedefKurus` |
| Q9 | Sözlükte `Segment` altında "Ne zaman açılır liste?", düz metin atıf |
| Q10 | Liste: "Kısmen ödendi n/m" rozeti + "Ödeme planı" |
| Q11 | GiderForm, tanım ve personel ekranları `degisti` + TY onayı |

## 3. Adım sırası

1. Motor + motor testleri (kira regresyonu önce).
2. Borç özeti, hatırlatıcı, çalışan ekstresi.
3. Form ve yöntem seçici.
4. Sözlük, gizlilik testi, DB roundtrip.
5. Tam test, lint, görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-6, AC-7 | `personel-hedef.test` |
| AC-3, AC-20, AC-21 | `personel-hedef.test` + `ui/personel-hedef` |
| AC-4, AC-5 | `personel-hedef.test` + `ui/personel-hedef` |
| AC-8, AC-9 | `personel-hedef.test` + `ui/dashboard-odeme-hatirlatma` |
| AC-10 | `kasa.test` |
| AC-11 | `gider-gizlilik.test.js` |
| AC-12, AC-27 | `personel-hedef.test` + mevcut `gider-taksit` + `db-roundtrip` |
| AC-13, AC-14, AC-15 | `personel-hedef.test` (+ göç yok kaynak taraması) |
| AC-16, AC-17, AC-18, AC-28 | `ui/gider-form`, `ui/gider-settings` |
| AC-19 | `personel-hedef.test` |
| AC-22 | `ui/personel-hedef` |
| AC-23, AC-24 | `personel-hedef.test` + `ui/gider-form` |
| AC-25 | `db-roundtrip.cjs` + kaynak taraması |
| AC-26 | 0023 testi AC adıyla |
| AC-29 | sözlük metin kontrolü |

## 5. Uygulama notları

- **Eski testlerin bilinçli güncellemesi:** `gider-ek-odeme` (R3/AC-20, R12/P6) ve `kasa.test` (AC-14 mahsup) personeli tek hedef varsayıyordu; spec bu davranışı değiştirdiği için yeni modele göre güncellendi (niyetleri korundu: tek toplam, ödenmemiş taksitlere bölme, mahsup sınırı). `odeme-hatirlatma` AC-17 değişmeden geçiyor (personel kalem başına birleştiği için). `ui/gider-form`'daki yöntem seçici etkileşimi düğme satırından açılır listeye çevrildi.
- **Q5 okuma anına da uygulandı:** satırsız eski personelin elden hedefi vadesiz kalsaydı hatırlatıcıdan düşerdi (AC-17 testi yakaladı); elden vadesi okuma anında kalemin vadesidir.
- **Test yerleşimi:** AC-9 ve AC-10 motor testinde (`personel-hedef.test.js`); plan tablosundaki `ui/dashboard-odeme-hatirlatma` ve `kasa.test` yerine. AC-29 sözlük metin kontrolü de aynı dosyada.
- **Görsel kanıt:** `docs/evidence/0042-piksel-raporu.json` (306 çekim; 6 gider formu ekranı ve 3 yeni personel ekranı değişti). İki Evrak ekranında 83 piksellik fark Adres metin kutusunun boyutlandırma tutamacındaki 1 piksellik çizim kaymasıdır; taban çekiminde görüntü 0042 öncesiyle birebir aynı çıktı (çekimden çekime oynayan çizim ayrıntısı), bu yüzden Evrak kayıtları kapanışta 0042 öncesi hâline döndü ve taban raporuna girmedi. TY onayı 2026-09-29; `kanit-eslemesi.json`'da 21 kayıt `degisti` + 3 yeni ekran; done'a taşınırken `0042-taban` raporuyla `ayni`ye çevrilecek.
- **Testler:** `personel-hedef.test.js` (22), `ui/personel-hedef.test.jsx` (5), ek bloklar; tam paket yeşil, lint 0 hata.
- **Triyaj (2026-09-29):** (1) hatırlatıcıda personel kalemi en acil gruba bütün olarak girer (resmi gecikmiş, elden yaklaşan → vadesi geçmiş grubunda toplam; test `personel-hedef.test.js` AC-9 triyaj); (2) satırsız eski kirada hedef durumunun kalandan türemesi düzeltme olarak spec R7 notu ve CLAUDE.md'ye yazıldı, testle sabitlendi (AC-12 triyaj).
