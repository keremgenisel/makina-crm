import { useState } from "react";
import { Btn, Field, Input, Select, Icon, LockConflict } from "../ui";
import { KartBolum, HataMetni, Ipucu } from "../tasarim";
import { AyInput, DAVRANIS_AD } from "../gider/GiderAlanlari";
import { useLock } from "../../hooks/useLock";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { MALIYET_ROLU_ETIKET, MALIYET_ROLLERI, maliyetRoluOf, rolBelirtildiMi, rolDavranisUyarisi, turRoluYaz, maliyetAyarDogrula, donemOnerisi,
  aylikKarsilik, kurusMetni } from "../../lib/makinaStandartMaliyet";
import { PayOzeti } from "./PayOzeti";

// Spec 0088 R5–R8, R29: hangi gider türü maliyete nasıl girer (tür bazlı, üç rol) ve genel gider payının iki varsayımı (dönem,
// dönemde varsayılan üretim adedi). Ayarlar `appSettings.maliyetAyarlari`'nda kendi anahtarında (giderAyarlari'na yazılmaz).
// R32: form `maliyet_ayar` kilidini tutar; tür rolü kayıt anında Gider Türleri panelinin kilidine (`ayar:gidertur`) bakar.
export const ADET_ETIKETI = "Dönemde varsayılan üretim adedi (toplam)";
const formDan = (a) => ({ baslangicAy: a?.baslangicAy || "", bitisAy: a?.bitisAy || "", varsayilanAdet: a?.varsayilanAdet == null ? "" : String(a.varsayilanAdet) });

export const HesapAyarlari = ({ pay, gercek, canDo, baskasiKilitli, showToast, ayarlar, setAppSettings, giderTurleri = [], setGiderTurleri, bugun }) => {
  const yetki = canDo("gider_tanim");
  const { lockConflict, forceAcquire } = useLock("maliyet_ayar", yetki ? 1 : null);
  const [form, setForm] = useState(() => formDan(ayarlar));
  const [hatalar, setHatalar] = useState({});
  const oneri = donemOnerisi(bugun);
  const aylik = aylikKarsilik(form);
  const kaydet = () => {
    const d = maliyetAyarDogrula(form);
    setHatalar(d.hatalar);
    if (!d.gecerli) return;
    setAppSettings?.(p => ({ ...p, maliyetAyarlari: d.deger }));
    showToast("Hesap ayarları kaydedildi.");
  };
  const rolYaz = (t, rol) => {
    const k = baskasiKilitli?.("ayar", "gidertur");
    if (k) { showToast(kilitRedMesaji(k), "err"); return; }
    setGiderTurleri?.(p => turRoluYaz(p, t.id, rol));
  };
  // Triyaj (bulgu 2): havuz ham tür haritasıyla kurulur (0078 C2); dönemde kalemi olan çöpteki tür de satır olarak çizilir ki
  // havuza giren tutarı görünsün ve rolü değiştirilebilsin.
  const kalemliTurler = new Set((pay.havuz?.satirlar || []).map(s => String(s.turId)));
  const turler = giderTurleri.filter(t => !t.deletedAt || kalemliTurler.has(String(t.id)));
  const tutar = new Map((pay.havuz?.satirlar || []).map(s => [String(s.turId), s.toplamK]));
  const rolsuz = pay.roller.rolsuzTurSayisi; // canlı türler (çöpteki tür sayılmaz)

  return (
    <div>
      <PayOzeti pay={pay} gercek={gercek} />
      <KartBolum varyant="kart" title="Genel gider payının varsayımları" style={{ marginBottom: 16 }} testId="maliyet-ayar-formu">
        {yetki && lockConflict ? <LockConflict lockedBy={lockConflict.lockedBy} lockedAt={lockConflict.lockedAt} onForce={forceAcquire} onCancel={() => {}} /> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              <Field label="Dönem başlangıcı"><AyInput value={form.baslangicAy} ariaLabel="Dönem başlangıcı" onChange={v => setForm(f => ({ ...f, baslangicAy: v || "" }))} /></Field>
              <Field label="Dönem bitişi"><AyInput value={form.bitisAy} ariaLabel="Dönem bitişi" onChange={v => setForm(f => ({ ...f, bitisAy: v || "" }))} /></Field>
              {/* Kullanıcı isteği 2026-10-18: uzun etiket tek satırda kalır ki alan diğer ikisiyle aynı hizada dursun. */}
              <Field label={<span style={{ whiteSpace: "nowrap" }}>{ADET_ETIKETI}</span>}>
                <Input value={form.varsayilanAdet} inputMode="numeric" aria-label={ADET_ETIKETI} placeholder="ör. 120" onChange={e => setForm(f => ({ ...f, varsayilanAdet: e.target.value }))} />
                {aylik != null && <Ipucu><span data-testid="aylik-karsilik">{`≈ ${String(aylik).replace(".", ",")} makina/ay`}</span></Ipucu>}
              </Field>
            </div>
            <HataMetni>{hatalar.donem || ""}</HataMetni>
            <HataMetni>{hatalar.adet || ""}</HataMetni>
            <Ipucu>Varsayılan adet dönemin tamamı içindir (aylık değil): on iki aylık dönemde ayda 10 makina için 120 yazın. Makina başına pay = dönem havuzu ÷ bu adet.</Ipucu>
            {!ayarlar && (
              <div data-testid="donem-onerisi" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                <Ipucu>{`Öneri: ${oneri.baslangicAy} – ${oneri.bitisAy} (son on iki tam ay). Kaydetmeden önce kontrol edin.`}</Ipucu>
                {yetki && <Btn small variant="ghost" onClick={() => setForm(f => ({ ...f, ...oneri }))}>Öneriyi kullan</Btn>}
              </div>
            )}
            {yetki && <div style={{ marginTop: 12 }}><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></div>}
          </>
        )}
      </KartBolum>
      <KartBolum varyant="kart" title="Gider türlerinin maliyet rolü" style={{ marginBottom: 16 }} testId="rol-tablosu">
        <Ipucu>
          "Ürün ağacından gelir": malzeme ve dış işçilik, parça maliyeti ve ek maliyet kalemleriyle zaten sayılır; genel gider havuzuna girmez (çift sayım yok).
          "Genel gidere girer": dönem toplamı makina başına paylaştırılır. Rolü belirtilmemiş tür maliyete girmez.
        </Ipucu>
        {rolsuz > 0 && <Ipucu><span data-testid="rolsuz-sayi">{`${rolsuz} türün rolü belirtilmedi.`}</span></Ipucu>}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
            {["Gider türü", "Davranış", "Dönemde tutar", "Maliyet rolü"].map(b => <th key={b} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, textAlign: "left", color: "var(--n600, #475569)" }}>{b}</th>)}
          </tr></thead>
          <tbody>
            {turler.map(t => {
              const rol = maliyetRoluOf(t);
              const davranisUyarisi = rolDavranisUyarisi(t, rol);
              return (
                <tr key={t.id} data-testid={`rol-satiri-${t.id}`} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>{t.ad}{t.deletedAt && <span data-testid="tur-copte" style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: "var(--n500, #64748b)" }}>(çöpte, kalemi dönemde)</span>}{davranisUyarisi && <div data-testid="rol-uyarisi" style={{ fontSize: 11, fontWeight: 400, color: "var(--warnTx, #854d0e)", whiteSpace: "normal" }}>{davranisUyarisi}</div>}</td>
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>{DAVRANIS_AD[t.davranis] || DAVRANIS_AD.normal}</td>
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>{kurusMetni(tutar.get(String(t.id)) ?? null)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 13 }}>
                    {yetki ? (
                      <Select aria-label={`${t.ad} maliyet rolü`} value={rolBelirtildiMi(t) ? t.maliyetRolu : ""} onChange={e => rolYaz(t, e.target.value)}>
                        <option value="">Seçilmedi (maliyete girmez)</option>
                        {MALIYET_ROLLERI.map(r => <option key={r} value={r}>{MALIYET_ROLU_ETIKET[r]}</option>)}
                      </Select>
                    ) : (rolBelirtildiMi(t) ? MALIYET_ROLU_ETIKET[rol] : "Seçilmedi (maliyete girmez)")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pay.havuz?.tursuzAdet > 0 && <Ipucu>{`Türü seçilmemiş ${pay.havuz.tursuzAdet} gider kalemi hiçbir havuza girmez.`}</Ipucu>}
      </KartBolum>
    </div>
  );
};
