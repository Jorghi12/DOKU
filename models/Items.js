const mongoose = require('mongoose');

//Create the Schema for the Images
var imageSchema = new mongoose.Schema({
    timestamp   : String,
    contentType : String,
    image       : Buffer,
});

//Can get the unique id of the item by using ._id
const itemSchema = new mongoose.Schema({
  sellerId: {type: String},
  description: {type: String},
  price: {type: Number},
  images: [imageSchema],
  pickup: {type: mongoose.Schema.Types.ObjectId, ref: 'Pickup'},
  delivery: {type: mongoose.Schema.Types.ObjectId, ref: 'Delivery'},
  buyers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}], //The IDs of the accounts who want to buy the item.
  title: {type: String, default: ''},
  category: {type: String, default: ''},
  deleted: {type: Boolean, default: false},
  questions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Question'}] // List of questions
}, { timestamps: true });

const Item = mongoose.model('Item', itemSchema);
const Image = mongoose.model('Image', imageSchema);

exports.Item = Item;
exports.Image = Image;