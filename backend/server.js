require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");
const fileRoutes = require("./routes/files");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "https://ayahassan-5656.github.io"
  ]
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use("/api/files", fileRoutes);

async function startServer() {
  try {
    await connectDB(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
