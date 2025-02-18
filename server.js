const express = require("express");
const http = require("http");
const { chromium } = require("playwright");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

let broadcaster;
const port = 4000;

io.sockets.on("error", (e) => console.log(e));
io.sockets.on("connection", (socket) => {
  socket.on("broadcaster", () => {
    broadcaster = socket.id;
    socket.broadcast.emit("broadcaster");
  });
  socket.on("watcher", () => {
    socket.to(broadcaster).emit("watcher", socket.id);
  });
  socket.on("offer", (id, message) => {
    socket.to(id).emit("offer", socket.id, message);
  });
  socket.on("answer", (id, message) => {
    socket.to(id).emit("answer", socket.id, message);
  });
  socket.on("candidate", (id, message) => {
    socket.to(id).emit("candidate", socket.id, message);
  });
  socket.on("disconnect", () => {
    socket.to(broadcaster).emit("disconnectPeer", socket.id);
  });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));

server.post("/start", async (req, res) => {
  const { startUrl, tasks } = req.body;
  console.log("Launching browser with:", startUrl, "Tasks:", tasks);

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-software-rasterizer",
      "--use-gl=egl",
      "--enable-webgl",
      "--disable-gpu-sandbox",
    ],
  });
  const context = await browser.newContext();

  const startPage = await context.newPage();
  await startPage.goto(startUrl, { timeout: 60000 });

  const broadcasterPage = await context.newPage();
  const broadcasterURL = `http://127.0.0.1:${port}/broadcaster.html`;
  await broadcasterPage.goto(broadcasterURL, { timeout: 60000 });

  res.json({ success: true, message: "Browser launched" });
});
