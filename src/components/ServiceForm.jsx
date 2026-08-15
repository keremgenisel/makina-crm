import { useState } from "react";
import { CUR_SYM, SERVICE_TYPES, REPAIR_PLACES, SALE_TYPES, DEFAULT_KDV_RATES, ODEME_YONTEMLERI } from "../lib/constants";
import { today, aramaNormalize, fmtCur, parseMoney, calcKDV, getKdvRateForDate, parcaAdi, partFiyatForCurrency, isAltuntasServisi, addMonthsToDateStr, fmtZamanTam, servisParcaSatirTutari } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, MoneyInput, Btn, Modal, SearchPick, CountryCityFields } from "./ui";
import { KartTaksitAlani, KartYansitmaOzeti } from "./KartTaksitAlani";

// Servis ekleme/düzenleme formu — Services.jsx ve Customers.jsx (müşteri detayından
// "Yeni Servis Talebi") tarafından paylaşılır. Tek form olduğu için ikisi de
// senkron kalır; ayrı bir kopya tutmak Makina Geçmişi'nde çözdüğümüz çift-form
// sorununu burada da yaratırdı.
export const ServiceForm = ({ title, form, setForm, customers, parts = [], dealers = [], factory = null, onSave, onCancel, kdvRates = DEFAULT_KDV_RATES, krediKartiKomisyonlari = null, draftBar = null, dosyalar = [], dosyaEkleyebilir = false, dosyaCevrimdisi = false, showToast = () => {}, geoData = null, loadingGeo = false, calisanlar = [] }) => {
  // Teknisyen: firma çalışanları (Ayarlar) açılır listeden seçilir; listede olmayan harici usta için
  // "Diğer (elle yaz)" seçeneği serbest metin kutusu açar. Açılır liste, seçili olsa bile TÜM çalışanları
  // gösterir (datalist gibi önce silmek gerekmez).
  const teknisyenAdlari = (calisanlar || []).map(c => c.ad).filter(Boolean);
  const [techElle, setTechElle] = useState(false);
  const factoryName = factory?.name || "Altuntaş Makina";
  // "Servis Panosunda göster": durum'u yönetir (açık → "Bekliyor"/mevcut, kapalı → boş = panoda çıkmaz).
  // Akıllı varsayılan: yeni serviste tarih bugünse panoda, geçmiş tarihliyse panosuz. Kullanıcı
  // checkbox'a elle dokununca (panoElle) tarih değişse de dokunulmaz.
  const [panoElle, setPanoElle] = useState(false);
  const anlasmaliFirmalar = (dealers || []).filter(d => d.anlasmaliServisMi);
  // Panoya düşme zamanı ileride mi? (yeni serviste "planlanmış" servis = o zamana kadar panoda görünmez)
  const girisIleri = !!form.fabrikaGirisZamani && new Date(form.fabrikaGirisZamani).getTime() > Date.now();
  const [custSearch, setCustSearch] = useState("");
  // Seçili müşterinin yetkili/adres bilgisini gösteren aç/kapa paneli (salt-okunur).
  const [yetkiliAcik, setYetkiliAcik] = useState(false);
  // Bu serviste kaydedilince bağlanacak yeni dosya taslakları (fiziksel dosya diske/sunucuya
  // yüklenmiş; künye kaydetmede oluşturulur). Düzenlemede zaten bağlı olanlar ayrıca listelenir.
  const [dosyaTaslaklari, setDosyaTaslaklari] = useState([]);
  const [dosyaBusy, setDosyaBusy] = useState(false);
  const mevcutServisDosyalari = (dosyalar || []).filter(d => !d.deletedAt && d.refType === "servis" && d.refId === form.id);
  const fmtDosyaBoyut = (b) => { const n = Number(b) || 0; if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`; return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`; };
  const dosyaEkle = async () => {
    if (!window.appFiles?.add) { showToast("Dosya ekleme bu ortamda kullanılamıyor.", "err"); return; }
    setDosyaBusy(true);
    const res = await window.appFiles.add(selectedCust?.name).catch(() => null);
    setDosyaBusy(false);
    if (!res || res.canceled) return;
    if (res.eklenen?.length) setDosyaTaslaklari(p => [...p, ...res.eklenen]);
    if (res.hatalar?.length) showToast(res.hatalar.join(" · "), "err");
  };

  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  const warrantyAktif = !!(selectedCust?.warrantyEnd && selectedCust.warrantyEnd >= today());
  // "İlk Çalıştırma" yalnızca garanti hâlâ aktifken VE garanti başlangıcından (installDate) en fazla
  // 6 ay geçmişken anlamlı — garantisi bitmiş veya başlangıcından 6 aydan fazla geçmiş bir makinada
  // bu seçenek soluk/tıklanamaz gösterilir.
  const ilkCalistirmaGecersiz = !!(selectedCust?.installDate) && (!warrantyAktif || today() >= addMonthsToDateStr(selectedCust.installDate, 6));
  // İşlemi yapan firma anlaşmalı bir servisse, parçanın Altuntaş'tan mı yoksa dışarıdan mı
  // tedarik edildiği belirsiz olabilir — varsayılan "Altuntaş'tan alındı" (true). Dışarıdan
  // tedarik edilse de parça ücreti yine girilebilir (müşteriye ne kadar tahsil edildiği geçmişte
  // görünsün) — sadece bu tutar Altuntaş'ın gelir/borç hesaplarına hiç girmez (bkz. isParcaUcretliMi).
  const islemAnlasmali = !isAltuntasServisi(form, factoryName);
  const parcalar = form.degisenParcalar || [];
  // Anlaşmalı bayi servisinde parça bazında dış tedarik işaretlenebilir
  const hasDisTedarikParca = islemAnlasmali && parcalar.some(p => p.disTedarik);
  const hasAltuntasParca = parcalar.some(p => !p.disTedarik);
  // parcaUcretsizMi: dış tedarik parça varsa her zaman false (o parçaların fiyatı girilmeli)
  const parcaUcretsizMi = parcalar.length === 0 || (!hasDisTedarikParca && warrantyAktif && !form.parcaGarantiDisi);
  const parcaUcretiToplam = parcalar.reduce((s, p) => s + servisParcaSatirTutari(p), 0);
  const svUcretliTipi = form.type === "Garanti Dışı" || form.type === "Periyodik Bakım";
  const ucretliVarMi = (svUcretliTipi && parseMoney(form.servisUcreti) > 0) || (!parcaUcretsizMi && parcaUcretiToplam > 0);
  // Ödeme yöntemi / kredi kartı komisyonu için ortak billable toplam (servis + ücretli parça) ve KDV oranı.
  const svParcaVar = !parcaUcretsizMi && parcaUcretiToplam > 0;
  const svToplam = parseMoney(form.servisUcreti) + (svParcaVar ? parcaUcretiToplam : 0);
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        aramaNormalize(c.name).includes(aramaNormalize(custSearch)) ||
        aramaNormalize(c.contact).includes(aramaNormalize(custSearch)) ||
        aramaNormalize(c.serialNo).includes(aramaNormalize(custSearch))
      ).slice(0, 6)
    : [];

  return (
    <Modal wide title={title} onClose={onCancel}>
      {draftBar}
      <Field label="Müşteri">
        {selectedCust ? (
          <div style={{ border: "2px solid var(--brand, #e85d1a)", borderRadius: 8, background: "var(--ambBg3, #fff7ed)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--n900, #0f172a)" }}>{selectedCust.name}</div>
                <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>
                  {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button type="button" onClick={() => setYetkiliAcik(v => !v)}
                  title={yetkiliAcik ? "Yetkili & adresi gizle" : "Yetkili & adresi göster"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "var(--orTx, #c2410c)", background: "var(--surface, #fff)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <Icon name="customers" size={12} /> Yetkili & Adres {yetkiliAcik ? "▴" : "▾"}
                </button>
                <button type="button" onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); setYetkiliAcik(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)", display: "flex" }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            </div>
            {yetkiliAcik && (() => {
              const bilgi = (etiket, deger) => (
                <div style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                  <span style={{ minWidth: 96, color: "var(--n500, #64748b)", fontWeight: 600 }}>{etiket}</span>
                  <span style={{ flex: 1, color: "var(--n800, #1e293b)" }}>{deger || "—"}</span>
                </div>
              );
              // Yetkili: müşteri formundaki "Yetkili 1/2" alanları (eski kayıtlarda contact yedeği).
              const yetkili = (ad, tel) => [ad, tel].filter(Boolean).join(" · ");
              const yetkili1 = yetkili(selectedCust.yetkili1Ad || selectedCust.contact, selectedCust.yetkili1Tel);
              const yetkili2 = yetkili(selectedCust.yetkili2Ad, selectedCust.yetkili2Tel);
              const sehir = [selectedCust.city, selectedCust.ilce, selectedCust.country].filter(Boolean).join(" / ");
              return (
                <div style={{ display: "grid", gap: 6, padding: "10px 14px", borderTop: "1px dashed var(--ambBr3, #fed7aa)", background: "var(--surface, #fff)" }}>
                  {bilgi("Yetkili 1", yetkili1)}
                  {yetkili2 && bilgi("Yetkili 2", yetkili2)}
                  {bilgi("Şirket Tel.", selectedCust.phone)}
                  {bilgi("Adres", selectedCust.adres)}
                  {bilgi("Şehir / Ülke", sehir)}
                </div>
              );
            })()}
          </div>
        ) : (
          <div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
              <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                placeholder="Firma adı, kişi veya seri no ile ara..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 14, background: "var(--n100, #f8fafc)", boxSizing: "border-box", outline: "none" }} />
            </div>
            {custSearch.trim() && (
              <div style={{ marginTop: 6, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
                {matchedCustomers.map(c => (
                  <div key={c.id}
                    onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--n150, #f1f5f9)", background: "var(--surface, #ffffff)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--ambBg3, #fff7ed)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--surface, #ffffff)"}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>
                      {c.contact} {c.model ? `· ${c.model}` : ""} {c.serialNo ? `· ${c.serialNo}` : ""}
                    </div>
                  </div>
                ))}
                {matchedCustomers.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--n400, #94a3b8)" }}>Müşteri bulunamadı.</div>
                )}
              </div>
            )}
          </div>
        )}
        <Warn>{!form.customerId ? "Müşteri seçilmedi" : ""}</Warn>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <Field label="Tarih"><Input type="date" value={form.date || ""} onChange={e => {
          const t = e.target.value;
          setForm(p => {
            const g = { ...p, date: t };
            // Yeni serviste (id yok) ve checkbox'a elle dokunulmadıysa: bugün/ileri → panoda, geçmiş → panosuz.
            if (!p.id && !panoElle) g.durum = (t && t >= today()) ? "Bekliyor" : "";
            // İleri tarih + panoda gösterilecekse: düşme zamanını o tarihe çek (08:00 ön-doldur;
            // kullanıcı saati "Panoya Düşme Zamanı" alanından değiştirebilir).
            if (!p.id && t && t > today() && g.durum === "Bekliyor") {
              const mevcut = (p.fabrikaGirisZamani || "").slice(0, 10);
              if (!p.fabrikaGirisZamani || mevcut !== t) g.fabrikaGirisZamani = `${t}T08:00`;
            }
            // Bugüne/geçmişe çekilirse ileri-planlı damgayı temizle (kayıtta simdiYerel damgalanır).
            if (!p.id && t && t <= today() && (p.fabrikaGirisZamani || "").slice(0, 10) > today()) {
              g.fabrikaGirisZamani = "";
            }
            return g;
          });
        }} /></Field>
        <Field label="Teknisyen">
          {/* Açılır liste tüm çalışanları gösterir; seçili olsa bile başkasını seçmek için önce silmek
              gerekmez. Harici usta için "Diğer (elle yaz)" serbest metin kutusu açar. */}
          {(() => {
            const teknListede = teknisyenAdlari.includes(form.tech);
            const techDiger = techElle || (!!form.tech && !teknListede);
            return (<>
              <Select value={techDiger ? "__diger__" : (form.tech || "")}
                onChange={e => {
                  const v = e.target.value;
                  if (v === "__diger__") setTechElle(true);
                  else { setTechElle(false); setForm(p => ({ ...p, tech: v })); }
                }}>
                <option value="">Kim yapıyor?</option>
                {teknisyenAdlari.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__diger__">Diğer (elle yaz)…</option>
              </Select>
              {techDiger && (
                <Input value={form.tech || ""} placeholder="Harici teknisyen adı..." style={{ marginTop: 6 }}
                  onChange={e => setForm(p => ({ ...p, tech: e.target.value }))} />
              )}
            </>);
          })()}
        </Field>
        <Field label="Tür">
          <Select value={form.type || "Periyodik Bakım"} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {SERVICE_TYPES.map(t => (
              <option key={t} disabled={(t === "Garanti İçi" && !warrantyAktif) || (t === "İlk Çalıştırma" && ilkCalistirmaGecersiz)}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Yapılan İşlem">
          {/* Eski kayıt listede olmayan bir değer (ör. kaldırılan "Kargo") taşıyorsa onu da göster,
              böylece düzenlemede değer kaybolmaz / sessizce değişmez. */}
          <Select value={form.repairPlace || "Yerinde Onarım"} onChange={e => setForm(p => ({ ...p, repairPlace: e.target.value }))}>
            {[...REPAIR_PLACES, ...(form.repairPlace && !REPAIR_PLACES.includes(form.repairPlace) ? [form.repairPlace] : [])].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      {/* Servis Panosunda göster: kapalıysa yalnız müşteri geçmişine kaydedilir, panoya düşmez. */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: "0 0 12px" }}>
        <input type="checkbox" checked={!!form.durum}
          onChange={e => { setPanoElle(true); setForm(p => ({ ...p, durum: e.target.checked ? (p.durum || "Bekliyor") : "" })); }}
          style={{ width: 16, height: 16, accentColor: "var(--brand, #e85d1a)", cursor: "pointer" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n700, #334155)" }}>Servis Panosunda göster</span>
        <span style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)" }}>(kapalıysa yalnız müşteri geçmişine kaydedilir, panoya düşmez)</span>
      </label>

      {/* Yeni servis + Bekliyor: panoya düşme zamanı. İleri alınırsa o gün/saat gelene kadar panoda görünmez. */}
      {!form.id && form.durum === "Bekliyor" && (
        <div style={{ margin: "0 0 12px", padding: "10px 12px", background: girisIleri ? "var(--ambBg, #fffbeb)" : "var(--n100, #f8fafc)", border: `1px solid ${girisIleri ? "var(--ambBr, #fde68a)" : "var(--n200, #e2e8f0)"}`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n700, #334155)" }}>🕒 Panoya Düşme Zamanı</span>
            <div style={{ flex: "0 1 220px" }}>
              <Input type="datetime-local" value={(form.fabrikaGirisZamani || "").slice(0, 16)}
                onChange={e => setForm(p => ({ ...p, fabrikaGirisZamani: e.target.value }))} />
            </div>
            {form.fabrikaGirisZamani && (
              <button type="button" onClick={() => setForm(p => ({ ...p, fabrikaGirisZamani: "" }))}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", background: "none", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, cursor: "pointer", padding: "5px 10px" }}>
                Hemen (temizle)
              </button>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: girisIleri ? "var(--amb600, #d97706)" : "var(--n400, #94a3b8)", marginTop: 6 }}>
            {girisIleri
              ? `Bu servis ${fmtZamanTam(form.fabrikaGirisZamani)} tarihinde panoya düşecek (o zamana kadar panoda görünmez).`
              : "Boş bırakılırsa servis kaydedilince hemen panoya düşer. İleri bir tarih/saat seçerseniz o zaman geldiğinde düşer."}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="İşlemi Yapan Firma">
          <Select value={form.islemFirma || factoryName} onChange={e => {
            const v = e.target.value;
            // "Diğer"den başka bir değere geçilince dış firma alanlarını temizle (eski değer kalmasın)
            setForm(p => v === "Diğer" ? { ...p, islemFirma: v }
              : { ...p, islemFirma: v, islemFirmaAd: "", islemFirmaYetkili: "", islemFirmaTel: "", islemFirmaAdres: "", islemFirmaUlke: "", islemFirmaSehir: "" });
          }}>
            <option value={factoryName}>{factoryName}</option>
            {anlasmaliFirmalar.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            <option value="Diğer">Diğer (anlaşmasız firma)…</option>
          </Select>
        </Field>
        <Field label="Fatura Tipi">
          <Select value={form.faturaTipi || "Faturalı Yurtiçi"} onChange={e => setForm(p => ({ ...p, faturaTipi: e.target.value }))}>
            {SALE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      {/* İşlemi anlaşmalı olmadığımız, müşterinin bulduğu bir servis yaptıysa: firma bilgileri
          YALNIZ bu servise kaydedilir (müşteri/bayi kaydı oluşturulmaz). */}
      {form.islemFirma === "Diğer" && (
        <div style={{ display: "grid", gap: 12, padding: 12, marginBottom: 14, borderRadius: 10, background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amb800, #92400e)" }}>Anlaşmasız Dış Servis Firması (yalnız bu servise kaydedilir)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Firma Adı"><Input value={form.islemFirmaAd || ""} onChange={e => setForm(p => ({ ...p, islemFirmaAd: e.target.value }))} placeholder="Servis firması adı" /></Field>
            <Field label="Yetkili Kişi"><Input value={form.islemFirmaYetkili || ""} onChange={e => setForm(p => ({ ...p, islemFirmaYetkili: e.target.value }))} placeholder="Yetkili" /></Field>
            <Field label="Telefon"><Input value={form.islemFirmaTel || ""} onChange={e => setForm(p => ({ ...p, islemFirmaTel: e.target.value }))} placeholder="Telefon" /></Field>
          </div>
          <Field label="Adres"><Input value={form.islemFirmaAdres || ""} onChange={e => setForm(p => ({ ...p, islemFirmaAdres: e.target.value }))} placeholder="Açık adres (cadde, mahalle, no)" /></Field>
          <CountryCityFields country={form.islemFirmaUlke || ""} city={form.islemFirmaSehir || ""}
            onCountry={v => setForm(p => ({ ...p, islemFirmaUlke: v, islemFirmaSehir: "" }))}
            onCity={v => setForm(p => ({ ...p, islemFirmaSehir: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Müşteri Talimatı / Açıklama">
          <textarea value={form.musteriTalimati || ""} onChange={e => setForm(p => ({ ...p, musteriTalimati: e.target.value }))}
            placeholder="Müşterinin talimatı / talebi..."
            className="input" style={{ resize: "vertical", minHeight: 90 }} />
        </Field>
        <Field label="Fabrika Notu">
          <textarea value={form.fabrikaNotu || ""} onChange={e => setForm(p => ({ ...p, fabrikaNotu: e.target.value }))}
            placeholder="Fabrika dahili notu (yazdırılan formda görünür)..."
            className="input" style={{ resize: "vertical", minHeight: 90 }} />
        </Field>
        <Field label="Yapılan İşler / Parça Değişimleri">
          <textarea value={form.yapilanIsler || ""} onChange={e => setForm(p => ({ ...p, yapilanIsler: e.target.value }))}
            placeholder="Yapılan işlemler, değişen parçalar..."
            className="input" style={{ resize: "vertical", minHeight: 90 }} />
        </Field>
      </div>

      {/* Servis Panosu aşama zamanları — düzenlemede (mevcut servis) tam döküm. Yeni serviste bunun
          yerine yukarıdaki "Panoya Düşme Zamanı" alanı kullanılır (bakım/bitiş henüz oluşmadı). */}
      {form.id && form.durum && (
        <Field label="Servis Panosu Zamanları (otomatik — gerekirse düzeltin)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 3 }}>Fabrikaya Giriş</div>
              <Input type="datetime-local" value={(form.fabrikaGirisZamani || "").slice(0, 16)} onChange={e => setForm(p => ({ ...p, fabrikaGirisZamani: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 3 }}>Bakım Başlangıcı</div>
              <Input type="datetime-local" value={(form.bakimBaslangicZamani || "").slice(0, 16)} onChange={e => setForm(p => ({ ...p, bakimBaslangicZamani: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 3 }}>Bitiş</div>
              <Input type="datetime-local" value={(form.bitisZamani || "").slice(0, 16)} onChange={e => setForm(p => ({ ...p, bitisZamani: e.target.value }))} />
            </div>
          </div>
        </Field>
      )}

      {/* Servis resimleri/dosyaları: bu servise bağlanacak belgeler. Kaydedilince künye oluşup
          servise (refType:servis) bağlanır; birden fazla eklenebilir. */}
      {dosyaEkleyebilir && window.appFiles?.add && (
        <Field label="Servis Resimleri / Dosyaları">
          {dosyaCevrimdisi ? (
            <div style={{ fontSize: 12, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, padding: "8px 10px" }}>
              Sunucu bağlantısı yok: dosya ekleme bağlantı gelince çalışır.
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Btn small variant="ghost" onClick={dosyaEkle} disabled={dosyaBusy || !form.customerId}>
                  <Icon name="paperclip" size={12} /> {dosyaBusy ? "Ekleniyor..." : "Resim / Dosya Ekle"}
                </Btn>
                {!form.customerId && <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Önce müşteri seçin.</span>}
                <span style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)" }}>PDF, resim veya Office belgesi (dosya başına en fazla 20 MB).</span>
              </div>
              {(mevcutServisDosyalari.length > 0 || dosyaTaslaklari.length > 0) && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {mevcutServisDosyalari.map(d => (
                    <div key={`v${d.id}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 8px", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8 }}>
                      <Icon name="paperclip" size={12} />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ad}</span>
                      <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{fmtDosyaBoyut(d.boyut)}</span>
                      <button type="button" onClick={() => window.appFiles?.open?.(d.dosyaAdi)} style={{ fontSize: 11, fontWeight: 600, color: "var(--blue2, #0369a1)", background: "none", border: "none", cursor: "pointer" }}>Aç</button>
                    </div>
                  ))}
                  {dosyaTaslaklari.map((d, i) => (
                    <div key={`t${i}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 8px", background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)", borderRadius: 8 }}>
                      <Icon name="paperclip" size={12} />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ad}</span>
                      <span style={{ fontSize: 11, color: "var(--grn600, #16a34a)", fontWeight: 700 }}>yeni</span>
                      <button type="button" title="Kaldır" onClick={() => setDosyaTaslaklari(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)", display: "flex" }}><Icon name="close" size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>
      )}

      {/* Değişen parçalar — tanımlı yedek parçalardan çoklu seçim + her parçaya ayrı fiyat */}
      <Field label="Değişen Parçalar (varsa)">
        {parts.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Tanımlı yedek parça yok. Ayarlar → Katalog'dan ekleyebilirsiniz.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SearchPick items={parts} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ara..."
              onPick={p => setForm(prev => ({ ...prev, degisenParcalar: [...(prev.degisenParcalar || []), { partId: String(p.id), ad: p.ad, adEN: p.adEN || "", miktar: 1, fiyat: partFiyatForCurrency(p, prev.currency || "TRY"), disTedarik: false }] }))} />
          </div>
        )}
      </Field>

      {(form.degisenParcalar || []).length > 0 && (
        <>
          {hasAltuntasParca && warrantyAktif && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.parcaGarantiDisi} onChange={e => setForm(p => ({ ...p, parcaGarantiDisi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--red600, #dc2626)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n600, #475569)" }}>
                {form.parcaGarantiDisi ? "Garanti kapsamı dışı (ücretli)" : "Garanti kapsamında, parça ücretsiz verildi"}
              </span>
            </label>
          )}
          <Field label={`Seçilen Parçalar (${form.degisenParcalar.length})`}>
            {form.degisenParcalar.map((p, i) => {
              const ad = parcaAdi(p);
              const hasPartId = p && p.partId;
              const hasComponentId = !!hasPartId;
              const itemColor = "var(--blu700, #1d4ed8)";
              const isDisTedarik = !!(islemAnlasmali && p.disTedarik);
              const cols = [
                "1fr",
                hasComponentId ? "60px" : null,
                islemAnlasmali ? "88px" : null,
                !parcaUcretsizMi ? "140px" : null,
                "36px",
              ].filter(Boolean).join(" ");
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisTedarik ? "var(--brand, #e85d1a)" : itemColor, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad}</span>
                    {!parcaUcretsizMi && (parseInt(p.miktar) || 1) > 1 && parseMoney(p.fiyat) > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--n400, #94a3b8)" }}>
                        {(parseInt(p.miktar) || 1)} × {fmtCur(parseMoney(p.fiyat), form.currency || "TRY")} = {fmtCur(servisParcaSatirTutari(p), form.currency || "TRY")}
                      </span>
                    )}
                  </span>
                  {hasComponentId && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <input type="number" min="1" value={p.miktar ?? 1}
                        onChange={e => setForm(prev => {
                          const arr = [...prev.degisenParcalar];
                          arr[i] = { ...arr[i], miktar: parseInt(e.target.value) || 1 };
                          return { ...prev, degisenParcalar: arr };
                        })}
                        style={{ width: "100%", padding: "6px 6px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--n100, #f8fafc)", textAlign: "center", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                  )}
                  {islemAnlasmali && (
                    <button type="button"
                      onClick={() => setForm(prev => {
                        const arr = [...prev.degisenParcalar];
                        arr[i] = { ...arr[i], disTedarik: !arr[i].disTedarik };
                        return { ...prev, degisenParcalar: arr };
                      })}
                      title={isDisTedarik ? "Dış tedarik — Altuntaş'tan alınmadı" : "Altuntaş'tan alındı"}
                      style={{ fontSize: 10, fontWeight: 700, cursor: "pointer", padding: "4px 7px", borderRadius: 8, border: isDisTedarik ? "1px solid var(--brand, #e85d1a)" : "1px solid var(--n200, #e2e8f0)", background: isDisTedarik ? "var(--ambBg3, #fff7ed)" : "var(--n100, #f8fafc)", color: isDisTedarik ? "var(--brand, #e85d1a)" : "var(--n400, #94a3b8)", whiteSpace: "nowrap" }}>
                      {isDisTedarik ? "Dış Tedarik" : "Bizden"}
                    </button>
                  )}
                  {!parcaUcretsizMi && (
                    <MoneyInput value={typeof p === "string" ? "" : p.fiyat} sym={CUR_SYM[form.currency || "TRY"]}
                      onChange={v => setForm(prev => {
                        const arr = [...prev.degisenParcalar];
                        arr[i] = { ...arr[i], fiyat: v };
                        return { ...prev, degisenParcalar: arr };
                      })} />
                  )}
                  <button type="button" title="Bu parçayı kaldır"
                    onClick={() => setForm(prev => ({ ...prev, degisenParcalar: prev.degisenParcalar.filter((_, idx) => idx !== i) }))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--redBr, #fecaca)", background: "var(--redBg, #fef2f2)", color: "var(--red600, #dc2626)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={15} /></button>
                </div>
              );
            })}
          </Field>
        </>
      )}

      {(svUcretliTipi || !parcaUcretsizMi) && (
        <div style={{ display: "grid", gridTemplateColumns: svUcretliTipi ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Field label="Para Birimi">
            {/* Parça seçimi Para Birimi'nden önce yapıldığı için fiyat ilk seçimde TL üzerinden gelmiş olabilir —
                Para Birimi sonradan değiştirilince, tanımlı bir fiyatı olan satırlar yeni para birimine göre güncellenir. */}
            <Select value={form.currency || "TRY"} onChange={e => {
              const yeniPB = e.target.value;
              setForm(p => ({
                ...p,
                currency: yeniPB,
                degisenParcalar: (p.degisenParcalar || []).map(item => {
                  const ad = parcaAdi(item);
                  const tanim = item.partId
                    ? parts.find(pt => String(pt.id) === String(item.partId))
                    : parts.find(pt => pt.ad === ad);
                  const yeniFiyat = tanim ? partFiyatForCurrency(tanim, yeniPB) : "";
                  return yeniFiyat === "" ? item : { ...item, fiyat: yeniFiyat };
                }),
              }));
            }}>
              <option value="TRY">₺ Türk Lirası</option>
              <option value="USD">$ Dolar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
            </Select>
          </Field>
          {svUcretliTipi && (
            <Field label="Servis Ücreti">
              <MoneyInput value={form.servisUcreti} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, servisUcreti: v }))} />
              {(form.currency || "TRY") !== "TRY" && (
                <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "var(--blu700, #1d4ed8)", background: "var(--bluBg2, #dbeafe)", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
              )}
            </Field>
          )}
        </div>
      )}

      {/* Ödeme durumu + yöntemi (satış formlarıyla aynı) — servis ve parça ücreti tek ortak tahsilat.
          Ödendi işaretliyken yöntem seçilir; Kredi Kartı'da taksit + komisyon, Çek'te vade + tahsil takibi. */}
      {ucretliVarMi && (
        <div style={{ marginBottom: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${form.odendi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "10px 12px" }}>
            <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
              {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
            </span>
          </label>
          {form.odendi && (
            <div style={{ marginTop: 8, display: "grid", gap: 10, padding: 12, borderRadius: 10, background: "var(--n050, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)" }}>
              <div style={{ display: "grid", gridTemplateColumns: form.yontem === "Çek" ? "1fr 1fr" : "1fr", gap: 10 }}>
                <Field label="Ödeme Yöntemi">
                  <Select value={form.yontem || "Nakit"} onChange={e => {
                    const v = e.target.value;
                    // Kredi kartı = zorunlu faturalı (KDV her zaman uygulanır).
                    setForm(p => ({ ...p, yontem: v, ...(v === "Kredi Kartı" && !/Faturalı/.test(p.faturaTipi || "") ? { faturaTipi: "Faturalı Yurtiçi" } : {}) }));
                  }}>
                    {ODEME_YONTEMLERI.map(y => <option key={y}>{y}</option>)}
                  </Select>
                </Field>
                {form.yontem === "Çek" && (
                  <Field label="Çek Vade Tarihi">
                    <Input type="date" value={form.vadeTarihi || ""} onChange={e => setForm(p => ({ ...p, vadeTarihi: e.target.value }))} />
                  </Field>
                )}
              </div>
              {form.yontem === "Kredi Kartı" && (
                <KartTaksitAlani ayar={krediKartiKomisyonlari}
                  tutar={svToplam + calcKDV(form.faturaTipi, svToplam, form.date, kdvRates)} currency={form.currency || "TRY"}
                  taksit={form.taksitSayisi} setTaksit={v => setForm(p => ({ ...p, taksitSayisi: v }))}
                  yansit={!!form.kkYansit} setYansit={v => setForm(p => ({ ...p, kkYansit: v }))} />
              )}
              {form.yontem === "Çek" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${form.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "9px 11px" }}>
                  <input type="checkbox" checked={!!form.tahsilEdildi} onChange={e => setForm(p => ({ ...p, tahsilEdildi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: form.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
                    {form.tahsilEdildi ? "Çek tahsil edildi (bankada karşılandı)" : "Çek henüz tahsil edilmedi (tahsil edilene kadar borçlu sayılır)"}
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Servis ücreti + parça ücretleri toplamı — Faturalı Yurtiçi'de KDV dahil toplam da gösterilir */}
      {ucretliVarMi && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          {(() => {
            const parcaVar = !parcaUcretsizMi && parcaUcretiToplam > 0;
            const cur = form.currency || "TRY";
            const toplam = parseMoney(form.servisUcreti) + (parcaVar ? parcaUcretiToplam : 0);
            const kdv = calcKDV(form.faturaTipi, toplam, form.date, kdvRates);
            return (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blu700, #1d4ed8)" }}>
                  Toplam (Servis + Parça): {fmtCur(toplam, cur)}
                </span>
                {kdv > 0 && !(form.odendi && form.yontem === "Kredi Kartı" && form.kkYansit) && (
                  <div style={{ fontSize: 12, color: "var(--grn800, #065f46)", marginTop: 6, fontWeight: 600 }}>
                    KDV (%{getKdvRateForDate(form.date, kdvRates)}): {fmtCur(kdv, cur)} · KDV dahil toplam: {fmtCur(toplam + kdv, cur)}
                  </div>
                )}
                {form.odendi && form.yontem === "Kredi Kartı" && form.kkYansit && toplam > 0 && (
                  <KartYansitmaOzeti netTaban={toplam} taksit={form.taksitSayisi} ayar={krediKartiKomisyonlari}
                    kdvOrani={calcKDV(form.faturaTipi, 100, form.date, kdvRates)} currency={cur} />
                )}
              </>
            );
          })()}
        </div>
      )}

      <div className="form-footer-bar" style={{ marginTop: 12 }}>
        <Btn variant="ghost" onClick={onCancel}>İptal</Btn>
        <Btn onClick={() => onSave(parcaUcretsizMi, dosyaTaslaklari)}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
