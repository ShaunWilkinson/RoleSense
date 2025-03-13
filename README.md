# RoleSense - Data-Driven Access Control for Azure
This solution allows for easily analysing Azure IAM Role Assignments and comparing them to Audit Logs directly from Azure or via a Log Analytics Workspace. This was originally planned to be a paid SaaS application, however due to being a new father and other commitments the plans for this have changed. As such I am completely open-sourcing the solution and welcome you to contribute to the product and to use it both personally and commercially.

You may not use any of the code found in this project to implement your own paid solution.

A working example of the project is located at https://rolesense.org/, this includes the original licencing limitations and is a paid solution. This may be updated in future to show the current repository live.

# Solution Design
The Solution is designed to run in tandem with the [RoleSense-ReportGeneration](https://github.com/ShaunWilkinson/RoleSense-ReportGeneration) repository which handles the back-end queuing and processing of report requests.

The project is designed to run in Azure but could likely be transitioned to other environments with relative ease. The following Azure resources are used -
- App Service - For hosting the front-end application.
- SQL Server - Storage of application data including live sessions, recommendations, reports, report status and user details.
- Storage Account - Queues are used for report generation requests so that the solution is easily scalable.
- Function App - Hosts the back-end report generation code. Triggered by a record being created in the Storage Account queue. This decouples rpeort processing from the front-end application.

# Prerequisites
The following Azure Resources are required for full-functioning of the solution -

## Enterprise Application - Dev/Production
An Enterprise Application is used by the application to handle user authentication via Entra ID and to access required resources such as the latest role definitions.

1. Create a new Enterprise App.
2. Navigate to Authentication and add a Redirect URI in the format *domain*/auth/redirect. EG. http://localhost:3030/auth/redirect
3. Ensure both Access tokens and ID token is selected.
4. Optionally, limit supported account types to those in the current tenant or Multitenant.
5. Navigate to Certificates & secrets and create a new Client secret. Take note of the secret value as it'll be needed.
6. Navigate to API Permissions and add the following Application type permissions, these provide access to the various API Calls used by the app -
	- Application.Read.All
	- AuditLog.Read.All
	- Group.Read.All
	- Organization.Read.All
	- RoleEligibilitySchedule.Read.Directory
	- RoleManagement.Read.All
	- User.ReadBasic.All
7. Navigate to an existing Subscription or create a new one. Provide the Enterprise App with Reader access. This is used to retrieve a list of all available roles as they often change.


## SQL Database - Dev/Production
The database requirements for the solution are minimal. Scripts to create the required tables may be found in the `databaseCreation` folder of the project. Each script creates one of the required tables.

## Storage Account - Dev/Production
The Storage account must contain 2 Queues, the names are configurable via local environment values. These queues contain a list of any reports which have been requested and are picked in a FIFO manner by the Function App.

Example names - report-requests & pim-report-requests

## App Service - Production
An Azure Web App may be used to host the front-end application. The resource requirements for the site are minimal and no special configuration is required. You will likely wish to make use of Custom domains in a production environment though.

You may also integrate the App Service with a VNet to allow more secure connections between it and the database and/or other resources.

## Function App - Production
A Function App is required for the ReportGeneration project to run. The required configuration is contained within the related project. Effectively there should be a Function created for both role and PIM report generation, each triggered via Queue, linked to the relevant Queue created in the Storage Account.

# How to Build and Run
This repo uses [Node.js with NPM](https://nodejs.org/en). Although the front-end will run locally, you must have at minimum configured a database for data storage

This repo contains a git submodule that contains the Report Queuing and Processing code. This runs seperately as a Function App and you may wish to avoid cloning it as part of the build.

When cloning, you'll want to use the standard git command, rather than including submodules:
```
git clone https://github.com/ShaunWilkinson/RoleSense.git
```

Once you've cloned the repository locally, you can install any required NPM packages:
```
npm install
```
Next, create a .env file located in the root of the project, this must at minimum contain the following variables set to their respective values:
```
NODE_ENV = 'development'

AZURE_TENANT_ID = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' # The tenant containing the Enterprise App
AZURE_CLIENT_ID = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' # The Application (client) ID of the related Enterprise App
AZURE_CLIENT_SECRET = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' # Must be a valid Client secret within the Enterprise App

AZURE_HOME_SUBSCRIPTION_ID = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' # The ID of a Subscription which the Enterprise App has read-access to, this is queried for the latest list of all Azure Roles.

REDIRECT_URI='http://localhost:3300/auth/redirect' # Used by Passport, must be in the format '*domain*/auth/redirect'

EXPRESS_SESSION_SECRET = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' # A randomly generated token for encryption of session

# Credentials for connecting to the database, likely better replaced by Key Vault
AZURE_SQL_USERNAME='XXXXXXXXXXXXXX'
AZURE_SQL_PASSWORD='XXXXXXXXXXXXXX'
AZURE_SQL_SERVER='example.database.windows.net'
AZURE_SQL_DATABASE='XXXXXXXXXXXXXX'

# Connection details for the Storage Account Queue
AZURE_STORAGE_ACCOUNT_NAME = 'reportqueue'
AZURE_STORAGE_ACCOUNT_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXX'
AZURE_ROLE_REPORT_QUEUE_NAME = 'report-requests'
AZURE_PIM_REPORT_QUEUE_NAME = 'pim-report-requests'

# The maximum number of reports that may be queued/processing for a single user
MAX_PARALLEL_REPORTS_QUEUED = 3
```

When the required modules are installed you may then run the project, which runs on https://localhost:3300 by default 
```
npm run start
```

# Contributing
I welcome any and all contributions to the project, the project was initially created as a test and grew from there so I'm aware of many shortcomings and potential improvements in the code base.