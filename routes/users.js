var slug = require('slug')
var UserObject = Parse.Object.extend("Users");

exports.get = function(req, res, next) {
	var teamname = req.params.name;

	var usersQuery = new Parse.Query(UserObject);
	usersQuery.equalTo("team", teamname);
	usersQuery.find().then(function(users) {
		res.render('partials/users', {
			title: teamname,
			teamname: teamname,
			users: users,
			layout: 'layout'
		});
	});
};

exports.post = function(req, res, next) {
	var teamname = req.params.name;

	if(!req.body.name) {
		req.flash('error', 'Vennligst skriv inn ett navn...');
	} else {
		var save = function(user) {
			if(req.file) {
	    		var base64 = req.file.buffer.toString('base64');
	    		var parseFile = new Parse.File(slug(req.file.originalname), { base64: base64 }, req.file.mimetype);
	    		parseFile.save().then(function() {
	            	user.save({ 'name': req.body.name, 'picture': parseFile, 'team': teamname }).then(function() {
		        		res.redirect('/' + teamname + '/users');
		        	});
				});
	    	} else {
	    		user.save({ 'name': req.body.name, 'team': teamname }).then(function() {
	        		res.redirect('/' + teamname + '/users');
	        	});
	    	}
		}

		if(!req.body.id) {
			req.flash('success', 'Bruker opprettet.', false);
			var user = new UserObject();
			save(user);
	    } else {
	    	req.flash('success', 'Bruker oppdatert.', false);
	    	var userQuery = new Parse.Query(UserObject);;
		    userQuery.get(req.body.id).then(function(user) {
	        	save(user);
	        });
	    }
	}		
};