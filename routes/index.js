var config = require("../config.js").config;

exports.index = function(req, res, db){
	db.collection("julekalender-winners").find(function(err, winners) {
		var lookupWinners = {};
		for (var i = 0, len = winners.length; i < len; i++) {
		    lookupWinners[winners[i].day] = winners[i].winner
		}
		db.collection("julekalender").find(function(errr, users) {
			var lookupUsers = {};
			for (var i = 0, len = users.length; i < len; i++) {
			    lookupUsers[users[i]._id] = users[i]
			}
			res.render('index',
				{
					title: config.title,
					winners: lookupWinners,
					users: lookupUsers
				}
			);
		});
	});
};