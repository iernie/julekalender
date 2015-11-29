var UserObject = Parse.Object.extend("Users");

exports.get = function(req, res, next) {
	var teamname = req.params.name;

	var query = new Parse.Query(UserObject);
	query.equalTo("team", teamname);
	query.find().then(function(result) {
		res.render('partials/users', {
			title: teamname,
			teamname: teamname,
			users: result,
			layout: 'layout'
		});
	});
};

exports.post = function(req, res, next) {
	var teamname = req.params.name;

	var save = function(user) {
		if(req.file) {
    		var base64 = req.file.buffer.toString('base64');
    		var parseFile = new Parse.File(req.file.originalname, { base64: base64 }, req.file.mimetype);
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
		var user = new UserObject();
		save(user);
    } else {
    	var query = new Parse.Query(UserObject);;
	    query.get(req.body.id).then(function(user) {
        	save(user);
        });
    }	
};