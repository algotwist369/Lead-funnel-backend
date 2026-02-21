const express = require("express");
const {
    create_funnel,
    get_my_funnels,
    get_funnel_by_slug,
    update_funnel,
    upload_branding_image,
    delete_funnel,
    upload_image
} = require("../controller/funnel.controller.js");
const { protect } = require("../middlewares/auth.middleware.js");
const upload = require("../middlewares/upload.middleware.js");

const router = express.Router();

router.post("/", protect, create_funnel);
router.get("/my", protect, get_my_funnels);
router.put("/:id", protect, update_funnel);
router.delete("/:id", protect, delete_funnel);

router.post("/:id/branding/upload", protect, upload.single("image"), upload_branding_image);
router.post("/upload", protect, upload.single("image"), upload_image);

router.get("/public/:slug", get_funnel_by_slug);

module.exports = router;
