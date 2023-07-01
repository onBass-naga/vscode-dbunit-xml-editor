import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "vscode-dbunit-xml-editor" is now active!');

	let disposable = vscode.commands.registerCommand('extension.helloXml', () => {
		vscode.window.showInformationMessage('Hello XML!?');
	});

	context.subscriptions.push(disposable);
}
