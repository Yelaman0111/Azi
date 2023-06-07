const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("./database");
const cors = require("cors");

const authRouter = require("./routes/authRouter");
const placeRouter = require("./routes/placeRouter");
const roomRouter = require("./routes/roomRouter");
const startSocketServer = require("./socket");
const PORT = 3000;
const app = express();

const server = app.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: { origin: "*" },
});
startSocketServer(io)

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

app.use(cors({ origin: true, credentials: true }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/place", placeRouter);
app.use("/api/v1/room", roomRouter);

console.log("Listening on port: " + PORT);
