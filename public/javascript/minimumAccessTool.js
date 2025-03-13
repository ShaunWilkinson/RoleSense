
let roleActionsInput, submitBtn;

$(() => {
	roleActionsInput = document.getElementById("roleActionsInput");
	submitBtn = document.getElementById("submitBtn")

	initiateInput();
	initialiseFindButton();
})

function initialiseFindButton() {
	if(!roleActionsInput || !submitBtn) {
		return;
	}

	submitBtn.addEventListener('click', (event) => {
		let roleActions = roleActionsInput.value;
		if(roleActions == "") return;
		submitBtn.disabled = true;

		updateAnalysisText("Please wait... Analysing available roles", "text-success")
		$.post('/resources/findMinimumRole', {r:roleActions}, (result) => {
			if(result) {
				showRoleResult(result);
				updateAnalysisText("Minimal Role identified.", "text-success")
			} else {
				updateAnalysisText(result.error, "text-danger")
			}
		})
	})
}

function initiateInput() {
	if(!submitBtn || !roleActionsInput) {
		return;
	}
	verifyInput();

	roleActionsInput.addEventListener("input", el => {
		verifyInput();
	})
}

function verifyInput() {
	const regex = /Microsoft\.[A-Za-z]+(?:\.[A-Za-z]+)*\/(?:\*|[A-Za-z]+)(?:\/(?:\*|[A-Za-z]+))?/;
	if(regex.test(roleActionsInput.value)) {
		submitBtn.disabled = false
	} else {
		submitBtn.disabled = true;
	}
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

function showRoleResult(roleData) {
	let roleDisplayCard = document.getElementById("roleDisplayCard")

	if(roleData.length == 0) {
		roleDisplayCard.classList.add("d-none")
		return;
	}

	roleDisplayCard.classList.remove("d-none")
	roleDisplayCard.classList.add("fade-hidden");

	// Allow the browser to process the DOM changes before starting the fade-in
	setTimeout(() => {
		roleDisplayCard.classList.add("fade-visible");
		roleDisplayCard.classList.remove("fade-hidden");
	}, 200);

	let clonedRows = document.querySelectorAll(".cloned-row")
	for(let i=0; i<clonedRows.length; i++) {
		clonedRows[i].remove();
	}

	// Get the template row and clone it
    const templateRow = document.getElementById('templateTr');
    if (!templateRow) {
        console.error("Template row not found!");
        return;
    }

	for(let i=0; i<roleData.length; i++) {
		let result = roleData[i].role;
		// Clone the template row and remove the id
		const rowClone = templateRow.cloneNode(true);
		rowClone.removeAttribute('id');
		rowClone.classList.remove('d-none');
		rowClone.classList.add('cloned-row')
		rowClone.id = `row-${i}`

		const roleName = rowClone.querySelector('.roleName');
		if (roleName) {
			roleName.textContent = result.name || "N/A";
		}

		const risk = rowClone.querySelector('.risk');
		switch(result.category) {
			case "Critical":
				rowClone.querySelector(".highRisk").remove();
				rowClone.querySelector(".mediumRisk").remove();
				rowClone.querySelector(".lowRisk").remove();
				break;
			case "High":
				rowClone.querySelector(".criticalRisk").remove();
				rowClone.querySelector(".mediumRisk").remove();
				rowClone.querySelector(".lowRisk").remove();
				break;
			case "Medium":
				rowClone.querySelector(".criticalRisk").remove();
				rowClone.querySelector(".highRisk").remove();
				rowClone.querySelector(".lowRisk").remove();
				break;
			case "Low":
				rowClone.querySelector(".criticalRisk").remove();
				rowClone.querySelector(".highRisk").remove();
				rowClone.querySelector(".mediumRisk").remove();
				break;

		}

		const description = rowClone.querySelector('.description');
		if (description) {
			description.textContent = result.description || "N/A";
		}

		const allowedActions = rowClone.querySelector('.allowedActions');
		if (allowedActions) {
			allowedActions.innerHTML = prettifyActions(result.actions[0].actions) || "N/A";
		}

		const disallowedActions = rowClone.querySelector('.disallowedActions');
		if (disallowedActions) {
			disallowedActions.innerHTML = prettifyActions(result.actions[0].notActions) || "N/A";
		}

		const dataActions = rowClone.querySelector('.dataActions');
		if (dataActions) {
			dataActions.innerHTML = prettifyActions(result.actions[0].dataActions)  || "N/A";
		}

		const disallowedDataActions = rowClone.querySelector('.disallowedDataActions');
		if (disallowedDataActions) {
			disallowedDataActions.innerHTML = prettifyActions(result.actions[0].notDataActions) || "N/A";
		}

		// Append the cloned row as the first child of reportsTbody
		const roleDisplayTbody = document.getElementById('roleDisplayTbody');
		if (roleDisplayTbody) {
			roleDisplayTbody.append(rowClone);
		} else {
			console.error("roleDisplayTbody not found!");
		}
	}
}

function prettifyActions(actions) {
	if(!actions || actions.length == 0) {
		return "";
	}
	if(actions.length > 1) {
		return actions.join("<br>")
	}
	return actions
}