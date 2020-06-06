import { join } from 'path';
import * as vscode from "vscode";
import { VscSourceFile } from "./vsc-source-file";
import { VscProjectManager } from './vsc-project-manager';
import { EditorTarget } from './editor-target';

export class Editor extends vscode.Disposable {
	public static readonly viewType = "preact-i18n.editor";

	public constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _projects: VscProjectManager
	) {
		super(() => {
			projectUpdates?.dispose();
			this._panel?.dispose();
		});

		const projectUpdates = this._projects.onUpdate(() => {
			if (this._target) {
				const sourceFile = this._projects.sourceFiles.get(this._target.sourceFile.filename);
				if (!sourceFile) {
					this._target = null;
				} else if (sourceFile !== this._target.sourceFile) {
					this._target.sourceFile = sourceFile;
				}
			}
			this._updateView();
		});

		this._panel = vscode.window.createWebviewPanel(
			Editor.viewType,
			"Translation Editor",
			{
				viewColumn: vscode.ViewColumn.Beside,
				preserveFocus: false
			},
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		let wasActive = false;
		this._panel.onDidChangeViewState(state => {
			if (wasActive) {
				this._projects.saveModifiedProjects();
			}
			wasActive = this._panel.active;
		});

		const view = this._panel.webview;

		view.onDidReceiveMessage(message => {
			switch (message?.type) {
				case "set-translation":
					if (this._target) {
						this._target.sourceFile.project.setTranslation(message.id, message.lang, message.value);
					}
					break;
			}
		});

		view.options = {
			enableScripts: true
		};
		const styleUri = view.asWebviewUri(vscode.Uri.file(join(this._context.extensionPath, "static/editor.css")));
		const scriptUri = view.asWebviewUri(vscode.Uri.file(join(this._context.extensionPath, "out/editor/index.js")));
		view.html = `<html>
			<head>
				<link rel="stylesheet" href="${styleUri}"/>
			</head>
			<body>
				<script src="${scriptUri}"></script>
			</body>
		</html>`;

		this.onDidDispose = this._panel.onDidDispose;
	}

	private readonly _panel: vscode.WebviewPanel;
	private _target: Editor.Target | null = null;

	public readonly onDidDispose: vscode.Event<void>;

	private _updateView() {
		if (this._panel.visible) {
			if (this._target) {
				const project = this._target.sourceFile.project;
				if (project.valid) {
					this._setViewState({
						target: <EditorTarget> {
							type: "edit",
							translationSets: project.translationSets(this._target.ids),
							languages: project.config.languages
						}
					});
				} else {
					this._setViewState({
						target: <EditorTarget> { type: "out-of-sync" }
					});
				}
			} else {
				this._setViewState({
					target: <EditorTarget> { type: "no-selection" }
				});
			}
		}
	}

	private _setViewState(state: object) {
		this._panel.webview.postMessage({ type: "set-state", state });
	}

	public update(state: Editor.Target | null, reveal: boolean) {
		this._target = state;
		if (reveal) {
			this._panel.reveal(undefined, false);
		}
		this._updateView();
	}
}

export namespace Editor {
	export interface Target {
		sourceFile: VscSourceFile;
		ids: string[];
	}
}
