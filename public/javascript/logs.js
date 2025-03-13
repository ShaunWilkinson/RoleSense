$(() => {
	initiateSubscriptionSelector();
    initiateWorkspaceSelector();
    initialiseLinkButton();
	testWorkspaceConnection();
})

function testWorkspaceConnection() {
	let testText = document.getElementById("workspaceConnectionTestText");
	if(!testText) {
		return;
	}

	let workspaceId = testText.getAttribute("workspaceId")
	if(!workspaceId) return;
	$.post(`/resources/testWorkspace`, {w:workspaceId}, (result) => {
		const date = new Date()
		const formattedDate = date.toLocaleString('en-UK', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});

		if(result.error) {
			testText.classList.remove("text-success")
			testText.classList.add("text-danger")
			testText.innerText = formattedDate + " - " + result.error
		} else {
			let now = new Date();
			let oldestLog = new Date(result.TimeGenerated)
			if(oldestLog > now.setDate(now.getDay()-30)) {
				testText.classList.remove("text-success")
				testText.classList.add("text-danger")
				testText.innerText = `Activity Logs available from ${oldestLog.toISOString().split('T')[0]} - This Workspace will not be queried until 30 days of logs are available`
			} else {
				testText.innerText = `Activity Logs available from ${result.TimeGenerated}`
			}
		}
	});
}

function initiateSubscriptionSelector() {
	let subscriptionSelector = document.getElementById("subscriptionSelector")
	const linkButton = document.getElementById("linkButton");
	if(!subscriptionSelector || !linkButton) {
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

function initiateWorkspaceSelector() {
    let workspaceSelector = document.getElementById("workspaceSelector")
	const linkButton = document.getElementById("linkButton");
	if(!workspaceSelector || !linkButton) {
		return;
	}

	workspaceSelector.addEventListener('change', (event) => {
		const selectedValue = event.target.value;
        if(selectedValue == '') {
            linkButton.disabled = true
        } else {
            linkButton.disabled = false
        }
	})
}

function subscriptionChanged(selectedValue) {
	const workspaceSelector = document.getElementById("workspaceSelector");
	const linkButton = document.getElementById("linkButton");

	if(!workspaceSelector || selectedValue == "") {
		linkButton.disabled = true;
		return;
	}

	$.get(`/resources/getWorkspaces`, {s:selectedValue}, (result) => {
		workspaceSelector.innerHTML = '<option value="">Select a Workspace...</option>';

		if(!result || result.length == 0) {
			workspaceSelector.querySelector("option").innerText = "No Log Analytics Workspaces found"
			linkButton.disabled = true;
		}
		
		for(let i=0; i<result.length; i++) {
			let option = document.createElement("option");
			option.value = result[i].id; // Assuming the resource group object has an `id`
			option.textContent = result[i].name; // Assuming the resource group object has a `name`
			workspaceSelector.appendChild(option);
		}
	})
}

function initialiseLinkButton() {
	let subscriptionSelector = document.getElementById("subscriptionSelector")
	let workspaceSelector = document.getElementById("workspaceSelector")
	let linkButton = document.getElementById("linkButton")

	if(!subscriptionSelector || !linkButton || !workspaceSelector) {
		return;
	}

	linkButton.addEventListener('click', (event) => {
		let workspaceId = workspaceSelector.value;
		if(workspaceId == "") return;
		linkButton.disabled = true;

		updateAnalysisText("Please wait... Validating connection to Workspace", "text-success")

		$.post('/resources/saveWorkspace', { w:workspaceId}, (result) => {
			if(result && !result.error) {
				updateAnalysisText("Successfully connected to the Workspace.", "text-success")
				window.location.replace("/logs")
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