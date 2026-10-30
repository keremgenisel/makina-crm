# 0119 Uygulama planı: panodaki servis kartında kalıbı gönderen kişi

Spec: `specs/0119-pano-kartinda-kalibi-gonderen-kisi.md`. Dal `feat/0119-kalip-sorumlusu` (`e20e249` üstünde; o commit iki önceki düzeltmeyi main'e aldı, Karar 36). Takım Yöneticisi planın on önerisinin hepsini onayladı (spec Karar 36–45). Yeni veri alanı, sütun, göç, izin kimliği, sunucu kuralı ve birleştirme kuralı yok (C5).

## 1. Dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Saf | `src/lib/kalipTamiri.js` | `SEVK_SORUMLU_SORUSU`, `sevkSorumluYaz(servis, ad)` (kırpar, boşta anahtarı siler, kutu kapısı yok) |
| Pano | `src/components/ServisPanosu.jsx` | Kontrol satırı tek dış kapta iki iç satıra bölündü; ikinci satır (🚚 `aria-hidden`, `aria-label="Kalıbı gönderen kişi"`, `sevkListe`), işleyici `sevkSorumluDegistir`, iz `kalip_sorumlu_degisti` |
| Etiket | `src/components/settings/SettingsAuditLog.jsx` | `kalip_sorumlu_degisti: "Kalıp Sorumlusu Değişti"` |
| Kanıt aracı | `scripts/evidence/0009-sayfa.jsx` | `SERVIS_0119`, `Pano0115`'e `ilk` prop'u, `servis-pano-0119-sorumlu` |
| Kanıt | `docs/evidence/0119-*` | Rapor ve taban; eşleme kaydı yok (R15/2) |
| Testler | yeni `tests/kalip-sorumlusu-0119.test.js`, `tests/ui/kalip-sorumlusu-0119.test.jsx`; `tests/ui/kalip-sevki-0117.test.jsx` (AC-55'in yalnız adı) | §4 |
| Belge | `CLAUDE.md`, `specs/README.md`, `specs/done/0117-…md` (AC-55 notu), spec | §2 |

## 2. Adım sırası

1. İki önceki düzeltme main'e (`e20e249`), çalışma kopyası, Electron kurulumu; kanıt aracına yeni ekran ve eski kodla taban çekimi (7 pano ekranı).
2. Saf yazıcı ve sabit.
3. Pano: tek kap, ikinci satır, işleyici, iz; var olan pano testleri hemen koşuldu (Karar 39: kırılma yok).
4. Etiket haritası.
5. İki test dosyası; mutasyon ölçümü.
6. Kanıt (yeni ↔ eski, yeni ↔ yeni), belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

| # | Risk | Karar |
|---|---|---|
| Ö1 | Commit'siz iki düzeltme dalın dosyalarında | Önce main'e (Karar 36) |
| Ö2 | AC-16 ile R10/3 çelişkisi | İzin listeli tarama (Karar 37) |
| Ö3 | İşleyicinin kapısı | Teknisyen ikizi (Karar 38) |
| Ö4 | Kabın bölünmesi sürükleme testini etkiler mi | Ölçüldü, etkilemedi (Karar 39) |
| Ö5 | AC-43 dilimi | Girintiyle tanımlı (Karar 40) |
| Ö6 | 0117 AC-55 metni done'da | Tek cümle not + test adı (Karar 41) |
| Ö7 | README satırları dalda yok | Analistin metninden alındı (Karar 42) |
| Ö8 | Kanıt verisi | Araçta yerel (Karar 43) |
| Ö9 | AC-22 ölçümü | Tek kap davranışı (Karar 44) |
| Ö10 | AC-20 ölçümü | `servisBridge.mutate` (Karar 45) |

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-2, AC-33 (DOM), AC-3, AC-4, AC-5, AC-6, AC-34, AC-50 | `ui/kalip-sorumlusu-0119` "satırın yeri ve ölçütü" |
| AC-8 (ekran), AC-9, AC-10, AC-35, AC-37 | `ui/kalip-sorumlusu-0119` "seçici ve liste" |
| AC-11, AC-12, AC-13 (ekran), AC-24, AC-42 | `ui/kalip-sorumlusu-0119` "yazım ve iz" |
| AC-17, AC-18, AC-19, AC-20, AC-21, AC-22 | `ui/kalip-sorumlusu-0119` "izin, bağlamlar, koruma" |
| AC-13, AC-14, AC-38, AC-8 (tarama) | `kalip-sorumlusu-0119` "saf yazıcı" |
| AC-7, AC-16, AC-23, AC-43, AC-26, AC-27, AC-29, AC-33 (kaynak), AC-36, AC-41, AC-48 | `kalip-sorumlusu-0119` "kaynak taramaları" |
| AC-25, AC-40 | `kalip-sorumlusu-0119` "iz" |
| AC-44, AC-46 | `kalip-sorumlusu-0119` "kanıt ve belge" |
| AC-15, AC-39, AC-47 | `kalip-sevki-0117`, `ui/kalip-sevki-0117` dokunulmadan yeşil |
| AC-28 | `kalip-tamiri-0115*`, `kargo-etiketi`, `ui/kalip-sevki-0117` dokunulmadan yeşil |
| AC-30, AC-31, AC-45 | `docs/evidence/0119-piksel-raporu.json`, `0119-taban-piksel-raporu.json` |
| AC-32, AC-49 | Kapanış bekçisi (`kalip-sorumlusu-0119`) |

**Mutasyon ölçümü:** durum kapısının düşmesi, boşta anahtarın silinmemesi, izin yazılmaması, `disabled`'ın kalkması, kayıtlı adın listeye eklenmemesi, müşteri kapısının eklenmesi, yazıcıya kalıp kapısı eklenmesi ve işleyicinin kapısının kalkması ayrı ayrı denendi; sekizi de en az bir testi kırdı.

**Görsel kanıt:** 7 pano ekranı × 2 tema; değişen tam üç ekran (`servis-pano-0115-onay`, `servis-pano-0115-kiosk`, `servis-pano-0119-sorumlu`), ötekiler 0 piksel; taban 0 fark; çekimde `adimUyarilari` yok.

## 5. Sürüm notu

"Servis ve Kargo Panosu: kalıbı atölyeye girmiş servis Tamamlandı sütunundayken kartında, servisi yapanın altında kalıbı gönderen kişi görünür ve oradan seçilebilir. Seçim servis formundaki 'Kargoyu Veren Kişi' alanıyla aynıdır." Veri değişikliği yok; sürüm sırası şartı yok (alan 0117'den beri var).
