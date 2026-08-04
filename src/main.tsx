import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 注册 Service Worker 实现 PWA 离线支持
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        console.log("SW 已注册:", registration.scope);

        // 检测新版本并自动更新
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // 新版本已就绪，通知用户刷新
                console.log("新版本已就绪，刷新页面即可更新");
                // 自动跳过等待并刷新
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            });
          }
        });
      },
      (err) => {
        console.log("SW 注册失败（可忽略）:", err.message);
      }
    );
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
