const mongoose = require('mongoose');

var imageSchema = new mongoose.Schema({
    timestamp   : String,
    contentType : String,
    image       : Buffer,
}, { strict: true });
imageSchema.index({ timestamp: 1}, { unique: true });

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;