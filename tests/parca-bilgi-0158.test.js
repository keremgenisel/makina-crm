// Spec 0158 A, F: parçanın bilgi alanları (tek yazıcı, Excel, arama nedeni) ve taramalar. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { PARCA_BILGI_ALANLARI, parcaBilgiYaz, parcaBilgiDegerleri, parcaBilgiHucreleri } from "../src/lib/parcaBilgi";
import { PARCA_AKTARMA_BASLIKLARI, PARCA_SABLON_ORNEGI, MALIYET_PB_BASLIKLARI, parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula } from "../src/lib/parcaAktarma";
import { parcaEslesmeNedeni } from "../src/components/GlobalSearch";
import { aramaKelimeleri } from "../src/lib/utils";
import { parcaMaliyetKurus, setKatalogu, EXCEL_MALIYET_BOS_DOVIZ_HATASI } from "../src/lib/urunAgaci";
import { malzemeKatalogu } from "../src/lib/malzeme";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import * as S from "../src/lib/siparisIhtiyaci";
import { veri, PARCALAR, MALZEMELER } from "./fixtures/0158-dolu.js";

const BUGUN = "2026-11-23";
const kodSatirlari = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const BILGI = { olcu: "M8 × 40", hammaddeAdi: "Paslanmaz A2", cins: "DIN 933" };
const satir = (ad, ek = []) => { const r = Array(16).fill(""); r[0] = ad; ek.forEach(([i, v]) => { r[i] = v; }); return r; };

describe("Spec 0158 A: tek yazıcı ve alan adları", () => {
  it("AC-2 / AC-70 / R2/2: alanlar her çağrıda silinir, kırpılır, yalnız doluyken yazılır", () => {
    expect(parcaBilgiYaz({ ad: "X", olcu: "  M8 ", hammaddeAdi: "", cins: "   " })).toEqual({ ad: "X", olcu: "M8" });
    expect(parcaBilgiYaz({ ad: "X" })).toEqual({ ad: "X" });
    expect(parcaBilgiDegerleri({ cins: "c", olcu: "o", hammaddeAdi: "h" })).toEqual(["o", "h", "c"]); // R5/2 sırası
  });
  it("AC-68 / C3/2 / C4: alan adları olcu, hammaddeAdi, cins; tedarikçinin `hammadde` bayrağından, `hammaddeler`den ve `tip`ten ayrı", () => {
    expect(PARCA_BILGI_ALANLARI.map(a => a.alan)).toEqual(["olcu", "hammaddeAdi", "cins"]);
    for (const yasak of ["hammadde", "hammaddeler", "tip"]) expect(PARCA_BILGI_ALANLARI.map(a => a.alan)).not.toContain(yasak);
    for (const f of ["src/components/gider/Tedarikciler.jsx", "src/components/MalzemeManager.jsx"]) expect(kodSatirlari(f)).not.toMatch(/hammaddeAdi/);
  });
});

describe("Spec 0158 F: Excel", () => {
  it("AC-48 / AC-77 / R35/2: son beş sütun 0157'nin iki sütunu ve üç bilgi alanı; dolu değer yazılır, boş hücre boş", () => {
    expect(PARCA_AKTARMA_BASLIKLARI).toHaveLength(16);
    expect(PARCA_AKTARMA_BASLIKLARI.slice(11)).toEqual(["Maliyet Para Birimi", "Maliyet Kuru", "Ölçü", "Hammadde", "Cins"]);
    expect(MALIYET_PB_BASLIKLARI).toEqual(["Maliyet Para Birimi", "Maliyet Kuru"]);
    expect(PARCA_SABLON_ORNEGI).toHaveLength(16);
    expect(PARCA_SABLON_ORNEGI.slice(11, 13)).toEqual(["USD", "40"]); // spec 0157 ile (P6, AC-44)
    expect(parcaDisaAktarmaSatiri({ ad: "C", ...BILGI }).slice(11)).toEqual(["", "", "M8 × 40", "Paslanmaz A2", "DIN 933"]);
    expect(parcaDisaAktarmaSatiri({ ad: "R" }).slice(11)).toEqual(["", "", "", "", ""]);
  });
  it("AC-49: içe aktarmada dolu hücreler kayda yazılır (kırpılmış)", () => {
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir("Cıvata", [[13, " M8 × 40 "], [14, "Paslanmaz A2"], [15, "DIN 933"]])], [], 100, BUGUN);
    expect(r.parts[0]).toMatchObject(BILGI);
  });
  it("AC-50 / AC-69 / R37/2: boş hücre kayıtlı değeri silmez; ikisi de boşsa anahtar yok", () => {
    const mevcut = { id: 7, ad: "Cıvata", ...BILGI };
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir("Cıvata", [[14, "AISI 316"]]), satir("Yeni")], [mevcut], 100, BUGUN);
    const son = parcaIceAktarmaUygula([mevcut], r.parts);
    expect(son.find(p => p.id === 7)).toMatchObject({ olcu: "M8 × 40", hammaddeAdi: "AISI 316", cins: "DIN 933" });
    const yeni = son.find(p => p.ad === "Yeni");
    for (const a of ["olcu", "hammaddeAdi", "cins"]) expect(yeni, a).not.toHaveProperty(a);
    expect(parcaBilgiHucreleri(["", "", ""], {})).toEqual({});
    expect(parcaBilgiHucreleri(["", " AISI 316 ", ""], BILGI)).toEqual({ ...BILGI, hammaddeAdi: "AISI 316" }); // boş hücre kayıtlı değere düşer
  });
  it("AC-51: eski on bir sütunlu şablon aynen içe aktarılır, üç alan etkilenmez", () => {
    const mevcut = { id: 7, ad: "Cıvata", ...BILGI };
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI.slice(0, 11), ["Cıvata", "Bolt", "", "", "", "", "", "", "", "", ""]], [mevcut], 100, BUGUN);
    expect(parcaIceAktarmaUygula([mevcut], r.parts)[0]).toMatchObject({ ...BILGI, adEN: "Bolt" });
  });
  // Spec 0157 ile (R18/2, AC-44): 12–13. sütun artık okunur ve 0158'in "henüz okunmuyor" reddi kalktı. Maliyet hücresi boş satırda
  // para birimi ve kur kaydı değiştirmez (P7); sütunların okunduğunun ölçümü 0157 testindedir.
  it("AC-77 / P14 (spec 0157 ile): maliyet hücresi boşken iki sütun kaydı değiştirmez, alan adları satış fiyatıyla karışmaz", () => {
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir("Cıvata", [[11, "USD"], [12, "40"]])], [], 100, BUGUN);
    expect(Object.keys(r.parts[0])).not.toEqual(expect.arrayContaining(["paraBirimi"]));
    expect(JSON.stringify(r.parts[0])).not.toMatch(/:"USD"|:"40"/);
  });
  it("AC-77 / P14 (triyaj bulgu 3, spec 0157 ile): maliyetsiz satırda dolu iki hücre sessizce yok sayılmaz, satır numarasıyla bildirilir; boşken bildirim yok", () => {
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir("Cıvata", [[11, "USD"], [12, "38"]]), satir("Somun"), satir("Pul", [[12, "38"]])], [], 100, BUGUN);
    expect(r.errors).toEqual([`Satır 2: ${EXCEL_MALIYET_BOS_DOVIZ_HATASI}`, `Satır 4: ${EXCEL_MALIYET_BOS_DOVIZ_HATASI}`]);
    expect(r.parts.map(p => p.ad)).toEqual(["Cıvata", "Somun", "Pul"]); // satır atlanmaz, yalnız iki hücre alınmaz
    const disa = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, parcaDisaAktarmaSatiri({ id: 7, ad: "Cıvata", ...BILGI })], [{ id: 7, ad: "Cıvata", ...BILGI }], 100, BUGUN);
    expect(disa.errors).toEqual([]); // dışa aktarılan dosya geri yüklenince bildirim yok (iki sütun boş yazılır)
  });
});

describe("Spec 0158 A: arama nedeni", () => {
  const p = { ad: "Cıvata", adEN: "Bolt", kod: "CV-8", ...BILGI };
  it("AC-9 / AC-75 / R6/2: başlık kümesi ad, İngilizce ad, kod; neden eşleşen alanın etiketiyle", () => {
    expect(parcaEslesmeNedeni(p, aramaKelimeleri("cıvata"))).toBeNull();
    expect(parcaEslesmeNedeni(p, aramaKelimeleri("cv-8"))).toBeNull();
    expect(parcaEslesmeNedeni(p, aramaKelimeleri("cıvata m8"))).toBe("ölçü: M8 × 40");
    expect(parcaEslesmeNedeni(p, aramaKelimeleri("paslanmaz"))).toBe("hammadde: Paslanmaz A2");
    expect(parcaEslesmeNedeni(p, aramaKelimeleri("din"))).toBe("cins: DIN 933");
  });
});

describe("Spec 0158 tarama ve çapraz ölçüm", () => {
  it("AC-10 / R3: alanlar maliyet, fiyat, sipariş adedi ve stok hesabına girmez (çapraz ölçüm)", () => {
    const bos = PARCALAR.map(p => { const y = { ...p }; for (const a of ["kod", "olcu", "hammaddeAdi", "cins"]) delete y[a]; return y; });
    const dolu = bos.map(p => ({ ...p, kod: "K", ...BILGI }));
    const kat = (ps) => setKatalogu(ps); const mk = malzemeKatalogu(MALZEMELER);
    expect(dolu.map(p => parcaMaliyetKurus(p, undefined, kat(dolu), mk))).toEqual(bos.map(p => parcaMaliyetKurus(p, undefined, kat(bos), mk)));
    const fb = (ps) => fiyatBaglamiKur({ parts: ps, malzemeler: MALZEMELER });
    expect(dolu.map(p => parcaSatisFiyati(p, "TRY", fb(dolu)).deger)).toEqual(bos.map(p => parcaSatisFiyati(p, "TRY", fb(bos)).deger));
    const ozet = (ps) => { const r = S.siparisIhtiyaci(veri({ parts: ps }), { tedarikciOdakli: true }); return [r.parcalar.map(x => [x.partId, x.siparis, x.stok]), r.kesitler.map(x => [x.anahtar, x.siparisKg, x.tutarK])]; };
    expect(ozet(dolu)).toEqual(ozet(bos));
  });
  it("AC-79 / R3/2 / P13: maliyet ve fiyat yolunda alanlar okunmaz; motorda tek okuyucu `parcaBilgisi`", () => {
    for (const f of ["src/lib/urunAgaci.js", "src/lib/maliyetKalemleri.js", "src/lib/malzeme.js", "src/lib/parcaFiyati.js", "src/lib/stokHareketi.js", "src/lib/setUretimi.js",
      "src/lib/servisStok.js", "src/lib/yedekParcaStok.js", "src/lib/makinaStandartMaliyet.js"]) {
      const k = kodSatirlari(f);
      expect(k, f).not.toMatch(/hammaddeAdi|\bcins\b|parcaBilgi|PARCA_BILGI/);
      expect(k, f).not.toMatch(/\.olcu\b/);
    }
    const m = kodSatirlari("src/lib/siparisIhtiyaci.js");
    expect((m.match(/PARCA_BILGI_ALANLARI/g) || []).length).toBe(2); // içe alma + parcaBilgisi
    expect((m.match(/parcaBilgisi\(/g) || []).length).toBe(1);
    expect(m).not.toMatch(/\bp\.(olcu|hammaddeAdi|cins)\b/);
  });
  it("AC-56 / C10: yeni veri bölümü, izin kimliği ve sunucu kuralı yok", () => {
    for (const f of ["electron/serverAuth.cjs", "src/components/settings/serverPermissionDefs.js", "src/lib/merge.js", "electron/server.cjs"]) expect(kodSatirlari(f), f).not.toMatch(/hammaddeAdi|\bcins\b|parcaBilgi/);
  });
});
