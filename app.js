// IMPORTS
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const passport = require('passport');
const passportSocketIo = require('passport.socketio');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
var Sequelize = require("sequelize");
var session = require("express-session");
const {storeOriginalUrl, recordUserActivity} = require('./middleware/auth')
const jwt = require('jsonwebtoken');
const favicon = require('serve-favicon');

// initalize sequelize with session store
var SequelizeStore = require("connect-session-sequelize")(session.Store);

var app = express();

// create database, ensure 'sqlite3' in your package.json
var sequelize = new Sequelize(process.env.AZURE_SQL_DATABASE, process.env.AZURE_SQL_USERNAME, process.env.AZURE_SQL_PASSWORD, {
	host: process.env.AZURE_SQL_SERVER,
	dialect: "mssql",
	logging: false
});
var sessionStore = new SequelizeStore({
	db: sequelize,
	checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds.
  	expiration: 24 * 60 * 60 * 1000  // The maximum age (in milliseconds) of a valid session. // 24 hours
})
sessionStore.sync();

app.use(session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore
}));

app.use(favicon('public/images/Logos/favicon.webp'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(compression())

app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ limit: '5mb', extended: false, parameterLimit: 5000 }));
app.use(cookieParser());
app.use(express.static('public', {maxAge: 604800000}));
app.use(express.static('./node_modules/tablesort/dist', {maxAge: 604800000})); 
app.use(express.static('./node_modules/socket.io/client-dist', {maxAge: 604800000}));
app.use(express.static('./node_modules/chart.js/dist', {maxAge: 604800000}));

const initSocketApi = require("./utils/socketApi");
const socketApi = initSocketApi()
socketApi.io.use(passportSocketIo.authorize({
    cookieParser: cookieParser, // The same cookie parser as in express-session
    key: 'connect.sid',         // The name of the cookie holding the session ID
    secret: process.env.EXPRESS_SESSION_SECRET,  // The same secret as in express-session
    store: sessionStore,        // The session store instance
}));

// Set helmet security defaults
app.use(
	helmet({
	  contentSecurityPolicy: {
		useDefaults: true,
		//crossOriginEmbedderPolicy: false,
		crossOriginResourcePolicy: { policy: "same-site" },
		directives: {
		  defaultSrc: ["'self'", "*.applicationinsights.azure.com", "https://hubspot-forms-static-embed.s3.amazonaws.com", "https://forms.hsforms.com"],
		  scriptSrc: ["'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdn.jsdelivr.net", "http://js.hsforms.net/forms/embed/v2.js", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
		  scriptSrcAttr: ["'unsafe-inline'"],
		  frameSrc: ["https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/", "https://app.hubspot.com/embedded-viral-link/forms", "https://www.kanshareban.com/project/1ba1e864-df2c-469e-8586-6a13e027b574"],
		  imgSrc: ["'self'", "*", "data:"],
		  upgradeInsecureRequests: null
		}
	  },
	  crossOriginOpenerPolicy: {
		policy: "same-origin-allow-popups"
	  }
	})
  );
app.disable('x-powered-by')

// ============= AUTH ===========================================
app.use(passport.initialize());
app.use(passport.session());
passport.use(new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/organizations/V2.0/.well-known/openid-configuration`,
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    clientID: process.env.AZURE_CLIENT_ID,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: process.env.REDIRECT_URI,
    allowHttpForRedirectUrl: process.env.NODE_ENV == 'development' ? true : false,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    validateIssuer: false,
    passReqToCallback: true,
    scope: ['profile', 'openid', 'email']
}, function(req, iss, sub, profile, accessToken, refreshToken, params, done) {
    req.session.accessToken = accessToken;

	// Decode the accessToken
    const decodedToken = jwt.decode(accessToken);
	var tenantId;
    if (decodedToken && decodedToken.tid) {
        tenantId = decodedToken.tid;
        console.log('User Default Tenant ID:', tenantId);
    } else {
        console.log('Tenant ID not found in access token');
    }

	profile.upn = decodedToken.upn;
	profile.tenantId = tenantId;

    return done(null, { profile, accessToken, refreshToken, params });
}));

passport.serializeUser(function(user, done) {
	done(null, user);
});
  
passport.deserializeUser(function(user, done) {
	done(null, user);
});

app.use(storeOriginalUrl)
app.use(recordUserActivity)
app.use(async (req, res, next) => { // Make the path accessible for the nav
    res.locals.currentPath = req.path;
	res.locals.env = process.env.NODE_ENV
	res.locals.user = req.session.passport?.user?.profile?._json ?? null

    next();
});

// ============= ROUTES ===========================================
app.use('/', require('./routes/indexRoutes'))
app.use('/', require('./routes/authRoutes'))


// ============= MODELS ===========================================
const UserModel = require('./models/UserModel');
const ReportModel = require('./models/ReportModel');

const userModel = new UserModel();
const reportModel = new ReportModel();

app.set('userModel', userModel);
app.set('reportModel', reportModel);

// ============= CONTROLLERS ===========================================
const DashboardController = require('./controllers/dashboardController');
const ResourceManager = require('./utils/resourceManager');
const QueueService = require('./utils/queueService');

const queueService = new QueueService();
const resourceManager = new ResourceManager(queueService);
const dashboardController = new DashboardController(resourceManager);

app.set('dashboardController', dashboardController);
app.set('resourceManager', resourceManager);
app.set('queueService', queueService);

console.log("Server started, connect to http://localhost:3300")
module.exports = {app, socketApi};

resourceManager.updateRolePrivilegeLevels();