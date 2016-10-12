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
		Delivery.findOne({item: req.body.item_id}, function (err, delivery){
			if (delivery && delivery.inProgress){
				//A delivery under this item already exists
				req.flash('errors', { msg: 'Delivery already in progress!'});
				return res.redirect('/marketplace');
			}
			else{
				//A pickup under the item doesn't already yet exist, create one.
				delivery = new Delivery();
				delivery.deliveryLocation = req.body.deliveryLocation;
				delivery.phoneNumber = req.body.deliveryPhoneNumber;
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
					item.delivery = delivery;
					item.save(function (err){
						if (err) {
							//Error.
							req.flash('errors', { msg: 'Error scheduling a delivery.'});
							
							//Show the transactions page
							return res.redirect('/marketplace');
						};
						
						req.flash('success', { msg: 'A delivery has been successfully scheduled!'});
						return exports.showMyPage(req,res);
					})
					
			});
		});
	});
}


/**
 * POST /transactions/confirmPickup
 *  - Adds the pick up date to the admin panel for our team to grab.
 */
exports.confirmPickUp = (req,res) => {
	Item.findById(req.body.item_id, function(err, item) {
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
		
		//Create the name friendly item map
		var mappedItem = {
			  itemId: item._id, 
			  image: imageStrings, 
			  description: item.description, 
			  price: item.price,
			  delivery: item.delivery
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
				path:'questions', model:'Question', populate: [{path:'comments', model:'Comment'}]
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
			mapped_questions.push({
				text: item.questions[i].question,
				createdAt: item.questions[i].createdAt,
				myQuestion: (item.questions[i].asker == req.user._id),
				comments: item.questions[i].comments
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
		console.log("#GAINZ");
		console.log(mapped_questions);
		res.render('marketplace/catalogItem', {
		  title: 'Marketplace: ' + item.title,
		  item: mappedItem
		});
	});
}

/**
 * POST /transactions/buy/:itemId
 *  - Purchases an item off the site (if you aren't the seller)
 */
exports.buyItem = (req, res) => {
	Item.findById(req.params.itemId, function(err, item) {
		if (item.sellerId == req.user._id){
			//Cannot purchase your own item
			req.flash('errors', { msg: 'Cannot purchase your own item.'});
			
			//Show the transactions page
			return res.redirect('/marketplace');
		}
		
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
							
							//Success!
							req.flash('success', { msg: 'Item successfully bought!' });
							
							//Show the transactions page
							exports.showMyPage(req,res);
						});
					}
				)
			});
		});
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
		res.render('home', {
		  title: 'Marketplace'
		});
		return;
	}
	Item.find({sellerId: req.user._id}, function(err, items) {
    var itemsToSell = [];
	
	//Pull the currently selling items.
    items.forEach(function(item) {
      var imageStrings = [];
	  for (var i = 0;i < item.images.length; i++){
		  var image = item.images[i];
		  imageStrings.push(image.image.toString('utf8'));
	  };
      itemsToSell.push({pickup: item.pickup, category: item.category, title: item.title, readyForSchedule: item.buyers.length > 0,isMyItem: item.sellerId == req.user._id, itemId: item._id, image: imageStrings, description: item.description, price: item.price});
    });

	//Pull the currently bought items.
	populateUserShopInfo(req.user._id, function(user){
		//Grab the Item IDs of items the user wants to purchase
		var itemIDs = user.userShopInfo.buyInfo.itemsBeingPurchased;

		//Map these itemIDs to actual items
		Item.find({'_id': { $in: itemIDs}}, function(err, itemsToPurchase){
			var mappedItemsToPurchase = itemsToPurchase.map(function(item,index){
				var imageStrings = [];
				for (var i = 0;i < item.images.length; i++){
					var image = item.images[i];
					imageStrings.push(image.image.toString('utf8'));
				};
				return {buyerConfirmed: (item.delivery != null),sellerConfirmed: (item.pickup != null),category: item.category, title: item.title, itemId: item._id, image: imageStrings, description: item.description, price: item.price};
			});
			
			res.render('marketplace/transactions', {
			  title: 'My Transactions',
			  items: itemsToSell,
			  purchasedItems: mappedItemsToPurchase
			});
		});
	});

  });
};

/**
 * GET /marketplace/search
 * Search through Catalog items.
 */
exports.searchCatalog = (req, res) => {
  console.log("JORG DOKU");
  console.log(req.body.selectedCategory);
  var category = req.body.selectedCategory == "All Categories" ? ".*" : req.body.selectedCategory;
  console.log(category);
  Item.find().or(
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
		  if (shortDescription.length >= 27) {
			  shortDescription = shortDescription.substr(0,24) + "...";
		  }
		  
		  itemMap.push({timestamp: timestamp,isMyItem: myID, itemId: item._id, image: imageStrings, description: shortDescription, price: item.price, title: item.title});
		});

		res.render('marketplace/index', {
		  title: 'MarketPlace',
		  items: itemMap
		});
  });
}


/**
 * GET /marketplace
 * List of Catalog items.
 */
exports.getCatalog = (req, res) => {
  Item.find({}, function(err, items) {
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
	  console.log(item);
	  if (shortDescription==null){
		  item.remove();
		  return;
	  }
	  if (shortDescription.length >= 27) {
		  shortDescription = shortDescription.substr(0,24) + "...";
	  }
	  
      itemMap.push({timestamp: timestamp,isMyItem: myID, itemId: item._id, image: imageStrings, description: shortDescription, price: item.price, title: item.title});
    });

    res.render('marketplace/index', {
      title: 'MarketPlace',
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
		category: req.body.itemCategory, // The category of the item
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


