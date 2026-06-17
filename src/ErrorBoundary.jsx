import { Component } from "react";

// Render sırasında beklenmeyen bir hata olursa tüm uygulama beyaz ekrana
// düşmesin — kullanıcıya yeniden başlatma seçeneği sunan bir ekran göster.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Beklenmeyen hata:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 32, maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.15)", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Beklenmeyen bir hata oluştu</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 22, lineHeight: 1.6 }}>
            Uygulama bu ekranda bir sorunla karşılaştı. Verileriniz diskte güvende — aşağıdaki butonla yeniden başlatabilirsiniz.
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", background: "#f8fafc", borderRadius: 8, padding: "10px 12px", marginBottom: 22, textAlign: "left", overflowX: "auto" }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button onClick={() => window.location.reload()}
            style={{ background: "#e85d1a", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            Yeniden Başlat
          </button>
        </div>
      </div>
    );
  }
}
