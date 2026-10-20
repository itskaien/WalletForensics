require("dotenv").config();

const express = require("express");
const app = express();
const indexRouter = require("./routes/indexRouter");
const usersRouter = require("./routes/userRouter");

app.use(express.json());
app.use("/api", usersRouter);
app.use("/", indexRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }

  console.log(`Server is running on port ${PORT}`);
});
