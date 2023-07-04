import * as vscode from 'vscode';

export class XmlEditorProvider implements vscode.CustomTextEditorProvider {

    private static readonly viewType = 'editor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new XmlEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(XmlEditorProvider.viewType, provider);
        return providerRegistration;
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }


    public async resolveCustomTextEditor(document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken): Promise<void> {

        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            console.log(document.getText())
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        }

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'apply':
                    this.save(document, e.text);
                    return;
            }
        });

        updateWebview();
    }

    private save(document: vscode.TextDocument, textModified: string) {

        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            textModified);

        return vscode.workspace.applyEdit(edit);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'datasetTables.js'));
        const converterScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'converter.js'));
        const styleSheetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'style.css'));

        const tabulatorScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'third-party', 'tabulator', 'tabulator.min.js'));
        const tabulatorCssUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'third-party', 'tabulator', 'tabulator.min.css'));

        const sortableScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'third-party', 'Sortable', 'Sortable.min.js'));

        const nonce = this.getNonce();

        return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${tabulatorCssUri}" rel="stylesheet">
                <link href="${styleSheetUri}" rel="stylesheet">

				<title>XML Editor</title>
			</head>
			<body>
                <div id="container"></div>
                <dialog id="tableEditDialog">
                    <form>
                        <div>
                            <div>Table name:</div>
                            <div><input id="tableNameField" type="text" /></div>
                        </div>
                        <div>
                            <div>Column names:</div>
                            <div id="columnListArea" class="modal-column-list">
                                <div><input class="columnNameField" type="text" /><button class="deleteColumnBtn"> - </button></div>
                                <div><input class="columnNameField" type="text" /><button class="deleteColumnBtn"> - </button></div>
                            </div>
                            <div id="columnMovableArea" class="modal-column-list"></div>
                            <div><button id="addColumnBtn"> + </button></div>
                        </div>
                        <div>
                            <button value="" formmethod="dialog">Cancel</button>
                            <button id="confirmBtn" value="create">Create</button>
                        </div>
                    </form>
                </dialog>

                <script nonce="${nonce}" src="${sortableScriptUri}"></script>
                <script nonce="${nonce}" src="${tabulatorScriptUri}"></script>
                <script nonce="${nonce}" src="${converterScriptUri}"></script>
                <script nonce="${nonce}" src="${mainScriptUri}"></script>
			</body>
			</html>`;
    }

    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
