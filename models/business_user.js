const mongoose = require("mongoose");

const business_user_schema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        google_id: {
            type: String,
            required: true,
            unique: true
        },

        plan: {
            type: String,
            enum: ["free", "pro", "agency"],
            default: "free"
        },

        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("business_user", business_user_schema);
