// Fail early if an old API server (or another process) occupies the API port.
const net = require("net");
const port = Number(process.env.PORT || 8080);
const socket = net.createConnection({ host: "127.0.0.1", port });
socket.setTimeout(1200);
socket.on("connect", () => {
  console.error(`\nJSF Flow: Port ${port} används redan. Stäng den gamla servern/terminalen som använder porten och kör npm run dev igen.\n`);
  socket.destroy();
  process.exitCode = 1;
});
socket.on("error", error => {
  if (error.code !== "ECONNREFUSED") {
    console.error(`Kunde inte kontrollera port ${port}: ${error.message}`);
    process.exitCode = 1;
  }
});
socket.on("timeout", () => {
  console.error(`Portkontroll för ${port} tog för lång tid.`);
  socket.destroy();
  process.exitCode = 1;
});
