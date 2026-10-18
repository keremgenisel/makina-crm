# 0092 Uygulama Planı: Peşin ödenen gider kapsadığı aylara yayılır ve bitişinde hatırlatır

| | |
|---|---|
| **Spec** | `specs/done/0092-pesin-gider-kapsami-ve-yenileme-hatirlatmasi.md` (revizyon 3) · Tamamlandı: commit `99333c2` |
| **Dal** | `feat/0092-pesin-gider-kapsami` (taban `f6411c3`, 0091 kapanışı) |
| **Onay** | Takım Yöneticisi · 2026-10-18 · bütün öneriler (K1–K11) kabul |

## 1. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/gider.js` | `KAPSAM_ANAHTARI` (`"dagitimAy"`), `KAPSAM_AY_MAX`, `KAPSAM_AY_HATASI`, `kapsamAySayisiCoz`, `kapsamSecilebilirMi(dav)` (normal ve kira), `kapsamAyOf(k, dav)`, `kapsamliMi`, `kapsamAraligi` (atamaya bakmaz, R7), `kapsamRozetMetni` (R19/2), `kapsamVerisiKoru` (R8/2; atama listesinden çıkar). `giderKalemDogrula` kullanıcı girdisini doğrular (R4). `tekrarlayanUret` kapsamı yeni çözücüyle kopyalar (R3). `hesaplaGiderRaporu` üçüncü parametresine `aylikPay: true` → `aylikPaylar` (R9/2); seçeneksiz çıktı birebir. Eski hata sabiti ve çözücüsü kalkar (AC-69/2); `dagitimAyOf`, `dagitimAraligi`, `dagitimPaylari` yalnız eski motor için aynen kalır (X9/2). |
| `src/lib/makinaStandartMaliyet.js` | `aylikRolTablosu` (tek rapor çağrısı); `rolHavuzlari`, `aylikGenelHavuzlar`, `partiGenelPaylari` onun okuyucusu (R13, R13/2, R18); havuz ve parti sonucunda `yayilanAdet` (R21/2, R21/3, R22). |
| `src/lib/giderKapsami.js` (yeni) | `kapsamBitisi`, `kapsamHatirlatmalari`, `KAPSAM_BITIS_ESIK_VARSAYILAN`, `kapsamBitisEsigi`, `kapsamBitisEsikDogrula`, metin sabitleri (R25–R37). |
| `src/components/gider/GiderAlanlari.jsx` | `KapsamAlani` (R2/2, R5). |
| `src/components/GiderForm.jsx` | Alan normal ve kirada; açılışta saklı değer çözücüden (R4/2). |
| `src/components/settings/SettingsGiderTanimlari.jsx` | Formda alan, listede `tanim-kapsam` satırı, koruyucu iki kapıyla (R3, R3/2, R8/2). |
| `src/components/gider/DonemRaporu.jsx` | `kapsam-rozeti` kısıtlı rozetin altında (R19, R19/2). |
| `src/components/maliyet/PayOzeti.jsx`, `src/components/gider/UretimPartileri.jsx` | Bilgi satırları (R21, R22). |
| `src/components/gider/OdemeHatirlatma.jsx`, `src/components/Dashboard.jsx` | Üçüncü sayı, alt metin, üçüncü bölüm, ibare, boş durum (R25–R34). |
| `src/components/settings/SettingsGider.jsx` | Eşik alanı, ilk durum ve kaydet listesi (C12). |
| `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md` | Ekranlar (`giderler-0072-liste` → `giderler-0092-liste`), kanıt kayıtları, 0092 bölümü. |

**Testler:** `tests/gider-kapsami-0092.test.js`, `tests/gider-kapsami-0092-cagri.test.js` (casus), `tests/gider-kapsami-0092-kiyas.test.js`
(altın `tests/fixtures/0092-havuz-once.json`, spec öncesi kodla), `tests/ui/gider-kapsami-0092.test.jsx`, `tests/ui/gider-kapsami-0092-app.test.jsx`,
`tests/fixtures/0092-veri.js`. Ters çevrilen ve güncellenen (notlu): `gider-atama-kalkar-0090` (iki dosya), `gider-dagitim-0072`, `gider.test`.

**Yeni kalıcı alan, veri bölümü, izin, sunucu ve birleştirme kuralı yok; `db.cjs` dokunulmaz.**

## 2. Adım sırası

0. Dal, spec revizyon 3, bu plan; altın spec öncesi kodla.
1. Motor (gider.js, makinaStandartMaliyet.js, giderKapsami.js) ve testleri; 0088, 0082, 0089, 0090 altınları dokunulmadan yeşil.
2. Formlar ve tanım listesi; 0090 testlerinin ters çevrilmesi.
3. Kalem listesi rozeti, pay özeti, Üretim Partileri.
4. Anasayfa kartı ve pencere, Gider Ayarları eşiği, App testi.
5. Mutasyon, taramalar, görsel kanıt, CLAUDE.md, rehber (commit dışı).
6. Electron dahil `npm test`, lint.

## 3. Kararlar (K1–K11, onaylandı)

- **K1.** Eski motorun üç dağıtım yardımcısı aynen kalır, yeni yol `kapsam*` ailesini kullanır (X9/2).
- **K2.** Rapor seçeneği `{ aylikPay: true }`; pay adayları çöpte olmayan, tarihi yürürlükten sonra ve pencerenin bitişinden önce, kapsamı pencereyle kesişen kalemler. Kapsamsız kalem bugünkü tarih süzgeciyle birebir. Taban `kisitHesabi().giderK`, bölme `esitBol`.
- **K3.** Tür satırının adı ham tür haritasından; türsüz adet kalem sayısıdır.
- **K4.** Satır sırası tür kırılımının sırası (toplam azalan, eşitte ilk görülme).
- **K5.** Parti payı tek çağrı; casus 1 ölçer (spec öncesi 12).
- **K6.** Hatırlatma metinleri R25/3.
- **K7.** Saklı geçersiz değer form açılışında boş (R4/2).
- **K8.** Personel ve SGK kapsamı rapor seçeneğinde tek giriş; rozet ve hatırlatma aynı çözücü.
- **K9.** C16 kabul; sürüm notu ve CLAUDE.md.
- **K10.** Görsel kanıtta taban ve sonrası aynı gün.
- **K11.** AC-50/2 ayırt edici ad ve tutarlarla, kapsam taşıyan personel kalemi dahil.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1–5, 5/2, 6, 6/2, 7–10, 11/2, 69, 69/2 | `ui/gider-kapsami-0092` |
| AC-11, 12, 13, 13/2, 14, 14/2 | `gider-kapsami-0092` |
| AC-15–17, 15/2, 15/3, 20, 20/2, 21–31, 26/2, 26/3 | `gider-kapsami-0092` |
| AC-18 | `gider-kapsami-0092-kiyas` |
| AC-19 | `parti-genel-payi-0090` (dokunulmadan) + `gider-kapsami-0092` |
| AC-20/3 | `ui/gider-kapsami-0092` |
| AC-32, 32/2 | `gider-kapsami-0092-cagri` |
| AC-33–35, 33/2, 33/3 | `ui/gider-kapsami-0092` + `gider-kapsami-0092` |
| AC-36, 37 | `ui/gider-gorunum-0089-kiyas` (dokunulmadan) + `gider-kapsami-0092` |
| AC-38–40, 38/2, 39/2 | `ui/gider-kapsami-0092` |
| AC-41, 67, 70, 71, 74 | `gider-kapsami-0092` (taramalar) |
| AC-42–56 ve alt maddeleri | `gider-kapsami-0092` + `ui/gider-kapsami-0092-app` |
| AC-57 | `ui/gider-kapsami-0092-app` |
| AC-58–63 | `ui/gider-kapsami-0092` + `gider-kapsami-0092` + App |
| AC-64, 65 | `gider-kapsami-0092` |
| AC-66 | `gider-kapsami-0092` (tarama) + `server-authz` (dokunulmadan) |
| AC-68 | `db-roundtrip.cjs` (dokunulmadan) + tarama |
| AC-72 | 0088, 0082, 0089, 0090 kıyas testleri dokunulmadan |
| AC-73 | `gider-kapsami-0092` (kanıt kaydı bloğu) + `kanit-eslemesi` |

## 5. Sürüm notu

- Kapanmış partilerin "Kapanmış partilerin aylarında değişen genel gider" kutusu, aylarına yayılan peşin gider varsa konuşabilir (C16): havuz gerçekten değişti.
- İlk yıl, kapsamı yıl sonundan taşan peşin giderler yüzünden havuz küçük görünebilir; taşan kısım gelecek yılın aylarına girer.
- Gider tarihi yürürlük ayından önce olan peşin ödeme havuza hiç girmez (R15/2).
