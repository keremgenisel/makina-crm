// Spec 0092: peşin ödenen giderin kapsam bitişi hatırlatması. Saf hesap (React'sız; "bugün" parametredir).
//
// Bu bir BORÇ hatırlatması değildir (R28): ödeme hatırlatıcısının motoru ve kapsamı dokunulmaz (C10); kart iki sonucu
// birlikte alır. Kapsam: çöpte olmayan, tarihli, yürürlük ayından sonraki, kapsamı birden çok ay olan normal ve kira kalemleri;
// ödenmiş olması engel değildir. Personel ve SGK kalemi hiç girmez (R29, kapsam çözücüsünün davranış kapısı); bu dosya çalışan
// alanlarını okumaz (R43 (a)). Kapsam bitişi kapsamın son ayının son günüdür (R27/2); pencere iki yönlü ve iki ucu dahildir.
import { ayinSonGunu, kapsamAraligi, davranisOf, turHaritasi, kalemGiderTutari } from "./gider";
import { gunFarki } from "./odemeHatirlatma";

export const KAPSAM_BITIS_ESIK_VARSAYILAN = 30;
export const KAPSAM_BITIS_ESIK_MAX = 365;
export const KAPSAM_BITIS_ESIK_ETIKETI = "Kapsam bitişi hatırlatma eşiği (gün)";
// Triyaj (bulgu 3): türsüz kalemin satır başlığı boş kalmasın (R30 "kalemin türü"); pay özetinin "Türü seçilmemiş" ifadesi.
export const TURSUZ_ADI = "Türü seçilmemiş";

// R36: 0–365 tam sayı; geçersizse neden döner (0003'ün ödeme eşiği ikizi, ayrı alan).
export const kapsamBitisEsikDogrula = (ham) => {
  const t = String(ham ?? "").trim();
  if (!/^-?\d+$/.test(t)) return { hata: "Kapsam bitişi hatırlatma eşiği tam sayı olmalı (0 ile 365 gün arası)." };
  const n = Number(t);
  if (n < 0 || n > KAPSAM_BITIS_ESIK_MAX) return { hata: "Kapsam bitişi hatırlatma eşiği 0 ile 365 gün arasında olmalı." };
  return { deger: n };
};
// R37: tek okuma yolu; ayar yok ya da bozuksa varsayılan.
export const kapsamBitisEsigi = (giderAyarlari) => {
  const n = Number(giderAyarlari?.kapsamBitisEsikGun);
  return giderAyarlari?.kapsamBitisEsikGun != null && giderAyarlari.kapsamBitisEsikGun !== "" && Number.isInteger(n) && n >= 0 && n <= KAPSAM_BITIS_ESIK_MAX
    ? n : KAPSAM_BITIS_ESIK_VARSAYILAN;
};

// R27/2: kapsamın son ayının son günü (kapsamsız ya da tarihsiz kalemde null).
export const kapsamBitisi = (k, dav) => {
  const a = kapsamAraligi(k, dav);
  return a ? ayinSonGunu(a.sonAy) : null;
};

// R25/3: kart ve pencere metinleri (tek yer).
export const KAPSAM_KART_ALT_METNI = "Ödenmemiş ve vadesi girilmiş kalemler, kapsadığı süre dolan peşin ödemeler · Görmek için tıkla";
export const kapsamSayiEtiketi = (esik) => `Kapsamı doluyor (± ${esik} gün)`;
export const kapsamBolumBasligi = (n, esik) => `Kapsamı doluyor (${n}) · ± ${esik} gün`;
export const KAPSAM_SUZGEC_IBARESI = "Bu bölüm Giderler'in hatırlatma süzgecine girmez.";
export const kapsamBosEki = (esik) => `Kapsadığı süre ${esik} gün içinde dolan ya da yeni dolmuş peşin ödenmiş gider de yok.`;

// R25–R31: satırlar bitişe göre artan; sayı kalem sayar (R26). gunFarki = bitiş − bugün (pozitif kalan, negatif geçen).
export const kapsamHatirlatmalari = (giderler = [], { turler = [], tedarikciler = [], yururlukAy = null, esikGun = KAPSAM_BITIS_ESIK_VARSAYILAN } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map((tedarikciler || []).map(t => [String(t.id), t]));
  const esikTarih = yururlukAy ? `${yururlukAy}-01` : "";
  const satirlar = [];
  for (const k of giderler || []) {
    if (k.deletedAt || !k.tarih || k.tarih < esikTarih) continue; // R28, R28/2, AC-47, AC-48, AC-49/2
    const dav = davranisOf(k, turMap);
    const a = kapsamAraligi(k, dav); // personel ve SGK'da null (R29)
    if (!a) continue;
    const bitis = ayinSonGunu(a.sonAy);
    const fark = gunFarki(bugun, bitis);
    if (Math.abs(fark) > esikGun) continue; // R27, R27/3: iki uç dahil
    const tur = turMap.get(String(k.turId));
    satirlar.push({
      anahtar: `kapsam:${k.id}`, kalem: k, turAd: tur?.ad || TURSUZ_ADI, aciklama: k.aciklama || "",
      tedarikci: k.tedarikciId != null ? tedMap.get(String(k.tedarikciId))?.ad || "" : "",
      aySayisi: a.aySayisi, ilkAy: a.ilkAy, sonAy: a.sonAy, bitis, gunFarki: fark,
      tutar: kalemGiderTutari(k, dav), // R30/2: kalem listesinin "Tutar" sütunu
    });
  }
  satirlar.sort((x, y) => (x.bitis !== y.bitis ? (x.bitis < y.bitis ? -1 : 1) : String(x.kalem.id).localeCompare(String(y.kalem.id), "tr", { numeric: true })));
  return { satirlar, sayi: satirlar.length, esikGun };
};
