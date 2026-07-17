import { useState } from "react";
import { trLower, bumpId, normalizeSaleType, fmt, fmtTR } from "../../lib/utils";
import { PART_TYPE_PALETTE_KEYS } from "../../lib/constants";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";
import { downloadCSV, IMPORT_HEADERS } from "./csvUtils";

const PARTS_IMPORT_HEADERS = ["Yedek Parça Adı (TR)", "Adı (EN)", "Kod", "Tip", "Tanım (TR)", "Tanım (EN)", "Fiyat (TL)", "Fiyat (USD)", "Fiyat (EUR)"];

export const SettingsImport = ({ customers, setCustomers, setServices, flash, parts = [], setParts, partTypeDefs = [], setPartTypeDefs = null }) => {
  // CSV ayrıştırıcı (tırnak içi ; ve satır sonu destekli, ayraç ; veya ,)
  const parseCSV = (text) => {
    text = text.replace(/^\uFEFF/, ""); // BOM temizliği
    const delim = (text.split("\n")[0].split(";").length >= text.split("\n")[0].split(",").length) ? ";" : ",";
    const rows = []; let row = []; let cur = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { row.push(cur); cur = ""; }
        else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else if (ch === "\r") { /* yoksay */ }
        else cur += ch;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ""));
  };

  const [importPreview, setImportPreview] = useState(null); // { customers:[], services:[], errors:[] }
  const [partsImportPreview, setPartsImportPreview] = useState(null);

  const trDate = (s) => {
    if (s == null || s === "") return "";
    // Date nesnesi (cellDates ile gelebilir) — UTC metotlarıyla oku (timezone kayması önle)
    if (s instanceof Date && !isNaN(s)) {
      return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, "0")}-${String(s.getUTCDate()).padStart(2, "0")}`;
    }
    s = String(s).trim();
    if (!s) return "";
    // Saat/zaman ekini at: "15.04.2024 00:00:00" veya "2024-04-15T00:00:00"
    s = s.split("T")[0].split(" ")[0].trim();
    // gg.aa.yyyy / gg/aa/yyyy / gg-aa-yyyy (tek hane de olur)
    let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (m) {
      let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      let yil = m[3];
      if (yil.length === 2) yil = (parseInt(yil, 10) > 50 ? "19" : "20") + yil; // 2 haneli yıl
      // Akıllı gün/ay tespiti: normalde gg.aa (Türkçe). Ama ilk sayı ≤12 ve ikinci >12 ise
      // Amerikan formatı (aa/gg) gelmiş demektir → yer değiştir.
      let gun = a, ay = b;
      if (a <= 12 && b > 12) { gun = b; ay = a; }
      return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
    }
    // yyyy-aa-gg / yyyy.aa.gg / yyyy/aa/gg
    m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    // Excel seri numarası (örn. 45397 = 15.04.2024). 1900 tarih sistemi.
    if (/^\d{4,6}$/.test(s)) {
      const serial = parseInt(s, 10);
      if (serial > 0 && serial < 100000) {
        const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        if (!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }
    }
    return "";
  };
  const moneyNum = (s) => {
    if (s == null) return 0;
    let t = String(s).replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = parseFloat(t); return isNaN(n) ? 0 : n;
  };

  // Satır dizisini (hücre dizileri) müşteri+servis kayıtlarına çevirir
  const rowsToRecords = (rows) => {
    const dataRows = rows.slice(1); // başlık atla
    const newCustomers = []; const newServices = []; const errors = [];
    let guncellenecek = 0; // mevcut kayıtların güncellenme sayısı
    let idc = Date.now();
    // Mevcut müşterileri eşleştirme için indeksle: seri no (öncelik) veya firma+model
    const bySerial = new Map();
    const byNameModel = new Map();
    (customers || []).forEach(c => {
      if (c.serialNo) bySerial.set(trLower(c.serialNo), c);
      byNameModel.set(trLower(c.name) + "|" + trLower(c.model || ""), c);
    });
    dataRows.forEach((r, idx) => {
      const cell = (i) => (r[i] == null ? "" : String(r[i]).trim());
      const name = cell(2);
      if (!name) { errors.push(`Satır ${idx + 2}: Satın Alan Firma boş, atlandı.`); return; }
      // Makina Kalıp Çapı (index 8): "50 x 80 x 115" → {en, yukseklik, boy} (Çap, Arka Ölçü, Boy)
      const capRaw = cell(8);
      let kalipCapi = undefined;
      if (capRaw) {
        const parts = capRaw.split(/[x×*]/i).map(p => p.trim());
        kalipCapi = { en: parts[0] || "", yukseklik: parts[1] || "", boy: parts[2] || "" };
      }
      // Para birimi (index 9): TL/TRY → TRY, USD/$ → USD, EUR/€ → EUR
      const curRaw = trLower(cell(9));
      let currency = "TRY";
      if (curRaw.includes("usd") || curRaw.includes("dolar") || curRaw.includes("$")) currency = "USD";
      else if (curRaw.includes("eur") || curRaw.includes("euro") || curRaw.includes("€")) currency = "EUR";
      // Satış tipi (index 10): metin → normalize. Boşsa fatura bedeline göre tahmin et.
      const tipRaw = cell(10);
      let satisTipi = tipRaw ? normalizeSaleType(tipRaw) : null;
      const kaliplarRaw = cell(11).split(/[;,]/).map(x => x.trim()).filter(Boolean);
      const kaliplar = kaliplarRaw.map(ad => ({ ad, olcu: "" }));
      const installDate = trDate(r[12]);
      const warrantyEnd = trDate(r[13]);
      const gercekBedel = moneyNum(cell(14));
      const faturaBedeli = moneyNum(cell(15));
      const serialNo = cell(19);
      // Satış tipi boşsa: fatura varsa Faturalı Yurtiçi, yoksa Faturasız Yurtiçi (geriye uyumlu tahmin)
      if (!satisTipi) satisTipi = faturaBedeli > 0 ? "Faturalı Yurtiçi" : "Faturasız Yurtiçi";
      // Mevcut kayıtla eşleştir: önce seri no, sonra firma+model
      let mevcut = null;
      if (serialNo && bySerial.has(trLower(serialNo))) mevcut = bySerial.get(trLower(serialNo));
      else if (byNameModel.has(trLower(name) + "|" + trLower(cell(7)))) mevcut = byNameModel.get(trLower(name) + "|" + trLower(cell(7)));
      const cid = mevcut ? mevcut.id : (++idc); // mevcutsa ID'sini koru (güncelle), değilse yeni
      if (mevcut) guncellenecek++;
      // Ödeme planı (index 32): "gg.aa.yyyy:tutar; gg.aa.yyyy:tutar" çiftleri
      const planRaw = cell(32);
      let odemePlani = mevcut?.odemePlani;
      if (planRaw) {
        const taksitler = planRaw.split(";").map(x => x.trim()).filter(Boolean).map(pair => {
          const i2 = pair.indexOf(":");
          const vd = i2 >= 0 ? pair.slice(0, i2).trim() : pair.trim();
          const tt = i2 >= 0 ? pair.slice(i2 + 1).trim() : "";
          return { id: ++idc, vadeTarihi: trDate(vd) || "", tutar: moneyNum(tt), odemeId: null };
        }).filter(t => t.vadeTarihi || t.tutar);
        if (taksitler.length) odemePlani = taksitler;
      }
      // Brüt kg (index 33): sandık etiketi brüt ağırlığı
      const brutKg = moneyNum(cell(33)) || mevcut?.brutKg || null;
      newCustomers.push({
        id: cid,
        kalipSayisi: parseInt(cell(0), 10) || kaliplar.length || 1,
        satisYapan: cell(1) || "Altuntaş Makina",
        name, phone: cell(3), email: cell(31) || mevcut?.email || "",
        adres: cell(4), country: cell(5) || "Türkiye", city: cell(6), ilce: cell(34),
        model: cell(7), currency, kaliplar,
        ...(kalipCapi ? { kalipCapi } : {}),
        installDate, warrantyEnd,
        faturali: satisTipi,
        faturaBedeli, fabrikaSatisBedeli: gercekBedel || faturaBedeli,
        komisyon: moneyNum(cell(16)), extraKalipFiyati: moneyNum(cell(17)), kalanBorc: moneyNum(cell(18)),
        serialNo, aciklama: cell(20),
        yetkili1Ad: cell(27) || mevcut?.yetkili1Ad || "", yetkili1Tel: cell(28) || mevcut?.yetkili1Tel || "",
        yetkili2Ad: cell(29) || mevcut?.yetkili2Ad || "", yetkili2Tel: cell(30) || mevcut?.yetkili2Tel || "",
        ...(odemePlani ? { odemePlani } : {}),
        ...(brutKg ? { brutKg } : {}),
        // Seri no boşsa "bekliyor" işareti (sonradan girilmesi için hatırlatma)
        ...(serialNo ? { seriNoBekliyor: false } : { seriNoBekliyor: true }),
        ...(mevcut?.isResale ? { isResale: mevcut.isResale, prevOwners: mevcut.prevOwners } : {}),
        _mevcut: !!mevcut, // güncelleme mi, yeni mi
      });
      [[21, 22], [23, 24], [25, 26]].forEach(([dt, isk]) => {
        const d = trDate(r[dt]); const isi = cell(isk);
        if (d || isi) {
          newServices.push({
            id: ++idc, customerId: cid, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım",
            yapilanIsler: isi, musteriTalimati: "", servisUcreti: 0, date: d || "", tech: "", currency: "TRY",
            _mevcutMusteri: !!mevcut,
          });
        }
      });
    });
    return { customers: newCustomers, services: newServices, errors, guncellenecek };
  };

  // Yedek parça satırlarını kayıt dizisine çevirir
  const partsRowsToRecords = (rows) => {
    const dataRows = rows.slice(1);
    const newParts = []; const errors = [];
    let yeniler = 0, guncellenenler = 0;
    let idc = Date.now();
    const byAd = new Map();
    (parts || []).forEach(p => { if (p.ad && !p.deletedAt) byAd.set(trLower(p.ad), p); });
    dataRows.forEach((r, idx) => {
      const cell = (i) => (r[i] == null ? "" : String(r[i]).trim());
      const ad = cell(0);
      if (!ad) { errors.push(`Satır ${idx + 2}: Parça adı boş, atlandı.`); return; }
      const mevcut = byAd.get(trLower(ad));
      const id = mevcut ? mevcut.id : (++idc);
      if (mevcut) guncellenenler++; else yeniler++;
      newParts.push({
        id, ad,
        adEN: cell(1) || (mevcut?.adEN ?? ""),
        kod: cell(2) || (mevcut?.kod ?? ""),
        tip: cell(3) || (mevcut?.tip ?? "Standart"),
        tanim: cell(4) || (mevcut?.tanim ?? ""),
        tanimEN: cell(5) || (mevcut?.tanimEN ?? ""),
        fiyatTRY: cell(6) || (mevcut?.fiyatTRY ?? ""),
        fiyatUSD: cell(7) || (mevcut?.fiyatUSD ?? ""),
        fiyatEUR: cell(8) || (mevcut?.fiyatEUR ?? ""),
        _mevcut: !!mevcut,
      });
    });
    return { parts: newParts, errors, yeniler, guncellenenler };
  };

  // xlsx (SheetJS) paketinde npm üzerinden düzeltilmemiş bilinen bir Prototip Kirlenmesi/ReDoS açığı var
  // (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). Kaynağı tamamen engelleyemediğimiz için saldırı yüzeyini
  // makul bir dosya boyutu ve satır sayısıyla sınırlıyoruz.
  const MAX_IMPORT_MB = 20;
  const MAX_IMPORT_ROWS = 50000;

  const readFileRows = (file, onRows) => {
    if (file.size > MAX_IMPORT_MB * 1024 * 1024) { flash("err", `Dosya çok büyük (en fazla ${MAX_IMPORT_MB} MB).`); return; }
    const name = (file.name || "").toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let rows;
        if (isExcel) {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: "array", cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", dateNF: "dd.mm.yyyy" });
        } else {
          rows = parseCSV(e.target.result);
        }
        if (rows.length > MAX_IMPORT_ROWS) { flash("err", `Dosyada çok fazla satır var (en fazla ${MAX_IMPORT_ROWS}).`); return; }
        rows = rows.filter(r => Array.isArray(r) && r.some(x => String(x).trim() !== ""));
        if (rows.length < 2) { flash("err", "Dosyada veri bulunamadı."); return; }
        onRows(rows);
      } catch (err) {
        flash("err", "Dosya okunamadı: " + err.message);
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, "UTF-8");
  };

  const handleImportFile = (file) => readFileRows(file, rows => setImportPreview(rowsToRecords(rows)));
  const handlePartsFile = (file) => readFileRows(file, rows => setPartsImportPreview(partsRowsToRecords(rows)));

  const applyImport = () => {
    if (!importPreview) return;
    if (window.__importApplying) return;
    window.__importApplying = true;
    const impCustomers = importPreview.customers;
    const impServices = importPreview.services;
    bumpId(impCustomers, impServices);
    // Mevcut kayıtları GÜNCELLE, yenileri EKLE (seri no/firma eşleşmesine göre)
    setCustomers(p => {
      const guncelMap = new Map();
      impCustomers.forEach(c => { const { _mevcut, ...clean } = c; guncelMap.set(c.id, clean); });
      // Önce mevcutları güncelle
      const guncellenmis = p.map(c => guncelMap.has(c.id) ? { ...c, ...guncelMap.get(c.id) } : c);
      // Sonra yeni olanları (mevcut listede id'si olmayan) başa ekle
      const mevcutIds = new Set(p.map(c => c.id));
      const yeniler = impCustomers.filter(c => !mevcutIds.has(c.id)).map(c => { const { _mevcut, ...clean } = c; return clean; });
      return [...yeniler, ...guncellenmis];
    });
    if (impServices.length && setServices) {
      // Yalnızca YENİ müşterilerin servislerini ekle (mevcut müşterininkiler zaten var, çiftlenmesin)
      setServices(p => {
        const mevcutIds = new Set(p.map(s => s.id));
        const yeni = impServices
          .filter(s => !s._mevcutMusteri && !mevcutIds.has(s.id))
          .map(s => { const { _mevcutMusteri, ...clean } = s; return clean; });
        return [...yeni, ...p];
      });
    }
    const yeniSayi = impCustomers.filter(c => !c._mevcut).length;
    const guncelSayi = importPreview.guncellenecek || 0;
    flash("ok", `${yeniSayi} yeni müşteri eklendi, ${guncelSayi} mevcut müşteri güncellendi.`);
    setImportPreview(null);
    setTimeout(() => { window.__importApplying = false; }, 800);
  };

  const applyPartsImport = () => {
    if (!partsImportPreview || !setParts) return;
    const impParts = partsImportPreview.parts;
    bumpId(impParts);
    // İçe aktarılan parçalarda tanımsız tip varsa otomatik yeni parça tipi ekle (kullanıcı kararı)
    if (setPartTypeDefs) {
      const mevcutAdlar = new Set((partTypeDefs || []).map(t => trLower(t.ad)));
      const yeniTipAdlari = [];
      for (const x of impParts) {
        const tipAd = (x.tip || "").trim();
        if (tipAd && !mevcutAdlar.has(trLower(tipAd)) && !yeniTipAdlari.some(a => trLower(a) === trLower(tipAd))) yeniTipAdlari.push(tipAd);
      }
      if (yeniTipAdlari.length) {
        setPartTypeDefs(prev => {
          let kullanilan = prev.filter(t => !t.sistem).length;
          const eklenecek = yeniTipAdlari
            .filter(ad => !prev.some(t => trLower(t.ad) === trLower(ad)))
            .map((ad, i) => ({
              id: `tip_${Date.now()}_${i}`, ad,
              renk: PART_TYPE_PALETTE_KEYS[(kullanilan++) % PART_TYPE_PALETTE_KEYS.length],
              makinaSecici: false, stokDus: false, raporGoster: false, sistem: false,
            }));
          return eklenecek.length ? [...prev, ...eklenecek] : prev;
        });
      }
    }
    setParts(p => {
      const guncelMap = new Map();
      impParts.forEach(x => { const { _mevcut, ...clean } = x; guncelMap.set(x.id, clean); });
      const updated = p.map(x => guncelMap.has(x.id) ? { ...x, ...guncelMap.get(x.id) } : x);
      const existingIds = new Set(p.map(x => x.id));
      const yeniler = impParts.filter(x => !existingIds.has(x.id)).map(x => { const { _mevcut, ...clean } = x; return clean; });
      return [...yeniler, ...updated];
    });
    flash("ok", `${partsImportPreview.yeniler} yeni parça eklendi, ${partsImportPreview.guncellenenler} parça güncellendi.`);
    setPartsImportPreview(null);
  };

  const downloadTemplate = async () => {
    const ornek = ["2", "Altuntaş Makina", "Örnek Gıda A.Ş.", "0532 000 00 00", "Atatürk Cad. No:1", "Türkiye", "İstanbul",
      "AK140_DSC", "50 x 80 x 115", "TL", "Faturalı Yurtiçi", "Hamburger; Adana Köfte", "15.04.2024", "15.04.2026", "850000", "650000", "0", "25000", "0", "AK140-2026-001", "Örnek kayıt",
      "10.01.2025", "Periyodik bakım yapıldı", "05.06.2025", "Bıçak değişti", "", "",
      "Ahmet Yılmaz", "0532 111 11 11", "", "",
      "ornek@firma.com", "15.05.2024:200000; 15.06.2024:200000", "850"];
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ornek]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Müşteriler");
      XLSX.writeFile(wb, "ice-aktarma-sablonu.xlsx");
      flash("ok", "Excel şablonu indirildi. Doldurup geri yükleyin.");
    } catch {
      downloadCSV([IMPORT_HEADERS, ornek], "ice-aktarma-sablonu.csv");
      flash("ok", "Şablon (CSV) indirildi.");
    }
  };

  const downloadPartsTemplate = async () => {
    const ornek = ["Örnek Parça", "Example Part", "PRC-001", "Standart", "Parça açıklaması", "Part description", "250", "", ""];
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([PARTS_IMPORT_HEADERS, ornek]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Yedek Parçalar");
      XLSX.writeFile(wb, "yedek-parca-sablonu.xlsx");
      flash("ok", "Yedek parça şablonu indirildi.");
    } catch {
      downloadCSV([PARTS_IMPORT_HEADERS, ornek], "yedek-parca-sablonu.csv");
      flash("ok", "Şablon (CSV) indirildi.");
    }
  };

  const FileUploadBtn = ({ onFile, label = "Excel / CSV Yükle" }) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "#e85d1a", color: "#fff" }}>
      <Icon name="plus" size={14} /> {label}
      <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }} />
    </label>
  );

  return (
    <>
      <Section title="Müşteri İçe Aktar (Excel / CSV)" icon="box">
        <div className="section-desc">
          Eski müşteri verilerinizi toplu olarak içe aktarın. <b>1)</b> Excel şablonunu indirin. <b>2)</b> Verilerinizi şablondaki sütun sırasına göre doldurun (Excel'de kaydedin, .xlsx olarak kalabilir). <b>3)</b> Aşağıdan yükleyin, önizlemeyi kontrol edip onaylayın. Hem Excel (.xlsx, .xls) hem CSV dosyaları desteklenir.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <Btn variant="ghost" onClick={downloadTemplate}><Icon name="download" size={14} /> Boş Excel Şablonu İndir</Btn>
          <FileUploadBtn onFile={handleImportFile} />
        </div>

        <div style={{ background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "var(--amb800, #92400e)", lineHeight: 1.6 }}>
          <b>Şablon sütunları:</b> Kalıp Sayısı · Satış Yapan · Satın Alan Firma · Telefon · Adres · Ülke · Şehir · Model · <b>Makina Kalıp Çapı (çap x arka ölçü x boy)</b> · <b>Para Birimi (TL/USD/EUR)</b> · <b>Satış Tipi (Faturalı Yurtiçi/Yurtdışı/Faturasız Yurtiçi/Yurtdışı)</b> · Aldığı Kalıplar (noktalı virgülle ayırın) · <b>Satış Tarihi / Garanti Başlangıç</b> · Garanti Bitiş · <b>Fabrika Satış Bedeli</b> · Fatura Bedeli · Komisyon · Extra Kalıp Fiyatı · Kalan Borç · Seri No · Açıklama · Servis1 Tarih · Servis1 İş · Servis2... · Servis3...
        </div>
      </Section>

      {importPreview && (
        <Modal wide title="İçe Aktarma Önizlemesi" onClose={() => setImportPreview(null)}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>
            Toplam <b>{importPreview.customers.length}</b> kayıt bulundu:
            <b style={{ color: "var(--grn600, #16a34a)" }}> {importPreview.customers.filter(c => !c._mevcut).length} yeni</b> eklenecek,
            <b style={{ color: "var(--cyan, #0891b2)" }}> {importPreview.guncellenecek || 0} mevcut</b> güncellenecek.
            {importPreview.errors.length > 0 && <span style={{ color: "var(--red600, #dc2626)" }}> · {importPreview.errors.length} satır atlandı.</span>}
            <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 6 }}>
              Not: Aynı seri numarasına (veya firma+model) sahip kayıtlar yeni eklenmez, mevcut kayıt güncellenir. Böylece çift kayıt olmaz.
            </div>
          </div>
          {importPreview.errors.length > 0 && (
            <div style={{ background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--red800, #991b1b)", maxHeight: 100, overflowY: "auto" }}>
              {importPreview.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 8 }}>İlk 5 kayıt önizlemesi:</div>
          <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
                {["Firma", "Model", "Seri No", "Garanti", "Fatura"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {importPreview.customers.slice(0, 5).map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: "8px 12px" }}>{c.model || "—"}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{c.serialNo || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.warrantyEnd ? fmtTR(c.warrantyEnd) : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.faturaBedeli ? fmt(c.faturaBedeli) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 16 }}>
            Not: İçe aktarılan kayıtlar mevcut listeye <b>eklenir</b> (mevcut veriler silinmez). Tarihler gg.aa.yyyy formatında olmalıdır.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setImportPreview(null)}>İptal</Btn>
            <Btn onClick={applyImport}><Icon name="check" size={14} /> İçe Aktar ({importPreview.customers.length} kayıt)</Btn>
          </div>
        </Modal>
      )}

      <Section title="Yedek Parça İçe Aktar" icon="parts">
        <div className="section-desc">
          Yedek parça kataloğunu toplu olarak içe aktarın. Aynı adlı (TR) parçalar güncellenir, yeni olanlar eklenir.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <Btn variant="ghost" onClick={downloadPartsTemplate}><Icon name="download" size={14} /> Boş Şablon İndir</Btn>
          <FileUploadBtn onFile={handlePartsFile} />
        </div>
        <div style={{ background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "var(--amb800, #92400e)", lineHeight: 1.6 }}>
          <b>Sütunlar:</b> Yedek Parça Adı (TR) · Adı (EN) · Kod · Tip ({(partTypeDefs.length ? partTypeDefs.map(t => t.ad) : ["Standart"]).join("/")}) · Tanım (TR) · Tanım (EN) · Fiyat (TL) · Fiyat (USD) · Fiyat (EUR)
          <div style={{ marginTop: 4, opacity: .85 }}>Tanımlı olmayan bir tip yazarsanız otomatik olarak yeni parça tipi oluşturulur.</div>
        </div>
      </Section>

      {partsImportPreview && (
        <Modal wide title="Yedek Parça İçe Aktarma Önizlemesi" onClose={() => setPartsImportPreview(null)}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>
            Toplam <b>{partsImportPreview.parts.length}</b> kayıt bulundu:
            <b style={{ color: "var(--grn600, #16a34a)" }}> {partsImportPreview.yeniler} yeni</b> eklenecek,
            <b style={{ color: "var(--cyan, #0891b2)" }}> {partsImportPreview.guncellenenler} mevcut</b> güncellenecek.
            {partsImportPreview.errors.length > 0 && <span style={{ color: "var(--red600, #dc2626)" }}> · {partsImportPreview.errors.length} satır atlandı.</span>}
          </div>
          {partsImportPreview.errors.length > 0 && (
            <div style={{ background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--red800, #991b1b)", maxHeight: 100, overflowY: "auto" }}>
              {partsImportPreview.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
                {["Parça Adı (TR)", "Adı (EN)", "Kod", "Fiyat (TL)"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {partsImportPreview.parts.slice(0, 5).map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)", background: !p._mevcut ? "var(--grnBg, #f0fdf4)" : undefined }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{p.ad}</td>
                    <td style={{ padding: "8px 12px", color: "var(--n500, #64748b)" }}>{p.adEN || "—"}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "var(--n500, #64748b)" }}>{p.kod || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{p.fiyatTRY || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setPartsImportPreview(null)}>İptal</Btn>
            <Btn onClick={applyPartsImport}><Icon name="check" size={14} /> İçe Aktar ({partsImportPreview.parts.length} kayıt)</Btn>
          </div>
        </Modal>
      )}

    </>
  );
};
