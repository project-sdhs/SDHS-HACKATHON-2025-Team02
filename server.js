const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImRmMGU0OTc0Y2Y1MjRkNjM4NjlkZTgwNWFjYjhlNGM0IiwiaCI6Im11cm11cjY0In0=";

app.use(cors());
app.use(express.json());

app.post("/geocode", async (req, res) => {
  try {
    const { address } = req.body;
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}&size=1`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Geocode 오류:", error.message);
    res.status(500).json({ error: "Geocode 실패" });
  }
});

app.post("/route", async (req, res) => {
  try {
    const { start, end } = req.body;
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${ORS_API_KEY}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Route 오류:", error.message);
    res.status(500).json({ error: "Route 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

