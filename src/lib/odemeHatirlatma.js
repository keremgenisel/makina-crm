// Ödeme hatırlatıcısı: saf hesap (spec 0003, plan H1–H12). React'sız.
//
// Kapsam 0001 borç özetiyle aynı kurallardır (R1): çöp, ödenmiş, tarihsiz, yürürlük öncesi, gider tarihi
// bugünden sonra ve ödenecek tutarı 0 olan kalemler girmez; ayrıca son ödeme tarihi olmayan kalem girmez (R7).
// "Vadesi geçmiş" kuralı YENİDEN YAZILMAZ: 0001'in vadesiGectiMi'si çağrılır (C2). Bu dosya yalnız "yaklaşan"
// (bugün ≤ vade ≤ bugün + eşik) kavramını ekler. Anasayfa kartı, liste penceresi ve Giderler süzgeci aynı
// fonksiyonu aynı `bugun` ve eşikle kullanır, sayılar bu yüzden ayrışamaz (AC-14).
import { turHaritasi, davranisOf, odemeHedefleri, hedefGecti, satirliMi, borcKapsamindaMi, kurumTarafAdi, DAVRANIS, HEDEF, VERGI_DAIRESI } from "./gider";

export const HATIRLATMA_ESIK_VARSAYILAN = 7;
export const HATIRLATMA_ESIK_MAX = 365;

// Metin tarihler arası gün farkı (b − a). Date.UTC gün numarası: saat dilimi ve yaz saatinden bağımsız (C3, H10).
const gunNo = (t) => { const [y, m, d] = String(t).split("-").map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
export const gunFarki = (a, b) => Math.round(gunNo(b) - gunNo(a));
export const gunEkle = (t, n) => {
  const d = new Date((gunNo(t) + n) * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

// R5, AC-23: 0–365 arası tam sayı. Geçersizse neden döner, değer değişmez.
export const hatirlatmaEsikDogrula = (ham) => {
  const t = String(ham ?? "").trim();
  if (!/^-?\d+$/.test(t)) return { hata: "Hatırlatma eşiği tam sayı olmalı (0 ile 365 gün arası)." };
  const n = Number(t);
  if (n < 0 || n > HATIRLATMA_ESIK_MAX) return { hata: "Hatırlatma eşiği 0 ile 365 gün arasında olmalı." };
  return { deger: n };
};
export const hatirlatmaEsigi = (giderAyarlari) => {
  const n = Number(giderAyarlari?.hatirlatmaEsikGun);
  return Number.isInteger(n) && n >= 0 && n <= HATIRLATMA_ESIK_MAX ? n : HATIRLATMA_ESIK_VARSAYILAN;
};

// R7, AC-8: vade tek alandır; yöntem Çek ise çek vadesi olarak adlandırılır.
export const vadeEtiketi = (k) => (k?.odemeYontemi === "Çek" ? "Çek vadesi" : "Son ödeme");
// H10: gün farkı metni.
export const gunFarkiMetni = (fark) => (fark === 0 ? "bugün" : fark > 0 ? `${fark} gün kaldı` : `${-fark} gün geçti`);

const sirala = (a, b) => (a.vade !== b.vade ? (a.vade < b.vade ? -1 : 1)
  : a.odenecekK !== b.odenecekK ? b.odenecekK - a.odenecekK
    : (Number(a.kalem.id) - Number(b.kalem.id)) || String(a.kalem.id).localeCompare(String(b.kalem.id))
      || String(a.hedef || "").localeCompare(String(b.hedef || ""))); // aynı kalemin iki hedefi: ana, sonra stopaj

// Bölüm satırları: personel kalemleri bölüm başına tek toplu satır (R3, AC-17, H5); satır, bölümdeki en eski
// personel vadesinin yerinde durur.
const bolumSatirlari = (ogeler) => {
  // Spec 0042 R12, Q6: iki hedefli personel kaleminin hedefleri tek alt satırda birleşir (sayı kalem sayar); hedef
  // kırılımı alt satırın `hedefler`inde, yalnız satır açılınca görünür.
  const birlesik = new Map();
  for (const o of ogeler.filter(x => x.personel)) {
    const key = String(o.id);
    if (!birlesik.has(key)) birlesik.set(key, { ...o, hedefler: [] });
    const b = birlesik.get(key);
    if (b.hedefler.length) { b.odenecekK += o.odenecekK; b.odenecek = b.odenecekK / 100; }
    b.hedefler.push({ hedef: o.hedef, odenecek: o.odenecek, vade: o.vade });
  }
  const personel = [...birlesik.values()];
  // Spec 0074 R20: SGK ayda tek kalemdir ve normal kalem satırı olarak görünür (0070'in toplu satırı kalktı).
  const satirlar = ogeler.filter(o => !o.personel).map(o => ({ tur: "kalem", ...o }));
  if (personel.length) {
    const ilk = personel[0];
    satirlar.push({
      tur: "personel", vade: ilk.vade, kalem: ilk.kalem, adet: personel.length,
      odenecek: personel.reduce((a, o) => a + o.odenecekK, 0) / 100, kalemler: personel,
    });
  }
  // ogeler zaten `sirala` ile sıralı gelir (vade, ödenecek, id). Array.prototype.sort kararlıdır: burada yalnız
  // personel satırını vadesinin yerine yerleştiriyoruz; aynı vadeli kalemler (tur === tur → 0) önceki sırayı korur,
  // eşit vadede personel satırı kalemlerden sonra gelir.
  return satirlar.sort((a, b) => (a.vade !== b.vade ? (a.vade < b.vade ? -1 : 1) : a.tur === b.tur ? 0 : a.tur === "personel" ? 1 : -1));
};

const kalemSayilari = (gecmis, yaklasan) => {
  const g = new Set(gecmis.map(o => String(o.id)));
  const y = new Set(yaklasan.map(o => String(o.id)).filter(id => !g.has(id)));
  return { gecmis: g.size, yaklasan: y.size };
};

export const odemeHatirlatmalari = (giderler = [], { turler = [], tedarikciler = [], yururlukAy = null, esikGun = HATIRLATMA_ESIK_VARSAYILAN } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const sinir = gunEkle(bugun, esikGun);
  const gecmis = [], yaklasan = [];
  // Spec 0021 R4, AC-9: satır ÖDEME HEDEFİ başınadır (taksit başına değil). Taksitli hedefte tutar kalan taksitlerin
  // toplamı, vade en yakın ödenmemiş taksitin vadesidir; kalem düzeyinde vade aranmaz (AC-24). Vadesi bilinmeyen
  // hedef (eski kiranın stopajı, R13) girmez. Kartın iki sayısı KALEM sayar (R14, T6): kalem en acil kovaya girer.
  for (const k of giderler) {
    // Spec 0061 R17 (AC-27): kapsam borç özetiyle aynı tek kuraldan; hatırlatıcının farkı aşağıdaki vade şartıdır (R18).
    if (!borcKapsamindaMi(k, { esik, bugun })) continue;
    const dav = davranisOf(k, turMap);
    const personel = dav === DAVRANIS.PERSONEL;
    const acikHedefler = odemeHedefleri(k, dav).filter(h => !h.odendi && h.kalanK > 0 && h.vade);
    // Spec 0042 R12, AC-9 (triyaj): personel kalemi bölünmez; en acil gruba bütün olarak girer (bir hedefi gecikmişse
    // bütün açık hedefleri vadesi geçmiş grubunda). Tutar iki hedefin açık toplamı, vade en erken açık vade olur.
    const personelGrup = personel ? (acikHedefler.some(h => hedefGecti(h, bugun)) ? "gecmis" : acikHedefler.some(h => h.vade <= sinir) ? "yaklasan" : null) : null;
    for (const h of acikHedefler) {
      const gecti = personel ? personelGrup === "gecmis" : hedefGecti(h, bugun);
      if (personel ? !personelGrup : (!gecti && h.vade > sinir)) continue;
      const stopaj = h.hedef === HEDEF.STOPAJ;
      // Spec 0074 R20: SGK kaleminin tarafı kurum adıdır (kurumTarafAdi), "Tedarikçi seçilmemiş" değil.
      const taraf = stopaj ? VERGI_DAIRESI : personel ? (k.calisanAd || "Çalışan")
        : kurumTarafAdi(dav) || (k.tedarikciId != null && tedMap.get(String(k.tedarikciId))?.ad) || "Tedarikçi seçilmemiş";
      const oge = {
        kalem: k, id: k.id, hedef: h.hedef, anahtar: `${k.id}:${h.hedef}`, vade: h.vade,
        vadeEtiketi: h.taksitli ? "Taksit vadesi" : stopaj ? "Stopaj vadesi" : vadeEtiketi(k), gunFarki: gunFarki(bugun, h.vade),
        odenecekK: h.kalanK, odenecek: h.kalanK / 100, taraf, personel: personel && !stopaj, gecti,
        taksit: satirliMi(k) && h.taksitli ? { odenen: h.odenenAdet, toplam: h.toplamAdet } : null,
      };
      (gecti ? gecmis : yaklasan).push(oge);
    }
  }
  gecmis.sort(sirala);
  yaklasan.sort(sirala);
  return {
    sayilar: kalemSayilari(gecmis, yaklasan),
    gecmis, yaklasan,
    gecmisSatirlar: bolumSatirlari(gecmis), yaklasanSatirlar: bolumSatirlari(yaklasan),
    kalemIdleri: new Set([...gecmis, ...yaklasan].map(o => String(o.id))),
    esikGun, bugun,
  };
};
