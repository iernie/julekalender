var config = require("../config.js").config;
var mongojs = require("mongojs");
var db = mongojs(config.database);
var srand = require('srand');
srand.seed(Date.now());

exports.index = function(req, res){
	db.collection("julekalender").runCommand('count', function(err, count) {
		if(count && count.n) {
			var rand = Math.floor(srand.random()*count.n);
		    db.collection("julekalender").find(function(err2, data) {
		    	console.log(data);

		    	db.collection("julekalender").update({_id: data[rand]._id}, {$inc:{won:1}}, {multi:false}, function() {});

		    	res.render('winner',
					{
						name: data[rand].navn
					}
				);
			});
		} else {
			res.redirect("/");
		}
	});
};