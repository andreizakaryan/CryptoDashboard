const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const wss = require("./websocket");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
