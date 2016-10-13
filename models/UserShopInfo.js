const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');

//Create the UserExtension Schema
var userExtendSchema = new mongoose.Schema({
    userID: String,
	buyInfo: {type: mongoose.Schema.Types.ObjectId, ref: 'BuyerExtension'},
	sellInfo: {type: mongoose.Schema.Types.ObjectId, ref: 'SellerExtension'}
});

//Create the buyer related information
var buyerSchema = new mongoose.Schema({
	userID: String,
	itemsBeingPurchased: [String]
});

//Create the seller related information
var sellerSchema = new mongoose.Schema({
	userID: String,
	itemsForSale: [String]
});


const buyerExtension = mongoose.model('BuyerExtension', buyerSchema);
const sellerExtension = mongoose.model('SellerExtension', sellerSchema);
const userExtension = mongoose.model('UserExtension', userExtendSchema);

exports.userExtension = userExtension;
exports.populateUserShopInfo = function(userId, callback){
	User.findOne({_id: userId}).populate(
		{
			path:'userShopInfo', model:'UserExtension', populate: [{path:'buyInfo', model:'BuyerExtension'},{path:'sellInfo', model:'SellerExtension'}]
		}
		).exec(function (err, userPopulated){
			callback(userPopulated);
		}
	);
}
exports.createExtendedFields = function(user, callback){
  var buyerExt = new buyerExtension({userID: user._id});
  var sellerExt = new sellerExtension({userID: user._id});
  var userExt = new userExtension({userID: user._id, buyInfo: buyerExt._id, sellInfo: sellerExt._id});
  
  buyerExt.save(function (err){
    if (err) {
		console.log("1. Error creating account! Cannot add final fields.");
	};
	sellerExt.save(function (err){
		if (err) {
			console.log("2. Error creating account! Cannot add final fields.");
		};
		userExt.save(
			function (err) {
				if (err) {
					console.log("3. Error creating account! Cannot add final fields.");
				};
				User.findOneAndUpdate({_id: user._id},{userShopInfo: userExt._id}, function (){		
					User.findOne({_id: user._id}).populate(
						{
							path:'userShopInfo', model:'UserExtension', populate: [{path:'buyInfo', model:'BuyerExtension'},{path:'sellInfo', model:'SellerExtension'}]
						}
						).exec(function (err, out){
							console.log(out);
							//console.log(out.userShopInfo.buyInfo);
							callback();
					});
				});
			}
		);
	})
  })
}