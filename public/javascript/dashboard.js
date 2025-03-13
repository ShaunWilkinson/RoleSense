var currentTenantId;
var socket = null;
var subscribedReports = [];
var toastElList = []
var toastList;

$(() => {
	initialiseSockets();
	initiateTenantSubmission();
	initiateSubscriptionSelector();
	initiateResourceGroupSelector();
	initialiseAnalyseButton();
	initialiseToasts();
})

function initialiseToasts() {
	toastElList = [].slice.call(document.querySelectorAll('.toast'))
	toastList = toastElList.map(function (toastEl) {
		return new bootstrap.Toast(toastEl)
	})
}

function showToast(title, body) {
	if(!toastList[0]) return;

	let date = new Date();
	const formattedDate = date.toLocaleString('en-UK', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	toastList[0].querySelector(".toastHeading").innerText = title;
	toastList[0].querySelector(".toastDate").innerText = formattedDate;
	toastList[0].querySelector(".toastBody").innerText = body;
	toastList[0].show();
}

function initialiseSockets() {
	try {
		socket = io({
			transports: ['websocket'],
			secure: true,
			withCredentials: true
		});

		registerServerSocketActions();
	} catch(error) {
		console.error(error)
	}
}

function registerServerSocketActions() {
    socket.on('connect_error', (err) => {
        console.log('Unable to connect to server, this is normally a transient issue\n' + err)
    })
    socket.on('reportStatusChanged', (result) => {
        updateReportStatus(result);
    });
}

function updateReportStatus(result) {
	let reportId = result.reportId;
	let newStatus = result.newStatus;

	let reportRow = document.getElementById(reportId)
	if(!reportRow) return;

	reportRow.querySelector(".reportStatus").innerText = newStatus

	if(newStatus == 'Ready') {
		reportRow.querySelector(".reportLink").href = `/report?id=${reportId}`

		showToast(
			"Report Ready!",
			"Your report has finished processing and is ready to view"
		)
	}
}

function subscribeToReportUpdate(reportId) {
	if(subscribedReports.includes(reportId)) {
		return;
	}

	subscribedReports.push(reportId);
	socket.emit('subscribeToReport', reportId)
}

function initiateTenantSubmission() {
	let tenantInput = document.getElementById("tenantId")
	let tenantSubmitBtn = document.getElementById("submitTenantIdBtn")
	if(!tenantInput || !tenantSubmitBtn) return;

	currentTenantId = tenantInput.value;

	tenantInput.addEventListener('input', (event) => {
		let val = event.target.value;
		const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

    	if(guidRegex.test(val) && val !== currentTenantId) {
			tenantSubmitBtn.disabled = false
		} else {
			tenantSubmitBtn.disabled = true
		}
	})
}
  
function initiateSubscriptionSelector() {
	let subscriptionSelector = document.getElementById("subscriptionSelector")
	const analyseButton = document.getElementById("analyseButton");
	if(!subscriptionSelector || !analyseButton) {
		return;
	}

	let defaultValue = subscriptionSelector.value;
	if(defaultValue && defaultValue != '') {
		subscriptionChanged(defaultValue)
	}

	subscriptionSelector.addEventListener('change', (event) => {
		const selectedValue = event.target.value;
		subscriptionChanged(selectedValue)
	})
}

function initiateResourceGroupSelector() {
	let subscriptionSelector = document.getElementById("subscriptionSelector")
	let resourceGroupSelector = document.getElementById("resourceGroupSelector")
	const analyseButton = document.getElementById("analyseButton");
	if(!subscriptionSelector || !resourceGroupSelector || !analyseButton) {
		return;
	}

	// On RG change, enable analyse button if there's a selected Subscription

	resourceGroupSelector.addEventListener('change', (event) => {
		const selectedValue = subscriptionSelector.value;

		if(selectedValue && selectedValue != '') {
			analyseButton.disabled = false;
		}
	})
}

function subscriptionChanged(selectedValue) {
	const resourceGroupSelector = document.getElementById("resourceGroupSelector");
	const analyseButton = document.getElementById("analyseButton");

	if(!resourceGroupSelector || selectedValue == "") {
		analyseButton.disabled = true;
		return;
	}

	$.get(`/resources/getResourceGroups`, {s:selectedValue}, (result) => {
		resourceGroupSelector.innerHTML = '<option value="">Optionally select a Resource Group...</option>';

		if(!result || result.length == 0) {
			resourceGroupSelector.querySelector("option").innerText = "No Resource Groups found"
			analyseButton.disabled = true;
		}

		analyseButton.disabled = false;
		
		for(let i=0; i<result.length; i++) {
			let option = document.createElement("option");
			option.value = result[i].id; // Assuming the resource group object has an `id`
			option.textContent = result[i].name; // Assuming the resource group object has a `name`
			resourceGroupSelector.appendChild(option);
		}
	})
}

function initialiseAnalyseButton() {
	let subscriptionSelector = document.getElementById("subscriptionSelector")
	let resourceGroupSelector = document.getElementById("resourceGroupSelector")
	let analyseButton = document.getElementById("analyseButton")
	let filterButton = document.getElementById("startDate")

	if(!subscriptionSelector || !analyseButton || !resourceGroupSelector || !filterButton) {
		return;
	}

	analyseButton.addEventListener('click', (event) => {
		let subscriptionId = subscriptionSelector.value;
		let startDate = filterButton.valueAsNumber;
		if(subscriptionId == "" || isNaN(startDate)) return;
		analyseButton.disabled = true;

		let resourceGroupId = resourceGroupSelector.value;

		updateAnalysisText("Please wait... Requesting new report", "text-success")
		$.post('/resources/createReport', {s:subscriptionId, r:resourceGroupId, f:startDate}, (result) => {
			if(result && result.status == 'Requested') {
				let noReportsRow = document.getElementById("noReportsRow")
				if(noReportsRow) {
					noReportsRow.remove()
				}

				addReportRow(result);
				updateAnalysisText("The Report has been requested and will be ready shortly once processed.", "text-success")
				subscribeToReportUpdate(result.id)
			} else {
				updateAnalysisText(result.error, "text-danger")
			}
		})
	})
}

function updateAnalysisText(text, colourClass) {
	let analysisText = document.getElementById("analysisText")
	if(!analysisText) {
		return;
	}

	const date = new Date()
	const formattedDate = date.toLocaleString('en-UK', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	analysisText.classList.remove("d-none")
	analysisText.classList.remove(["text-success", "text-warning", "text-danger"])
	analysisText.classList.add(colourClass)
	analysisText.innerText = formattedDate + " - " + text
}

function addReportRow(result) {
    // Get the template row and clone it
    const templateRow = document.getElementById('reportRowTemplate');
    if (!templateRow) {
        console.error("Template row not found!");
        return;
    }
    
    // Clone the template row and remove the id
    const rowClone = templateRow.cloneNode(true);
    rowClone.removeAttribute('id');
    rowClone.classList.remove('d-none');
	rowClone.setAttribute('reportId', result.id)
	rowClone.id = result.id

    // Populate report name
    const reportName = rowClone.querySelector('.reportName');
    if (reportName) {
        reportName.textContent = result.name || "N/A";
    }

    // Populate users count
    const reportUsersCount = rowClone.querySelector('.reportUsersCount');
    if (reportUsersCount) {
        reportUsersCount.textContent = `${result.usersCount || 0}`;
    }

    // Populate report date
    const reportDate = rowClone.querySelector('.reportDate');
    if (reportDate) {
		const date = new Date(result.created)
        reportDate.textContent = date.toLocaleString('en-UK', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // Populate report status
    const reportStatus = rowClone.querySelector('.reportStatus');
    if (reportStatus) {
        reportStatus.textContent = result.status || "Requested";
    }

    // Append the cloned row as the first child of reportsTbody
    const reportsTbody = document.getElementById('reportsTbody');
    if (reportsTbody) {
        reportsTbody.insertBefore(rowClone, reportsTbody.firstChild);
    } else {
        console.error("reportsTbody not found!");
    }
}
