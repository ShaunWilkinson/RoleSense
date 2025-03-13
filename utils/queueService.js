
const { QueueServiceClient, StorageSharedKeyCredential } = require('@azure/storage-queue');

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const roleReportQueueName = process.env.AZURE_ROLE_REPORT_QUEUE_NAME;
const pimReportQueueName = process.env.AZURE_PIM_REPORT_QUEUE_NAME;

class QueueService {
	constructor() {
		this.queueServiceClient = new QueueServiceClient(
			`https://${accountName}.queue.core.windows.net`,
			new StorageSharedKeyCredential(accountName, accountKey)
		);

		this.roleReportQueueClient = this.queueServiceClient.getQueueClient(roleReportQueueName);
		this.pimReportQueueClient = this.queueServiceClient.getQueueClient(pimReportQueueName);
	}

	// Generates a message in the Azure Queue
	async requestReport(reportParameters) {
		const reportId = reportParameters["id"]
		const reportRequest = {
			reportId,
			reportParameters,
			requestedAt: new Date(reportParameters["created"]*1000).toISOString(),
			status: 'Queued'
		};

		try {
			// Add the report request to the queue
			const message = JSON.stringify(reportRequest);
			await this.roleReportQueueClient.sendMessage(Buffer.from(message).toString('base64'));

			// Respond with success and report details
			return true
		} catch (error) {
			console.error("Failed to queue requestReport")
			console.error(error)
			return false
		}
	}

	async requestPIMReport(reportParameters) {
		const reportId = reportParameters["id"]
		const reportRequest = {
			reportId,
			reportParameters,
			requestedAt: new Date(reportParameters["created"]*1000).toISOString(),
			status: 'Queued'
		};

		try {
			// Add the report request to the queue
			const message = JSON.stringify(reportRequest);
			await this.pimReportQueueClient.sendMessage(Buffer.from(message).toString('base64'));

			// Respond with success and report details
			return true
		} catch (error) {
			console.error("Failed to queue requestReport")
			console.error(error)
			return false
		}
	}
}

module.exports = QueueService