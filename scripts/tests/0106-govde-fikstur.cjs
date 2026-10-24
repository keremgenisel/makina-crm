// Spec 0106 (plan adım 2, AC-50): durum alanları olmayan müşteri, kalıp ve Extra Kalıp kayıtlarının OKUNAN gövdesini taban kodla üretir.
// Yalnız fikstür üretmek için bir kez çalıştırılır: `electron scripts/tests/0106-govde-fikstur.cjs`. Çıktı
// tests/fixtures/0106-govde-once.json; db-roundtrip.cjs aynı girdiyi yazıp okuduğu gövdeyi bununla karşılaştırır.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-0106-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir } };
  return origLoad(request, parent, isMain);
};
const root = path.join(__dirname, "..", "..");
const { GOVDE_GIRDISI } = require(path.join(root, "tests", "fixtures", "0106-govde-girdisi.cjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
dbmod.migrateFromJsonIfNeeded();
dbmod.writeBlobToDb(GOVDE_GIRDISI);
const b = dbmod.readBlobFromDb();
const cikti = { customers: b.customers, partSales: b.partSales };
fs.writeFileSync(path.join(root, "tests", "fixtures", "0106-govde-once.json"), JSON.stringify(cikti, null, 2) + "\n");
dbmod.close();
console.log("YAZILDI");
process.exit(0);
