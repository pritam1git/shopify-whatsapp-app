import express from "express";
import { serveWidget } from "../controllers/widgetController.js";

const router = express.Router();
router.get("/widget.js", serveWidget);

export default router;
