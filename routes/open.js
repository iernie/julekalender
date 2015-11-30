var UserObject = Parse.Object.extend("Users");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var teamname = req.params.name;
	var day = req.params.day;

	var usersQuery = new Parse.Query(UserObject);
	usersQuery.equalTo("team", teamname);
	usersQuery.find().then(function(users) {
		if(users.length > 0) {
			var rand = Math.floor(Math.random() * users.length);
			res.render('partials/open', {
				title: teamname,
				teamname: teamname,
				day: day,
				winner: users[rand],
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