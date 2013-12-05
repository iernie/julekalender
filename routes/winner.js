var config = require("../config.js").config;
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

exports.index = function(req, res, db){
	db.collection("julekalender").find({ won: { $lt: config.giftsperuser } }, function(err, data) {
		console.log(err, data);
		if(data && data.length > 0) {
			var rand = Math.floor(Math.random()*data.length);
	    	console.log(data);

	    	res.render('winner',
				{
					title: config.title,
					data: data[rand]
				}
			);
			
		} else {
			res.redirect("/");
		}
	});
};

exports.won = function(req, res, db) {
	console.log(ObjectId(req.body.id));
	db.collection("julekalender").update({ _id: ObjectId(req.body.id) }, { $inc: { won: 1 } }, { multi: false }, function(err, updated) {});
	res.redirect("/");
}