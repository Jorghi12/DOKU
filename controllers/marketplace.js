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
const Comment = require('../models/Comments').Comment;

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


// Return an image
exports.getImage = (req, res) => {
	Item.findById({_id: req.params.itemId}, function(err, item){
		/*res.writeHead(200, {
			'Content-Type': mimetype,
			'Content-Length': data.length
		});
		res.end(new Buffer(data, 'binary'));*/
	
		var imageObject = item.images[0];
		var imageString = imageObject.image.toString('binary');
		
		var im = imageString.split(",")[1];

		var img = new Buffer(im, 'base64');

		res.writeHead(200, {
		   'Content-Type': 'image/jpg',
		   'Content-Length': img.length
		});

		res.end(img); 
	});
}

/**
 * POST /comments/answerquestion
 *  - Asks a question about an item in the catalog.
 */
exports.answerQuestion = (req, res, next) => {
	if (req.user == null){
		req.flash('errors', { msg: 'Please log in to answer questions about items.' });
		return res.redirect('back');
	}
	
	//Check to see if the user owns the item
	Item.findById(req.body.item_id, function(err, item) {
		// Error you don't own the item
		if (item.sellerId != req.user._id){
			req.flash('info', { msg: 'You don\'t own this item.' });
			return res.redirect('back');
		}
	});
	
	// Create a new comment
	var comment = new Comment({
		text: req.body.answer_text,
		commenter: req.user._id,
		forQuestion: req.body.question_id
	});
	
	// Save the comment
	comment.save();
	
	// Update the question
	Question.findById(req.body.question_id, function(err, question) {
		question.comments.push(comment);
		question.save(function (err) {
			if (err){
				req.flash('errors', { msg: 'Error adding your comment to the question.' });
				return res.redirect('back');
			}
		});
		
		req.flash('success', { msg: 'Successfully added comment.' });
		return res.redirect('back');
	});
}


/**
 * POST /comments/askquestion
 *  - Asks a question about an item in the catalog.
 */
exports.askQuestion = (req,res,next) => {
	if (req.user == null){
		req.flash('info', { msg: 'Please log in to ask questions about items.' });
		return res.redirect('back');
	}
	
	// Create a new question document
	var question = new Question({
		question   : req.body.question_text,
		asker: req.user._id,
		forItem: req.body.item_id,
		comments : []
	});
	
	// Save the newly created question.
	question.save((err) => {
	    if (err) { return next(err); }
	
		// Update the item question list.
		Item.findById(req.body.item_id, function(err, item) {
			// Add the newly created question.
			item.questions.push(question);

			//Save the pickUp information
			item.save(function (err) {
				if (err) { return next(err); }
					
				req.flash('success', { msg: 'Your question has been asked!' });
				return res.redirect('back');
			});
			
		});
	});	
}


/**
 * POST /transactions/confirmDelivery
 *  - Adds the delivery date to the admin panel for our team to grab.
 */
exports.confirmDelivery = (req,res) => {
	Item.findById(req.body.item_id, function(err, item) {
		//Add the buyer to the Item's buyer list.
		if (item.buyers.indexOf(req.user._id) == -1){
			item.buyers.push(req.user._id)
		}
		
		//Save the item.
		item.save(function (err) {
			if(err) {
				//Failed to update.
				req.flash('errors', { msg: 'Failed to purchase item.' });
			}
			
			//Add the item to the Buyer's 'bought' list.
			populateUserShopInfo(req.user._id, function(user){
				if(!user) {
					//Could not find the buyer's user account
					req.flash('errors', { msg: 'Failed to purchase item.' });
				}
				//console.log(user);
				if (user.userShopInfo.buyInfo.itemsBeingPurchased.indexOf(req.params.itemId) == -1){
					user.userShopInfo.buyInfo.itemsBeingPurchased.push(req.params.itemId)
				}
				else
				{
					//User is already buying the item!
					req.flash('info', { msg: 'You\'ve already purchased the item.' });
					
					//Show the transactions page
					return exports.showMyPage(req,res);
				}
				
				//Access the actual 'buyInfo' model populated by the user account
				user.userShopInfo.buyInfo.save(
					function (err) {
						user.save(function (err) {
							if(err) {
								//Could not save the user's shop info
								req.flash('errors', { msg: 'Failed to purchase item.' });
							}
						});
					}
				)
			});
		});
		
		Delivery.findOne({item: req.body.item_id, buyerId: req.user._id}, function (err, delivery){
			if (delivery && delivery.inProgress){
				//A delivery under this item already exists
				req.flash('errors', { msg: 'Delivery already in progress!'});
				return res.redirect('/marketplace');
			}
			else if (delivery){
				//Use existing delivery document.
				delivery.deliveryLocation = req.body.deliveryLocation;
				delivery.phoneNumber = req.body.deliveryPhoneNumber;
				delivery.buyerVenmo = req.body.deliveryVenmoAccount;
				delivery.buyerId = req.user._id;
				delivery.item = item._id;
			}
			else{
				//A delivery with your buyer id doesn't exit yet.
				delivery = new Delivery();
				delivery.deliveryLocation = req.body.deliveryLocation;
				delivery.phoneNumber = req.body.deliveryPhoneNumber;
				delivery.buyerVenmo = req.body.deliveryVenmoAccount;
				delivery.buyerId = req.user._id;
				delivery.item = item._id;
			}
			
			// Save the pickUp information
			delivery.save(function (err) {
					if (err) {
						//Error.
						req.flash('errors', { msg: 'Error scheduling a delivery.'});
						
						//Show the transactions page
						return res.redirect('/marketplace');
					};
					
					// Set the pick up field for the item!
					item.delivery.push(delivery);
					item.save(function (err){
						if (err) {
							//Error.
							req.flash('errors', { msg: 'Error scheduling a delivery.'});
							
							//Show the transactions page
							return res.redirect('/marketplace');
						};
						
						req.flash('success', { msg: 'A purchase request has been sent!'});
						
						// Send an email to the buyer asking for Venmo Payment and what's next.
						exports.sendEmailToBuyerAskingForVenmo(req,res);
						
						// Send an email to the seller asking for confirmation of Item Availability.
						exports.sendEmailToSellerAskingForAvailability(req,res,item);
						
						return exports.showMyPage(req,res);
					})
			});
		});
	});
}

// Occurs when a buyer confirms a delivery. Asks the seller for item availability.
exports.sendEmailToSellerAskingForAvailability = (req, res, item) => {
	User.findOne({_id: item.sellerId}, function(err, seller){
		var sellerEmail = seller.email;
		var item_name = item.title;
		var itemId = item._id;
		var confirmation_link = req.headers.host + "/transactions/schedulepickup/" + itemId;
		
		var sellerMessage = EMAIL_CONSTANTS.sellerAvailaibilityMessage(item_name,confirmation_link);
		
		//Send email to the buyer
		const toSellerEmail = {
		  to: sellerEmail,
		  from: sellerMessage.name + ' <hello@dokumarket.com>',
		  subject: 'Item Availability | dokumarket.com',
		  html: sellerMessage.body
		};
		transporter.sendMail(toSellerEmail);
	})
}

// Occurs when the buyer confirms a delivery. Alerts us to send a personalized email.
exports.sendEmailToBuyerAskingForVenmo = (req, res) =>{
	var buyerEmail = req.user.email;
	var thename = "";
	if (req.user.profile && req.user.profile.name){
		thename = req.user.profile.name;
	}
	var buyerMessage = EMAIL_CONSTANTS.buyerVenmoMessage(thename);

	//Send email to the buyer
	const toBuyerEmail = {
	  to: buyerEmail,
	  from: buyerMessage.name + ' <hello@dokumarket.com>',
	  subject: 'Venmo Instructions | dokumarket.com',
	  text: buyerMessage.body
	};
	transporter.sendMail(toBuyerEmail);
}

// Used by exports.confirmPickUp
// This occurs when the buyer's venmo payment has been received.
exports.notifyBothBuyerAndSellerOfTransaction = (req, res, buyer, seller, item, pickup) => {
	var buyerEmail = buyer.email;
	var sellerEmail = seller.email;
	
	if (seller.profile && seller.profile.name){seller_name = seller.profile.name} else {seller_name = ""}
	if (buyer.profile && buyer.profile.name){buyer_name = buyer.profile.name} else {buyer_name = ""}
	var item_name = item.title;
	var pickup_address = pickup.pickupLocation;
	var pickup_time = pickup.pickupDateTime;
	
	var buyerMessage = EMAIL_CONSTANTS.finalConfirmationBuyer(buyer_name);
	var sellerMessage = EMAIL_CONSTANTS.finalConfirmationSeller(seller_name,item_name,pickup_address,pickup_time);
	
	//Send email to the buyer
	const toBuyerEmail = {
	  to: buyerEmail,
	  from: buyerMessage.name + ' <hello@dokumarket.com>',
	  subject: 'Complete! | dokumarket.com',
	  html: buyerMessage.body
	};
	transporter.sendMail(toBuyerEmail);

	//Send email to the seller
	const toSellerEmail = {
	  to: sellerEmail,
	  from: sellerMessage.name + ' <hello@dokumarket.com>',
	  subject: 'Complete! | dokumarket.com',
	  html: sellerMessage.body
	};
	transporter.sendMail(toSellerEmail);
}


/**
 * POST /transactions/confirmPickup
 *  - Adds the pick up date to the admin panel for our team to grab.
 */
exports.confirmPickUp = (req,res) => {
	Item.findById(req.body.item_id).populate(
			{
				path:'delivery', model:'Delivery'
			}
		).exec(function(err, item) {
		PickUp.findOne({item: req.body.item_id}, function (err, pickUp){
			if (pickUp && pickUp.inProgress){
				//A pickup under this item already exists
				req.flash('errors', { msg: 'Pick up already in progress!'});
				return res.redirect('/marketplace');
			}
			else{
				//A pickup under the item doesn't already yet exist, create one.
				pickUp = new PickUp();
				pickUp.pickupLocation = req.body.pickupLocation;
				pickUp.pickupDateTime = req.body.pickupDate;
				pickUp.sellerId = item.sellerId;
				pickUp.item = item._id;
				pickUp.phoneNumber = req.body.phoneNumber;
			}
			
			// Save the pickUp information
			pickUp.save(function (err) {
					if (err) {
						//Error.
						req.flash('errors', { msg: 'Error scheduling a pick up.'});
						
						//Show the transactions page
						return res.redirect('/marketplace');
					};
					
					// Set the pick up field for the item!
					item.pickup = pickUp;
					item.save(function (err){
						if (err) {
							//Error.
							req.flash('errors', { msg: 'Error scheduling a pick up.'});
							
							//Show the transactions page
							return res.redirect('/marketplace');
						};
						
						req.flash('success', { msg: 'A PickUp date has been successfully scheduled!'});
						
						/*var theDelivery = null;
						for (var i=0;i<item.delivery.length;i++){
							if (item.delivery[i].sentDeposit){
								theDelivery = item.delivery[i];
								break;
							}
						}
						
						User.findById(theDelivery.buyerId, function(err, buyer){
							// Send Confirmation to both the Buyer and the Seller!
							exports.notifyBothBuyerAndSellerOfTransaction(req, res, buyer, req.user, item, pickUp);
						});*/
						return exports.showMyPage(req,res);
					})
					
			});
		});
	});
}

/**
 * GET /transactions/scheduledelivery/:itemId
 *  - Obtains the item information for full view display
 */
exports.scheduleDelivery = (req, res) => {
	
	Item.findById(req.params.itemId).populate(
			{
				path:'delivery', model:'Delivery'
			}
		).exec(
	function(err, item) {
		if (item.sellerId == req.user._id){
			//Cannot schedule delivery for someone else's item
			req.flash('errors', { msg: 'You can\'t purchase your own item.'});
			
			//Show the transactions page
			return res.redirect('/marketplace');
		}
		
		//Pull the images from the Item	
		var imageStrings = [];
	    for (var i = 0;i < item.images.length; i++){
		    var image = item.images[i];
		    imageStrings.push(image.image.toString('utf8'));
	    };
		
		//Find the delivery associated with the item. (Do this in Mongo later)
		var delivery = null;
		for (var i =0;i<item.delivery.length;i++){
			if (item.delivery[i].buyerId == req.user._id){
				delivery = item.delivery[i];
				break;
			}
		}
		//Create the name friendly item map
		var mappedItem = {
			  itemId: item._id, 
			  image: imageStrings, 
			  description: item.description, 
			  price: item.price,
			  delivery: delivery
	    };
		
		res.render('marketplace/scheduleDelivery', {
		  title: 'Schedule delivery for : ' + item.title,
		  purpose: 'delivery',
		  item: mappedItem
		});
	});
}


/**
 * GET /transactions/schedulepickup/:itemId
 *  - Obtains the item information for full view display
 */
exports.schedulePickUp = (req, res) => {
	
	Item.findById(req.params.itemId).populate(
			{
				path:'pickup', model:'Pickup'
			}
		).exec(
	function(err, item) {
		if (item.sellerId != req.user._id){
			//Cannot purchase your own item
			req.flash('errors', { msg: 'Not your item to schedule.'});
			
			//Show the transactions page
			return res.redirect('/marketplace');
		}
		
		//Pull the images from the Item
		var imageStrings = [];
	    for (var i = 0;i < item.images.length; i++){
		    var image = item.images[i];
		    imageStrings.push(image.image.toString('utf8'));
	    };
		
		//Create the name friendly item map
		var mappedItem = {
			  isMyItem: item.sellerId == req.user._id, 
			  itemId: item._id, 
			  image: imageStrings, 
			  description: item.description, 
			  price: item.price,
			  pickup: item.pickup
	    };
		
		res.render('marketplace/scheduleItem', {
		  title: 'Schedule item Pick Up: ' + item.title,
		  purpose: 'pickup',
		  item: mappedItem
		});
	});
}

/**
 * GET /marketplace/fullView/:itemId
 *  - Obtains the item information for full view display
 */
exports.itemFullView = (req, res) => {
	
	Item.findById({_id: req.params.itemId}).populate(
			{
				path:'questions', model:'Question', populate: [{path:'comments', model:'Comment', populate: [{path: 'commenter', model:'User'}]},{path:'asker', model:'User'}]
			}
		).exec(

	function (err, item){
		//Pull the images from the Item
		var imageStrings = [];
	    for (var i = 0;i < item.images.length; i++){
		    var image = item.images[i];
		    imageStrings.push(image.image.toString('utf8'));
	    };
		
		console.log(item.questions)
		
		
		var mapped_questions = [];
		
		for (var i =0;i<item.questions.length;i++){
			var timestamp = moment(item._id.getTimestamp()).format('MMM DD, YYYY');
			//Add timestamps for each comment
			for (var j=0;j<item.questions[i].comments.length;j++){
				item.questions[i].comments[j].timestamp = moment(item.questions[i].comments[j]._id.getTimestamp()).format('MMM DD, YYYY');
			};
			
			mapped_questions.push({
				id: item.questions[i]._id,
				text: item.questions[i].question,
				createdAt: item.questions[i].createdAt,
				myQuestion: (req.user && (item.questions[i].asker == req.user._id)),
				comments: item.questions[i].comments,
				timestamp: timestamp,
				asker: item.questions[i].asker
			})
		}
		
	    if (req.user){
		    var myID = item.sellerId == req.user._id;
	    }
	    else{
		    var myID = false;
     	};
	  
	    //Grab the timestamp of the item
	    var timestamp = moment(item._id.getTimestamp()).format('MMM DD, YYYY');
	  
		//Create the name friendly item map
		var mappedItem = {
						  isMyItem: myID, 
						  itemId: item._id, 
						  image: imageStrings, 
						  description: item.description, 
						  price: item.price,
						  title: item.title,
						  timestamp: timestamp,
						  questions: mapped_questions
	    };
		
		res.render('marketplace/catalogItem', {
		  title: item.title,
		  item: mappedItem
		});
	});
}

/**
 * POST /transactions/buy/:itemId
 *  - Purchases an item off the site (if you aren't the seller)
 */
exports.buyItem = (req, res) => {
	if (req.user == null){
		req.flash('info', { msg: 'Please log in to purchase an item.' });
		return res.redirect('back');
	}
	Item.findById(req.params.itemId, function(err, item) {
		if (item.sellerId == req.user._id){
			//Cannot purchase your own item
			req.flash('errors', { msg: 'Cannot purchase your own item.'});
			
			//Show the transactions page
			return res.redirect('/marketplace');
		}
		
		//Directly get the buyer to schedule a delivery!
		exports.scheduleDelivery(req, res);
	});
}


/**
 * POST /transactions/update
 *  - Updates an item in the catalog (owned)
 */
exports.updateItem = (req, res) => {
	Item.findOneAndUpdate({sellerId: req.user._id, _id: req.body.itemId},{
		price: req.body.itemPrice,
		description: req.body.itemDescription,
		title: req.body.itemTitle,
		category: req.body.itemCategory
	}, function(err, item) {
		if (err){
			//Failure Message
			req.flash('errors', { msg: 'Error updating the item.'});
		}
		else if (!item){
			//No item under user's name found
			req.flash('errors', { msg: 'You do not own this item.' });
		}
		else{
			//Save the item in MongoDB
			req.flash('success', { msg: 'Successfully updated item.' });
		}
		
		//Show the transactions page
		exports.showMyPage(req,res);
  });
}

/**
 * GET /transactions/:itemId
 *  - Removes an item from the MarketPlace for sale.
 */
exports.removeItem = (req, res) => {
	Item.findOneAndRemove({sellerId: req.user._id, _id: req.params.itemId}, function(err, item) {
		if (err){
			//Failure Message
			req.flash('errors', { msg: 'Item could not be found.' });
		}
		else{
			//Success Message
			req.flash('success', { msg: 'Item successfully removed from catalog.' });
		}
		
		//Show the transactions page
		exports.showMyPage(req,res);
  });
};

/**
 * GET /transactions
 * Provides all the necessary information required for the User Information Page.
 *  - List of items sold
 *  - List of items being sold
 *  - List of items you purchased...
 */
exports.showMyPage = (req, res) => {
	if (req.user == null){
		req.flash('info', { msg: 'Please log in to access your transactions.' });
		return exports.getCatalog(req, res);
	}
	Item.find({sellerId: req.user._id}).populate(
			{
				path:'delivery', model:'Delivery'
			}
		).exec(
function(err, items) {
    var itemsToSell = [];
	
	//Pull the currently selling items.
    items.forEach(function(item) {
      var imageStrings = [];
	  for (var i = 0;i < item.images.length; i++){
		  var image = item.images[i];
		  imageStrings.push(image.image.toString('utf8'));
	  };
	  
	  /*
	  //Has someone paid?
	  var someonePaid = false;
	  for (var i =0;i<item.delivery.length;i++){
		  if (item.delivery[i].sentDeposit){
			  someonePaid = true;
			  break;
		  }
	  }
	  //readyForSchedule: someonePaid
	  */
	  var someoneBuying = item.buyers.length > 0;
	  
      itemsToSell.push({pickup: item.pickup, category: item.category, title: item.title, readyForSchedule: someoneBuying,isMyItem: item.sellerId == req.user._id, itemId: item._id, image: imageStrings, description: item.description, price: item.price});
    });

	//Pull the currently bought items.
	populateUserShopInfo(req.user._id, function(user){
		//Grab the Item IDs of items the user wants to purchase
		var itemIDs = user.userShopInfo.buyInfo.itemsBeingPurchased;

		//Map these itemIDs to actual items
		Item.find({'_id': { $in: itemIDs}}).populate(
			{
				path:'delivery', model:'Delivery'
			}
		).exec(function(err, itemsToPurchase) {
			var mappedItemsToPurchase = itemsToPurchase.map(function(item,index){
				var imageStrings = [];
				for (var i = 0;i < item.images.length; i++){
					var image = item.images[i];
					imageStrings.push(image.image.toString('utf8'));
				};
				var depositSent = false;
				for (var i =0;i<item.delivery.length;i++){
					if (item.delivery[i].buyerId == req.user._id){
						depositSent = item.delivery[i].sentDeposit;
						break;
					}
				}
				return {waitingOnDeposit: !depositSent,sellerConfirmed: (item.pickup != null),category: item.category, title: item.title, itemId: item._id, image: imageStrings, description: item.description, price: item.price};
			});
			
			var mode = 0;
			if (req.params.mode == "selling"){mode = 0};
			if (req.params.mode == "buying"){mode = 1};
			
			res.render('marketplace/transactions', {
			  title: 'My Transactions',
			  items: itemsToSell,
			  purchasedItems: mappedItemsToPurchase,
			  initialTab: mode
			});
		});
	});

  });
};

/**balajis@21.co
 * GET /marketplace/search
 * Search through Catalog items.
 */
exports.searchCatalog = (req, res) => {
  console.log("JORG DOKU");
  console.log(req.body.selectedCategory);
  var PER_PAGE = 9;
  var category = req.body.selectedCategory == "All Categories" ? ".*" : req.body.selectedCategory;
  console.log(category);
  Item.find().sort([['_id', -1]]).limit(PER_PAGE).or(
    [
		{"title": { "$regex": req.body.searchQuery, "$options": "i" }, "category":{"$regex":category, "$options": ""}},
		{"description": { "$regex": req.body.searchQuery, "$options": "i" }, "category":{"$regex":category, "$options": ""}}
	]).exec(
	function(err,items) { 
		var itemMap = [];
		//If we couldn't find any results.
		if (items == null){
			items = [];
		};
		items.forEach(function(item) {
		  var imageStrings = [];
		  for (var i = 0;i < item.images.length; i++){
			  var image = item.images[i];
			  imageStrings.push(image.image.toString('utf8'));
		  };
		  if (req.user){
			  var myID = item.sellerId == req.user._id;
		  }
		  else{
			  var myID = false;
		  };
		  
		  //Grab the timestamp of the item
		  var timestamp = moment(item._id.getTimestamp()).format('MMM DD, YYYY');
		  var shortDescription = item.description;
		  var shortTitle = item.title;
		  if (shortDescription.length >= 35) {
			  shortDescription = shortDescription.substr(0,35) + "...";
		  }
		  if (shortTitle.length >= 25) {
			  shortTitle = shortTitle.substr(0,25) + "...";
		  }
		  
		  itemMap.push({timestamp: timestamp,isMyItem: myID, itemId: item._id, image: imageStrings, description: shortDescription, price: item.price, title: shortTitle});
		});

		res.render('marketplace/index', {
		  title: 'MarketPlace',
		  category: req.body.selectedCategory,
		  search_text: req.body.searchQuery,
		  items: itemMap
		});
  });
}

/**
 * GET /marketplace/loadmore
 * Loads more catalog items.
 */
exports.catalogLoadMore = (req, res) => {
	// Category, Search Specifier, Range Requested
	var PER_PAGE = 3;
	console.log(req.query);
	var PAGE = req.query.page;
	var category = req.query.category;
	var search_query = req.query.searchQuery;
	
	//Filter Category
	if (req.query.category == null || req.query.category == "" || req.query.category == "All Categories"){
		category = ".*";
	}
	
	//Filter Search Query
	if (req.query.searchQuery == null){
		search_query = "";
	}
	
	Item.find().sort([['_id', -1]]).limit(PER_PAGE).skip(PER_PAGE * PAGE).or(
    [
		{"title": { "$regex": search_query, "$options": "i" }, "category":{"$regex":category, "$options": ""}},
		{"description": { "$regex": search_query, "$options": "i" }, "category":{"$regex":category, "$options": ""}}
	]).exec(
	function(err,items) {
		var itemMock = `<div class="col-md-4"><a href="/marketplace/fullView/ITEM_ID" style="color: inherit;text-decoration: none;cursor:pointer;"><img src="IMGSRC" style="height:280px;width:100%;margin-top:5px"/>
	  <h6 style="font-size:1.05rem;letter-spacing:0.065rem;font-family:Montserrat,sans-serif;font-weight:300">TIMESTAMP</h6><hr style='margin-bottom:7px;margin-top:7px'>
	  <b style='font-size:18px;font-family:Montserrat,sans-serif;text-transform:uppercase'>TITLE_ITEM</b>
	  <p>
		<small style='width:100%;letter-spacing:0.065rem;font-family:Montserrat,sans-serif'>DESCRIPTION_ITEM</small>
		<br>
		<span style='font-weight:bold;font-size:16px;font-family:Monsterrat, sans-serif;'>$PRICE_ITEM<span>
	  </p></a></div>`;
	  
	  var item_contents = '<div class="row">';

	  for (var i=0;i<items.length;i++){
		  var itemString = itemMock;
		  itemString = itemString.replace("ITEM_ID",items[i]._id);
		  itemString = itemString.replace("IMGSRC",items[i].images[0].image.toString('utf8'));
		  itemString = itemString.replace("TIMESTAMP",moment(items[i]._id.getTimestamp()).format('MMM DD, YYYY'));
		  
		  
		  var shortDescription = items[i].description;
		  var shortTitle = items[i].title;
		  if (shortDescription.length >= 35) {
			  shortDescription = shortDescription.substr(0,35) + "...";
		  }
		  if (shortTitle.length >= 25) {
			  shortTitle = shortTitle.substr(0,25) + "...";
		  }
		  itemString = itemString.replace("TITLE_ITEM",shortTitle);
		  itemString = itemString.replace("DESCRIPTION_ITEM",shortDescription);
		  itemString = itemString.replace("PRICE_ITEM",items[i].price);  
		  item_contents +=itemString;
	  }
	  
	  // Close the Div
	  item_contents += '</div>';
  
	  // Send the catalog information as Text
	  res.send(item_contents);
	});
}

/**
 * GET /marketplace
 * List of Catalog items.
 */
exports.getCatalog = (req, res) => {
  var PER_PAGE = 9;
  Item.find({}).sort([['_id', -1]]).limit(PER_PAGE).exec(function(err, items) {
    var itemMap = [];

    items.forEach(function(item) {
      var imageStrings = [];
	  for (var i = 0;i < item.images.length; i++){
		  var image = item.images[i];
		  imageStrings.push(image.image.toString('utf8'));
	  };
	  if (req.user){
		  var myID = item.sellerId == req.user._id;
	  }
	  else{
		  var myID = false;
	  };
	  
	  //Grab the timestamp of the item
	  var timestamp = moment(item._id.getTimestamp()).format('MMM DD, YYYY');
	  var shortDescription = item.description;
	  var shortTitle = item.title;
	  console.log(item);
	  if (shortDescription==null){
		  item.remove();
		  return;
	  }
	  if (shortDescription.length >= 27) {
		  shortDescription = shortDescription.substr(0,24) + "...";
	  }
	  if (shortTitle.length >= 25) {
		  shortTitle = shortTitle.substr(0,25) + "...";
	  }
	  
      itemMap.push({timestamp: timestamp,isMyItem: myID, itemId: item._id, image: imageStrings, description: shortDescription, price: item.price, title: shortTitle});
    });

    res.render('marketplace/index', {
      title: 'Cornell',
	  category: "All Categories",
	  search_text: "",
	  items: itemMap
    });
  });
};

exports.getSell = (req, res) => {
	//Check if logged in
	if (!req.user){
		req.flash('info', { msg: 'Login to sell an item.' });
		res.redirect('/marketplace');
	}
	
  res.render('marketplace/sell', {
    title: 'MarketPlace'
  });
};

/**
 * POST /marketplace/sell
 * Add an item to sell.
 */
exports.sellNewItem = (req, res, next) => {
	//Check if logged in
	if (!req.user){
        req.flash('info', { msg: 'Login to sell an item.' });
        res.redirect('/marketplace');
	}
	
	//Create the item
	const item = new Item({
		sellerId: req.user._id, //The site _id of the seller.
		description: req.body.description, //The description of the item
		price: req.body.price, //The price of the item
		title: req.body.itemTitle, // The title of the item
		category: req.body.itemCategory == 'Select Category' ? 'All Categories' : req.body.itemCategory, // The category of the item
		images: []
	});
	
	//Iterate through body for variables
	var imagebase = [];
	for(var key in req.body) {
	  if(req.body.hasOwnProperty(key)){
		if (key.startsWith("imagebase")){
			var buff = Buffer.from(req.body[key].toString(),'utf8');
			imagebase.push(buff);
		}
	  }
	}

	//Add the images
	for (var i = 0;i < imagebase.length;i++){
		var image = new Image();
		image.timestamp = 0;
		image.contentType = 'image/jpeg';
		image.image = imagebase[i];
		item.images.push(image);
	}
	
	//Save the item in MongoDB
	item.save((err) => {
	  if (err) { return next(err); }
        req.flash('success', { msg: 'Item added to catalog successfully.' });
        res.redirect('/marketplace');
	});
};


