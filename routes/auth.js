// routes/auth.js - Complete Fixed Version
import express from "express";
import { startAuth, authCallback, topLevelAuth } from "../controllers/authController.js";

const router = express.Router();

// Top-level redirect route
router.get("/top-level", topLevelAuth);

// Start auth process
router.get("/", startAuth);

// Auth callback
router.get("/callback", authCallback);

export default router;