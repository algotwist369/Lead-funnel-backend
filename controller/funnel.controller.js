const Funnel = require("../models/funnel.js");
const generate_slug = require("../utils/generate_slug.js");
const cloudinary = require("../utils/cloudinary.js");
const asyncHandler = require("../utils/async_handler.js");

/**
 * Helper to handle Cloudinary uploads from buffer
 */
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

/**
 * @desc    Create a new funnel
 * @route   POST /api/funnels
 * @access  Private
 */
const create_funnel = asyncHandler(async (req, res) => {
    const slug = generate_slug(req.body.title);

    const funnel = await Funnel.create({
        ...req.body,
        business_user_id: req.user._id,
        slug
    });

    res.status(201).json({ success: true, funnel });
});

/**
 * @desc    Get all funnels for the logged-in user
 * @route   GET /api/funnels
 * @access  Private
 */
const get_my_funnels = asyncHandler(async (req, res) => {
    const funnels = await Funnel.find({
        business_user_id: req.user._id
    }).lean();

    res.json({ success: true, funnels });
});

/**
 * @desc    Update funnel details
 * @route   PATCH /api/funnels/:id
 * @access  Private
 */
const update_funnel = asyncHandler(async (req, res) => {
    const updateData = { ...req.body };

    if (updateData.title) {
        updateData.slug = generate_slug(updateData.title);
    }

    const funnel = await Funnel.findOneAndUpdate(
        { _id: req.params.id, business_user_id: req.user._id },
        updateData,
        { new: true, lean: true }
    );

    if (!funnel) {
        return res.status(404).json({ success: false, message: "Funnel not found" });
    }

    res.json({ success: true, funnel });
});

/**
 * @desc    Upload branding image (logo or background)
 * @route   PATCH /api/funnels/:id/branding
 * @access  Private
 */
const upload_branding_image = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { field } = req.body;

    if (!field || !["logo", "background"].includes(field)) {
        return res.status(400).json({ success: false, message: "Valid field (logo or background) is required" });
    }

    const funnel = await Funnel.findOne({ _id: id, business_user_id: req.user._id });
    if (!funnel) {
        return res.status(404).json({ success: false, message: "Funnel not found" });
    }

    let url = "";
    let public_id = "";

    const oldPublicId = field === "logo"
        ? funnel.branding?.logo_public_id
        : funnel.branding?.background_image_public_id;

    if (req.file) {
        // Delete old image if exists
        if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId).catch(err => console.error("Cloudinary delete error:", err));
        }

        const folder = field === "logo" ? "lead_funnel/Logo" : "lead_funnel/BgImage";
        const result = await uploadToCloudinary(req.file.buffer, folder);
        url = result.secure_url;
        public_id = result.public_id;
    } else if (req.body.image) {
        // Manual URL provided
        url = req.body.image;
        if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId).catch(err => console.error("Cloudinary delete error:", err));
        }
        public_id = ""; // External URL
    } else {
        return res.status(400).json({ success: false, message: "No image provided" });
    }

    const update = {};
    if (field === "logo") {
        update["branding.logo_url"] = url;
        update["branding.logo_public_id"] = public_id;
    } else {
        update["branding.background_image_url"] = url;
        update["branding.background_image_public_id"] = public_id;
    }

    const updatedFunnel = await Funnel.findOneAndUpdate(
        { _id: id, business_user_id: req.user._id },
        { $set: update },
        { new: true, lean: true }
    );

    res.json({ success: true, url, funnel: updatedFunnel });
});

/**
 * @desc    Generic image upload (pre-creation or standalone)
 * @route   POST /api/funnels/upload
 * @access  Private
 */
const upload_image = asyncHandler(async (req, res) => {
    const { field, old_public_id } = req.body;

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file provided" });
    }

    if (old_public_id) {
        await cloudinary.uploader.destroy(old_public_id).catch(err => console.error("Cloudinary delete error:", err));
    }

    const folder = field === "logo" ? "lead_funnel/Logo" : "lead_funnel/BgImage";
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id
    });
});

/**
 * @desc    Get public funnel details by slug
 * @route   GET /api/funnels/slug/:slug
 * @access  Public
 */
const get_funnel_by_slug = asyncHandler(async (req, res) => {
    const funnel = await Funnel.findOne({
        slug: req.params.slug,
        status: "active"
    }).select("-business_user_id").lean();

    if (!funnel) {
        return res.status(404).json({ success: false, message: "Funnel not found" });
    }

    // Increment visits in background
    Funnel.updateOne(
        { _id: funnel._id },
        { $inc: { "metrics.total_visits": 1 } }
    ).catch(err => console.error("Metrics update error:", err));

    res.json({ success: true, funnel });
});

/**
 * @desc    Delete a funnel and its assets
 * @route   DELETE /api/funnels/:id
 * @access  Private
 */
const delete_funnel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const funnel = await Funnel.findOne({
        _id: id,
        business_user_id: req.user._id
    });

    if (!funnel) {
        return res.status(404).json({ success: false, message: "Funnel not found" });
    }

    // Delete associated Cloudinary assets
    if (funnel.branding?.logo_public_id) {
        await cloudinary.uploader.destroy(funnel.branding.logo_public_id).catch(err => console.error(err));
    }
    if (funnel.branding?.background_image_public_id) {
        await cloudinary.uploader.destroy(funnel.branding.background_image_public_id).catch(err => console.error(err));
    }

    await Funnel.deleteOne({ _id: id });

    res.json({ success: true, message: "Funnel deleted successfully" });
});

module.exports = {
    create_funnel,
    get_my_funnels,
    update_funnel,
    upload_branding_image,
    get_funnel_by_slug,
    delete_funnel,
    upload_image
};
