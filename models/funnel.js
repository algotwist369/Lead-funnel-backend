const mongoose = require("mongoose");

const option_schema = new mongoose.Schema({
  label: String,
  value: String
});

const question_schema = new mongoose.Schema({
  step_number: Number,

  question_text: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["single", "multi", "input", "textarea"],
    required: true
  },

  options: [option_schema],

  is_required: {
    type: Boolean,
    default: true
  }
});

const funnel_schema = new mongoose.Schema(
  {
    business_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "business_user",
      required: true
    },

    title: {
      type: String,
      required: true
    },

    slug: {
      type: String,
      required: true,
      unique: true
    },

    description: String,

    branding: {
      logo_url: String,
      logo_public_id: String,
      background_image_url: String,
      background_image_public_id: String,
      primary_color: String,
      secondary_color: String,
      font_family: String
    },

    contact: {
      phone_number: String,
      whatsapp_number: String
    },

    questions: [question_schema],

    capture_step: {
      ask_name: { type: Boolean, default: true },
      ask_phone: { type: Boolean, default: true },
      ask_email: { type: Boolean, default: false },
      ask_address: { type: Boolean, default: false },
      phone_otp_verify: { type: Boolean, default: false }
    },

    metrics: {
      total_visits: { type: Number, default: 0 },
      total_leads: { type: Number, default: 0 }
    },

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("funnel", funnel_schema);
