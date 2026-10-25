const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const express = require("express");
const app = express();
const cors = require("cors");
const indexRouter = require("./routes/indexRouter");
const usersRouter = require("./routes/userRouter");

app.use(cors());
app.use(express.json());

app.use("/api", usersRouter);
app.use("/", indexRouter);

module.exports = app;
