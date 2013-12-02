var config = require("../config.js").config;
var mongojs = require("mongojs");
var db = mongojs(config.database);

exports.index = function(req, res){
  	res.render('register');
};

exports.save = function(req, res){
	console.log(req.body);
	db.collection("julekalender").save(req.body);
	res.redirect("/");
};