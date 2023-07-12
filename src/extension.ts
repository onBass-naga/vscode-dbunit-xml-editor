import * as vscode from 'vscode';
import { XmlEditorProvider } from './xmlEditor';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "vscode-dbunit-xml-editor" is now active!');

	context.subscriptions.push(XmlEditorProvider.register(context));
}
