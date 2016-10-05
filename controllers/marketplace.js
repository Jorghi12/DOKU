const ItemLib = require('../models/Items');
const Item = ItemLib.Item;
const Image = ItemLib.Image;
const User = require('../models/User');
const createExtendedFields = require('../models/UserShopInfo').createExtendedFields;
const populateUserShopInfo = require('../models/UserShopInfo').populateUserShopInfo;
const PickUp = require('../models/PickUps').Pickup;

/**
 * GET /transactions/confirmPickup/:itemId
 *  - Adds the pick up date to the admin panel for our team to grab.
 */
exports.confirmPickUp = (req,res) => {
	Item.findById(req.params.itemId, function(err, item) {
		PickUp.findOne({item: req.params.itemId}, function (err, pickUp){
			if (pickUp){
				//A pickup under this item already exists
				if (pickUp.inProgress){
					req.flash('errors', { msg: 'Pick up already in progress!'});
					return res.redirect('/marketplace');
				}
			}
			else{
				//A pickup under the item doesn't already yet exist, create one.
				var pickUp = new PickUp();
				pickUp.pickupLocation = req.body.pickupLocation;
				pickUp.pickupDateTime = req.body.pickupDate;
				pickUp.sellerId = item.sellerId;
				pickUp.item = item._id;
			}
			
			//Save the pickUp information
			pickUp.save(function (err) {
					if (err) {
						//Cannot purchase your own item
						req.flash('errors', { msg: 'Error scheduling a pick up.'});
						
						//Show the transactions page
						return res.redirect('/marketplace');
					};
					
					
					req.flash('success', { msg: 'Successfully assigned a pick up for your item!'});
					return res.redirect('/marketplace');
			});
		});
	});
}


/**
 * GET /transactions/schedulepickup/:itemId
 *  - Obtains the item information for full view display
 */
exports.schedulePickUp = (req, res) => {
	Item.findById(req.params.itemId, function(err, item) {
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
		    imageStrings.push(image.image.toString('base64'));
	    };
		
		//Create the name friendly item map
		var mappedItem = {
			  isMyItem: item.sellerId == req.user._id, 
			  itemId: item._id, 
			  image: imageStrings, 
			  description: item.description, 
			  price: item.price
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
	Item.findById(req.params.itemId, function(err, item) {
		//Pull the images from the Item
		var imageStrings = [];
	    for (var i = 0;i < item.images.length; i++){
		    var image = item.images[i];
		    imageStrings.push(image.image.toString('base64'));
	    };
		
		//Create the name friendly item map
		var mappedItem = {
						  isMyItem: item.sellerId == req.user._id, 
						  itemId: item._id, 
						  image: imageStrings, 
						  description: item.description, 
						  price: item.price
	    };
		
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
				console.log(user);
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
		description: req.body.itemDescription
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
		  imageStrings.push(image.image.toString('base64'));
	  };
      itemsToSell.push({readyForSchedule: item.buyers.length > 0,isMyItem: item.sellerId == req.user._id, itemId: item._id, image: imageStrings, description: item.description, price: item.price});
    });

	//Pull the currently bought items.
	createExtendedFields(req.user, function(){
			populateUserShopInfo(req.user._id, function(user){
			//Grab the Item IDs of items the user wants to purchase
			var itemIDs = user.userShopInfo.buyInfo.itemsBeingPurchased;

			//Map these itemIDs to actual items
			Item.find({'_id': { $in: itemIDs}}, function(err, itemsToPurchase){
				var mappedItemsToPurchase = itemsToPurchase.map(function(item,index){
					var imageStrings = [];
					for (var i = 0;i < item.images.length; i++){
						var image = item.images[i];
						imageStrings.push(image.image.toString('base64'));
					};
					return {itemId: item._id, image: imageStrings, description: item.description, price: item.price};
				});
				
				res.render('marketplace/transactions', {
				  title: 'My Transactions',
				  items: itemsToSell,
				  purchasedItems: mappedItemsToPurchase
				});
			});
		});
	});
  });
};

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
		  imageStrings.push(image.image.toString('base64'));
	  };
      itemMap.push({isMyItem: item.sellerId == req.user._id, itemId: item._id, image: imageStrings, description: item.description, price: item.price});
    });

    res.render('marketplace/index', {
      title: 'MarketPlace',
	  items: itemMap
    });
  });
};

exports.getSell = (req, res) => {
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
		title: req.body.item_title, // The title of the item
		images: []
	});


	//Add the images
	var image = new Image();
	image.timestamp = 0;
	image.contentType = req.file.mimetype;
	image.image = req.file.buffer;
	item.images.push(image);
	
	//Save the item in MongoDB
	item.save((err) => {
	  if (err) { return next(err); }
        req.flash('success', { msg: 'Item added to catalog successfully.' });
        res.redirect('/marketplace');
	});
};


