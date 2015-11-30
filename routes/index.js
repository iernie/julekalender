exports.get = function(req, res, next) {
	res.render('partials/index', {
		title: 'Julekalender as a Service',
		layout: 'layout'
	});
};

exports.post = function(req, res, next) {
	var TeamObject = Parse.Object.extend("Teams");
	var teamQuery = new Parse.Query(TeamObject);

	if(!req.body.name) {
		req.flash('error', 'Vennligst skriv inn ett navn...');
	} else {
		teamQuery.equalTo("name", req.body.name);
		teamQuery.first().then(function(team) {
			if(!team) {
				var team = new TeamObject();
				team.save({ name: req.body.name }).then(function(object) {
					req.flash('success', 'Ny kalender opprettet.', false);
					res.redirect('/' + object.get('name'));
				});
			} else {
				req.flash('error', 'Navnet er allerede i bruk. Vennligst velg ett annet.');
			}
		});
	}

	
};
