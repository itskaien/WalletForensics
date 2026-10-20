require("dotenv").config();

const express = require("express");
const app = express();
const indexRouter = require("./routes/indexRouter");

app.use("/", indexRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).send(err.message);
});
