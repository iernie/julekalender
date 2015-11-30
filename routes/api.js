var UserObject = Parse.Object.extend("Users");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var teamname = req.params.name;
	var today = new Date().getDate();

	var winnersQuery = new Parse.Query(WinnerObject);
	winnersQuery.equalTo("team", teamname);
	winnersQuery.equalTo("day", today);
	winnersQuery.first().then(function(winner) {
		if(winner) {
			var usersQuery = new Parse.Query(UserObject);
		    usersQuery.get(winner.get('user')).then(function(user) {
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