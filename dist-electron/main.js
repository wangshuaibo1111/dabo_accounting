import { app as n, BrowserWindow as i, shell as s } from "electron";
import { join as o } from "path";
let e = null;
function l() {
  e = new i({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: "大博记账",
    webPreferences: {
      preload: o(__dirname, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), e.webContents.setWindowOpenHandler(({ url: t }) => ((t.startsWith("https:") || t.startsWith("http:")) && s.openExternal(t), { action: "deny" })), process.env.VITE_DEV_SERVER_URL ? (e.loadURL(process.env.VITE_DEV_SERVER_URL), e.webContents.openDevTools()) : e.loadFile(o(__dirname, "../dist/index.html")), e.on("closed", () => {
    e = null;
  });
}
n.whenReady().then(l);
n.on("window-all-closed", () => {
  process.platform !== "darwin" && n.quit();
});
n.on("activate", () => {
  i.getAllWindows().length === 0 && l();
});
