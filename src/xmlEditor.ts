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
                <dialog id="tableEditDialog" class="modal">
                    <form class="table-edit-form">
                        <div class="modal-header">
                          <p id="modalTitle">Header</P>
                          <button class="button button-square" value="" formmethod="dialog">&times</button>
                        </div>
                        <div class="modal-content">
                          <label>
                            <span class="textbox-label">Table Name</span>
                            <input id="tableNameField" type="text" class="textbox"/>
                          </label>
                        </div>
                        <div class="modal-content">
                            <div class="textbox-label">Column Names</div>
                            <div id="columnListArea" class="modal-column-list"></div>
                            <div id="columnMovableArea" class="modal-column-list hide"></div>
                            <div class="add-button-row">
                              <button id="addColumnBtn" class="button button-square">&plus;</button>
                            </div>
                            <div id="alertBox" class="alert-box hide">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                    <path fill="#f06060"
                                        d="M12,1.5c.7,0,1.3,.4,1.6,.9l10.1,17.3c.3,.6,.3,1.3,0,1.9s-1,.9-1.6,.9H1.9c-.7,0-1.3-.4-1.6-.9s-.3-1.3,0-1.9L10.4,2.4c.3-.6,1-.9,1.6-.9Zm0,6c-.6,0-1.1,.5-1.1,1.1v5.3c0,.6,.5,1.1,1.1,1.1s1.1-.5,1.1-1.1v-5.3c0-.6-.5-1.1-1.1-1.1Zm1.5,10.5c0-.8-.7-1.5-1.5-1.5s-1.5,.7-1.5,1.5,.7,1.5,1.5,1.5,1.5-.7,1.5-1.5Z"/>
                                </svg>
                                <p>Names are required.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="button button-clear" value="" formmethod="dialog">Cancel</button>
                            <button id="confirmBtn" class="button button-primary" value="create">Create</button>
                        </div>
                    </form>
                </dialog>

                <dialog id="tableDeleteDialog" class="modal">
                    <form class="table-edit-form">
                        <div class="modal-content">
                            <h5 id="tableNameToDelete">TableName</h5>
                            <p>Do you really want to Delete?</p>
                        </div>
                        <div class="modal-footer">
                            <button class="button button-clear" value="" formmethod="dialog">Cancel</button>
                            <button id="deleteTableBtn" class="button button-danger" value="delete">Delete anyway</button>
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
