const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const BusinessUser = require("../models/business_user.js");
const asyncHandler = require("../utils/async_handler.js");

const getGoogleAudiences = () => {
    const fallbackClientIds = [
        "1035838949713-7atp6lfctnsk8modn8r537ce7mbo1snn.apps.googleusercontent.com",
        "437429633678-mosk9iguvlap3htfu3nd6qh50sgvq05j.apps.googleusercontent.com"
    ];

    return [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_IDS,
        ...fallbackClientIds
    ]
        .filter(Boolean)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);
};

const googleClient = new OAuth2Client();

/**
 * @desc    Google Login / Register
 * @route   POST /api/auth/google
 * @access  Public
 */
const google_login = asyncHandler(async (req, res) => {
    const { id_token } = req.body;

    if (!id_token) {
        return res.status(400).json({ success: false, message: "id_token is required" });
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: getGoogleAudiences()
    });

    const payload = ticket.getPayload();
    const { sub: google_id, email, name } = payload;

    if (!email || !google_id) {
        return res.status(400).json({ success: false, message: "Invalid Google token" });
    }

    let user = await BusinessUser.findOne({ email });

    if (!user) {
        user = await BusinessUser.create({
            name,
            email,
            google_id
        });
    }

    const token = jwt.sign(
        { user_id: user._id },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES || "7d"
        }
    );

    res.status(200).json({
        success: true,
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            google_id: user.google_id
        }
    });
});

module.exports = {
    google_login
};
