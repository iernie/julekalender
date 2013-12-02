var config = require("../config.js").config;

exports.index = function(req, res, db){
  	res.render('register', {
  		title: config.title
  	});
};

exports.save = function(req, res, db){
	var user = req.body;
	user.won = 0;
	console.log(user);
	db.collection("julekalender").save(user);
	res.redirect("/register");
};