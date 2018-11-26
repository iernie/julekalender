var _ = require('lodash');
var UserObject = Parse.Object.extend("Users");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var teamname = req.params.name;
	var day = req.params.day;

	var usersQuery = new Parse.Query(UserObject);
	usersQuery.equalTo("team", teamname);
	usersQuery.find().then(function(users) {

		var grouped = _.entries(_.groupBy(users, function(user) {
			return user.get('won') || 0;
		}));

		grouped.sort();

		if(grouped.length > 0 && grouped[0][1].length > 0) {
			var lowest = grouped[0][1];
			var rand = Math.floor(Math.random() * lowest.length);
			res.render('partials/open', {
				title: teamname,
				teamname: teamname,
				day: day,
				winner: lowest[rand],
				layout: 'layout'
			});
		} else {
			req.flash('error', 'Ingen brukere funnet.', false);
			res.redirect('/' + teamname);
		}
	});
};

exports.post = function(req, res, next) {
	var teamname = req.params.name;
	var day = req.params.day;

	var userQuery = new Parse.Query(UserObject);;
    userQuery.get(req.body.id).then(function(user) {
    	var won = user.get('won') || 0;
    	user.save({ won: won + 1 }).then(function() {
			var winner = new WinnerObject();
			winner.save({ 'team': teamname, 'user': user.id, 'day': parseInt(day) }).then(function() {
        		res.redirect('/' + teamname);
        	});
		});
    });
};