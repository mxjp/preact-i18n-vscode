import * as vscode from "vscode";
import { VscProjectManager } from "../vsc-project-manager";
import { Output } from "../output";
import { EditorView } from "./view";
import { useRateLimit, disposeAll } from "../utility";
import { VscSourceFile } from "../vsc-source-file";
import { Project } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "../vsc-project";

export class Editor extends vscode.Disposable {
	public constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _output: Output,
		private readonly _projects: VscProjectManager
	) {
		super(() => {
			disposeAll(this._subscriptions);
			disposeAll(this._projectSubscriptions);
			this._view?.dispose();
		});

		this._subscriptions.push(
			vscode.commands.registerCommand("preact-i18n.show-editor", () => {
				this._getView().focus();
			}),

			vscode.window.registerWebviewPanelSerializer("preact-i18n.editor", {
				deserializeWebviewPanel: async (panel, state) => {
					this._getView(panel);
				}
			}),

			vscode.window.onDidChangeActiveTextEditor(this._updateSelection, this),
			vscode.window.onDidChangeTextEditorSelection(e => this._updateSelection(e.textEditor)),
			vscode.workspace.onDidSaveTextDocument(() => this._updateSelection(), this),

			_projects.onDidChangeProject(() => this._updateSelection()),
			_projects.onDidChangeProjects(() => this._updateSelection())
		);

		this._updateSelection();
	}

	private readonly _subscriptions: vscode.Disposable[] = [];

	private readonly _onDidChangeProject = new vscode.EventEmitter<void>();
	private readonly _onDidChangeProjectValid = new vscode.EventEmitter<void>();
	private readonly _onDidChangeTranslationSets = new vscode.EventEmitter<void>();

	public readonly onDidChangeProject = this._onDidChangeProject.event;
	public readonly onDidChangeProjectValid = this._onDidChangeProjectValid.event;
	public readonly onDidChangeTranslationSets = this._onDidChangeTranslationSets.event;

	private _view: EditorView | null = null;

	private _project: VscProject | null = null;
	private _projectSubscriptions: vscode.Disposable[] = [];

	private _translationSets: Editor.TranslationSet[] = [];

	public get projectValid() {
		return this._project ? this._project.valid : false;
	}

	public get project() {
		return this._project;
	}

	public get translationSets() {
		return this._translationSets;
	}

	private _updateProject(newProject: VscProject) {
		if (this._project !== newProject) {
			disposeAll(this._projectSubscriptions);
			this._project = newProject;
			this._projectSubscriptions.push(
				newProject.onDidVerify((() => {
					this._onDidChangeProjectValid.fire();
				}))
			);
			this._onDidChangeProject.fire();
			this._onDidChangeProjectValid.fire();
		}
	}

	@useRateLimit()
	private _updateSelection(editor?: vscode.TextEditor) {
		if (!editor) {
			editor = vscode.window.activeTextEditor;
		}
		if (editor && !editor.document.isDirty && VscSourceFile.isSourceFile(editor.document.uri.fsPath)) {
			const source = this._projects.allSources.get(editor.document.uri.fsPath);
			if (source === undefined || !source.project.valid) {
				return;
			}
			const start = source.positionToOffset(editor.selection.start);
			const end = source.positionToOffset(editor.selection.end);
			const fragments = source.fragmentsAt(start, end);

			const translationSets: Editor.TranslationSet[] = [];

			for (const fragment of fragments) {
				const translationSet = source.project.editor.getTranslationSet(fragment.id);
				if (translationSet) {
					translationSets.push({
						id: fragment.id,
						set: translationSet
					});
				}
			}

			this._updateProject(source.project);

			this._translationSets = translationSets;
			this._onDidChangeTranslationSets.fire();
		}
	}

	[useRateLimit.handleDeferredError](error: any) {
		this._output.error(error);
	}

	private _getView(restorePanel?: vscode.WebviewPanel) {
		if (this._view === null) {
			this._view = new EditorView(this._context, this, restorePanel);
			this._view.onDidDispose(() => {
				this._view = null;
			});
		}
		return this._view;
	}
}

export namespace Editor {
	export interface TranslationSet {
		readonly id: string;
		readonly set: Project.TranslationSet;
	}
}
