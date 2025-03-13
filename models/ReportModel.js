// @ts-check
const sql = require("mssql")
const {sqlConfig} = require('../config/db')
const {get} = require('../controllers/sqlPoolManager')

class ReportModel {
    async listReports(tenantId, count) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.input("count", sql.Int, count)
			.query(`
				SELECT TOP(@count) r.id, r.title, r.userCount, r.created, rs.status
				FROM Reports r
				LEFT JOIN ReportStatus rs ON rs.id = r.status
				WHERE r.tenantId = @tenantId
				ORDER BY r.created DESC`
			)
			.catch(err => {
				console.error("Failed to listReports")
				console.error(err)
			})
	
		return result?.recordset ?? null;
	}

	async listPIMReports(tenantId, count) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.input("count", sql.Int, count)
			.query(`
				SELECT TOP(@count) r.id, r.title, r.userCount, r.created, rs.status
				FROM ReportsPIM r
				LEFT JOIN ReportStatus rs ON rs.id = r.status
				WHERE r.tenantId = @tenantId
				ORDER BY r.created DESC`
			)
			.catch(err => {
				console.error("Failed to listPIMReports")
				console.error(err)
			})
	
		return result?.recordset ?? null;
	}

	async getQueuedReportsCount(tenantId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.query(`
				SELECT COUNT(id) AS count
				FROM Reports r
				WHERE r.tenantId = @tenantId AND status != 3`
			)
			.catch(err => {
				console.error("Failed to getQueuedReportsCount")
				console.error(err)
			})
	
		return result?.recordset?.[0]?.count ?? 0;
	}

	async getQueuedPIMReportsCount(tenantId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.query(`
				SELECT COUNT(id) AS count
				FROM ReportsPIM r
				WHERE r.tenantId = @tenantId AND (status = 1 OR status = 2 OR status = 4)`
			)
			.catch(err => {
				console.error("Failed to getQueuedPIMReportsCount")
				console.error(err)
			})
	
		return result?.recordset?.[0]?.count ?? 0;
	}

	async listIncompleteReportIds(tenantId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.query(`
				SELECT r.id
				FROM Reports r
				WHERE r.tenantId = @tenantId AND r.status != 3`
			)
			.catch(err => {
				console.error("Failed to listIncompleteReportIds")
				console.error(err)
			})
	
		return result?.recordset ?? null;
	}

	async addReport(defaultTenantId, subscriptionId, subscriptionName, resourceGroupId, resourceGroupName, tenantName, userCount, fromDate) {
		let title = tenantName + " - " + subscriptionName;
		if(resourceGroupName) {
			title += " - " + resourceGroupName
		}

		// Create a JavaScript Date object from the epoch value
		const date = new Date(fromDate);

		// Format the date as yyyy-MM-dd HH:mm:ss
		const formattedDateTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ` +
                          `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;


		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("defaultTenantId", sql.UniqueIdentifier, defaultTenantId)
			.input("tenantName", sql.VarChar(64), tenantName)
			.input("subscriptionId", sql.UniqueIdentifier, subscriptionId)
			.input("subscriptionName", sql.VarChar(120), subscriptionName)
			.input("resourceGroupId", sql.VarChar(1200), resourceGroupId)
			.input("resourceGroupName", sql.VarChar(120), resourceGroupName)
			.input("fromDate", sql.DateTime, formattedDateTime)
			.input("title", sql.VarChar(120), title)
			.input("userCount", sql.Int, userCount)
			.query(`
				INSERT INTO Reports (tenantId, tenantName, subscriptionId, subscriptionName, resourceGroupId, resourceGroupName, title, userCount, fromDate)
				OUTPUT INSERTED.id, INSERTED.title, INSERTED.created, INSERTED.fromDate
				VALUES (@defaultTenantId, @tenantName, @subscriptionId, @subscriptionName, @resourceGroupId, @resourceGroupName, @title, @userCount, @fromDate)

			`)
			.catch(err => {
				console.error("Failed to addReport")
				console.error(err)
			})
	
		return result?.recordset?.[0] ?? null;
	}

	async addPIMReport(defaultTenantId, tenantName, userCount, fromDate) {
		let title = tenantName;

		// Create a JavaScript Date object from the epoch value
		const date = new Date(fromDate);

		// Format the date as yyyy-MM-dd HH:mm:ss
		const formattedDateTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ` +
                          `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;


		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("defaultTenantId", sql.UniqueIdentifier, defaultTenantId)
			.input("tenantName", sql.VarChar(64), tenantName)
			.input("fromDate", sql.DateTime, formattedDateTime)
			.input("title", sql.VarChar(120), title)
			.input("userCount", sql.Int, userCount)
			.query(`
				INSERT INTO ReportsPIM (tenantId, tenantName, title, userCount, fromDate)
				OUTPUT INSERTED.id, INSERTED.title, INSERTED.created, INSERTED.fromDate
				VALUES (@defaultTenantId, @tenantName, @title, @userCount, @fromDate)

			`)
			.catch(err => {
				console.error("Failed to addPIMReport")
				console.error(err)
			})
	
		return result?.recordset?.[0] ?? null;
	}

	async getReport(tenantId, reportId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.input("reportId", sql.UniqueIdentifier, reportId)
			.query(`
				SELECT TOP(1) tenantName, subscriptionName, resourceGroupName, title, userCount, created, status
				FROM Reports
				WHERE id = @reportId AND tenantId = @tenantId

				IF @@ROWCOUNT = 0
				BEGIN
					RETURN
				END

				SELECT userName, userPrincipalName, userType, assignedRole, scope, scopeType, roleRequired, requiredActions, recommendedRole
				FROM RoleSuggestions
				WHERE reportId = @reportId
			`)
			.catch(err => {
				console.error("Failed to getReport")
				console.error(err)
			})
	
		return result?.recordsets ?? null;
	}

	async getPIMReport(tenantId, reportId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.input("reportId", sql.UniqueIdentifier, reportId)
			.query(`
				SELECT TOP(1) tenantName, title, userCount, created, status
				FROM ReportsPIM
				WHERE id = @reportId AND tenantId = @tenantId

				IF @@ROWCOUNT = 0
				BEGIN
					RETURN
				END

				SELECT displayName, principalName, inUse, lastUsed, groupName, groupDescription, roleDisplayname, directoryScopeId, accountType, accountId, groupId, roleId, reportId
				FROM PIMSuggestions
				WHERE reportId = @reportId
			`)
			.catch(err => {
				console.error("Failed to getReport")
				console.error(err)
			})
	
		return result?.recordsets ?? null;
	}

	async updateReportStatus(reportId, statusId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("reportId", sql.UniqueIdentifier, reportId)
			.input("statusId", sql.Int, statusId)
			.query(`
				UPDATE Reports
				SET status = @statusId
				WHERE id = @reportId
			`)
			.catch(err => {
				console.error("Failed to updateReportStatus")
				console.error(err)
			})
	
		return result?.rowsAffected?.[0] > 0 ?? false;
	}

	async getOldestRequestedReport() {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.query(`
				SELECT TOP(1) id, tenantId, subscriptionId, resourceGroupName, resourceGroupId
				FROM Reports
				WHERE status = 1
				ORDER BY created DESC

			`)
			.catch(err => {
				console.error("Failed to getOldestRequestedReport")
				console.error(err)
			})
	
		return result?.recordset?.[0] ?? null;
	}

	async bulkSaveRoleSuggestions(reportId, roleSuggestions) {
		if (roleSuggestions.length === 0) return; // No data to insert

		let pool;
		try {
			pool = await get('default', sqlConfig);

			// Step 2: Generate bulk insert query
			const columns = Object.keys(roleSuggestions[0]);
			const values = roleSuggestions.map(row => 
				`('${reportId}', ${columns.map(column => `'${row[column]}'`).join(", ")})`
			).join(", ");

			const query = `
				INSERT INTO RoleSuggestions (reportId, ${columns.join(", ")})
				VALUES ${values}
			`;

			// Step 3: Execute the query
			await pool.request().query(query);
			return true;
		} catch (err) {
			console.error("Failed to perform bulk insert");
			console.error(err);
			return false;
		}
	}
}

module.exports = ReportModel