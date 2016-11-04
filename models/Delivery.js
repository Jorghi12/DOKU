const mongoose = require('mongoose');

//Can get the unique id of the item by using ._id
const deliverySchema = new mongoose.Schema({
  deliveryLocation: {type: String},
  buyerId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  buyerVenmo: {type: String},
  sentDeposit: {type: Boolean, default: false},
  depositAmount: {type: Number},
  inProgress: {type: Boolean},
  item: {type: mongoose.Schema.Types.ObjectId, ref: 'Item'},
  phoneNumber: {type: String}
}, { timestamps: true });

const Delivery = mongoose.model('Delivery', deliverySchema);

exports.Delivery = Delivery;