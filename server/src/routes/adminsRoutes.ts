import { Router } from "express";
import { getMe } from "../controllers/adminsController";
import { authMiddleware } from "../middlewares/authMiddleware";
const adminsController = require("../controllers/adminsController");
const router = Router();

router.get("/me",  authMiddleware, getMe);

router.get("/", authMiddleware, adminsController.getAllAdmins);
router.get("/:id", authMiddleware, adminsController.getAdmin);
router.post("/", authMiddleware, adminsController.createAdmin);
router.put("/:id", authMiddleware, adminsController.updateAdmin);
router.delete("/:id", authMiddleware, adminsController.deleteAdmin);
export default router;
