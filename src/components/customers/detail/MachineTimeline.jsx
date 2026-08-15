import { useEffect, useRef } from "react";
import { SALE_TYPE_STYLE } from "../../../lib/constants";
import {
  fmtTR, fmtCur, parseMoney, calcKDV, normalizeSaleType, parcaAdi, parcaGruplari, isAltuntasServisi,
  disServisMi, islemFirmaGoster, partSaleDisFirmaMi, satisFirmaGoster, sureBicim, yedekParcaBedeli,
} from "../../../lib/utils";
import { servisSureleri } from "../../../lib/servisAnaliz";
import { yansitilanKomisyon } from "../../../lib/krediKarti";
import { Icon, Btn, AtesRozeti } from "../../ui";

const svUcretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
const svParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;

// Kredi kartı komisyonu müşteriye yansıtılmış satışta üçlü kırılım gösterimi:
// kayıtta saklanan tutar (matrah) = ürün(kalem) + komisyon; müşterinin ödediği = matrah + KDV (çekilen kart).
// Ürün fiyatını, komisyonu ve KDV'yi AYRI göster (yoksa matrah "ürün fiyatı" sanılıyordu). Yansıt yoksa null → çağıran normal gösterir.
const kkUcgenMetin = (matrah, komisyon, kdv, currency, bedelLabel = "Ürün") => {
  if (!(komisyon > 0)) return null;
  const kalem = matrah - komisyon;
  return `${bedelLabel}: ${fmtCur(kalem, currency)} · Komisyon: ${fmtCur(komisyon, currency)}${kdv > 0 ? ` · KDV: ${fmtCur(kdv, currency)}` : ""} · Çekilen kart: ${fmtCur(matrah + kdv, currency)}`;
};

// Tutarlı ödeme-yöntemi pili (başlığın hemen yanında, kapora ile aynı yer) ve "Yazdır" buton stili (servisteki gibi).
const PIL = { fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: "var(--n150, #f1f5f9)", color: "var(--n600, #475569)", border: "1px solid var(--n200, #e2e8f0)" };
const YAZDIR_BTN = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" };
const SIL_BTN = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--red600, #dc2626)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" };

export const MachineTimeline = ({
  detailView,
  odakServisId = null, // genel aramadan gelen: bu servis kaydını vurgula + görünür alana kaydır
  odakKalipId = null,  // genel aramadan gelen: bu Extra Kalıp satışını (psList içinde) vurgula + kaydır
  odakTaksitId = null, // anasayfa Beklenen Tahsilat: bu taksit (ödeme planı) olayını vurgula + kaydır
  odakOdemeId = null,  // anasayfa Borçlu Firmalar: bu ödeme (kapora/çek/kredi kartı) olayını vurgula + kaydır
  odakNonce = 0,       // her navigasyonda artar → aynı kayda tekrar tıklamada da kaydırma/flaş yeniden tetiklenir
  detailTimelineEvents,
  factoryName,
  kdvRates,
  calismaSaatleri = undefined,
  canDo,
  onEditService,
  onPrintOrPick,
  onDeleteService,
  onEditPartSale,
  onDeletePartSale,
  onPrintKalipEtiket = null,
  onEditYedekParca = null,
  onDeleteYedekParca = null,
  onToggleYedekParcaOdendi = null,
  onToggleYedekParcaCekTahsil = null, // yedek parça çeki tahsil edildi/beklemede toggle
  onTogglePartSaleCekTahsil = null,   // Extra Kalıp çeki tahsil edildi/beklemede toggle
  onGoYedekParca = null, // bayiden tahsis edilen (salt-okunur) satıra tıklayınca Stok'taki satışa git
  onPrintYedekParcaEtiket = null, // müşterinin kendi yedek parça satışı için kargo etiketi yazdır
  onEditPayment,
  onToggleCekTahsil,
  onDeletePayment,
  onToggleServisOdendi,
  onTogglePartSaleOdendi,
  onTahsilTaksit = null,
  dosyaAdet = null,
  onDosyaBadge = null,
}) => {
  // Odaklı satıra kaydır (genel aramadan "servis" veya "Extra Kalıp" sonucuna tıklanınca)
  const odakRef = useRef(null);
  useEffect(() => {
    if (odakServisId == null && odakKalipId == null && odakTaksitId == null && odakOdemeId == null) return;
    // Uzun geçmişte olay çok aşağıda olabilir → görünür alana kaydır (kalıcı vurgu; yanıp sönme yok, Son Satışlar gibi).
    // odakNonce sayesinde aynı kayda tekrar tıklanınca da (odak değeri değişmese bile) yeniden kaydırır.
    const t = setTimeout(() => odakRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" }), 120);
    return () => clearTimeout(t);
  }, [odakServisId, odakKalipId, odakTaksitId, odakOdemeId, odakNonce, detailTimelineEvents]);
  return (
  <div style={{ background: "var(--n100, #f8fafc)", borderRadius: 12, padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, color: "var(--n900, #0f172a)", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <Icon name="service" size={15} /> Makina Geçmişi
        <span style={{ fontSize: 11, background: "var(--surface, #ffffff)", color: "var(--n500, #64748b)", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>{detailTimelineEvents.length} olay</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canDo("cust_detail_print") && <Btn small variant="ghost" onClick={() => onPrintOrPick("makina")}><Icon name="print" size={12} /> Yazdır</Btn>}
        {canDo("cust_detail_mail") && <Btn small variant="ghost" onClick={() => onPrintOrPick("mail_makina")}><Icon name="mail" size={12} /> E-posta Gönder</Btn>}
      </div>
    </div>
    {detailTimelineEvents.length === 0 ? (
      <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13, padding: "8px 0" }}>Bu makinaya ait kayıt bulunmuyor.</div>
    ) : (
      detailTimelineEvents.map((ev, i) => {
        const last = i === detailTimelineEvents.length - 1;
        const sv = ev.sv;
        const ps = ev.ps;
        const psList = ev.psList;
        const payment = ev.payment;
        // Id karşılaştırması tip-güvenli (ödeme/taksit id'leri number iken odak state'e string dönebilir).
        const esit = (a, b) => a != null && b != null && String(a) === String(b);
        const odakServisEsles = ev.kind === "service" && esit(sv?.id, odakServisId);
        const odakKalipEsles = ev.kind === "part" && Array.isArray(psList) && odakKalipId != null && psList.some(x => esit(x?.id, odakKalipId));
        const odakTaksitEsles = ev.kind === "taksit" && esit(ev.taksit?.id, odakTaksitId);
        const odakOdemeEsles = ev.kind === "payment" && esit(payment?.id, odakOdemeId);
        const odakli = odakServisEsles || odakKalipEsles || odakTaksitEsles || odakOdemeEsles;
        return (
          <div key={i} ref={odakli ? odakRef : null} data-odak-servis={odakServisEsles ? "1" : undefined} data-odak-kalip={odakKalipEsles ? "1" : undefined} data-odak-taksit={odakTaksitEsles ? "1" : undefined} data-odak-odeme={odakOdemeEsles ? "1" : undefined}
            style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 0 : 18, ...(odakli ? { background: "var(--ambBg3, #fff7ed)", boxShadow: "0 0 0 2px var(--ambBr3, #fed7aa)", borderRadius: 10 } : null) }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 3, border: "3px solid #fff", boxShadow: `0 0 0 2px ${ev.color}33` }} />
              {!last && <div style={{ width: 2, flex: 1, background: "var(--n200, #e2e8f0)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", fontWeight: 600 }}>{ev.date ? fmtTR(ev.date) : "tarih yok"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 1 }}>
                {ev.kind === "service" && sv ? (
                  <>
                    <span onClick={canDo("cust_service_edit") ? () => onEditService(sv) : undefined} title={canDo("cust_service_edit") ? "Düzenlemek için tıklayın" : undefined}
                      style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: canDo("cust_service_edit") ? "pointer" : "default", textDecoration: canDo("cust_service_edit") ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}</span>
                    {sv.odendi && sv.yontem && <span style={PIL}>{sv.yontem}</span>}
                    {dosyaAdet && <AtesRozeti n={dosyaAdet("servis", sv.id)} onClick={() => onDosyaBadge("servis", sv.id)} />}
                    {canDo("cust_detail_print") && (
                      <button onClick={() => onPrintOrPick("servis", sv)} title="Servis Formu Yazdır"
                        style={YAZDIR_BTN}>
                        <Icon name="print" size={11} /> Yazdır
                      </button>
                    )}
                    {canDo("cust_detail_mail") && (
                      <button onClick={() => onPrintOrPick("mail_servis", sv)} title="Servis Formu E-posta Gönder"
                        style={YAZDIR_BTN}>
                        <Icon name="mail" size={11} /> E-posta
                      </button>
                    )}
                    {canDo("cust_service_delete") && (
                      <button onClick={() => onDeleteService(sv.id)} title="Servis kaydını sil"
                        style={SIL_BTN}>
                        <Icon name="trash" size={11} /> Sil
                      </button>
                    )}
                  </>
                ) : ev.kind === "part" && psList ? (
                  psList.length === 1 ? (
                    <>
                      <span onClick={canDo("cust_kalip_edit") ? () => onEditPartSale(psList[0]) : undefined} title={canDo("cust_kalip_edit") ? "Düzenlemek için tıklayın" : undefined}
                        style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: canDo("cust_kalip_edit") ? "pointer" : "default", textDecoration: canDo("cust_kalip_edit") ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}</span>
                      {psList[0].odendi && psList[0].yontem && !psList[0].ucretsizMi && <span style={PIL}>{psList[0].yontem}</span>}
                      {dosyaAdet && <AtesRozeti n={dosyaAdet("kalip", psList[0].id)} onClick={() => onDosyaBadge("kalip", psList[0].id)} />}
                      {onPrintKalipEtiket && <button onClick={() => onPrintKalipEtiket(psList)} title="Kargo Etiketi Yazdır" style={YAZDIR_BTN}><Icon name="print" size={11} /> Etiket</button>}
                      {canDo("cust_kalip_delete") && (
                        <button onClick={() => onDeletePartSale(psList[0].id)} title="Extra Kalıp kaydını sil"
                          style={SIL_BTN}>
                          <Icon name="trash" size={11} /> Sil
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>
                        {ev.title} <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)", fontWeight: 600 }}>({psList.length} kalıp)</span>
                      </span>
                      {psList[0].odendi && psList[0].yontem && !psList[0].ucretsizMi && <span style={PIL}>{psList[0].yontem}</span>}
                      {onPrintKalipEtiket && <button onClick={() => onPrintKalipEtiket(psList)} title="Kargo Etiketi Yazdır" style={YAZDIR_BTN}><Icon name="print" size={11} /> Etiket</button>}
                    </>
                  )
                ) : ev.kind === "part" && ev.yp ? (() => {
                  // Toplu satış (birden çok kalem) tek olay → başlığa tıklayınca TÜM grup çoklu-satır
                  // formunda düzenlenir; Sil TÜM grubu kaldırır.
                  const tekli = !ev.ypGrup || ev.ypGrup.length === 1;
                  const duzenlenebilir = canDo("cust_yedek_parca_edit") && onEditYedekParca;
                  return (
                  <>
                    <span onClick={duzenlenebilir ? () => onEditYedekParca(ev.yp) : undefined} title={duzenlenebilir ? "Düzenlemek için tıklayın" : undefined}
                      style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: duzenlenebilir ? "pointer" : "default", textDecoration: duzenlenebilir ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}{!tekli ? ` (${ev.ypGrup.length} kalem)` : ""}</span>
                    {ev.yp.odendi && ev.yp.yontem && <span style={PIL}>{ev.yp.yontem}</span>}
                    {onPrintYedekParcaEtiket && <button onClick={() => onPrintYedekParcaEtiket(ev.ypGrup && ev.ypGrup.length ? ev.ypGrup : [ev.yp])} title="Kargo Etiketi Yazdır" style={YAZDIR_BTN}><Icon name="print" size={11} /> Etiket</button>}
                    {canDo("cust_yedek_parca_delete") && onDeleteYedekParca && (
                      <button onClick={() => onDeleteYedekParca(ev.yp)} title={tekli ? "Yedek parça (kargo) satışını sil" : "Toplu satışın tümünü sil"}
                        style={SIL_BTN}>
                        <Icon name="trash" size={11} /> Sil
                      </button>
                    )}
                  </>
                  );
                })() : ev.kind === "part" && ev.ypTahsisId ? (
                  // Bayi/dış firma alımından bu makinaya TAHSİS edilen parça (salt-okunur). Tıklayınca
                  // Stok > Yedek Parça Satışı'nda o satışa gidilir (burada düzenlenmez; borçlusu bayi).
                  <span onClick={onGoYedekParca ? () => onGoYedekParca(ev.ypTahsisId) : undefined}
                    title={onGoYedekParca ? "Yedek parça satışına git" : undefined}
                    style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: onGoYedekParca ? "pointer" : "default", textDecoration: onGoYedekParca ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}</span>
                ) : ev.kind === "payment" && payment ? (
                  <>
                    <span onClick={canDo("cust_payment_edit") ? () => onEditPayment(payment) : undefined} title={canDo("cust_payment_edit") ? "Düzenlemek için tıklayın" : undefined}
                      style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: canDo("cust_payment_edit") ? "pointer" : "default", textDecoration: canDo("cust_payment_edit") ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}</span>
                    {payment.yontem && <span style={PIL}>{payment.yontem}</span>}
                    {dosyaAdet && <AtesRozeti n={dosyaAdet("odeme", payment.id)} onClick={() => onDosyaBadge("odeme", payment.id)} />}
                    {payment.yontem === "Çek" && canDo("cust_payment_edit") && (
                      <button onClick={() => onToggleCekTahsil(payment)}
                        style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: payment.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)", background: payment.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", color: payment.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
                        {payment.tahsilEdildi ? "Tahsil Edildi" : "Beklemede · işaretle: Tahsil Edildi"}
                      </button>
                    )}
                    {canDo("cust_payment_edit") && (
                      <button onClick={() => onDeletePayment(payment.id)} title="Ödemeyi sil"
                        style={SIL_BTN}>
                        <Icon name="trash" size={11} /> Sil
                      </button>
                    )}
                  </>
                ) : ev.kind === "taksit" && ev.taksit ? (
                  <>
                    <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>{ev.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", border: "1px solid", borderColor: ev.taksitGecikti ? "var(--redBr, #fecaca)" : "var(--ambBr, #fde68a)", background: ev.taksitGecikti ? "var(--redBg, #fef2f2)" : "var(--ambBg, #fffbeb)", color: ev.taksitGecikti ? "var(--red700, #b91c1c)" : "var(--amb800, #92400e)" }}>
                      {ev.taksitGecikti ? "⚠ Gecikti" : "Bekliyor"}
                    </span>
                    {onTahsilTaksit && canDo("cust_taksit_tahsil") && (
                      <button onClick={() => onTahsilTaksit(ev.taksit)} title="Taksiti tahsil et (ödeme kaydı oluşturur)"
                        style={{ fontSize: 11, fontWeight: 700, color: "var(--grn700, #15803d)", background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>
                        Tahsil Et
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>{ev.title}</span>
                    {ev.kind === "part" && ev.ps && dosyaAdet && <AtesRozeti n={dosyaAdet("parca", ev.ps.id)} onClick={() => onDosyaBadge("parca", ev.ps.id)} />}
                  </>
                )}
                {ev.tip && <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: (SALE_TYPE_STYLE[ev.tip] || {}).bg || "var(--n150, #f1f5f9)", color: (SALE_TYPE_STYLE[ev.tip] || {}).fg || "var(--n600, #475569)" }}>{ev.tip}</span>}
                {sv?.durum && (() => { const st = { "Bekliyor": ["var(--ambBg2, #fef3c7)", "var(--amb800, #92400e)"], "Yapılıyor": ["var(--bluBg2, #dbeafe)", "var(--blu700, #1d4ed8)"], "Tamamlandı": ["var(--grnBg2, #dcfce7)", "var(--grn700, #15803d)"] }[sv.durum] || ["var(--n150, #f1f5f9)", "var(--n600, #475569)"]; return <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: st[0], color: st[1] }}>{sv.durum}</span>; })()}
                {sv?.bitisZamani && (() => { const s = servisSureleri(sv, null, calismaSaatleri); return s.isclikDk != null ? <span title="Bakım-onarım işçilik süresi" style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: "var(--n150, #f1f5f9)", color: "var(--n600, #475569)" }}>⏱ {sureBicim(s.isclikDk)}</span> : null; })()}
                {sv && disServisMi(sv) && (
                  <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: "var(--redBg2, #fee2e2)", color: "var(--red700, #b91c1c)" }}>
                    Dış Servis (Anlaşmasız): {islemFirmaGoster(sv)}
                  </span>
                )}
                {sv?.islemFirma && !disServisMi(sv) && !isAltuntasServisi(sv, factoryName) && (
                  <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: "var(--ambBg2, #fef3c7)", color: "var(--amb800, #92400e)" }}>
                    Anlaşmalı Servis: {sv.islemFirma}
                  </span>
                )}
                {sv?.tech && <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>· {sv.tech}</span>}
                {sv?.repairPlace && <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>· {sv.repairPlace}</span>}
              </div>
              {sv && disServisMi(sv) && (sv.islemFirmaYetkili || sv.islemFirmaTel || sv.islemFirmaAdres || sv.islemFirmaUlke || sv.islemFirmaSehir) && (
                <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginTop: 3 }}>
                  {[sv.islemFirmaYetkili, sv.islemFirmaTel, [sv.islemFirmaAdres, [sv.islemFirmaSehir, sv.islemFirmaUlke].filter(Boolean).join(", ")].filter(Boolean).join(" · ")].filter(Boolean).join(" · ")}
                </div>
              )}
              {ev.desc && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
              {ev.yp && (() => {
                // Toplu satış → grubun toplam bedeli + KDV (tek satır); tek satışta grup = [yp].
                const grup = ev.ypGrup && ev.ypGrup.length ? ev.ypGrup : [ev.yp];
                const bedel = grup.reduce((t, s) => t + yedekParcaBedeli(s), 0);
                const kom = grup.reduce((t, s) => t + yansitilanKomisyon(s), 0);
                const kdv = grup.reduce((t, s) => t + calcKDV(s.faturaTipi, yedekParcaBedeli(s), s.tarih, kdvRates), 0);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>
                      {kkUcgenMetin(bedel, kom, kdv, ev.yp.currency, "Yedek parça")
                        || <>Yedek Parça Ücreti: {fmtCur(bedel, ev.yp.currency)}{kdv > 0 && <> · KDV dahil: {fmtCur(bedel + kdv, ev.yp.currency)}</>}</>}
                    </span>
                    {canDo("cust_yedek_parca_payment") && onToggleYedekParcaOdendi && (
                      <button onClick={() => onToggleYedekParcaOdendi(ev.yp)}
                        style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: ev.yp.odendi === false ? "var(--redBr, #fecaca)" : "var(--grnBr, #bbf7d0)", background: ev.yp.odendi === false ? "var(--redBg, #fef2f2)" : "var(--grnBg, #f0fdf4)", color: ev.yp.odendi === false ? "var(--red600, #dc2626)" : "var(--grn700, #15803d)" }}>
                        {ev.yp.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                      </button>
                    )}
                    {ev.yp.odendi && ev.yp.yontem === "Çek" && canDo("cust_yedek_parca_payment") && onToggleYedekParcaCekTahsil && (
                      <button onClick={() => onToggleYedekParcaCekTahsil(ev.yp)}
                        style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: ev.yp.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)", background: ev.yp.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", color: ev.yp.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
                        {ev.yp.tahsilEdildi ? "Çek tahsil edildi" : "Çek beklemede · işaretle: tahsil edildi"}
                      </button>
                    )}
                  </div>
                );
              })()}
              {psList && (
                <div style={{ marginTop: 4 }}>
                  {psList[0]?.satisFirma && psList[0].satisFirma !== factoryName && (
                    <div style={{ fontSize: 11, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: partSaleDisFirmaMi(psList[0]) ? "var(--red700, #b91c1c)" : "var(--n600, #475569)" }}>
                        Satış yapan: {satisFirmaGoster(psList[0])}{partSaleDisFirmaMi(psList[0]) ? " (anlaşmasız)" : ""}
                      </span>
                      {partSaleDisFirmaMi(psList[0]) && (psList[0].satisFirmaYetkili || psList[0].satisFirmaTel || psList[0].satisFirmaUlke || psList[0].satisFirmaSehir) && (
                        <span style={{ color: "var(--n500, #64748b)" }}>
                          {" · "}{[psList[0].satisFirmaYetkili, psList[0].satisFirmaTel, [psList[0].satisFirmaSehir, psList[0].satisFirmaUlke].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  )}
                  {psList.map(p => {
                    const kdv = p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, p.tarih, kdvRates);
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: psList.length > 1 ? 3 : 5, flexWrap: "wrap" }}>
                        {psList.length > 1 && (
                          <>
                            <span onClick={canDo("cust_kalip_edit") ? () => onEditPartSale(p) : undefined} title={canDo("cust_kalip_edit") ? "Düzenlemek için tıklayın" : undefined}
                              style={{ fontSize: 13, fontWeight: 600, color: "var(--orTx, #c2410c)", cursor: canDo("cust_kalip_edit") ? "pointer" : "default", textDecoration: canDo("cust_kalip_edit") ? "underline" : "none", textDecorationColor: "var(--ambBr3, #fed7aa)" }}>
                              {p.ad}{p.olcu ? ` (${p.olcu})` : ""}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>· {p.tarih ? fmtTR(p.tarih) : "tarih yok"}</span>
                            {dosyaAdet && <AtesRozeti n={dosyaAdet("kalip", p.id)} onClick={() => onDosyaBadge("kalip", p.id)} />}
                          </>
                        )}
                        <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>
                          {psList.length === 1 ? `${p.ad}${p.olcu ? " (" + p.olcu + ")" : ""} · ` : ""}
                          {p.ucretsizMi ? "garanti kapsamında (ücretsiz)"
                            : (kkUcgenMetin(parseMoney(p.ucret), yansitilanKomisyon(p), kdv, p.currency)
                              || (fmtCur(p.ucret, p.currency) + (kdv > 0 ? ` · KDV dahil: ${fmtCur(p.ucret + kdv, p.currency)}` : "")))}
                        </span>
                        {canDo("cust_kalip_payment") && (
                          <button onClick={() => onTogglePartSaleOdendi(p)}
                            style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: p.odendi === false ? "var(--redBr, #fecaca)" : "var(--grnBr, #bbf7d0)", background: p.odendi === false ? "var(--redBg, #fef2f2)" : "var(--grnBg, #f0fdf4)", color: p.odendi === false ? "var(--red600, #dc2626)" : "var(--grn700, #15803d)" }}>
                            {p.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                          </button>
                        )}
                        {p.odendi && p.yontem === "Çek" && !p.ucretsizMi && canDo("cust_kalip_payment") && onTogglePartSaleCekTahsil && (
                          <button onClick={() => onTogglePartSaleCekTahsil(p)}
                            style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: p.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)", background: p.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", color: p.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
                            {p.tahsilEdildi ? "Çek tahsil edildi" : "Çek beklemede · işaretle: tahsil edildi"}
                          </button>
                        )}
                        {psList.length > 1 && canDo("cust_kalip_delete") && (
                          <button onClick={() => onDeletePartSale(p.id)} title="Bu kalıp kaydını sil" style={SIL_BTN}>
                            <Icon name="trash" size={11} /> Sil
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {psList.length > 1 && (() => {
                    const toplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : parseMoney(p.ucret)), 0);
                    const komToplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : yansitilanKomisyon(p)), 0);
                    const kdvToplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, p.tarih, kdvRates)), 0);
                    return (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--blu700, #1d4ed8)", marginTop: 5 }}>
                        {kkUcgenMetin(toplam, komToplam, kdvToplam, psList[0].currency, "Ürün toplam")
                          || `Toplam: ${fmtCur(toplam, psList[0].currency)}${kdvToplam > 0 ? ` · KDV dahil: ${fmtCur(toplam + kdvToplam, psList[0].currency)}` : ""}`}
                      </div>
                    );
                  })()}
                </div>
              )}
              {sv?.yapilanIsler && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .3 }}>Yapılan İşler / Parça Değişimleri</div>
                  <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.yapilanIsler}</div>
                </div>
              )}
              {sv?.degisenParcalar?.length > 0 && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .3 }}>Değişen Parçalar</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                    {parcaGruplari(sv.degisenParcalar).map(({ p, adet }, i) => {
                      const ad = parcaAdi(p);
                      const birim = typeof p === "object" ? parseMoney(p.fiyat) : 0;
                      const satirTutar = birim * (adet || 1); // birim × adet = satır toplamı
                      const isDisTedarik = typeof p === "object" && !!p.disTedarik;
                      return (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, color: isDisTedarik ? "var(--brand, #e85d1a)" : "var(--blu700, #1d4ed8)", background: isDisTedarik ? "var(--ambBg3, #fff7ed)" : "var(--bluBg, #eff6ff)", border: `1px solid ${isDisTedarik ? "var(--ambBr3, #fed7aa)" : "var(--bluBr, #bfdbfe)"}`, borderRadius: 12, padding: "2px 9px" }}>
                          {ad}{adet > 1 ? ` x${adet}` : ""}{isDisTedarik ? " · Dış Tedarik" : ""}{satirTutar > 0 ? ` · ${fmtCur(satirTutar, sv.parcaCurrency)}` : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {sv?.musteriTalimati && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .3 }}>Müşteri Talimatı</div>
                  <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.musteriTalimati}</div>
                </div>
              )}
              {sv?.fabrikaNotu && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .3 }}>Fabrika Notu</div>
                  <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.fabrikaNotu}</div>
                </div>
              )}
              {sv && (svUcretliMi(sv) || svParcaUcretliMi(sv)) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                  {(() => {
                    const servisVar = svUcretliMi(sv);
                    const parcaVar = svParcaUcretliMi(sv);
                    const sameCurrency = !servisVar || !parcaVar || sv.currency === (sv.parcaCurrency || sv.currency);
                    if (sameCurrency) {
                      const toplam = (servisVar ? parseMoney(sv.servisUcreti) : 0) + (parcaVar ? parseMoney(sv.parcaUcreti) : 0);
                      const kdv = calcKDV(sv.faturaTipi, toplam, sv.date, kdvRates);
                      const label = servisVar && parcaVar ? "Servis ve Yedek Parça Ücreti" : servisVar ? "Servis Ücreti" : "Yedek Parça Ücreti";
                      const ucgen = kkUcgenMetin(toplam, yansitilanKomisyon(sv), kdv, sv.currency, label);
                      return (
                        <span style={{ fontSize: 12, color: "var(--red600, #dc2626)", fontWeight: 700 }}>
                          {ucgen || <>{label}: {fmtCur(toplam, sv.currency)}{kdv > 0 && <> · KDV dahil: {fmtCur(toplam + kdv, sv.currency)}</>}</>}
                        </span>
                      );
                    }
                    return (
                      <>
                        {servisVar && <span style={{ fontSize: 12, color: "var(--red600, #dc2626)", fontWeight: 700 }}>Servis Ücreti: {fmtCur(sv.servisUcreti, sv.currency)}</span>}
                        {parcaVar && <span style={{ fontSize: 12, color: "var(--red600, #dc2626)", fontWeight: 700 }}>Parça Ücreti: {fmtCur(sv.parcaUcreti, sv.parcaCurrency)}</span>}
                      </>
                    );
                  })()}
                  {canDo("cust_service_payment") && (
                    <button onClick={() => onToggleServisOdendi(sv)}
                      style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: sv.odendi === false ? "var(--redBr, #fecaca)" : "var(--grnBr, #bbf7d0)", background: sv.odendi === false ? "var(--redBg, #fef2f2)" : "var(--grnBg, #f0fdf4)", color: sv.odendi === false ? "var(--red600, #dc2626)" : "var(--grn700, #15803d)" }}>
                      {sv.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
  );
};
