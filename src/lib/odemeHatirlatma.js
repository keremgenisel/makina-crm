// Ödeme hatırlatıcısı: saf hesap (spec 0003, plan H1–H12). React'sız.
//
// Kapsam 0001 borç özetiyle aynı kurallardır (R1): çöp, ödenmiş, tarihsiz, yürürlük öncesi, gider tarihi
// bugünden sonra ve ödenecek tutarı 0 olan kalemler girmez; ayrıca son ödeme tarihi olmayan kalem girmez (R7).
// "Vadesi geçmiş" kuralı YENİDEN YAZILMAZ: 0001'in vadesiGectiMi'si çağrılır (C2). Bu dosya yalnız "yaklaşan"
// (bugün ≤ vade ≤ bugün + eşik) kavramını ekler. Anasayfa kartı, liste penceresi ve Giderler süzgeci aynı
// fonksiyonu aynı `bugun` ve eşikle kullanır, sayılar bu yüzden ayrışamaz (AC-14).
import { turHaritasi, davranisOf, odenecekTutar, vadesiGectiMi, kurus, DAVRANIS } from "./gider";

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
    : (Number(a.kalem.id) - Number(b.kalem.id)) || String(a.kalem.id).localeCompare(String(b.kalem.id)));

// Bölüm satırları: personel kalemleri bölüm başına tek toplu satır (R3, AC-17, H5); satır, bölümdeki en eski
// personel vadesinin yerinde durur.
const bolumSatirlari = (ogeler) => {
  const personel = ogeler.filter(o => o.personel);
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

export const odemeHatirlatmalari = (giderler = [], { turler = [], tedarikciler = [], yururlukAy = null, esikGun = HATIRLATMA_ESIK_VARSAYILAN } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const sinir = gunEkle(bugun, esikGun);
  const gecmis = [], yaklasan = [];
  for (const k of giderler) {
    if (k.deletedAt || k.odendi || !k.tarih || k.tarih < esik || k.tarih > bugun || !k.sonOdemeTarihi) continue;
    const dav = davranisOf(k, turMap);
    const odenecekK = kurus(odenecekTutar(k, dav));
    if (odenecekK <= 0) continue;
    const gecti = vadesiGectiMi(k, bugun);
    if (!gecti && k.sonOdemeTarihi > sinir) continue;
    const personel = dav === DAVRANIS.PERSONEL;
    const taraf = personel ? (k.calisanAd || "Çalışan")
      : (k.tedarikciId != null && tedMap.get(String(k.tedarikciId))?.ad) || "Tedarikçi seçilmemiş";
    const oge = {
      kalem: k, id: k.id, vade: k.sonOdemeTarihi, vadeEtiketi: vadeEtiketi(k), gunFarki: gunFarki(bugun, k.sonOdemeTarihi),
      odenecekK, odenecek: odenecekK / 100, taraf, personel, gecti,
    };
    (gecti ? gecmis : yaklasan).push(oge);
  }
  gecmis.sort(sirala);
  yaklasan.sort(sirala);
  return {
    sayilar: { gecmis: gecmis.length, yaklasan: yaklasan.length },
    gecmis, yaklasan,
    gecmisSatirlar: bolumSatirlari(gecmis), yaklasanSatirlar: bolumSatirlari(yaklasan),
    kalemIdleri: new Set([...gecmis, ...yaklasan].map(o => String(o.id))),
    esikGun, bugun,
  };
};
