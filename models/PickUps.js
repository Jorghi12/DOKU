const mongoose = require('mongoose');

//Can get the unique id of the item by using ._id
const pickupSchema = new mongoose.Schema({
  pickupLocation: {type: String},
  pickupDateTime: {type: String},
  sellerId: {type: String},
  inProgress: {type: Boolean},
  item: {type: mongoose.Schema.Types.ObjectId, ref: 'Item'}
}, { timestamps: true });

const Pickup = mongoose.model('Pickup', pickupSchema);

exports.Pickup = Pickup;