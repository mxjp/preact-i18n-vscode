import * as vscode from "vscode";
import { join } from "path";
import { Editor } from ".";
import { disposeAll } from "../utility";
import { ViewMessage, RendererMessage } from "./messages";

export class EditorView extends vscode.Disposable {
	public constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _editor: Editor,
		restorePanel?: vscode.WebviewPanel
	) {
		super(() => {
			disposeAll(this._subscriptions);
			this._panel.dispose();
		});

		this._panel = restorePanel || vscode.window.createWebviewPanel(
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
			_editor.onDidChangeProject(this._updateProject, this),
			_editor.onDidChangeProjectValid(this._updateProjectValid, this),
			_editor.onDidChangeTranslationSets(this._updateTranslationSets, this),
			this._panel.onDidChangeViewState(() => this._updateAll()),
			this._panel.webview.onDidReceiveMessage((message: RendererMessage) => {
				switch (message.type) {
					case RendererMessage.Type.Ready:
						this._updateAll();
						break;

					case RendererMessage.Type.SetTranslationValue:
						if (_editor.project) {
							// TODO: Also check, if this is still the correct project by passing a project id to the renderer and back.

							_editor.project.editor.set(message.id, message.language, message.value);
						}
						break;
				}
			})
		);
	}

	private readonly _subscriptions: vscode.Disposable[] = [];
	private readonly _panel: vscode.WebviewPanel;

	private _postMessage(message: ViewMessage) {
		if (this._panel.visible) {
			this._panel.webview.postMessage(message);
		}
	}

	private _updateAll() {
		this._updateProject();
		this._updateProjectValid();
		this._updateTranslationSets();
	}

	private _updateProject() {
		this._postMessage({
			type: ViewMessage.Type.UpdateProject,
			projectConfig: this._editor.project?.config
		})
	}

	private _updateProjectValid() {
		this._postMessage({
			type: ViewMessage.Type.UpdateProjectValid,
			projectValid: this._editor.projectValid
		});
	}

	private _updateTranslationSets() {
		this._postMessage({
			type: ViewMessage.Type.UpdateTranslationSets,
			translationSets: this._editor.translationSets
		});
	}

	public get onDidDispose() {
		return this._panel.onDidDispose;
	}

	public focus() {
		this._panel.reveal(undefined, false);
	}
}
