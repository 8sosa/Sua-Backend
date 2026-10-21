const mongoose = require('mongoose');

// A Classbook (learning portal) account. Separate from Admin, which is the shop admin.
const PortalUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    // Students belong to one cohort; teachers can teach several.
    cohort: { type: String, trim: true },
    cohorts: [{ type: String, trim: true }],
    subjects: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

PortalUserSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    cohort: this.cohort || null,
    cohorts: this.cohorts || [],
    subjects: this.subjects || [],
    active: this.active,
    mustChangePassword: this.mustChangePassword,
    lastLoginAt: this.lastLoginAt || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('PortalUser', PortalUserSchema);
