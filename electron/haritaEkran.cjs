// Faaliyet Haritası penceresini hangi ekrana açacağımızı seçen saf mantık.
// Electron'un `screen` modülüne bağımlı DEĞİL: yalnız düz veri (display listesi +
// ana pencere bounds) alır, düz veri döndürür. Böylece node altında test edilebilir
// (gerçek pencere/ekran gerektirmeden). main.cjs bunu screen.getAllDisplays() ile besler.

// Bir noktanın (ana pencerenin merkezi) hangi ekranın sınırları içinde olduğunu bulur.
function ekranKapsar(display, nokta) {
  const b = display && display.bounds;
  if (!b) return false;
  return nokta.x >= b.x && nokta.x < b.x + b.width && nokta.y >= b.y && nokta.y < b.y + b.height;
}

// Ana pencerenin BULUNMADIĞI bir ekranın çalışma alanını (workArea, görev çubuğu hariç)
// döndürür. Tek ekran varsa null → çağıran, harita penceresini ana pencerenin üstünde
// varsayılan boyda açar. Ana pencere hangi ekrandaysa onu asla seçmez.
function ikinciEkran(displays, anaBounds) {
  if (!Array.isArray(displays) || displays.length < 2 || !anaBounds) return null;
  const merkez = {
    x: anaBounds.x + (anaBounds.width || 0) / 2,
    y: anaBounds.y + (anaBounds.height || 0) / 2,
  };
  const anaEkran = displays.find((d) => ekranKapsar(d, merkez)) || displays[0];
  const hedef = displays.find((d) => d.id !== anaEkran.id);
  return hedef ? hedef.workArea || hedef.bounds || null : null;
}

module.exports = { ikinciEkran, ekranKapsar };
