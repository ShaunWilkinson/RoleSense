
const axios = require('axios');
const UserModel = require("../models/UserModel");
const ReportModel = require("../models/ReportModel")
const { ClientSecretCredential } = require('@azure/identity');
const { getAzureFormattedTimestamp } = require('./stringFunctions');
const {saveDataToConfigFile} = require('./fileWriter');

class ResourceManager {
	constructor(queueService) {
		this.userModel = new UserModel();
		this.reportModel = new ReportModel();
		this.queueService = queueService;
	}

	async getAccessToken(tenantId, scope) {
		if(!tenantId || !scope) return "Missing params"
		const credential = new ClientSecretCredential(tenantId, process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_SECRET)
		const token = await credential.getToken(scope);
		return token.token;
	}

	async getTenant(tenantId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://graph.microsoft.com/.default');

		return await axios
			.get(`https://graph.microsoft.com/v1.0/organization/${tenantId}?$select=displayName`, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Microsoft Graph Tenant API:', error.response.data);
				return {
					status: 500,
					error: error.response.data.error
				}
			});
	}

	async getUserCount(tenantId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://graph.microsoft.com/.default');
		var requestUrl = `https://graph.microsoft.com/v1.0/users/$count`

		try {
			let response = await axios.get(requestUrl, {
				headers: { 
					Authorization: `Bearer ${accessToken}`,
					consistencyLevel: 'eventual'
				}
			})

			return response.data;
		} catch(error) {
			console.error('Error fetching details from Resource Manager User Count API:', error.response.data);
			return {
				status: 500,
				error: error.response.data.error
			}
		}
	}

	async listSubscriptions(tenantId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		return await axios
			.get('https://management.azure.com/subscriptions?api-version=2022-12-01', {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Microsoft Resource Manager List Subscriptions API:', error.response.data);
				return {
					status: 500,
					error: `Error fetching subscription details - ${error.response.data}`
				}
			});
	}
	
	async getSubscription(tenantId, subscriptionId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		return await axios
			.get(`https://management.azure.com/subscriptions/${subscriptionId}?api-version=2021-04-01`, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Microsoft Resource Manager Get Subscriptions API:', error.response.data);
				return {
					status: 500,
					error: `Error fetching subscription details - ${error.response.data}`
				}
			});
	}

	async listResourceGroups(tenantId, subscriptionId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		return await axios
			.get(`https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data.value;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Resource Manager Resource Groups API:', error.response.data);
				return {
					status: 500,
					error: 'Error fetching user details'
				}
			});
	}

	async listLogAnalyticsWorkspaces(tenantId, subscriptionId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		return await axios
			.get(`https://management.azure.com/subscriptions/${subscriptionId}/resources?$filter=resourceType eq 'Microsoft.OperationalInsights/workspaces'&api-version=2021-04-01`, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data.value;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Resource Manager Log Analytics Resource API:', error.response.data);
				return {
					status: 500,
					error: 'Error fetching log analytics workspace details'
				}
			});
	} 

	async retrieveActivityLogs(tenantId, workspaceId, quantity, subscriptionId) {
		if(subscriptionId) {
			subscriptionId = subscriptionId.toLowerCase();
		}
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		var url = `https://management.azure.com/${workspaceId}/query?api-version=2017-10-01`
		var body = {
			query: `AzureActivity`
		}
		if(subscriptionId) {
			body.query += `| where SubscriptionId == '${subscriptionId}' 
				and ActivityStatusValue == 'Success'
				and Caller contains '@'
				| project Caller, Authorization, TimeGenerated`
			if(quantity) {
				body.query += `| top ${quantity} by TimeGenerated asc`
			}
		}
		else {
			body.query += `| where ActivityStatusValue == 'Success'
				and Caller contains '@'
				| project Caller, Authorization, TimeGenerated`
			if(quantity) {
				body.query += `| top ${quantity} by TimeGenerated asc`
			}
		}
		
		return await axios
			.post(url, body, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				// Ensure there's data in the tables
				if (!response.data.tables || response.data.tables.length === 0) {
					console.error('No tables found in response.');
					return [];
				}
			
				// Get the first table (usually "PrimaryResult")
				const table = response.data.tables[0];
			
				// Extract columns and rows
				const columns = table.columns.map(col => col.name); // Array of column names
				const rows = table.rows; // Array of rows
			
				// Map rows to objects
				const result = rows.map(row => {
					const obj = {};
					row.forEach((value, index) => {
						obj[columns[index]] = value;
					});
					return obj;
				});
			
				return result;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Log Analytics:', error.response.data);
				return []
			});
	}

	async retrieveAuditLogs(tenantId, workspaceId, quantity) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		var url = `https://management.azure.com/${workspaceId}/query?api-version=2017-10-01`
		var body = {
			query: `AuditLogs 
					| where OperationName == 'Add member to role completed (PIM activation)' 
						and Result == 'success'
						and Category == 'RoleManagement'
					| project TimeGenerated, Identity, UPN = TargetResources[2].userPrincipalName, id = TargetResources[2].id, TargetRole = TargetResources[0].displayName, TargetRoleId = TargetResources[0].id, Result`
		}
		
		if(quantity) {
			body.query += `| top ${quantity} by TimeGenerated asc`
		}
		
		return await axios
			.post(url, body, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				// Ensure there's data in the tables
				if (!response.data.tables || response.data.tables.length === 0) {
					console.error('No tables found in response.');
					return [];
				}
			
				// Get the first table (usually "PrimaryResult")
				const table = response.data.tables[0];
			
				// Extract columns and rows
				const columns = table.columns.map(col => col.name); // Array of column names
				const rows = table.rows; // Array of rows
			
				// Map rows to objects
				const result = rows.map(row => {
					const obj = {};
					row.forEach((value, index) => {
						obj[columns[index]] = value;
					});
					return obj;
				});
			
				return result;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Log Analytics AuditLogs:', error.response.data);
				return []
			});
	}

	async getResourceGroup(tenantId, resourceGroupId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		return await axios
			.get(`https://management.azure.com/${resourceGroupId}?api-version=2021-04-01`, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Microsoft Resource Manager Get Resource Groups API:', error.response.data);
				return {
					status: 500,
					error: `Error fetching subscription details - ${error.response.data}`
				}
			});
	}

	async createReport(sub, subscriptionId, resourceGroupId, tenantName, fromDate) {
		const defaultTenantId = await this.userModel.getTenantId(sub);
		const userCount = await this.getUserCount(defaultTenantId);
		const subscriptionDetails = await this.getSubscription(defaultTenantId, subscriptionId);

		const queuedReports = await this.reportModel.getQueuedReportsCount(defaultTenantId);
		if (queuedReports >= process.env.MAX_PARALLEL_REPORTS_QUEUED) {
			return {
				error: 'Report request failed. You may only have 3 actively processing reports. Please wait until reports are ready.'
			};
		}

		var resourceGroupDetails = null;
		if(resourceGroupId && resourceGroupId.length !== 0) {
			resourceGroupDetails = await this.getResourceGroup(defaultTenantId, resourceGroupId)
		}

		// Record report in SQL
		const sqlEntry = await this.reportModel.addReport(defaultTenantId, subscriptionId, subscriptionDetails.displayName, resourceGroupId, resourceGroupDetails?.name ?? null, tenantName, userCount, fromDate)
		if(!sqlEntry) {
			console.error(`Failed to add Report request in database for tenant ${defaultTenantId}, Subscription ${subscriptionId}.`)
			return {
				error: 'Failed to save report request.'
			};
		}

		// Create Azure Queue request
		const queueRequest = await this.queueService.requestReport(sqlEntry)
		if(!queueRequest) {
			console.error(`Failed to queue report request for tenant ${defaultTenantId}, Subscription ${subscriptionId}.`)
			return {
				error: 'Failed to queue report request.'
			};
		}

		return {
			id: sqlEntry.id,
			name: sqlEntry.title,
			usersCount: userCount,
			created: new Date(),
			status: "Requested"
		}
	}

	async createPIMReport(sub, tenantName, fromDate) {
		const defaultTenantId = await this.userModel.getTenantId(sub);
		const userCount = await this.getUserCount(defaultTenantId);

		const queuedReports = await this.reportModel.getQueuedPIMReportsCount(defaultTenantId);
		if (queuedReports >= process.env.MAX_PARALLEL_REPORTS_QUEUED) {
			return {
				error: 'Report request failed. You may only have 3 actively processing reports. Please wait until reports are ready.'
			};
		}

		// Record report in SQL
		const sqlEntry = await this.reportModel.addPIMReport(defaultTenantId, tenantName, userCount, fromDate)
		if(!sqlEntry) {
			console.error(`Failed to add PIM Report request in database for tenant ${defaultTenantId}.`)
			return {
				error: 'Failed to save report request.'
			};
		}

		// Create Azure Queue request
		const queueRequest = await this.queueService.requestPIMReport(sqlEntry)
		if(!queueRequest) {
			console.error(`Failed to queue PIM report request for tenant ${defaultTenantId}`)
			return {
				error: 'Failed to queue report request.'
			};
		}

		return {
			id: sqlEntry.id,
			name: sqlEntry.title,
			usersCount: userCount,
			created: new Date(),
			status: "Requested"
		}
	}

	async updateRolePrivilegeLevels() {
		const roleDefinitions = await this.listRoleDefinitions(process.env.AZURE_TENANT_ID, process.env.AZURE_HOME_SUBSCRIPTION_ID, null);
		if(!roleDefinitions || roleDefinitions?.status == 500) {
			console.warn("Failed to update role definitions")
		}

		if(!roleDefinitions) {
			console.error("Missing role definitions")
			return;
		}
		var processedRoles = roleDefinitions.filter(role => role.properties.type == 'BuiltInRole').map(role => {
			var category = this.calculateRiskCategory(role);
			
			// Return role with category
			return {
				name: role.properties.roleName,
				id: role.roleName,
				category: category,
				description: role.properties.description,
				actions: role.properties.permissions
			};
		})

		if(processedRoles.length == 0) {
			console.error("Failed to retrieve roles")
		}

		saveDataToConfigFile(processedRoles, 'roleData.json')
	}

	calculateRiskCategory(role) {
		if(role.properties.roleName == "API Management Service Operator Role") {
			console.log("found")
		}
		
		const highRiskKeywords = [
			"Microsoft.Resources/deployments/*",
			"Microsoft.Compute/virtualMachines/*",
			"Microsoft.Compute/disks/*",
			"Microsoft.Network/networkInterfaces/*",
			"Microsoft.Storage/storageAccounts/*"
		];
	
		const mediumRiskKeywords = [
			"*/write",
			"*/action",
		];

		var actions = role.properties.permissions[0].actions
		actions = actions.concat(role.properties.permissions[0].dataActions)
	
		var highestCategory = 0; // 0 = Low, 1 = Medium, 2=High, 3=Critical
		for (const action of actions) {
			// High-risk check: Match keywords exactly or wildcard patterns ending with *
			if (
				action === "*" && role.properties.roleName !== "Contributor"
			) {
				highestCategory = 3;
			}

			// High-risk check: Match keywords exactly or wildcard patterns ending with *
			else if (
				(action === "*" || highRiskKeywords.includes(action) || action.endsWith("delete") || action.endsWith("/*") ||
				action == 'Microsoft.ContainerService/managedClusters/listClusterAdminCredential/action' ||
				action == 'Microsoft.ContainerService/managedClusters/listClusterUserCredential/action')
				&& action != 'Microsoft.Support/*' 
				&& action != 'Microsoft.RecoveryServices/Vaults/monitoringConfigurations/*' 
				&& action != '"Microsoft.CognitiveServices/*"' 
				&& action != 'Microsoft.Insights/alertRules/*' 
				&& action != 'Microsoft.Resources/deployments/*'
			) {
				if(highestCategory < 2) highestCategory = 2
			}
	
			// Medium-risk check: Match keywords exactly or wildcard patterns
			else if (
				mediumRiskKeywords.some((keyword) =>
					action === keyword || (action.match(new RegExp(`^${keyword.replace(/\*/g, ".*")}$`)))
				)
			) {
				if(highestCategory < 1) highestCategory = 1
			}
		}

		var categoryLabel = "Low";
		switch(highestCategory) {
			case 3:
				categoryLabel = "Critical";
				break;
			case 2:
				categoryLabel = "High";
				break;
			case 1:
				categoryLabel = "Medium";
				break;
		}
		return categoryLabel;
	}

	// Calculates the least-privileged role given the required array of actions and a list of Azure roles
	getLeastPrivilegedRole(requiredActions, allRoles, roleCount) {
		requiredActions = requiredActions.map(action => action.toLowerCase())

		const matchingRoles = [];
	
		allRoles.forEach((role) => {
			var actions = role.actions[0];
			actions.actions = actions.actions.map(action => action.toLowerCase())
			actions.dataActions = actions.dataActions.map(action => action.toLowerCase())
			actions.notActions = actions.notActions.map(action => action.toLowerCase())
			actions.notDataActions = actions.notDataActions.map(action => action.toLowerCase())

			const allowedActions = [...actions.actions, ...actions.dataActions];
			const notActions = [...actions.notActions, ...actions.notDataActions];
	
			// Check if all required actions are included in allowed actions (considering wildcards)
			const missingActions = requiredActions.filter(action => 
				!allowedActions.some(allowedAction => 
					allowedAction === action || allowedAction === '*' || action.includes(allowedAction)
				)
			);
	
			// Exclude roles that have NotActions that intersect with required actions (considering wildcards)
			const conflictingNotActions = requiredActions.filter(action => 
				notActions.some(notAction => 
					notAction === action || notAction === '*' || action.includes(notAction)
				)
			);

			// Calculate role score
			if (missingActions.length === 0 && conflictingNotActions.length === 0) {
				let roleScore = 0;
				
				allowedActions.forEach(action => {
					if (requiredActions.includes(action)) {
						// Exact match
						roleScore -= 100;
						return;
					} else if (action === '*') {
						// Match via '*'
						roleScore += 100;
						return;
					}

					if(action.includes("/read")) {
						roleScore += 1
					} else if (action.includes("/write")) {
						roleScore += 5;
					} else if (action.includes("/action")) {
						roleScore += 5;
					} else if (action.includes("/delete")) {
						roleScore += 10;
					} else if (action.endsWith("/*")) {
						roleScore += 20
					}
				});
	
				// Store the role and its score
				matchingRoles.push({ role, score: roleScore });
			}
		});
	
		if (matchingRoles.length > 0) {
			// Sort the roles by score (lower score is better)
			// If scores are equal, prefer roles with fewer allowed actions
			matchingRoles.sort((a, b) => 
				a.score - b.score
			);
	
			// Select the role with the lowest score
			return matchingRoles.slice(0, roleCount)
		}
	
		return null;
	}	

	// Retrieves all Activity Logs from Azure for the past 30 days
	// TODO - store records in DB and only request records newer than the latest in DB
	async retrieveActivityLogs(tenantId, subscriptionId, resourceGroupName, maxCount) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');
		var startTime = new Date()
		startTime.setDate(startTime.getDate() - 31)
		const formattedStartTime = getAzureFormattedTimestamp(startTime);

		var requestUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$select=authorization,caller,eventTimestamp&$filter=eventTimestamp ge '${formattedStartTime}'`
		if(resourceGroupName) {
			requestUrl += ` and resourceGroupName eq '${resourceGroupName}'`
		}

		let allRecords = [], response;

		try {
			while (requestUrl && allRecords.length < maxCount) {
				response = await axios.get(requestUrl, {
					headers: { 
						Authorization: `Bearer ${accessToken}`
					}
				})

				allRecords = allRecords.concat(response.data.value);
				requestUrl = response.data.nextLink || null;
			}

			return allRecords;

		} catch(error) {
			console.error('Error fetching details from Resource Manager Activity Logs API:', error.response.data);
				return {
					status: 500,
					error: 'Error fetching activity logs'
				}
		}
	}
	
	async listRoleDefinitions(tenantId, subscriptionId, resourceGroupId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		var requestUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions?&api-version=2022-04-01`
		if(resourceGroupId) {
			requestUrl = `https://management.azure.com/${resourceGroupId}/providers/Microsoft.Authorization/roleDefinitions?&api-version=2022-04-01`
		}

		return await axios
			.get(requestUrl, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data.value;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Resource Manager roleAssignments API:', error.response.data);
				return {
					status: 500,
					error: 'Error fetching user details'
				}
			});
	}

	async listRoleAssignments(tenantId, subscriptionId, resourceGroupId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		var requestUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`
		if(resourceGroupId) {
			requestUrl = `https://management.azure.com/${resourceGroupId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`
		}

		return await axios
			.get(requestUrl, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data.value;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Resource Manager roleAssignments API:', error.response.data);
				return {
					status: 500,
					error: 'Error fetching user details'
				}
			});
	}

	async listRoleAssignments(tenantId, subscriptionId, resourceGroupId) {
		const accessToken = await this.getAccessToken(tenantId, 'https://management.azure.com/.default');

		var requestUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`
		if(resourceGroupId) {
			requestUrl = `https://management.azure.com/${resourceGroupId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`
		}

		return await axios
			.get(requestUrl, {
				headers: { 
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then(response => {
				// Handle successful response
				return response.data.value;
			})
			.catch(error => {
				// Handle error
				console.error('Error fetching details from Resource Manager roleAssignments API:', error.response.data);
				return {
					status: 500,
					error: 'Error fetching user details'
				}
			});
	}

	async getUserCountRecommendation(tenantId) {
		const subscriptions = await this.listSubscriptions(tenantId);
		if(!subscriptions || subscriptions.status == 500) {
			return 0;
		}

		var roleAssignments = [], listedAssignments;
		for(let i=0; i<subscriptions.count.value; i++) {
			listedAssignments = await this.listRoleAssignments(tenantId, subscriptions.value[i].subscriptionId)
			roleAssignments = roleAssignments.concat(listedAssignments)
		}

		if(roleAssignments.length == 0) {
			return 0;
		}

		let uniqueAssignments = [...new Set(roleAssignments.filter(assignment => assignment.properties.principalType == 'User').map(assignment => assignment.properties.principalId))]
		return uniqueAssignments.length;
	}
}

module.exports = ResourceManager