const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const express = require("express");
const indexRouter = require("./routes/indexRouter");
const usersRouter = require("./routes/userRouter");

const app = express();

app.use(express.json());

app.use("/api", usersRouter);
app.use("/", indexRouter);

module.exports = app;
