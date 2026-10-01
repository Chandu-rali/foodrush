const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

/* Middleware */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/* Home API */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FoodRush Backend API is running",
    version: "1.0.0"
  });
});

/* Health Check */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "FoodRush Backend",
    status: "healthy"
  });
});

/* Test API */

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "FoodRush API is working"
  });
});

/* Start Server */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FoodRush backend running on port ${PORT}`);
});
