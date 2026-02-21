const jwt = require("jsonwebtoken");
const BusinessUser = require("../models/business_user.js");

const protect = async (req, res, next) => {
    try {
        const headerToken = req.headers.authorization?.split(" ")[1];
        let token = headerToken;

        if (!token && req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token && req.url) {
            const match = req.url.match(/[?&]token=([^&]+)/);
            if (match && match[1]) {
                token = decodeURIComponent(match[1]);
            }
        }

        if (!token) return res.status(401).json({ message: "Not authorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await BusinessUser.findById(decoded.user_id);

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = {
    protect
};
