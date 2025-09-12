import express from "express";
import { installWidget, getSettings } from "../controllers/apiController.js";

const router = express.Router();
router.post("/install-widget", installWidget);
router.get("/get-settings", getSettings);

export default router;
