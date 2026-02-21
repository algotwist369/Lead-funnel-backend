const express = require("express");
const {
    submit_lead,
    get_my_leads,
    update_lead_status,
    delete_lead,
    restore_lead,
    export_leads_pdf
} = require("../controller/lead.controller.js");
const { protect } = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.post("/", submit_lead);

router.get("/my", protect, get_my_leads);
router.get("/export/pdf", protect, export_leads_pdf);
router.patch("/:id/status", protect, update_lead_status);
router.patch("/:id/delete", protect, delete_lead);
router.patch("/:id/restore", protect, restore_lead);

module.exports = router;
