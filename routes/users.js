var config = require("../config.js").config;

exports.index = function(req, res, db) {
	db.collection("julekalender").find(function(err, data) {
		console.log(data);
		res.render("users", {
			title: config.title,
			users: data
		});
	});
}