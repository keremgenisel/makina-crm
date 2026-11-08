// Spec 0087 R11: parça (yedek parça tanımı) dışa ve içe aktarmasının saf çekirdeği. Bugüne kadar SettingsExport ve
// SettingsImport'un içindeydi; maliyet sütunu eklenirken test edilebilsin diye buraya aynen taşındı (çıktı birebir aynı,
// `tests/fixtures/0087-aktarma-once.json`). İçe aktarma başlığı OKUMAZ, hücreleri konuma göre eşler: yeni sütun yalnız
// SONA eklenir, yoksa eski şablonla alınmış dosyalar sessizce kayar.
import { trLower } from "./utils";
import { kurus } from "./gider";
import { parcaMaliyetDogrula, parcaMaliyetKurus, kirilimTutarliMi, HAMMADDE_EXCEL_HATASI, maliyetGecmisiYaz, gecerliGunMu, setMi, setKatalogu, SET_EXCEL_HATASI,
  setIcerigiOf, setIcerigiDogrula, setteGecenParcalar, icerenSetAdlariHaritasi, setIcerigiHucresi, setIcerigiHucresiParcala, setIcerigiParcasiCoz, setIcerigiExcelHatasi,
  SET_BILESEN_BULUNAMADI, SET_ICERIGI_BASLIGI, SET_ICERIGI_ORNEGI } from "./urunAgaci";
import { malzemeSatiriVar, malzemeKatalogu, MALZEME_EXCEL_HATASI } from "./malzeme";
import { maliyeteBagliMi, parcaSatisFiyati, fiyatAyariOf } from "./parcaFiyati";
import { tutarCoz } from "./gider";
export const FIYAT_EXCEL_HATASI = "bu parçanın fiyatı maliyetten türüyor, Excel'deki fiyat alınmadı.";

export const PARCA_AKTARMA_BASLIKLARI = ["Yedek Parça Adı (TR)", "Adı (EN)", "Kod", "Tip", "Tanım (TR)", "Tanım (EN)", "Fiyat (TL)", "Fiyat (USD)", "Fiyat (EUR)",
  // Spec 0087 R11: onuncu sütun (konuma göre eşleme; araya eklenseydi eski dosyalar kayardı).
  "Maliyet (TL, KDV hariç)",
  // Spec 0124 R1: on birinci ve SON sütun.
  SET_ICERIGI_BASLIGI];
export const PARCA_SABLON_ORNEGI = ["Örnek Parça", "Example Part", "PRC-001", "Standart", "Parça açıklaması", "Part description", "250", "", "", "120,50", SET_ICERIGI_ORNEGI];
// Spec 0124 R5/3 (Karar 4): dosyada yinelenen ad (boş ad emsali).
export const YINELENEN_AD_HATASI = "Bu ad dosyada daha önce geçti, satır atlandı.";

export const MALIYET_BELIRSIZ_DESEN = /^\s*-?\d+\.\d{3,}\s*$/;
export const MALIYET_BELIRSIZ_HATASI = "Maliyet belirsiz (nokta binlik mi ondalık mı anlaşılmıyor; ör. 1234,56 yazın), alınmadı.";

// Spec 0096 C1, C9 (AC-30, AC-30/2): maliyet tek okuma yolundan (kırılımlıda toplam), kuruştan iki haneli ham sayıya; sütun
// sayısı ve sırası değişmez, kırılımsız parçada hücre spec öncesiyle aynı (tests/fixtures/0096-kiyas-once.json).
// Spec 0121 R12/2 (AC-50): setin hücresi çözülmüş maliyeti taşır; katalog (`setKatalogu`) çağıranda bir kez kurulur ve geçirilir.
// Katalog verilmezse set hücresi boş kalır (C2); içerik Excel'e hiç girmez (X10).
// Spec 0132 R21 (AC-72): malzeme satırlı parçanın hücresi çözülmüş maliyeti taşır; `malzemeKat` çağıranda bir kez kurulur.
const maliyetHucresi = (p, katalog, malzemeKat) => { const k = parcaMaliyetKurus(p, undefined, katalog, malzemeKat); return k == null ? "" : k / 100; };
// Spec 0124 R3, R3/3: on birinci hücre içerik (ad canlı katalogdan); katalog verilmezse boş.
// Spec 0133 R18 (AC-42, AC-43): dördüncü parametre fiyat ayarı; maliyete bağlı parçanın TL hücresi yürürlükteki (türetilmiş)
// fiyattır, elle sabit parçada girilen değer birebir (kıyas, C4). Döviz hücreleri elle.
const tlHucresi = (p, katalog, malzemeKat, fiyatAyarlari) => (maliyeteBagliMi(p)
  ? parcaSatisFiyati(p, "TRY", { setKat: katalog, malzemeKat, ayar: fiyatAyariOf(fiyatAyarlari) }).deger : (p.fiyatTRY ?? ""));
export const parcaDisaAktarmaSatiri = (p, katalog, malzemeKat, fiyatAyarlari = null) => [p.ad, p.adEN ?? "", p.kod ?? "", p.tip ?? "Standart", p.tanim ?? "", p.tanimEN ?? "", tlHucresi(p, katalog, malzemeKat, fiyatAyarlari), p.fiyatUSD ?? "", p.fiyatEUR ?? "", maliyetHucresi(p, katalog, malzemeKat),
  setIcerigiHucresi(p, katalog)];

// Satırlar (ilk satır başlık) → kayıt dizisi. `idBaslangic` yeni parçaların kimlik tabanıdır (ekranda Date.now()).
// Spec 0097 R20, R20/2 (plan P11): `bugun` (yerel gün, YYYY-AA-GG) zorunludur ve varsayılanı yoktur; modül saat okumaz.
// Değişen maliyet içe aktarma gününden geçerli sayılır; karar parça kartıyla aynı tek motordan (`maliyetGecmisiYaz`).
// Spec 0132 R21 (AC-73): beşinci parametre malzeme listesi; malzeme satırlı parçanın hücresi karşılaştırma için çözülür.
// Spec 0133 R19, R19/2 (AC-44, AC-75, AC-76): altıncı parametre fiyat ayarı. Maliyete bağlı parçanın TL hücresi kayda yazılmaz
// (kayıttaki değer korunur); bildirim yalnız dosyadaki değer yürürlükteki fiyattan farklıysa, satır numarasıyla.
export const parcaSatirlariniCoz = (rows, parts = [], idBaslangic = Date.now(), bugun, malzemeler = null, fiyatAyarlari = null) => {
  if (!gecerliGunMu(bugun)) throw new Error("parcaSatirlariniCoz: bugun (YYYY-AA-GG) gerekli");
  const malzemeKat = malzemeler ? malzemeKatalogu(malzemeler) : null;
  const fiyatBag = { setKat: setKatalogu(parts), malzemeKat, ayar: fiyatAyariOf(fiyatAyarlari) }; // spec 0133: bir kez
  const dataRows = rows.slice(1);
  const newParts = []; const errors = [];
  let yeniler = 0, guncellenenler = 0, icerikYazilanlar = 0;
  let idc = idBaslangic;
  const byAd = new Map();
  (parts || []).forEach(p => { if (p.ad && !p.deletedAt) byAd.set(trLower(p.ad), p); });
  // ── Spec 0124 R5/2, R5/3 (Karar 3, 4): BİRİNCİ GEÇİŞ. Bütün satırların kimliği atanır ve ad → kimlik haritası kurulur
  // (var olanlar byAd'dan, yeniler yeni kimlikten); dosyada yinelenen ad ikinci satırdan itibaren atlanır.
  const adKimlik = new Map([...byAd].map(([a, p]) => [a, p.id]));
  const gorulenAd = new Set();
  const satirlar = [];
  dataRows.forEach((r, idx) => {
    const cell = (i) => (r[i] == null ? "" : String(r[i]).trim());
    const ad = cell(0);
    if (!ad) { errors.push(`Satır ${idx + 2}: Parça adı boş, atlandı.`); return; }
    const anahtar = trLower(ad);
    if (gorulenAd.has(anahtar)) { errors.push(`Satır ${idx + 2}: ${YINELENEN_AD_HATASI}`); return; }
    gorulenAd.add(anahtar);
    const mevcut = byAd.get(anahtar);
    const id = mevcut ? mevcut.id : (++idc);
    adKimlik.set(anahtar, id);
    satirlar.push({ r, idx, cell, ad, mevcut, id });
  });
  // ── İKİNCİ GEÇİŞ (R6, R6/2, R6/3, R7; Karar 19, 20, 22): içerik hücresi kimliğe çevrilir ve 0121'in doğrulamasından geçer.
  // Doğrulama dosya sonrası katalogda yapılır ve yeni ret çıkmayana kadar tekrarlanır: reddedilen satır eski içeriğinde kalır
  // (R8), katalog o hâliyle yeniden kurulur. Haritalar tur başına BİR KEZ kurulur (C6).
  const adBul = (a) => adKimlik.get(trLower(a));
  const ayniIcerik = (a, b) => JSON.stringify(a.map(r => [String(r.partId), Number(r.miktar)])) === JSON.stringify(b.map(r => [String(r.partId), Number(r.miktar)]));
  const adaylar = new Map(); // id → { st, parcalar, form }
  const ret = new Map(); // id → bildirim
  satirlar.forEach(st => {
    const parcalar = setIcerigiHucresiParcala(st.cell(10)).map(x => setIcerigiParcasiCoz(x, adBul));
    if (!parcalar.length) return; // R8: boş hücre içeriği korur
    const bulunamayan = parcalar.filter(x => x.id == null);
    if (bulunamayan.length) { ret.set(st.id, setIcerigiExcelHatasi(st.idx + 2, SET_BILESEN_BULUNAMADI, bulunamayan[0].metin, bulunamayan.length - 1)); return; }
    const form = parcalar.map(x => ({ partId: String(x.id), miktar: x.adetHam }));
    // Karar 20: kayıtlıyla aynı içerik aday değildir (yazılmaz, sayılmaz, doğrulanmaz; kayıtlı hâli katalogda zaten var).
    if (st.mevcut && ayniIcerik(setIcerigiOf(st.mevcut), form.map(f => ({ partId: f.partId, miktar: f.miktar })))) return;
    adaylar.set(st.id, { st, parcalar, form });
  });
  const yeniParcalar = satirlar.filter(st => !st.mevcut).map(st => ({ id: st.id, ad: st.ad }));
  const katalogKur = (kabul) => {
    const icerik = (id) => (kabul.has(id) ? adaylar.get(id).form.map(f => ({ partId: f.partId, miktar: Number(f.miktar) || 1 })) : null);
    return [
      ...(parts || []).map(p => { const ic = icerik(p.id); return ic ? { ...p, setIcerigi: ic } : p; }),
      ...yeniParcalar.map(p => { const ic = icerik(p.id); return ic ? { ...p, setIcerigi: ic } : p; }),
    ];
  };
  // Bir kabul kümesinin bütün satırları birlikte geçerli mi? Haritalar çağrı başına BİR KEZ kurulur (C6).
  const haritalar = (sonuc) => {
    const adHaritasi = icerenSetAdlariHaritasi(sonuc);
    return { harita: setKatalogu(sonuc), setteGecen: setteGecenParcalar(sonuc), adHaritasi, icerenAdlari: (id) => adHaritasi.get(String(id)) || [] };
  };
  const dogrula = (kabul) => {
    const sonuc = katalogKur(kabul);
    const { harita, setteGecen, icerenAdlari } = haritalar(sonuc);
    const sonuclar = new Map();
    for (const id of kabul) sonuclar.set(id, setIcerigiDogrula(adaylar.get(id).form, { kendiId: id, parts: sonuc, harita, setteGecen, icerenAdlari }));
    return sonuclar;
  };
  const bildirim = (a, v) => {
    const sira = Object.keys(v.hatalar).map(Number).sort((x, y) => x - y);
    return sira.length ? setIcerigiExcelHatasi(a.st.idx + 2, v.hatalar[sira[0]], a.parcalar[sira[0]].ad, sira.length - 1) : setIcerigiExcelHatasi(a.st.idx + 2, v.genel);
  };
  // Karar 19: iyimser tur. Bütün adaylar kabul sayılır; geçersizler reddedilir ve yeni ret çıkmayana kadar tekrarlanır (retler
  // yalnız artar). Sonra reddedilenler dosya sırasıyla yeniden denenir: kabul edilenlerle birlikte hepsi geçerliyse satır kurtulur.
  // Böylece sonuç birlikte tutarlıdır (yanlış kabul yok) ve iyimser turun birbirine bağlı satırlardaki fazla reddi geri alınır.
  const kabul = new Set(adaylar.keys());
  for (let tur = 0; tur <= adaylar.size; tur++) {
    let yeniRet = false;
    for (const [id, v] of dogrula(kabul)) if (!v.gecerli) { kabul.delete(id); ret.set(id, bildirim(adaylar.get(id), v)); yeniRet = true; }
    if (!yeniRet) break;
  }
  // Kurtarma (triyaj bulgu 1, C6): haritalar BİR KEZ kurulur ve kabul edilen her satırla ARTIMLI güncellenir; reddedilen satır
  // yalnız kendisi doğrulanır. Yeterlidir, çünkü çakışmalar simetriktir: kabul edilmiş bir set bu satırı içeriyorsa satırın ters yön
  // denetimi, bu satır kabul edilmiş bir seti içeriyorsa iç içe denetimi onu yakalar. Toplam O(satır + katalog).
  const sonuc0 = katalogKur(kabul);
  const { harita, setteGecen, adHaritasi, icerenAdlari } = haritalar(sonuc0);
  const icerikEkle = (p, fark) => {
    const gorulen = new Set();
    for (const r of setIcerigiOf(p)) {
      const c = String(r.partId);
      if (c === String(p.id) || gorulen.has(c)) continue;
      gorulen.add(c);
      const x = setteGecen.get(c) || { set: 0, cop: 0 };
      x.set += fark; setteGecen.set(c, x);
      const adlar = adHaritasi.get(c) || [];
      adHaritasi.set(c, fark > 0 ? [...adlar, p.ad] : adlar.filter((a, i) => i !== adlar.indexOf(p.ad)));
    }
  };
  for (const id of adaylar.keys()) {
    if (kabul.has(id)) continue;
    const a = adaylar.get(id);
    const v = setIcerigiDogrula(a.form, { kendiId: id, parts: sonuc0, harita, setteGecen, icerenAdlari });
    if (!v.gecerli) { ret.set(id, bildirim(a, v)); continue; }
    const eski = harita.get(String(id)) || { id, ad: a.st.ad };
    const yeni = { ...eski, setIcerigi: a.form.map(f => ({ partId: f.partId, miktar: Number(f.miktar) || 1 })) };
    icerikEkle(eski, -1); icerikEkle(yeni, +1);
    harita.set(String(id), yeni);
    kabul.add(id); ret.delete(id);
  }
  // Son doğrulama: geçersiz çıkan kabul hiçbir zaman yazılmaz (savunma; iyimser tur yakınsadığı için beklenmez).
  const gecerli = new Map();
  for (const [id, v] of dogrula(kabul)) { if (v.gecerli) gecerli.set(id, v.kayit); else { kabul.delete(id); ret.set(id, bildirim(adaylar.get(id), v)); } }
  // Triyaj (bulgu 3): setin maliyet uyarısı DOSYA SONRASI bileşen maliyetleriyle karşılaştırır. Satırın maliyet hücresi önce
  // çözülür; set olmayan, kırılımsız ve hatasız satırların yeni maliyeti karşılaştırma kataloğuna yazılır.
  const maliyetCoz = (r, cell) => {
    const hamMaliyet = typeof r[9] === "number" ? r[9] : cell(9);
    const belirsiz = typeof hamMaliyet === "string" && MALIYET_BELIRSIZ_DESEN.test(hamMaliyet);
    return { belirsiz, m: belirsiz ? { bos: false, deger: null, hata: MALIYET_BELIRSIZ_HATASI } : parcaMaliyetDogrula(hamMaliyet) };
  };
  const dosyaMaliyeti = new Map();
  satirlar.forEach(({ r, cell, mevcut, id }) => {
    const { m } = maliyetCoz(r, cell);
    if (!m.bos && !m.hata && !setMi(mevcut) && !gecerli.has(id) && !(mevcut && (kirilimTutarliMi(mevcut) || malzemeSatiriVar(mevcut)))) dosyaMaliyeti.set(id, m.deger);
  });
  const sonucKatalog = setKatalogu(katalogKur(kabul).map(p => (dosyaMaliyeti.has(p.id) ? { ...p, maliyet: dosyaMaliyeti.get(p.id) } : p)));
  satirlar.forEach(({ r, idx, cell, ad, mevcut, id }) => {
    if (ret.has(id)) errors.push(ret.get(id));
    const yeniIcerik = gecerli.get(id);
    // Karar 20: içerik yalnız kayıtlıdan farklıysa yazılır ve sayılır.
    const icerikYaz = !!yeniIcerik && !(mevcut && ayniIcerik(setIcerigiOf(mevcut), yeniIcerik));
    if (icerikYaz) icerikYazilanlar++;
    // R9, R9/3 (Karar 9): "set mi" dosyadan gelen içerikle belirlenir; kırılım dalında, set dalında ve geçmişte aynı ölçüt.
    const setOlacak = setMi(mevcut) || !!yeniIcerik;
    // Spec 0087 R11, R14 (AC-30): maliyet onuncu sütundan, parça formuyla aynı doğrulamadan. Boş hücre (ya da sütunu olmayan
    // eski şablon) alanı hiç yazmaz: mevcut kaydın maliyeti uygulamada korunur, yeni parçaya boş alan doğmaz (C4/3).
    // Geçersiz maliyet satırı atlatmaz, yalnız maliyet alınmaz.
    // Triyaj (0087 bulgu 2): tutarCoz noktayı ancak 1–2 haneli ondalıksa ondalık sayar, yoksa binlik diye siler ("48.5333" →
    // 485.333). İngilizce bölge ayarlı CSV'de bu sessiz büyüme olurdu; kural gider tarafıyla ortak olduğu için tutarCoz'a
    // dokunulmaz, tek noktalı ve noktadan sonra 3+ haneli (virgülsüz) METİN burada belirsiz sayılır ve alınmaz (`maliyetCoz`).
    const { belirsiz, m } = maliyetCoz(r, cell);
    if (m.hata) errors.push(`Satır ${idx + 2}: ${m.hata}${belirsiz ? "" : " Maliyet alınmadı."}`);
    // Spec 0096 R24 (AC-40): kırılımı tutarlı parçada maliyet hammadde satırlarından gelir; hücre hiç alınmaz. Triyaj (bulgu 1):
    // dışa aktarma bu hücreye kırılımın toplamını yazdığı için aynı dosyanın geri yüklenmesi bildirim üretmez; yalnız FARKLI bir
    // rakam yazılmışsa neden bildirilir.
    // Spec 0121 triyaj (bulgu 1): set kontrolü kırılımdan önce gelir; saklı kırılımı da olan sette neden "içerikten"dir (aşağıda).
    // Spec 0132 R21 (AC-73): malzeme satırlı parçada hücre alınmaz; set kazanır, malzeme kırılımdan önce gelir (R9/2 önceliği).
    // Dışa aktarmanın yazdığı rakam geri yüklenirse bildirim yok, farklı rakamda (ya da liste verilmediyse) neden yazılır.
    const malzemeli = !!mevcut && !setOlacak && malzemeSatiriVar(mevcut) && !m.bos && !m.hata;
    if (malzemeli && kurus(m.deger) !== parcaMaliyetKurus(mevcut, undefined, undefined, malzemeKat)) errors.push(`Satır ${idx + 2}: ${MALZEME_EXCEL_HATASI}`);
    const kirilimli = !!mevcut && !setOlacak && !malzemeli && kirilimTutarliMi(mevcut) && !m.bos && !m.hata;
    if (kirilimli && kurus(m.deger) !== parcaMaliyetKurus(mevcut)) errors.push(`Satır ${idx + 2}: ${HAMMADDE_EXCEL_HATASI}`);
    // Spec 0121 R12/2 (AC-50): setin maliyet hücresi alınmaz (maliyet içerikten gelir); dışa aktarmanın yazdığı rakam geri
    // yüklenirse bildirim yok, farklı rakamda neden satır numarasıyla bildirilir (0096 triyaj emsali). Spec 0124 R9: karşılaştırma
    // dosya sonrası içerikle ve katalogla.
    const setli = setOlacak && !m.bos && !m.hata;
    const setKaydi = { ...(mevcut || {}), id, ...(yeniIcerik ? { setIcerigi: yeniIcerik } : {}) };
    // Triyaj (bulgu 5): bileşeni malzemeden hesaplanan sette dışa aktarmanın rakamı malzeme listesiyle okunur.
    if (setli && kurus(m.deger) !== parcaMaliyetKurus(setKaydi, undefined, sonucKatalog, malzemeKat)) errors.push(`Satır ${idx + 2}: ${SET_EXCEL_HATASI}`);
    if (mevcut && maliyeteBagliMi(mevcut) && cell(6) !== "") {
      const yurur = parcaSatisFiyati(mevcut, "TRY", fiyatBag).deger;
      const dosya = tutarCoz(cell(6)); // Excel sayıyı "4082.69" biçiminde verir; tutarCoz noktayı ondalık okur
      if (yurur === "" || dosya.gecersiz || Math.round(dosya.deger * 100) !== Math.round(Number(yurur) * 100)) errors.push(`Satır ${idx + 2}: ${FIYAT_EXCEL_HATASI}`);
    }
    if (mevcut) guncellenenler++; else yeniler++;
    const maliyetAlani = m.bos || m.hata || kirilimli || setli || malzemeli ? {} : { maliyet: m.deger };
    // R20, R4: geçmiş mevcut kayıttan türer; değer değişmiyorsa geçmiş alanı hiç yazılmaz (uygulama kolu eskisini korur).
    // Spec 0124 R9/2: `set` kapısı dosyadan gelen yeni hâle göre.
    const gecmisKarari = mevcut ? maliyetGecmisiYaz(mevcut, parcaMaliyetKurus({ ...mevcut, ...maliyetAlani }), { tarih: bugun, bugun, set: setOlacak, malzeme: malzemeSatiriVar(mevcut) }) : null;
    const gecmisAlani = gecmisKarari && !gecmisKarari.hata && JSON.stringify(gecmisKarari.gecmis) !== JSON.stringify(mevcut.maliyetGecmisi || [])
      ? { maliyetGecmisi: gecmisKarari.gecmis } : {};
    if (gecmisKarari?.hata) errors.push(`Satır ${idx + 2}: ${gecmisKarari.hata} Maliyet alınmadı.`);
    newParts.push({
      id, ad,
      adEN: cell(1) || (mevcut?.adEN ?? ""),
      kod: cell(2) || (mevcut?.kod ?? ""),
      tip: cell(3) || (mevcut?.tip ?? "Standart"),
      tanim: cell(4) || (mevcut?.tanim ?? ""),
      tanimEN: cell(5) || (mevcut?.tanimEN ?? ""),
      fiyatTRY: mevcut && maliyeteBagliMi(mevcut) ? (mevcut.fiyatTRY ?? "") : (cell(6) || (mevcut?.fiyatTRY ?? "")),
      fiyatUSD: cell(7) || (mevcut?.fiyatUSD ?? ""),
      fiyatEUR: cell(8) || (mevcut?.fiyatEUR ?? ""),
      ...(gecmisKarari?.hata ? {} : maliyetAlani),
      ...gecmisAlani,
      ...(icerikYaz ? { setIcerigi: yeniIcerik } : {}),
      _mevcut: !!mevcut,
    });
  });
  return { parts: newParts, errors, yeniler, guncellenenler, icerikYazilanlar };
};

// İçe aktarmanın uygulama kolu: var olan kayıt korunur (`{ ...x, ...guncel }`: models, resim, deletedAt düşmez).
export const parcaIceAktarmaUygula = (p, impParts) => {
  const guncelMap = new Map();
  impParts.forEach(x => { const { _mevcut, ...clean } = x; guncelMap.set(x.id, clean); });
  const updated = p.map(x => guncelMap.has(x.id) ? { ...x, ...guncelMap.get(x.id) } : x);
  const existingIds = new Set(p.map(x => x.id));
  const yeniler = impParts.filter(x => !existingIds.has(x.id)).map(x => { const { _mevcut, ...clean } = x; return clean; });
  return [...yeniler, ...updated];
};
