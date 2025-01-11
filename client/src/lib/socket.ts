import { io } from "socket.io-client";

// 創建 Socket.IO 客戶端實例
const socket = io({
  path: "/ws",
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  transports: ["websocket", "polling"],
});

// 監聽連接事件
socket.on("connect", () => {
  console.log("Socket.IO connected successfully");
});

// 監聽連接錯誤
socket.on("connect_error", (error) => {
  console.error("Socket.IO connection error:", error);
});

// 監聽斷開連接
socket.on("disconnect", (reason) => {
  console.log("Socket.IO disconnected:", reason);

  // 如果是服務器端主動斷開，則不自動重連
  if (reason === "io server disconnect") {
    socket.connect();
  }
});

// 監聽重連嘗試
socket.on("reconnect_attempt", (attemptNumber) => {
  console.log(`Socket.IO attempting to reconnect... (attempt ${attemptNumber})`);
});

// 監聽重連成功
socket.on("reconnect", (attemptNumber) => {
  console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
});

// 監聽重連錯誤
socket.on("reconnect_error", (error) => {
  console.error("Socket.IO reconnection error:", error);
});

// 監聽重連失敗
socket.on("reconnect_failed", () => {
  console.error("Socket.IO reconnection failed after all attempts");
});

// 監聽 ping/pong 事件以確保連接存活
socket.on("ping", () => {
  console.debug("Socket.IO ping received");
});

socket.on("pong", (latency) => {
  console.debug(`Socket.IO pong received (latency: ${latency}ms)`);
});

export default socket;