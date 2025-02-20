const express = require("express");
const http = require("http");
const { chromium } = require("playwright");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

const port = 4000;
let broadcasters = {};

io.sockets.on("error", (e) => console.log(e));
io.sockets.on("connection", (socket) => {
  socket.on("broadcaster", (watcher) => {
    broadcasters[watcher] = socket.id;
    socket.to(watcher).emit("broadcaster");
  });
  socket.on("watcher", () => {
    socket.to(broadcasters[socket.id]).emit("watcher");
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
    socket.to(broadcasters[socket.id]).emit("disconnectPeer", socket.id);
  });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));

app.post("/start", async (req, res) => {
  const { startUrl, tasks, watcher } = req.body;
  console.log("Launching browser with:", startUrl, "Tasks:", tasks);

  try {
    const browser = await chromium.launch({
      headless: false,
      args: [
        "--start-maximized",
        "--auto-select-tab-capture-source-by-title=SharedPage",
      ],
    });
    const context = await browser.newContext({
      viewport: null,
    });

    const startPage = await context.newPage();
    await startPage.goto(startUrl, { timeout: 60000 });
    await startPage.evaluate(() => {
      document.title = "SharedPage";
    });

    const broadcasterPage = await context.newPage();
    const broadcasterURL = `http://127.0.0.1:${port}/broadcaster.html?watcher=${watcher}`;
    await broadcasterPage.goto(broadcasterURL, { timeout: 60000 });

    res.json({ success: true, message: "Browser launched" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Browser launch failed" });
  }
});
