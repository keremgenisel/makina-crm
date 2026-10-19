import { useState } from "react";
import { uid, simdiYerel } from "../../lib/utils";
import { partiDogrula, partiKapanisUygula, partiMakinaSayisi } from "../../lib/uretimPartisi";
import { kurusMetni, PARTI_DURUM } from "../../lib/makinaStandartMaliyet";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Btn, Modal, ConfirmDialog, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";
import { AyInput } from "./GiderAlanlari";
import { KartBolum, BosDurum, HataMetni, Ipucu } from "../tasarim";
import { Rozet } from "./DonemRaporu";
import { yayilanKalemMetni } from "../maliyet/PayOzeti";

// Makina Maliyeti › Üretim Partileri (spec 0088 ile Giderler'den taşındı; spec 0022 R1, R3, R7, R11; plan P5, P8). Parti yalnız
// genel gider payının tabanıdır (C7). Spec 0090 R12–R37: rakamlar Makina Maliyeti ekranının kurduğu `partiGenelPaylari`
// sonucundan (parti başına TEK nesne, R31); ekran hesap yapmaz (C5, AC-51). Tanım, kapatma ve silme `gider_tanim` ister (C5).
// Spec 0068 R9: silme çöp kutusuna taşır; makina bağı okuma anında çözüldüğü için alan temizlenmez (0022 R11) ve parti geri
// alınınca bağ kendiliğinden döner. Liste canlı dizidir; yazım tam dizi üzerinde işlevsel güncelleyiciyle (C8).
const BOS = { id: null, ad: "", baslangicAy: "", bitisAy: null, aciklama: "" };
const satirStil = { display: "grid", gridTemplateColumns: "100px minmax(0, 1fr) 120px", gap: 12, padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13, alignItems: "center" };
const ayAdi = (ay) => { if (!ay) return ""; const [y, m] = ay.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); };

// Spec 0090 R35, R30: başlık ve boş durum cümlesi havuzun kapısının tür rolü olduğunu söyler.
export const PARTI_BASLIK_CUMLESI = "Parti parti üretimde, partinin sürdüğü ayların genel gideri (rolü “Genel gidere girer” olan türler) o ayın hak sahiplerine makina adediyle bölünür; o ay üretilmiş partisiz makinalar da birer pay alır. Makinalar stok kaydından partiye bağlanır; satılınca bağ satış kaydında korunur.";
export const PARTI_BOS_METNI = "Partisiz makinalar da üretildikleri ayın genel gider bölünmesinde birer pay alır.";

export const UretimPartileri = ({ uretimPartileri = [], setUretimPartileri, stock = [], customers = [], partiSonucu = null, kapanisHavuzu = null, canDo = () => true, showToast = () => {}, serverPermissions }) => {
  const [form, setForm] = useState(null);
  const [hatalar, setHatalar] = useState({});
  const [sil, setSil] = useState(null);
  // Spec 0064 R4: üretim partisi formu ve silme onayı aynı partinin kilidini paylaşır (yeni partide kilit yok).
  const kilitId = form?.id ?? sil?.p?.id ?? null;
  const { lockConflict: partiKilidi, forceAcquire: partiKilidiDevral } = useLock("uretim_partisi", kilitId);
  const kilitli = !!(partiKilidi && kilitId != null);
  const kilitKapat = () => { setForm(null); setSil(null); };
  const ozet = new Map((partiSonucu?.partiler || []).map(p => [String(p.id), p]));
  // Spec 0089 R11, spec 0090 R24, R25: kapanmış partinin ayında genel gider kapanıştan sonra değişti (yeni anlık görüntü farkı;
  // 0090 öncesi kapanmış partinin eski görüntüsü okunmaz). Metin, başlık ve testId aynı.
  const ad = new Map(uretimPartileri.map(p => [String(p.id), p.ad]));
  const partiDegisimleri = (partiSonucu?.partiler || []).filter(p => p.degisimler.length);
  const yetki = canDo("gider_tanim");

  const ac = (p) => { setHatalar({}); setForm(p ? { ...BOS, ...p } : { ...BOS }); };
  const kaydet = () => {
    const { hatalar: h, kayit } = partiDogrula(form, uretimPartileri);
    setHatalar(h);
    if (!kayit) return;
    const yeni = form.id == null;
    const eski = yeni ? null : uretimPartileri.find(p => p.id === form.id);
    // Spec 0090 R23, R26, R37: bitiş girilince (ya da aralık değişince) ayların genel gider havuzu anlık görüntü olarak
    // yazılır; harita yoksa ya da bir ay haritada yoksa kayıt yapılmaz ve nedeni söylenir (sessizce boş görüntü yazılmaz).
    // Triyaj (bulgu 2): harita kaydedilen partinin aralığından (kapanisHavuzu); verilmezse motor sonucunun haritası.
    const yeniKayit = { ...kayit, id: form.id ?? uid() };
    const havuz = kapanisHavuzu ? kapanisHavuzu(yeniKayit) : partiSonucu ? { aylar: partiSonucu.aylar, yururlukAy: partiSonucu.yururlukAy } : null;
    const sonuc = partiKapanisUygula(eski, yeniKayit, havuz, simdiYerel());
    if (sonuc.hata) { showToast(sonuc.hata, "err"); return; }
    const son = sonuc.kayit;
    setUretimPartileri(p => (yeni ? [...p, son] : p.map(x => (x.id === son.id ? son : x))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "uretim_partisi", entityId: son.id, entityName: son.ad });
    setForm(null);
    showToast(yeni ? "Üretim partisi eklendi." : son.bitisAy && !eski?.bitisAy ? "Parti kapatıldı: maliyetlerdeki “geçici” ibaresi kalktı." : "Üretim partisi güncellendi.");
  };
  const silOnayla = () => {
    const zaman = new Date().toISOString();
    setUretimPartileri(p => p.map(x => (x.id === sil.p.id ? { ...x, deletedAt: zaman } : x)));
    logAction({ serverPermissions, action: "silindi", entity: "uretim_partisi", entityId: sil.p.id, entityName: sil.p.ad });
    setSil(null);
    showToast("Üretim partisi çöp kutusuna taşındı.");
  };
  // Spec 0068 C8: liste canlı kayıtlardır (ham dizi gelse de çöptekiler çizilmez).
  const sirali = uretimPartileri.filter(p => !p.deletedAt).sort((a, b) => (a.baslangicAy !== b.baslangicAy ? (a.baslangicAy < b.baslangicAy ? 1 : -1) : String(a.ad).localeCompare(String(b.ad), "tr")));
  const th = { padding: "9px 12px" }, td = { padding: "10px 12px", borderTop: "1px solid var(--n150, #f1f5f9)", verticalAlign: "top" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--n600, #475569)", maxWidth: 760 }}>
          {PARTI_BASLIK_CUMLESI}
        </div>
        {yetki && <Btn onClick={() => ac(null)}><Icon name="plus" size={14} /> Yeni Üretim Partisi</Btn>}
      </div>
      {sirali.length === 0 ? (
        <BosDurum testId="bos-uretim-partileri" baslik="Henüz üretim partisi yok" metin={PARTI_BOS_METNI} />
      ) : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="uretim-partileri">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
            <thead><tr style={{ background: "var(--n100, #f8fafc)", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase", textAlign: "left" }}>
              <th style={th}>Parti</th><th style={th}>Dönem</th><th style={th}>Durum</th><th style={{ ...th, textAlign: "right" }}>Makina</th>
              <th style={{ ...th, textAlign: "right" }}>Genel gider havuzu</th><th style={{ ...th, textAlign: "right" }}>Makina başı pay</th><th style={th} />
            </tr></thead>
            <tbody>
              {sirali.map(p => {
                const o = ozet.get(String(p.id));
                const acik = !p.bitisAy;
                return (
                  <tr key={p.id} data-testid="parti-satiri">
                    <td style={td}><b>{p.ad}</b>{p.aciklama && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{p.aciklama}</div>}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{ayAdi(p.baslangicAy)} – {acik ? "sürüyor" : ayAdi(p.bitisAy)}</td>
                    <td style={td}>{acik ? <Rozet renk="turuncu" title="Parti kapanınca maliyetlerdeki geçici ibaresi kalkar">Açık · geçici</Rozet> : <Rozet renk="yesil">Kapalı</Rozet>}</td>
                    {/* Spec 0090 R31: dört hücre yalnız motor nesnesinden (adet, neden ipucu, havuz, makina başı pay). */}
                    <td style={{ ...td, textAlign: "right" }} data-testid="parti-adet">
                      <b>{o ? o.adet : "—"}</b>
                      {o?.durum === PARTI_DURUM.MAKINA_YOK && <Ipucu>{o.neden}</Ipucu>}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }} data-testid="parti-havuz">
                      {!o ? "—" : (o.durum === PARTI_DURUM.ROL_YOK || o.durum === PARTI_DURUM.BASLAMADI || o.durum === PARTI_DURUM.YURURLUK_ONCESI)
                        ? <span data-testid="parti-neden" style={{ fontSize: 12, color: "var(--n600, #475569)", whiteSpace: "normal" }}>{o.neden}</span>
                        : <>{kurusMetni(o.havuzK)}<div data-testid="parti-kaynak" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{o.kaynak}</div></>}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }} data-testid="parti-makina-basi">{o?.makinaBasiK != null && o.durum === PARTI_DURUM.TAMAM ? <>{kurusMetni(o.makinaBasiK)}{acik && <div style={{ fontSize: 11, color: "var(--orTx, #c2410c)" }}>geçici</div>}</> : "—"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                      {yetki && <Btn small variant="ghost" onClick={() => ac(p)} title="Düzenle"><Icon name="edit" size={12} /></Btn>}{" "}
                      {yetki && <Btn small variant="danger" onClick={() => setSil({ p, n: partiMakinaSayisi(p.id, { stock, customers }) })} title="Sil"><Icon name="trash" size={12} /></Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Spec 0092 R22: yayılmış kalem bilgisi tablonun altında bir kez (sayı motordan, parti başına tekrar edilmez).
              Kullanıcı isteği 2026-10-19: kap boşluksuz olduğu için yazı tablo hücreleriyle aynı yatay boşluğu alır. */}
          {partiSonucu?.yayilanAdet > 0 && <div data-testid="parti-yayilan" style={{ padding: "0 12px 10px" }}><Ipucu>{yayilanKalemMetni(partiSonucu.yayilanAdet)}</Ipucu></div>}
        </KartBolum>
      )}

      {partiDegisimleri.length > 0 && (
        <KartBolum varyant="kart" baslikStili="baslik" title="Kapanmış partilerin aylarında değişen ortak gider" altBaslik="Parti kapandıktan sonra bu aylara gider eklendi, değişti ya da silindi. Paylar bugünkü veriyle yeniden hesaplandı." baslikBosluk={10} baslikRengi="inherit" testId="parti-degisimleri">
          {partiDegisimleri.flatMap(p => p.degisimler.map(d => (
            <div key={`${p.id}-${d.ay}`} style={satirStil} data-testid="parti-degisim-satiri">
              <span style={{ color: "var(--n600, #475569)" }}>{d.ay}</span>
              <span><b>{ad.get(String(p.id))}</b> <span style={{ color: "var(--amb700, #b45309)", fontSize: 12 }}>· kapanışta {kurusMetni(d.kapanistaK)}, bugün {kurusMetni(d.bugunK)}</span></span>
              <b style={{ textAlign: "right" }}>{d.artti ? "+ " : "− "}{kurusMetni(d.farkMutlakK)}</b>
            </div>
          )))}
        </KartBolum>
      )}

      {kilitli && (
        <Modal title={form ? "Üretim Partisini Düzenle" : "Üretim Partisi"} onClose={kilitKapat}>
          <LockConflict lockedBy={partiKilidi.lockedBy} lockedAt={partiKilidi.lockedAt} onForce={partiKilidiDevral} onCancel={kilitKapat} />
        </Modal>
      )}
      {form && !kilitli && (
        <Modal title={form.id == null ? "Yeni Üretim Partisi" : "Üretim Partisini Düzenle"} onClose={() => setForm(null)} wide
          footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={() => setForm(null)}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></div>}>
          <Field label="Parti adı veya numarası *"><Input aria-label="Parti adı" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Örn. 2026-1" /><HataMetni>{hatalar.ad}</HataMetni></Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Başlangıç ayı *"><AyInput ariaLabel="Başlangıç ayı" value={form.baslangicAy} onChange={v => setForm(f => ({ ...f, baslangicAy: v || "" }))} /><HataMetni>{hatalar.baslangicAy}</HataMetni></Field></div>
            <div style={{ flex: 1 }}>
              <Field label="Bitiş ayı">
                <AyInput ariaLabel="Bitiş ayı" value={form.bitisAy} onChange={v => setForm(f => ({ ...f, bitisAy: v }))} />
                <HataMetni>{hatalar.bitisAy}</HataMetni>
                <Ipucu>Parti kapanınca girin. Boşken parti açıktır ve maliyetler geçicidir.</Ipucu>
              </Field>
            </div>
          </div>
          <Field label="Açıklama"><Input aria-label="Açıklama" value={form.aciklama || ""} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Opsiyonel (ör. 70 makinalık bahar üretimi)" /></Field>
        </Modal>
      )}
      {sil && !kilitli && (
        <ConfirmDialog title="Üretim partisi silinsin mi?"
          message={`“${sil.p.ad}” partisi çöp kutusuna taşınacak. ${sil.n} makina bu partiye bağlı; parti çöpteyken bu makinaların ortak gider payı üretildikleri ayın kuralına döner, geri alınınca parti dağıtımı geri gelir.`}
          onConfirm={silOnayla} onCancel={() => setSil(null)} />
      )}
    </div>
  );
};
