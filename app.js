const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("./database");

const authRouter = require("./routes/authRouter");
const placeRouter = require("./routes/placeRouter");
const roomRouter = require("./routes/roomRouter");
const PORT = 3000;
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/place", placeRouter);
app.use("/api/v1/room", roomRouter);

console.log("Listening on port: " + PORT);

app.listen(PORT);
