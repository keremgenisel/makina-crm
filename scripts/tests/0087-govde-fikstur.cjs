// Spec 0087 (plan P10): maliyetsiz parçanın ve ek kalemsiz modelin OKUNAN gövdesini taban kodla üretir.
// Yalnız fikstür üretmek için bir kez çalıştırılır: `electron scripts/tests/0087-govde-fikstur.cjs`. Çıktı
// tests/fixtures/0087-govde-once.json; db-roundtrip.cjs aynı girdiyi yazıp okuduğu gövdeyi bununla karşılaştırır.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-0087-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir } };
  return origLoad(request, parent, isMain);
};
const root = path.join(__dirname, "..", "..");
const { GOVDE_GIRDISI } = require(path.join(root, "tests", "fixtures", "0087-govde-girdisi.cjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
dbmod.migrateFromJsonIfNeeded();
dbmod.writeBlobToDb(GOVDE_GIRDISI);
const b = dbmod.readBlobFromDb();
const cikti = { parts: b.parts, standardModels: b.standardModels, customModels: b.customModels };
fs.writeFileSync(path.join(root, "tests", "fixtures", "0087-govde-once.json"), JSON.stringify(cikti, null, 2) + "\n");
dbmod.close();
console.log("YAZILDI");
process.exit(0);
