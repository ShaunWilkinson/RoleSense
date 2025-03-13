var express = require('express')
var router = express.Router();
const {isAuthenticated} = require('../middleware/auth')
const {apiLimit} = require('../middleware/api')

router.get('/', (req, res) => {
	if(req.isAuthenticated()) {
		req.app.get('dashboardController').displayDashboard(req, res)
	} else {
		req.app.get('dashboardController').displayHomepage(req, res)
	}
});
router.get('/contact', (req, res) => req.app.get('dashboardController').displayContact(req, res));
router.get('/privacyPolicy', (req, res) => req.app.get('dashboardController').displayPrivacyPolicy(req, res));
router.get('/termsOfUse', (req, res) => req.app.get('dashboardController').displayTermsOfUse(req, res));

router.get('/resources/getResourceGroups', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').getResourceGroups(req, res));
router.get('/resources/getWorkspaces', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').getLogAnalyticsWorkspaces(req, res));
router.get('/pimReports', isAuthenticated, (req, res) => req.app.get('dashboardController').displayPimReports(req, res));
router.get('/report', isAuthenticated, (req, res) => req.app.get('dashboardController').viewReport(req, res));
router.get('/pimReport', isAuthenticated, (req, res) => req.app.get('dashboardController').viewPIMReport(req, res));
router.get('/report/download', isAuthenticated, (req, res) => req.app.get('dashboardController').downloadReport(req, res));
router.get('/logs', isAuthenticated, (req, res) => req.app.get('dashboardController').displayLogsPage(req, res));
router.get('/minimumAccessTool', isAuthenticated, (req, res) => req.app.get('dashboardController').displayMinimumAccessPage(req, res));
router.get('/gettingStarted', (req, res) => req.app.get('dashboardController').displayGettingStarted(req, res));
router.get('/roadmap', (req, res) => req.app.get('dashboardController').displayRoadmap(req, res));

router.post('/saveDefaultTenant', isAuthenticated, (req, res) => req.app.get('dashboardController').saveTenantId(req, res))
router.post('/resources/createReport', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').createReport(req, res));
router.post('/resources/createPIMReport', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').createPIMReport(req, res));
router.post('/report/updateReportStatus', (req, res) => req.app.get('dashboardController').updateReportStatusView(req, res));
router.post('/resources/saveWorkspace', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').saveWorkspace(req, res));
router.post('/resources/unlinkWorkspace', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').unlinkWorkspace(req, res));
router.post('/resources/testWorkspace', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').testWorkspaceLink(req, res));
router.post('/resources/findMinimumRole', isAuthenticated, apiLimit, (req, res) => req.app.get('dashboardController').findMinimumRole(req, res));

module.exports = router;