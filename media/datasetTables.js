
(function () {
    const vscode = acquireVsCodeApi();

    const container = document.querySelector('#dataset-tables');

    const textbox = document.createElement("textarea");
    textbox.setAttribute("cols", "100");
    textbox.setAttribute("rows", "40");
    textbox.addEventListener('blur', () => {
        console.log(!!hidden.value)
        vscode.postMessage({
			type: 'apply',
            text: serialize(JSON.parse(textbox.value), hidden.value)
		});
	});
    container.appendChild(textbox);

    const hidden = document.createElement("hidden");
    hidden.value = false;
    container.appendChild(hidden);

    function updateContent(text, isFlatXml) {
		textbox.value = "";
        textbox.value = text;
        hidden.value = isFlatXml;
	}

    window.addEventListener('message', event => {
		const message = event.data;
		switch (message.type) {
			case 'update':
                const xmlObj = parseXmlString(message.text);
				const text = JSON.stringify(xmlObj.tables);
				updateContent(text, xmlObj.isFlatXml);
				vscode.setState({ xmlObj });
				return;
		}
	});

	const state = vscode.getState();
	if (state) {
        const text = JSON.stringify(state.xmlObj.tables);
		updateContent(text, state.xmlObj.isFlatXml);
	}

}());
