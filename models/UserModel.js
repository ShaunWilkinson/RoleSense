// @ts-check
const sql = require("mssql")
const {sqlConfig} = require('../config/db')
const {get} = require('../controllers/sqlPoolManager')

class UserModel {
    async recordUserActivity(sub, email, firstName, familyName, tenantId, upn) {
		let transaction;

		try {
			const pool = await get('default', sqlConfig);
			
			// Begin transaction explicitly
			transaction = pool.transaction();
			await transaction.begin();

			const result = await transaction.request()
				.input("sub", sql.VarChar(43), sub)
				.input("email", sql.VarChar(254), email)
				.input("firstName", sql.VarChar(64), firstName)
				.input("familyName", sql.VarChar(64), familyName)
				.input("defaultTenant", sql.UniqueIdentifier, tenantId)
				.input("upn", sql.VarChar(254), upn)
				.query(`
					UPDATE dbo.Users WITH (UPDLOCK, SERIALIZABLE) 
					SET 
						email = @email,
						givenName = @firstName,
						familyName = @familyName,
						lastActivity = DATEDIFF(SECOND,'1970-01-01', GETUTCDATE()),
						defaultTenant = @defaultTenant,
						upn = @upn
					OUTPUT 0 AS existing
					WHERE 
						sub = @sub;
					
					IF @@ROWCOUNT = 0
					BEGIN
						INSERT dbo.Users(sub, email, givenName, familyName, defaultTenant, upn) 
						OUTPUT 1 AS existing
						VALUES (@sub, @email, @firstName, @familyName, @defaultTenant, @upn)
						
					END
				`)
				
			await transaction.commit();

			if (result && result.rowsAffected[0] > 0) {
				return result.recordset?.[0];
			}
			return false;
		} catch (err) {
			// Rollback transaction in case of error
			console.error("Failed to recordUserActivity");
			console.error(err);

			// Explicit rollback
			if (transaction) {
				await transaction.rollback();
			}
			throw err; // Re-throw error so the calling function can handle it
		}
	}

	async saveDefaultTenantId(sub, tenantId) {
		let transaction;

		try {
			const pool = await get('default', sqlConfig);
			
			// Begin transaction explicitly
			transaction = pool.transaction();
			await transaction.begin();

			const result = await transaction.request()
				.input("sub", sql.VarChar(43), sub)
				.input("tenantId", sql.UniqueIdentifier, tenantId)
				.query(`
					UPDATE dbo.Users WITH (UPDLOCK, SERIALIZABLE) 
					SET 
						defaultTenant = @tenantId
					WHERE 
						sub = @sub;

					INSERT INTO Licence (tenantId)
					SELECT @tenantId
					WHERE NOT EXISTS (
						SELECT *
						FROM Licence WITH (UPDLOCK, HOLDLOCK)
						WHERE tenantId = @tenantId
					)
				`)
				
			await transaction.commit();

			if (result && result.rowsAffected[0] > 0 && result.rowsAffected[1] > 0) {
				return true;
			}
			return false;
		} catch (err) {
			// Rollback transaction in case of error
			console.error("Failed to saveDefaultTenantId");
			console.error(err);

			// Explicit rollback
			if (transaction) {
				await transaction.rollback();
			}
			throw err; // Re-throw error so the calling function can handle it
		}
	}

	async getWorkspaceId(defaultTenantId) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("defaultTenantId", sql.UniqueIdentifier, defaultTenantId)
			.query(`
				SELECT TOP(1) logAnalyticsWorkspaceId
				FROM Licence
				WHERE tenantId = @defaultTenantId`
			)
			.catch(err => {
				console.error("Failed to getWorkspaceId")
				console.error(err)
			})
	
		return result?.recordset?.[0]?.logAnalyticsWorkspaceId ?? null;
	}

	async updateWorkspaceId(defaultTenantId, workspaceId) {
		let transaction;

		try {
			const pool = await get('default', sqlConfig);
			
			// Begin transaction explicitly
			transaction = pool.transaction();
			await transaction.begin();

			const result = await transaction.request()
				.input("tenantId", sql.UniqueIdentifier, defaultTenantId)
				.input("workspaceId", sql.VarChar(3000), workspaceId)
				.query(`
					UPDATE dbo.Licence WITH (UPDLOCK, SERIALIZABLE) 
					SET 
						logAnalyticsWorkspaceId = @workspaceId
					WHERE 
						tenantId = @tenantId;
				`)
				
			await transaction.commit();

			if (result && result.rowsAffected[0] > 0) {
				return true;
			}
			return false;
		} catch (err) {
			// Rollback transaction in case of error
			console.error("Failed to updateWorkspaceId");
			console.error(err);

			// Explicit rollback
			if (transaction) {
				await transaction.rollback();
			}
			throw err; // Re-throw error so the calling function can handle it
		}
	}

	async removeWorkspaceId(defaultTenantId) {
		let transaction;

		try {
			const pool = await get('default', sqlConfig);
			
			// Begin transaction explicitly
			transaction = pool.transaction();
			await transaction.begin();

			const result = await transaction.request()
				.input("tenantId", sql.UniqueIdentifier, defaultTenantId)
				.query(`
					UPDATE dbo.Licence WITH (UPDLOCK, SERIALIZABLE) 
					SET 
						logAnalyticsWorkspaceId = NULL
					WHERE 
						tenantId = @tenantId;
				`)
				
			await transaction.commit();

			if (result && result.rowsAffected[0] > 0) {
				return true;
			}
			return false;
		} catch (err) {
			// Rollback transaction in case of error
			console.error("Failed to removeWorkspaceId");
			console.error(err);

			// Explicit rollback
			if (transaction) {
				await transaction.rollback();
			}
			throw err; // Re-throw error so the calling function can handle it
		}
	}

	async shouldShowBeginnerGuide(sub) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("sub", sql.VarChar(43), sub)
			.query(`
				UPDATE Users
				SET showBeginnerGuide = 0
				OUTPUT DELETED.showBeginnerGuide
				WHERE sub = @sub`
			)
			.catch(err => {
				console.error("Failed to shouldShowBeginnerGuide")
				console.error(err)
			})
	
		return result?.recordset?.[0]?.showBeginnerGuide ?? null;
	}

    async getTenantId(sub) {
		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("sub", sql.VarChar(43), sub)
			.query(`
				SELECT TOP(1) defaultTenant
				FROM Users
				WHERE sub = @sub`
			)
			.catch(err => {
				console.error("Failed to getTenantId")
				console.error(err)
			})
	
		return result?.recordset?.[0]?.defaultTenant ?? null;
	}

	async getDashboardLicenceDetails(tenantId) {
		if(!tenantId) {
			return null;
		}

		let pool = await get('default', sqlConfig);
		let result = await pool.request()
			.input("tenantId", sql.UniqueIdentifier, tenantId)
			.query(`
				SELECT TOP(1) logAnalyticsWorkspaceId
				FROM Licence
				WHERE tenantId = @tenantId`
			)
			.catch(err => {
				console.error("Failed to getLicenceDetails")
				console.error(err)
			})
	
		return result?.recordset?.[0] ?? null;
	}
}

module.exports = UserModel