var config = require("../config.js").config;
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

exports.index = function(req, res, db) {
	db.collection("julekalender").find(function(err, data) {
		console.log(data);
		res.render("users", {
			title: config.title,
			users: data
		});
	});
}

exports.edit = function(req, res, db) {
	db.collection("julekalender").update({_id: ObjectId(req.body.id)},
	{
		"navn": req.body.navn,
		"won": parseInt(req.body.won),
		"image": req.body.image
	}, { multi: false }, function(err, updated) {
		console.log(err, updated);
		res.redirect("/users");
	});
}