
(function () {
    const vscode = acquireVsCodeApi();

    const container = document.querySelector('#dataset-tables');

    const textbox = document.createElement("textarea");
    textbox.setAttribute("cols", "100");
    textbox.setAttribute("rows", "40");
    textbox.addEventListener('blur', () => {
        vscode.postMessage({
			type: 'apply',
            text: textbox.value
		});
	});
    container.appendChild(textbox);

    function updateContent(text) {
		textbox.value = "";
        textbox.value = text;
	}

    window.addEventListener('message', event => {
		const message = event.data;
		switch (message.type) {
			case 'update':
				const text = message.text;
				updateContent(text);
				vscode.setState({ text });
				return;
		}
	});

	const state = vscode.getState();
	if (state) {
		updateContent(state.text);
	}

}());
