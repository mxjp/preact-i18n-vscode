import * as vscode from "vscode";
import { join } from "path";
import { Editor } from ".";
import { disposeAll } from "../utility";

export class EditorView extends vscode.Disposable {
	public constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _editor: Editor
	) {
		super(() => {
			disposeAll(this._subscriptions);
			this._panel.dispose();
		});

		this._panel = vscode.window.createWebviewPanel(
			"preact-i18n.editor",
			"Preact I18n Editor",
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
			{ enableCommandUris: true, enableScripts: true, retainContextWhenHidden: true }
		);
		this._panel.onDidDispose(() => {
			disposeAll(this._subscriptions);
		});

		const view = this._panel.webview;
		const src = this._context.extensionPath;
		view.html = `<html>
			<head>
				<link rel="stylesheet" href="${
					view.asWebviewUri(vscode.Uri.file(join(src, "resources/editor.css")))
				}"/>
			</head>
			<body>
				<script src="${
					view.asWebviewUri(vscode.Uri.file(join(src, "out/editor/renderer/index.js")))
				}"></script>
			</body>
		</html>`;

		this._subscriptions.push(
			_editor.onDidChangeTranslationSets(() => {
				// TODO: Display editor for translation sets.
			})
		);
	}

	private readonly _subscriptions: vscode.Disposable[] = [];
	private readonly _panel: vscode.WebviewPanel;

	public get onDidDispose() {
		return this._panel.onDidDispose;
	}

	public focus() {
		this._panel.reveal(undefined, false);
	}
}
