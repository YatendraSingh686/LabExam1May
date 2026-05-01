const express = require("express");
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
const validator = require("validator");
require("dotenv").config();

const app = express();
app.use(express.json());

// ================= MongoDB Connection =================
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/urlShortener";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB Error:", err.message);
    process.exit(1);
  });

// ================= Schema =================
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  clicks: { type: Number, default: 0 },
}, { timestamps: true });

const Url = mongoose.model("Url", urlSchema);

// ================= Base URL =================
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

// ================= Create Short URL =================
app.post("/shorten", async (req, res) => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl || !validator.isURL(originalUrl)) {
      return res.status(400).json({ error: "Valid URL is required" });
    }

    // Check existing
    let existing = await Url.findOne({ originalUrl });
    if (existing) {
      return res.json({
        shortUrl: `${BASE_URL}/${existing.shortCode}`
      });
    }

    const shortCode = nanoid(6);

    const newUrl = await Url.create({
      originalUrl,
      shortCode
    });

    res.status(201).json({
      shortUrl: `${BASE_URL}/${newUrl.shortCode}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Redirect =================
app.get("/:code", async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code });

    if (!url) {
      return res.status(404).json({ error: "Short URL not found" });
    }

    url.clicks++;
    await url.save();

    return res.redirect(url.originalUrl);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Health Check =================
app.get("/", (req, res) => {
  res.send("URL Shortener Running ✅");
});

// ================= Start Server =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
});