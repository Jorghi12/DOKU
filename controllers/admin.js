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
	
  res.render('adminpanel', {
    title: 'Admin Panel'
  });
};

