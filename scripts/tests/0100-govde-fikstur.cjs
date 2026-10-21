// Spec 0100 (plan adım 0): üretim durumu olmayan stok satırlarının OKUNAN gövdesini taban kodla üretir.
// Yalnız fikstür üretmek için bir kez çalıştırılır: `electron scripts/tests/0100-govde-fikstur.cjs`. Çıktı
// tests/fixtures/0100-govde-once.json; db-roundtrip.cjs aynı girdiyi yazıp okuduğu gövdeyi bununla karşılaştırır.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-0100-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir } };
  return origLoad(request, parent, isMain);
};
const root = path.join(__dirname, "..", "..");
const { GOVDE_GIRDISI } = require(path.join(root, "tests", "fixtures", "0100-govde-girdisi.cjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
dbmod.migrateFromJsonIfNeeded();
dbmod.writeBlobToDb(GOVDE_GIRDISI);
const b = dbmod.readBlobFromDb();
const cikti = { stock: b.stock };
fs.writeFileSync(path.join(root, "tests", "fixtures", "0100-govde-once.json"), JSON.stringify(cikti, null, 2) + "\n");
dbmod.close();
console.log("YAZILDI");
process.exit(0);
