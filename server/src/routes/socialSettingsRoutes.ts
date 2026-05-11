import { Router } from "express";
import * as socialController from "../controllers/socialSettingsController";
import createUploader from "../middlewares/upload";

const router = Router();

// multer uploader (socialIcons)
const upload = createUploader("socialIcons");

router.post("/upload", upload.single("icon"), socialController.uploadIcon);
router.post("/", upload.single("icon"), socialController.createSocialSetting);
router.get("/type", socialController.getSocialSettingsByType);
router.get("/", socialController.getSocialSettings); 
router.get("/:id", socialController.getSocialSetting);

router.put("/:id", upload.single("icon"), socialController.updateSocialSetting);
router.delete("/:id", socialController.deleteSocialSetting);

export default router;
