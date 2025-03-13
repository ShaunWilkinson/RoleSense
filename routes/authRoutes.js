var express = require('express')
var router = express.Router();
var {regenerateSessionAfterAuthentication} = require('../middleware/auth')
const passport = require('passport');

router.get('/login', passport.authenticate('azuread-openidconnect', { 
	failureRedirect: '/' 
}));

router.get('/logout', function(req, res) {
	req.logout((err) => {
		if(err) return Next(err);
		res.redirect('/');
	});
});

router.post('/auth/redirect', passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), regenerateSessionAfterAuthentication, (req, res) => {
	// Redirect to the original URL or to the profile page if not set
    const redirectUrl = req.session.originalUrl || '/';

    delete req.session.originalUrl; // Clean up the session
    res.redirect(redirectUrl);
});

module.exports = router;