const CONST_buyerMessage = `Greetings %buyer_name%!

We’re extremely glad that you’ve found what you’re looking for! Just 1 more step before you get your item delivered straight to your door. 

To send payment for the item, we’d kindly ask you to Venmo the correct price of the item you just purchased to @dokumarket. 

If you don’t have Venmo or would like to pay using other forms of payment, tell us! You can reach us at hello@dokumarket.com or (607) 229-7969.

Cheers!
Julian`

exports.buyerVenmoMessage = (buyer_name) => {
	var message = {
		body: CONST_buyerMessage, 
		subject: 'You’re almost there!',
		from: 'Julian from Doku',
		name: 'Julian from Doku'
	};
	
	//Parse body
	message.body = message.body.replace("%buyer_name%",buyer_name);
	
	return message;
}

const CONST_sellerAvailability = `
We're excited to tell you that someone's very interested in buying your %item_name%! If this item is still available for sale, do click the link below to confirm:

*insert link to confirmation*

Once you do, we'll pick it up from your doorstep and pay you immediately. 

Cheers!
Julian

If you have any questions, don't hesitate to contact us at hello@dokumarket.com or (607) 229-7969. `

//email seller saying click confirm to confirm this is still avail
exports.sellerAvailaibilityMessage = (item_name,confirmation_link) => {
	var message = {
		body: CONST_sellerAvailability, 
		subject: 'Someone wants to buy your item!',
		from: 'Julian from Doku',
		name: 'Julian from Doku'
	};
	
	//Parse body
	message.body = message.body.replace("%item_name%",item_name);
	message.body = message.body.replace("*insert link to confirmation*",confirmation_link);
	
	return message;
}

const CONST_finalBuyerMessage = `Greetings %buyer_name%!

Awesome, your item is on its way! We’ll be picking it up from the seller and bringing it to your doorstep as swiftly as possible. 

We want to make buying something from another student through Doku easier and faster than buying on Amazon or any other online retailer. We'll have the item at your doorstep within a day from today, so sit tight!

Thank you for buying through Doku and we hope that this experience was super enjoyable for you, as it was for us! :) 

If you have any further questions or feedback, don't hesitate to contact me at hello@dokumarket.com or (607) 229-7969.

Cheers!
Julian`;

//Sends confirmation to the buyer that the item is being delivered
exports.finalConfirmationBuyer = (buyer_name) => {
	var message = {
		body: CONST_finalBuyerMessage, 
		subject: 'Your item is on its way!',
		name: 'Julian from Doku'
	};
	
	//Parse body
	message.body = message.body.replace("%buyer_name%",buyer_name);
	
	return message;
}


const CONST_finalSellerMessage = `Hey %seller_name%!

Your %item_name% is about to be sold very, very soon! We'll be coming over to %pickup_address% at %pickup_time% to collect the item and pay you on the spot. 

More cash, less junk! 

Cheers!
Julian

If you have any questions, don't hesitate to contact us at hello@dokumarket.com or (607) 229-7969.`;

exports.finalConfirmationSeller = (seller_name,item_name,pickup_address,pickup_time) => {
	var message = {
		body: CONST_finalSellerMessage, 
		subject: 'Congratulations on selling!',
		from: 'Julian from Doku',
		name: 'Julian from Doku'
	};
	
	//Parse body
	message.body = message.body.replace("%seller_name%",seller_name);
	message.body = message.body.replace("%item_name%",item_name);
	message.body = message.body.replace("%pickup_address%",pickup_address);
	message.body = message.body.replace("%pickup_time%",pickup_time);
	
	return message;
}