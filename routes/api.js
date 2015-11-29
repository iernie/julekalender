var UserObject = Parse.Object.extend("Users");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var teamname = req.params.name;
	var today = new Date().getDate();

	var query = new Parse.Query(WinnerObject);
	query.equalTo("team", teamname);
	query.equalTo("day", today);
	query.first().then(function(winner) {
		if(winner) {
			var users = new Parse.Query(UserObject);
		    users.get(winner.get('user')).then(function(user) {
		        var parseFile = user.get('picture');
		        if(parseFile) {
		            res.json({
						name: user.get('name'),
						url: parseFile.url()
					});
		        } else {
		        	res.json({ name: winner.get('name') });
		        }
		    });
		} else {
			res.json({});
		}
	});
};