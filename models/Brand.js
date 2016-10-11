const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: String
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;