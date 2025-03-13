// custom middleware to check auth state
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect("/login")
};

function isAuthenticatedUser(req) {
    if (!req.user) {
        return false
    }

    return true;
};

async function recordUserActivity(req, res, next) {
	if(req.method == 'GET' && req.isAuthenticated()) {
		let userData = req.user.profile;
		let sub = userData.sub;
		let firstName = userData.name.givenName;
		let familyName = userData.name.familyName;
		let email = userData._json.email;
		let tenantId = userData.tenantId;
		let upn = userData.upn;

		if(!userData || !sub) {
			next();
			return;
		}

		const user = await req.app.get("userModel").recordUserActivity(sub, email, firstName, familyName, tenantId, upn)
		if(user === false) {
			await req.app.get("userModel").saveDefaultTenantId(sub, tenantId)
		}
	}

	next();
}

function regenerateSessionAfterAuthentication(req, res, next) {
	var passportInstance = req.session.passport;

	return req.session.regenerate(function (err){
	  if (err) {
		console.error(err)
		return next(err);
	  }
	  req.session.passport = passportInstance;
	  return req.session.save(next);
	});
}

// Middleware to store the original URL in session
function storeOriginalUrl(req, res, next) {
    if (!req.isAuthenticated()) {
        if (!req.session) {
            req.session = {};
        }
        req.session.originalUrl = req.originalUrl;
    }
    next();
}

module.exports = {isAuthenticated, isAuthenticatedUser, regenerateSessionAfterAuthentication, storeOriginalUrl, recordUserActivity}