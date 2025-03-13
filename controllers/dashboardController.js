const UserModel = require("../models/UserModel")
const ReportModel = require("../models/ReportModel")
const fastcsv = require('fast-csv');
const eventEmitter = require("../utils/eventEmitter");

class DashboardController {
	constructor(resourceManager) {
		this.resourceManager = resourceManager
		this.userModel = new UserModel();
		this.reportModel = new ReportModel();
	}

	async displayHomepage(req, res) {
		res.render('homepage', { 
			title: '',
		});
    }

	async displayContact(req, res) {
		res.render('contact', { 
			title: 'Contact Us',
		});
    }

	async displayPrivacyPolicy(req, res) {
		res.render('privacyPolicy', { 
			title: 'Privacy Policy',
		});
	}

	async displayGettingStarted(req, res) {
		if(req.isAuthenticated()) {
			res.render('gettingStarted', { 
				title: 'Getting Started',
			});
		} else {
			res.render('gettingStartedPublic', { 
				title: 'Getting Started',
			});
		}
	}

	async displayLogsPage(req, res) {
		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		
		var tenantDetails, subscriptions, workspaceId;

		try {
			if(defaultTenantId) {
				[tenantDetails, subscriptions, workspaceId] = await Promise.all([
					this.resourceManager.getTenant(defaultTenantId),
					this.resourceManager.listSubscriptions(defaultTenantId),
					this.userModel.getWorkspaceId(defaultTenantId)
				])
			}
		} catch (error) {
			throw(error)
		}

		res.render('logs', { 
			title: 'Activity Log Link',
			tenantDetails: tenantDetails,
			subscriptions: subscriptions,
			workspaceId: workspaceId
		});
	}

	async displayMinimumAccessPage(req, res) {
		res.render('minimumAccessTool', { 
			title: 'Minimum Role Tool'
		});
	}

	async displayRoadmap(req, res) {
		res.render('roadmap', {
			title: 'Roadmap'
		})
	}

	async displayTermsOfUse(req, res) {
		res.render('termsOfUse', { 
			title: 'Terms of Use',
		});
	}

	async displayDashboard(req, res) {
		var userCount = null, subscriptions = null, tenantDetails = null, reports = null, licenceDetails = null;
		var subscriptions = null;

		const showBeginnerGuide = await this.userModel.shouldShowBeginnerGuide(req.session.passport.user.profile.sub);
		if(showBeginnerGuide) {
			res.redirect("/GettingStarted")
			return;
		}

		var helpText = 'Enter your Tenant ID and click submit to connect the application to your tenant. Ensure the application has the required access in your tenant.'
		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		
		try {
			if(defaultTenantId) {
				helpText = 'Select a Subscription and optionally a Resource Group and then press Analyse to start a role assignment analysis. A report will be created in Requested status, and will change to Processing once scheduled and then Ready once it\'s viewable. The time this takes is dependent on the size of your environment and the number of roles and activity logs to retrieve.';
				
				[tenantDetails, userCount, subscriptions, reports, licenceDetails] = await Promise.all([
					this.resourceManager.getTenant(defaultTenantId),
					this.resourceManager.getUserCount(defaultTenantId),
					this.resourceManager.listSubscriptions(defaultTenantId),
					this.reportModel.listReports(defaultTenantId, 25),
					this.userModel.getDashboardLicenceDetails(defaultTenantId)
				])
			}
		} catch (error) {
			throw(error)
		}

		if(licenceDetails?.logAnalyticsWorkspaceId) {
			var oldestDate = await this.resourceManager.retrieveActivityLogs(defaultTenantId, licenceDetails.logAnalyticsWorkspaceId, 1)
			if(oldestDate?.length > 0) {
				oldestDate = oldestDate[0]
			}
		}

		res.render('dashboard', {
			title: 'Role Assignments',
			helpText: helpText,
			userCount: userCount ?? 0,
			subscriptions: subscriptions,
			subscriptionCount: subscriptions?.count?.value ?? 0,
			tenantDetails: tenantDetails,
			defaultTenantId: defaultTenantId,
			reports: reports,
			licenceDetails: licenceDetails,
			oldestAvailableLogDate: oldestDate
		})
	}

	async displayPimReports(req, res) {
		var userCount = null, tenantDetails = null, reports = null, licenceDetails = null;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		
		try {
			if(defaultTenantId) {
				[tenantDetails, userCount, reports, licenceDetails] = await Promise.all([
					this.resourceManager.getTenant(defaultTenantId),
					this.resourceManager.getUserCount(defaultTenantId),
					this.reportModel.listPIMReports(defaultTenantId, 25),
					this.userModel.getDashboardLicenceDetails(defaultTenantId)
				])
			}
		} catch (error) {
			throw(error)
		}

		if(licenceDetails?.logAnalyticsWorkspaceId) {
			var oldestDate = await this.resourceManager.retrieveActivityLogs(defaultTenantId, licenceDetails.logAnalyticsWorkspaceId, 1)
			if(oldestDate?.length > 0) {
				oldestDate = oldestDate[0]
			}
		}

        const errorStatus = req.cookies["errorStatus"]
        res.clearCookie("errorStatus")

		res.render('pimReports', {
			title: 'PIM Reporting',
			userCount: userCount ?? 0,
			tenantDetails: tenantDetails,
			defaultTenantId: defaultTenantId,
			reports: reports,
			licenceDetails: licenceDetails,
			oldestAvailableLogDate: oldestDate,
			errorStatus: errorStatus
		})
	}

	async displayReportsList(req, res) {
		var reports;
		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);

        const errorStatus = req.cookies["errorStatus"]
        res.clearCookie("errorStatus")
		
		try {
			if(defaultTenantId) {
				reports = await this.reportModel.listReports(defaultTenantId, 20);
			}
		} catch (error) {
			throw(error)
		}

		res.render('reportList', {
			title: 'Reports',
			reports: reports,
			errorStatus: errorStatus
		})
	}

	async createReport(req, res) {
		const subscriptionId = req.body.s;
		const resourceGroupId = req.body.r;
		const startDate = parseInt(req.body.f);

		if(!subscriptionId) {
			res.send({
				error: 'Failed to queue report request. Invalid Subscription ID'
			})
			return;
		}

		if(isNaN(startDate) || startDate > Date.now()) {
			res.send({
				error: 'Failed to queue report request. Invalid From Filter Date'
			})
			return;
		}

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		const tenantDetails = await this.resourceManager.getTenant(defaultTenantId);
		const result = await this.resourceManager.createReport(req.session.passport.user.profile.sub, subscriptionId, resourceGroupId, tenantDetails.displayName, startDate)
		
		if(result) {
			res.send(result);
			return;
		} else {
			res.send({
				error: 'Failed to queue report request.'
			})
			return;
		}
	}

	async createPIMReport(req, res) {
		const startDate = parseInt(req.body.f);

		if(isNaN(startDate) || startDate > Date.now()) {
			res.send({
				error: 'Failed to queue report request. Invalid From Filter Date'
			})
			return;
		}

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		const tenantDetails = await this.resourceManager.getTenant(defaultTenantId);
		const result = await this.resourceManager.createPIMReport(req.session.passport.user.profile.sub, tenantDetails.displayName, startDate)
		
		if(result) {
			res.send(result);
			return;
		} else {
			res.send({
				error: 'Failed to queue report request.'
			})
			return;
		}
	}

	async saveWorkspace(req, res) {
		const workspaceId = req.body.w;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		
		// Test workspace access
		const testSuccessful = await this.resourceManager.retrieveActivityLogs(defaultTenantId, workspaceId, 1)
		if(testSuccessful.length == 0) {
			res.send({
				error: 'Failed to connect to Log Analytics Workspace or no Activity Logs available.'
			})
			return;
		}

		// Save workspace on Licence
		const saveResult = await this.userModel.updateWorkspaceId(defaultTenantId, workspaceId);
		
		if(saveResult) {
			res.sendStatus(200);
			return;
		} else {
			res.send({
				error: 'Failed to update workspace ID.'
			})
			return;
		}
	}

	async testWorkspaceLink(req, res) {
		const workspaceId = req.body.w;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		
		// Test workspace access
		const oldestRecord = await this.resourceManager.retrieveActivityLogs(defaultTenantId, workspaceId, 1)
		if(oldestRecord.length == 0) {
			res.send({
				error: 'Failed to connect to Log Analytics Workspace or no Activity Logs available.'
			})
			return;
		}

		if(oldestRecord) {
			res.send(oldestRecord[0]);
			return;
		} else {
			res.send({
				error: 'Failed to retrieve Log Analytics Workspace records.'
			})
			return;
		}
	}

	async unlinkWorkspace(req, res) {
		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		
		// Save workspace on Licence
		await this.userModel.removeWorkspaceId(defaultTenantId);
		
		res.redirect("/logs")
	}

	async getResourceGroups(req, res) {
		const subscriptionId = req.query.s;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		const resourceGroups = await this.resourceManager.listResourceGroups(defaultTenantId, subscriptionId)
		res.send(resourceGroups);
	}

	async getLogAnalyticsWorkspaces(req, res) {
		const subscriptionId = req.query.s;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		const logAnalyticsWorkspaces = await this.resourceManager.listLogAnalyticsWorkspaces(defaultTenantId, subscriptionId)
		res.send(logAnalyticsWorkspaces);
	}

	async viewReport(req, res) {
		const reportId = req.query.id;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);

		var roleDefinitionData = require("../config/roleData.json")

		const report = await this.reportModel.getReport(defaultTenantId, reportId);
		if(!report) {
			res.cookie("errorStatus", "Failed to find the given report")
			res.redirect("/reports")
		}

		res.render('report', {
			title: report?.[0]?.[0]?.title ?? null,
			reportId: reportId,
			report: report?.[0]?.[0] ?? null,
			suggestions: report[1],
			roleDefinitionDetails: roleDefinitionData
		})
	}

	async viewPIMReport(req, res) {
		const reportId = req.query.id;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);

		const report = await this.reportModel.getPIMReport(defaultTenantId, reportId);
		if(!report) {
			res.cookie("errorStatus", "Failed to find the given report")
			res.redirect("/reports")
		}

		res.render('reportPim', {
			title: report?.[0]?.[0]?.title ?? null,
			reportId: reportId,
			report: report?.[0]?.[0] ?? null,
			suggestions: report[1],
			totalReportSize: report[1].length
		})
	}

	async downloadReport(req, res) {
		const reportId = req.query.id;

		const defaultTenantId = await this.userModel.getTenantId(req.session.passport.user.profile.sub);
		if(!defaultTenantId) {
			return;
		}

		var reportData = await this.reportModel.getReport(defaultTenantId, reportId);
		if(!reportData) return;

		var report = reportData[0][0]

		var roleDefinitionData = require("../config/roleData.json")
		let chosenSuggestions = reportData[1].map((item) => {
			let relatedRoleDefinition = roleDefinitionData.find(role => role.name === item.assignedRole)

			return {
				...item,
				category: relatedRoleDefinition?.category
			}
		})

		const csvData = await fastcsv.writeToString(chosenSuggestions, {headers: true})

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename="${report.title}.csv"`);
		res.send(csvData);
	}

	async updateReportStatusView(req, res) {
		const reportId = req.query.id;
		const newStatus = req.query.status;

		eventEmitter.emit('reportStatusChanged', {
			reportId: reportId,
			newStatus: newStatus
		})

		res.sendStatus(200)
	}

	async findMinimumRole(req, res) {
		const roleActionsInput = req.body.r;
		
		const regex = /Microsoft\.[A-Za-z]+(?:\.[A-Za-z]+)*\/(?:\*|[A-Za-z]+)(?:\/(?:\*|[A-Za-z]+))?/;
		if(!regex.test(roleActionsInput)) {
			res.sendStatus(401)
		}

		const requiredActions = roleActionsInput.split(",");
		var roleDefinitionData = require("../config/roleData.json")
		const suggestedRole = await this.resourceManager.getLeastPrivilegedRole(requiredActions, roleDefinitionData, 10)

		res.send(suggestedRole)
	}
}

module.exports = DashboardController;