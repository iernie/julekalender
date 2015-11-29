var UserObject = Parse.Object.extend("Users");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var teamname = req.params.name;
	var day = req.params.day;

	var users = new Parse.Query(UserObject);
	users.equalTo("team", teamname);
	users.find().then(function(result) {
		if(result.length > 0) {
			var rand = Math.floor(Math.random() * result.length);
			res.render('partials/open', {
				title: teamname,
				teamname: teamname,
				day: day,
				winner: result[rand],
				layout: 'layout'
			});
		} else {
			res.redirect('/' + teamname);
		}
	});
};

exports.post = function(req, res, next) {
	var teamname = req.params.name;
	var day = req.params.day;

	var query = new Parse.Query(UserObject);;
    query.get(req.body.id).then(function(user) {
    	var won = user.get('won') || 0;
    	user.save({ won: won + 1 }).then(function() {
			var winner = new WinnerObject();
			winner.save({ 'team': teamname, 'user': user.id, 'day': parseInt(day) }).then(function() {
        		res.redirect('/' + teamname);
        	});
		});
    });
};