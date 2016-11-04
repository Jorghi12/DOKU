const ItemLib = require('../models/Items');
const Item = ItemLib.Item;
const Image = ItemLib.Image;
const User = require('../models/User');
const moment = require('moment');
const createExtendedFields = require('../models/UserShopInfo').createExtendedFields;
const populateUserShopInfo = require('../models/UserShopInfo').populateUserShopInfo;
const PickUp = require('../models/PickUps').Pickup;
const Delivery = require('../models/Delivery').Delivery;

const Question = require('../models/Comments').Question;
const Comment = require('../models/Comments').Comments;

const EMAIL_CONSTANTS = require('../email_strings/Emails');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.dokumarket.com',
  port: 25,
  auth: {
	user: process.env.DOKUMARKET_EMAIL_USER,
	pass: process.env.DOKUMARKET_EMAIL_PASSWORD
  },
  tls: {rejectUnauthorized: false}
});

//Update the venmo information for deliveries.		
exports.postVenmoDeposit = (req,res) => {
	//Find the delivery that's using a specific venmo account
	var venmo = req.body.venmo;
	var deposit = req.body.deposit;
	
	Delivery.findOne({buyerVenmo:venmo}).populate(
			{
				path:'item', model:'Item'
			}
		).exec(function(err,delivery){
		if (delivery == null){
			req.flash('errors', { msg: 'Could not find a delivery associated with the venmo account: ' + venmo + '.'});
			return res.redirect('/admin');
		}
		if (err) {
			req.flash('errors', { msg: err});
			return res.redirect('/admin');
		}
		if (delivery.item.price == deposit){
			delivery.sentDeposit = true;
			delivery.depositAmount = deposit;
			delivery.save(function (err){
				req.flash('success', { msg: 'Successfully verified the deposit value: $' + deposit + ' of venmo account "' + venmo + '".' });
				return res.redirect('/admin');
			})
		}
		else{
			req.flash('errors', { msg: 'The price is not enough. Venmo user provided $' + deposit + '. The item costs $' + delivery.item.price + '.'});
			return res.redirect('/admin');
		}
		
	})
}

exports.getAdminPanel = (req, res) => {
  //Need some security to verify if they belong on our team... ;)
  User.find({}).exec(function(err, users) {
	  Item.find({}).sort([['_id', -1]]).populate(
			{
				path:'sellerId', model:'User'
			}
		).exec(function(err, items) {
			
		PickUp.find({}).populate(
				[{path:'sellerId', model:'User'}, {path:'item', model:'Item'}]
			).exec(function(err, pickups) {
			Delivery.find({}).populate(
				[{path:'buyerId', model:'User'}, {path:'item', model:'Item'}]
			).exec(function(err, deliveries) {
				var transactions = [];
				var mapPickups = {};
				for (var i =0;i<pickups.length;i++){
					var pickup = pickups[i];
					mapPickups[pickup.item._id] = pickup;
				}
				
				var mapDeliveries = {};
				for (var i =0;i<deliveries.length;i++){
					var delivery = deliveries[i];
					mapDeliveries[delivery.item._id] = delivery;
				}
				
				//Hey you look like an Alien.
				for (var key in mapPickups) {
				  if (mapDeliveries.hasOwnProperty(key)) {
					var pickup = mapPickups[key];
					var deliv = mapDeliveries[key];
					var object = {
						seller: pickup.sellerId,
						buyer: deliv.buyerId,
						pickup_time: pickup.pickupDateTime,
						pickup_location: pickup.pickupLocation,
						delivery_location: deliv.deliveryLocation
					};
					transactions.push(object);
				  }
				}
				
				//Render page!
			    res.render('adminpanel', {
				    title: 'Admin Panel',
			  	    users: users,
				    items: items,
				    transactions: transactions
			    });
				
			})
		})
	  });
  });
};

