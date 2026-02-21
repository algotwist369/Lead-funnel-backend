const mongoose = require("mongoose");

const question_bank_schema = new mongoose.Schema(
    {
        business_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "business_user"
        },

        question_text: String,

        type: {
            type: String,
            enum: ["single", "multi", "input", "textarea"]
        },

        options: [
            {
                label: String,
                value: String
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("question_bank", question_bank_schema);
