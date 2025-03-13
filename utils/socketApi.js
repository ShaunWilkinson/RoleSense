
const eventEmitter = require("./eventEmitter");
const ReportModel = require("../models/ReportModel")
const reportModel = new ReportModel();

const io = require("socket.io")({
	transports: ['websocket'],
	secure: true
});

const initSocketApi = () => {
	const socketapi = {
		io: io
	}

	// Run sockets when connected
	io.on("connection", (socket) => {
		const user = socket?.request?.user ?? null;

		if(user === null || !user.logged_in) {
			socket.disconnect();
			return;
		}

		reportModel.listIncompleteReportIds(user.profile.tenantId).then((result) => {
			result.forEach(reportId => {
				socket.join(reportId)
			});
		});

		socket.on("subscribeToReport", (data) => {
			socket.join(data);
		});
	});

	io.on("connect_error", (err) => {
		console.error("Socket connection failed", err.message)
		console.error(err.context)
	})

	// Event-based sockets
	eventEmitter.on('reportStatusChanged', async (data) => {
		let reportId = data.reportId;
		var newStatus = data.newStatus;

		io.emit('reportStatusChanged', {
			reportId: reportId,
			newStatus: newStatus
		})
	});
	
	return {
		io
	}
};

module.exports = initSocketApi;