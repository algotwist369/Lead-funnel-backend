const Lead = require("../models/lead.js");
const Funnel = require("../models/funnel.js");
const PDFDocument = require("pdfkit");
const asyncHandler = require("../utils/async_handler.js");

/**
 * @desc    Submit a new lead
 * @route   POST /api/leads
 * @access  Public
 */
const submit_lead = asyncHandler(async (req, res) => {
    const { funnel_id } = req.body;

    const funnel = await Funnel.findById(funnel_id);
    if (!funnel) {
        return res.status(404).json({ success: false, message: "Invalid funnel" });
    }

    // Create lead
    const lead = await Lead.create({
        ...req.body,
        business_user_id: funnel.business_user_id
    });

    // Update metrics (Background task-like)
    await Funnel.updateOne(
        { _id: funnel._id },
        { $inc: { "metrics.total_leads": 1 } }
    );

    // Return populated lead
    const populatedLead = await Lead.findById(lead._id)
        .populate("funnel_id", "title slug")
        .lean();

    const formattedLead = {
        ...populatedLead,
        funnel_title: populatedLead.funnel_id?.title || null,
        funnel_slug: populatedLead.funnel_id?.slug || null
    };

    res.status(201).json({
        success: true,
        lead: formattedLead
    });
});

/**
 * @desc    Get leads for the logged-in business user
 * @route   GET /api/leads/my
 * @access  Private
 */
const get_my_leads = asyncHandler(async (req, res) => {
    const leads = await Lead.find({
        business_user_id: req.user._id,
        status: { $ne: "deleted" }
    })
        .populate("funnel_id", "title slug")
        .sort({ createdAt: -1 })
        .lean();

    const formattedLeads = leads.map((lead) => ({
        ...lead,
        funnel_title: lead.funnel_id?.title || null,
        funnel_slug: lead.funnel_id?.slug || null
    }));

    res.json({ success: true, leads: formattedLeads });
});

/**
 * @desc    Update lead status
 * @route   PATCH /api/leads/:id/status
 * @access  Private
 */
const update_lead_status = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["new", "contacted", "converted"];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid status value"
        });
    }

    const lead = await Lead.findOneAndUpdate(
        { _id: id, business_user_id: req.user._id },
        { status },
        { new: true, lean: true }
    );

    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, lead });
});

/**
 * @desc    Soft delete a lead
 * @route   PATCH /api/leads/:id/delete
 * @access  Private
 */
const delete_lead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findOneAndUpdate(
        {
            _id: id,
            business_user_id: req.user._id,
            status: { $ne: "deleted" }
        },
        { status: "deleted", deleted_at: new Date() },
        { new: true, lean: true }
    );

    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, lead });
});

/**
 * @desc    Restore a soft-deleted lead
 * @route   PATCH /api/leads/:id/restore
 * @access  Private
 */
const restore_lead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findOne({
        _id: id,
        business_user_id: req.user._id
    });

    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (lead.status !== "deleted" || !lead.deleted_at) {
        return res.status(400).json({
            success: false,
            message: "Lead is not deleted"
        });
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diffMs = Date.now() - lead.deleted_at.getTime();

    if (diffMs > sevenDaysMs) {
        await Lead.deleteOne({ _id: lead._id, business_user_id: req.user._id });

        return res.status(410).json({
            success: false,
            message: "Lead permanently deleted after 7 days"
        });
    }

    lead.status = "new";
    lead.deleted_at = null;
    await lead.save();

    res.json({ success: true, lead: lead.toObject() });
});

/**
 * @desc    Export leads to PDF
 * @route   GET /api/leads/export/pdf
 * @access  Private
 */
const export_leads_pdf = asyncHandler(async (req, res) => {
    // Set headers early
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="leads_export.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(20).text("Leads Export Report", { align: "center" });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    // Using cursor-based streaming to avoid loading all leads into memory at once
    const cursor = Lead.find({
        business_user_id: req.user._id,
        status: { $ne: "deleted" }
    })
        .populate("funnel_id", "title")
        .sort({ createdAt: -1 })
        .lean()
        .cursor();

    let leadCount = 0;

    for (let lead = await cursor.next(); lead != null; lead = await cursor.next()) {
        leadCount++;

        // Add a page if lead details won't fit (simplified check)
        if (doc.y > 700) doc.addPage();

        const funnelTitle = lead.funnel_id?.title || "N/A";

        doc.fontSize(12).fillColor("#444").text(`Project: ${funnelTitle}`, { underline: true });
        doc.fontSize(10).fillColor("#000")
            .text(`Name: ${lead.name || "N/A"}`)
            .text(`Phone: ${lead.phone || "N/A"}`);

        if (lead.email) doc.text(`Email: ${lead.email}`);

        doc.text(`Status: ${lead.status}`)
            .text(`Preferred Contact: ${lead.preferred_contact || "call"}`);

        if (lead.utm && (lead.utm.source || lead.utm.medium || lead.utm.campaign)) {
            const utmStr = [
                lead.utm.source && `Source: ${lead.utm.source}`,
                lead.utm.medium && `Medium: ${lead.utm.medium}`,
                lead.utm.campaign && `Campaign: ${lead.utm.campaign}`
            ].filter(Boolean).join(" | ");
            doc.fontSize(8).fillColor("#777").text(`UTM: ${utmStr}`).fillColor("#000").fontSize(10);
        }

        if (lead.answers && lead.answers.length > 0) {
            doc.moveDown(0.2);
            doc.text("Questionnaire Answers:", { continued: false, weight: 'bold' });
            lead.answers.forEach((ans) => {
                doc.text(`  • ${ans.question_text}: ${ans.answer}`);
            });
        }

        doc.moveDown();
        doc.rect(doc.x, doc.y, 515, 0.5).fill("#eee"); // Horizontal line
        doc.moveDown();
    }

    if (leadCount === 0) {
        doc.text("No leads found matching the criteria.");
    }

    doc.end();
});

module.exports = {
    submit_lead,
    get_my_leads,
    update_lead_status,
    delete_lead,
    restore_lead,
    export_leads_pdf
};
