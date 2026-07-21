import { SALE_TYPE_STYLE } from "../../../lib/constants";
import {
  fmtTR, fmtCur, parseMoney, calcKDV, normalizeSaleType, parcaAdi, isAltuntasServisi,
  disServisMi, islemFirmaGoster, partSaleDisFirmaMi, satisFirmaGoster, sureBicim,
} from "../../../lib/utils";
import { servisSureleri } from "../../../lib/servisAnaliz";
import { Icon, Btn, AtesRozeti } from "../../ui";

const svUcretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
const svParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;

export const MachineTimeline = ({
  detailView,
  detailTimelineEvents,
  factoryName,
  kdvRates,
  canDo,
  onEditService,
  onPrintOrPick,
  onDeleteService,
  onEditPartSale,
  onDeletePartSale,
  onEditPayment,
  onToggleCekTahsil,
  onDeletePayment,
  onToggleServisOdendi,
  onTogglePartSaleOdendi,
  onTahsilTaksit = null,
  dosyaAdet = null,
  onDosyaBadge = null,
}) => (
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
        return (
          <div key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 0 : 18 }}>
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
                    {dosyaAdet && <AtesRozeti n={dosyaAdet("servis", sv.id)} onClick={() => onDosyaBadge("servis", sv.id)} />}
                    {canDo("cust_detail_print") && (
                      <button onClick={() => onPrintOrPick("servis", sv)} title="Servis Formu Yazdır"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                        <Icon name="print" size={11} /> Yazdır
                      </button>
                    )}
                    {canDo("cust_detail_mail") && (
                      <button onClick={() => onPrintOrPick("mail_servis", sv)} title="Servis Formu E-posta Gönder"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                        <Icon name="mail" size={11} /> E-posta
                      </button>
                    )}
                    {canDo("cust_service_delete") && (
                      <button onClick={() => onDeleteService(sv.id)} title="Servis kaydını sil"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--red600, #dc2626)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                        <Icon name="trash" size={11} /> Sil
                      </button>
                    )}
                  </>
                ) : ev.kind === "part" && psList ? (
                  psList.length === 1 ? (
                    <>
                      <span onClick={canDo("cust_kalip_edit") ? () => onEditPartSale(psList[0]) : undefined} title={canDo("cust_kalip_edit") ? "Düzenlemek için tıklayın" : undefined}
                        style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: canDo("cust_kalip_edit") ? "pointer" : "default", textDecoration: canDo("cust_kalip_edit") ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}</span>
                      {dosyaAdet && <AtesRozeti n={dosyaAdet("kalip", psList[0].id)} onClick={() => onDosyaBadge("kalip", psList[0].id)} />}
                      {canDo("cust_kalip_delete") && (
                        <button onClick={() => onDeletePartSale(psList[0].id)} title="Extra Kalıp kaydını sil"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--red600, #dc2626)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                          <Icon name="trash" size={11} /> Sil
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>
                      {ev.title} <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)", fontWeight: 600 }}>({psList.length} kalıp)</span>
                    </span>
                  )
                ) : ev.kind === "payment" && payment ? (
                  <>
                    <span onClick={canDo("cust_payment_edit") ? () => onEditPayment(payment) : undefined} title={canDo("cust_payment_edit") ? "Düzenlemek için tıklayın" : undefined}
                      style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: canDo("cust_payment_edit") ? "pointer" : "default", textDecoration: canDo("cust_payment_edit") ? "underline" : "none", textDecorationColor: "var(--n200, #e2e8f0)" }}>{ev.title}</span>
                    {dosyaAdet && <AtesRozeti n={dosyaAdet("odeme", payment.id)} onClick={() => onDosyaBadge("odeme", payment.id)} />}
                    {payment.yontem === "Çek" && canDo("cust_payment_edit") && (
                      <button onClick={() => onToggleCekTahsil(payment)}
                        style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: payment.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)", background: payment.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", color: payment.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
                        {payment.tahsilEdildi ? "Tahsil Edildi" : "Beklemede · işaretle: Tahsil Edildi"}
                      </button>
                    )}
                    {canDo("cust_payment_edit") && (
                      <button onClick={() => onDeletePayment(payment.id)} title="Ödemeyi sil"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--red600, #dc2626)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
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
                {sv?.bitisZamani && (() => { const s = servisSureleri(sv); return s.isclikDk != null ? <span title="Bakım-onarım işçilik süresi" style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: "var(--n150, #f1f5f9)", color: "var(--n600, #475569)" }}>⏱ {sureBicim(s.isclikDk)}</span> : null; })()}
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
              {sv && disServisMi(sv) && (sv.islemFirmaYetkili || sv.islemFirmaTel || sv.islemFirmaUlke || sv.islemFirmaSehir) && (
                <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginTop: 3 }}>
                  {[sv.islemFirmaYetkili, sv.islemFirmaTel, [sv.islemFirmaSehir, sv.islemFirmaUlke].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                </div>
              )}
              {ev.desc && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
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
                          {p.ucretsizMi ? "garanti kapsamında (ücretsiz)" : fmtCur(p.ucret, p.currency) + (kdv > 0 ? ` · KDV dahil: ${fmtCur(p.ucret + kdv, p.currency)}` : "")}
                        </span>
                        {canDo("cust_kalip_payment") && (
                          <button onClick={() => onTogglePartSaleOdendi(p)}
                            style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: p.odendi === false ? "var(--redBr, #fecaca)" : "var(--grnBr, #bbf7d0)", background: p.odendi === false ? "var(--redBg, #fef2f2)" : "var(--grnBg, #f0fdf4)", color: p.odendi === false ? "var(--red600, #dc2626)" : "var(--grn700, #15803d)" }}>
                            {p.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                          </button>
                        )}
                        {psList.length > 1 && canDo("cust_kalip_delete") && (
                          <button onClick={() => onDeletePartSale(p.id)} title="Bu kalıp kaydını sil"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--red600, #dc2626)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}>
                            <Icon name="trash" size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {psList.length > 1 && (() => {
                    const toplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : parseMoney(p.ucret)), 0);
                    const kdvToplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, p.tarih, kdvRates)), 0);
                    return (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--blu700, #1d4ed8)", marginTop: 5 }}>
                        Toplam: {fmtCur(toplam, psList[0].currency)}{kdvToplam > 0 ? ` · KDV dahil: ${fmtCur(toplam + kdvToplam, psList[0].currency)}` : ""}
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
                    {sv.degisenParcalar.map((p, i) => {
                      const ad = parcaAdi(p);
                      const fiyat = typeof p === "object" ? parseMoney(p.fiyat) : 0;
                      const isDisTedarik = typeof p === "object" && !!p.disTedarik;
                      return (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, color: isDisTedarik ? "#ea580c" : "var(--blu700, #1d4ed8)", background: isDisTedarik ? "var(--ambBg3, #fff7ed)" : "var(--bluBg, #eff6ff)", border: `1px solid ${isDisTedarik ? "var(--ambBr3, #fed7aa)" : "var(--bluBr, #bfdbfe)"}`, borderRadius: 12, padding: "2px 9px" }}>
                          {ad}{isDisTedarik ? " · Dış Tedarik" : ""}{fiyat > 0 ? ` · ${fmtCur(fiyat, sv.parcaCurrency)}` : ""}
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
                      return (
                        <span style={{ fontSize: 12, color: "var(--red600, #dc2626)", fontWeight: 700 }}>
                          {label}: {fmtCur(toplam, sv.currency)}
                          {kdv > 0 && <> · KDV dahil: {fmtCur(toplam + kdv, sv.currency)}</>}
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
