import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 只在生产模式注册 Service Worker（开发模式不缓存，刷新即可看到最新代码）
if ("serviceWorker" in navigator) {
  // 先注销所有旧的 SW，避免开发时缓存旧版本
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });

  // 只在生产构建中注册
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
