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
		

exports.getAdminPanel = (req, res) => {
  //Need some security to verify if they belong on our team... ;)
	
  res.render('adminpanel', {
    title: 'Admin Panel'
  });
};

