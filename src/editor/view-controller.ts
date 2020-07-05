import * as vscode from "vscode";
import { Editor } from ".";
import { join } from "path";
import { disposeAll } from "../utility";
import { ViewMessage, ControllerMessage } from "./messages";

export class ViewController extends vscode.Disposable {
	public constructor(
		private readonly _editor: Editor,
		private readonly _context: vscode.ExtensionContext,
		restore?: vscode.WebviewPanel
	) {
		super(() => {
			this._panel.dispose();
			this._onDidDispose.fire();
			disposeAll(this._subscriptions);
		});

		this._panel = restore || vscode.window.createWebviewPanel(
			"preact-i18n.editor-view",
			"Translation Editor",
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		this._panel.onDidDispose(() => {
			this.dispose();
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
					view.asWebviewUri(vscode.Uri.file(join(src, "out/editor/view/index.js")))
				}"></script>
			</body>
		</html>`;

		this._subscriptions.push(
			view.onDidReceiveMessage((message: ViewMessage) => {
				switch (message.type) {
					case ViewMessage.Type.Load:
						this._updateProject();
						this._updateProjectValid();
						this._updateTranslationSets();
						break;

					case ViewMessage.Type.SetTranslation:
						this._editor.setTranslation(message.projectConfigFilename, message.id, message.language, message.value);
						break;
				}
			}),

			_editor.onDidChangeProject(this._updateProject, this),
			_editor.onDidChangeProjectValid(this._updateProjectValid, this),
			_editor.onDidChangeTranslationSets(this._updateTranslationSets, this)
		);
	}

	private readonly _panel: vscode.WebviewPanel;
	private readonly _subscriptions: vscode.Disposable[] = [];
	private readonly _onDidDispose = new vscode.EventEmitter<void>();

	public readonly onDidDispose = this._onDidDispose.event;

	private _postMessage(message: ControllerMessage) {
		this._panel.webview.postMessage(message);
	}

	private _updateProject() {
		this._postMessage({
			type: ControllerMessage.Type.UpdateProject,
			config: this._editor.projectConfig
		})
	}

	private _updateProjectValid() {
		this._postMessage({
			type: ControllerMessage.Type.UpdateProjectValid,
			valid: this._editor.projectValid
		});
	}

	private _updateTranslationSets() {
		this._postMessage({
			type: ControllerMessage.Type.UpdateTranslationSets,
			sets: this._editor.translationSets
		});
	}

	public focus() {
		this._panel.reveal(undefined, false);
	}
}
