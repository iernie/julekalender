exports.get = function(req, res, next) {
	res.render('partials/index', {
		title: 'Julekalender as a Service',
		error: req.query.error,
		layout: 'layout'
	});
};

exports.post = function(req, res, next) {
	var TeamObject = Parse.Object.extend("Teams");
	var query = new Parse.Query(TeamObject);
	query.equalTo("name", req.body.name);
	query.first().then(function(team) {
		if(!team) {
			var team = new TeamObject();
			team.save({ name: req.body.name }).then(function(object) {
				res.redirect('/' + object.get('name'));
			});
		} else {
			res.redirect('/?error=true');
		}
	});
};
