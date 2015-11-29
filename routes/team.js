var TeamObject = Parse.Object.extend("Teams");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var name = req.params.name;
	
	var query = new Parse.Query(TeamObject);
	query.equalTo('name', name);
	query.ascending('day');
	query.first().then(function(team) {
		if(team) {
			var winners = new Parse.Query(WinnerObject);
			winners.equalTo('team', team.get('name'));
			winners.find().then(function(results) {
				var today = new Date().getDate();
				var days = [];
				for (var i = 0; i < 24; i++) {
					days[i] = { id: i+1, teamname: name };
					if(results[i]) {
						days[i].opened = true;
						days[i].user = results[i].get('user');
					}
					else if(today >= i+1) {
						days[i].today = true;
					}
 				};
				res.render('partials/team', {
					title: team.get('name'),
					teamname: team.get('name'),
					days: days,
					layout: 'layout'
				});
			});
		} else {
			res.redirect('/');
		}
	});
};