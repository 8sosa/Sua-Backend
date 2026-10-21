// Creates the first Classbook admin, who can then add teachers and learners from the portal.
// Usage: npm run portal:create-admin -- "Full Name" admin@example.org 'a-strong-password'
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const PortalUser = require('../Models/portal/user');

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password || password.length < 8) {
    console.error('Usage: npm run portal:create-admin -- "Full Name" email password (8+ characters)');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await PortalUser.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`An account for ${email} already exists (role: ${existing.role}).`);
    process.exit(1);
  }
  await PortalUser.create({ name, email, role: 'admin', password: await bcrypt.hash(password, 10) });
  console.log(`Created Classbook admin ${email}.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
