import { Component } from "react";
import { DEV_REPORT_EMAIL } from "./lib/constants";

// Render sırasında beklenmeyen bir hata olursa tüm uygulama beyaz ekrana
// düşmesin — kullanıcıya yeniden başlatma seçeneği sunan bir ekran göster.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, reportStatus: null, sending: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Beklenmeyen hata:", error, info);
    this.setState({ info });
    window.appError?.log({
      message: error?.message || String(error),
      stack: error?.stack || "",
      componentStack: info?.componentStack || "",
      timestamp: new Date().toISOString(),
    });
  }

  sendReport = async () => {
    if (!window.appMail) {
      this.setState({ reportStatus: "E-posta özelliği bu ortamda kullanılamıyor." });
      return;
    }
    this.setState({ sending: true, reportStatus: null });
    const log = (await window.appError?.readLog()) || [];
    const text = `Hata: ${this.state.error?.message || this.state.error}\n\nStack:\n${this.state.error?.stack || ""}\n\nComponent Stack:\n${this.state.info?.componentStack || ""}`;
    const logJson = JSON.stringify(log, null, 2);
    const res = await window.appMail.send({
      to: DEV_REPORT_EMAIL,
      subject: "Altunmak CRM - Hata Raporu",
      text,
      attachments: [{ filename: "hata-kayitlari.json", contentBase64: btoa(unescape(encodeURIComponent(logJson))), mimeType: "application/json" }],
    });
    this.setState({ sending: false, reportStatus: res?.ok ? "Hata raporu gönderildi, teşekkürler." : `Gönderilemedi: ${res?.error || "bilinmeyen hata"}` });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--n100, #f8fafc)", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 14, padding: 32, maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.15)", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--n900, #0f172a)", marginBottom: 10 }}>Beklenmeyen bir hata oluştu</div>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 22, lineHeight: 1.6 }}>
            Uygulama bu ekranda bir sorunla karşılaştı. Verileriniz diskte güvende — aşağıdaki butonla yeniden başlatabilirsiniz.
          </div>
          <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", background: "var(--n100, #f8fafc)", borderRadius: 8, padding: "10px 12px", marginBottom: 22, textAlign: "left", overflowX: "auto" }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => window.location.reload()}
              style={{ background: "#e85d1a", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Yeniden Başlat
            </button>
            <button onClick={this.sendReport} disabled={this.state.sending}
              style={{ background: "var(--surface, #ffffff)", color: "var(--n600, #475569)", border: "1px solid var(--n200, #e2e8f0)", padding: "10px 22px", borderRadius: 8, cursor: this.state.sending ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, opacity: this.state.sending ? .6 : 1 }}>
              {this.state.sending ? "Gönderiliyor..." : "Hata Raporu Gönder"}
            </button>
          </div>
          {this.state.reportStatus && (
            <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 14 }}>{this.state.reportStatus}</div>
          )}
        </div>
      </div>
    );
  }
}
