var moment = require('moment');

var TeamObject = Parse.Object.extend("Teams");
var WinnerObject = Parse.Object.extend("Winners");

exports.get = function(req, res, next) {
	var teamname = req.params.name;
	
	var teamQuery = new Parse.Query(TeamObject);
	teamQuery.equalTo('name', teamname);
	teamQuery.ascending('day');
	teamQuery.first().then(function(team) {
		if(team) {
			var winnersQuery = new Parse.Query(WinnerObject);
			winnersQuery.equalTo('team', team.get('name'));
			winnersQuery.find().then(function(winners) {
				var days = [];
				for (var i = 0; i < 24; i++) {
					days[i] = { id: i+1, teamname: teamname };
					if(winners[i]) {
						days[i].opened = true;
						days[i].user = winners[i].get('user');
					}
					else if(moment().date() >= i+1 && moment().month() + 1 === 11) {
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
			req.flash('error', 'Fant ikke kalender ved det navnet.', false);
			res.redirect('/');
		}
	});
};