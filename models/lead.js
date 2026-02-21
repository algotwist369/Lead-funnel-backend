const mongoose = require("mongoose");

const lead_answer_schema = new mongoose.Schema({
    question_id: mongoose.Schema.Types.ObjectId,
    question_text: String,
    answer: mongoose.Schema.Types.Mixed
});

const lead_schema = new mongoose.Schema(
    {
        business_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "business_user",
            required: true
        },

        funnel_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "funnel",
            required: true
        },

        answers: [lead_answer_schema],

        name: String,

        phone: {
            type: String,
            required: true
        },

        email: String,

        address: String,

        preferred_contact: {
            type: String,
            enum: ["call", "whatsapp"],
            default: "call"
        },

        utm: {
            source: String,
            medium: String,
            campaign: String,
            content: String
        },

        status: {
            type: String,
            enum: ["new", "contacted", "converted", "deleted"],
            default: "new"
        },

        deleted_at: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("lead", lead_schema);
