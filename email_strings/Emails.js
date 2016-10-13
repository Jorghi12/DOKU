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
		from: 'Julian from Doku'
	};
	
	//Parse body
	body.replace("%buyer_name%",buyer_name);
	
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
		from: 'Julian from Doku'
	};
	
	//Parse body
	body.replace("%item_name%",item_name);
	body.replace("*insert link to confirmation*",confirmation_link);
	
	return message;
}