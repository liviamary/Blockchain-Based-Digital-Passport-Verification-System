// server.js

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 🔽 Required for ES modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 FORCE dotenv to load backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// ------------------ DEBUG (temporary) ------------------
console.log("RPC_URL =", process.env.RPC_URL);
console.log("CONTRACT_ADDRESS =", process.env.CONTRACT_ADDRESS);
// ------------------------------------------------------

import express from "express";
import cors from "cors";
import passportRoutes from "./routes/passport.js";
import adminDecryptRoute from "./routes/adminDecrypt.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/passport", passportRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
