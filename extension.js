const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "vscode-dbunit-xml-editor" is now active!');

	let disposable = vscode.commands.registerCommand('extension.helloXml', () => {
		vscode.window.showInformationMessage('Hello XML!');
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

// eslint-disable-next-line no-undef
module.exports = {
	activate,
	deactivate
}
