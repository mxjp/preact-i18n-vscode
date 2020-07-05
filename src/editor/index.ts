import * as vscode from "vscode";
import { VscProjectManager } from "../vsc-project-manager";
import { Output } from "../output";
import { ViewController } from "./view-controller";
import { rateLimit, disposeAll, PromiseBag, onDeferredError } from "../utility";
import { VscSourceFile } from "../vsc-source-file";
import { Project } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "../vsc-project";

export class Editor extends vscode.Disposable {
	public constructor(
		private readonly _output: Output,
		private readonly _context: vscode.ExtensionContext,
		private readonly _projects: VscProjectManager
	) {
		super(() => {
			this._view?.dispose();
			disposeAll(this._subscriptions);
			disposeAll(this._projectSubscriptions);
		});

		this._subscriptions.push(
			vscode.commands.registerCommand("preact-i18n.show-editor", () => {
				this._getView().focus();
			}),

			vscode.window.registerWebviewPanelSerializer("preact-i18n.editor-view", {
				deserializeWebviewPanel: async panel => {
					this._getView(panel);
				}
			}),

			vscode.window.onDidChangeActiveTextEditor(editor => {
				this._saveAllChanges();
				this._updateSelection(editor);
			}),
			vscode.window.onDidChangeVisibleTextEditors(() => {
				this._saveAllChanges();
				this._updateSelection();
			}),
			vscode.window.onDidChangeTextEditorSelection(e => this._updateSelection(e.textEditor), this),

			vscode.window.onDidChangeWindowState(() => this._saveAllChanges()),

			vscode.workspace.onWillSaveTextDocument(this._interceptFileOperation, this),
			vscode.workspace.onWillCreateFiles(this._interceptFileOperation, this),
			vscode.workspace.onWillDeleteFiles(this._interceptFileOperation, this),
			vscode.workspace.onWillRenameFiles(this._interceptFileOperation, this),

			_projects.onDidUnloadProject(() => this._updateSelection()),
			_projects.onDidLoadProject(() => this._updateSelection())
		);

		this._updateSelection();
	}

	private readonly _pendingOperations = new PromiseBag();
	private readonly _subscriptions: vscode.Disposable[] = [];
	private readonly _projectSubscriptions: vscode.Disposable[] = [];

	private _view: ViewController | undefined = undefined;
	private _project: VscProject | undefined = undefined;
	private _selection: string[] = [];
	private _translationSets: Editor.TranslationSet[] = [];

	private readonly _onDidChangeProject = new vscode.EventEmitter<void>();
	private readonly _onDidChangeProjectValid = new vscode.EventEmitter<void>();
	private readonly _onDidChangeTranslationSets = new vscode.EventEmitter<void>();

	public readonly onDidChangeProject = this._onDidChangeProject.event;
	public readonly onDidChangeProjectValid = this._onDidChangeProjectValid.event;
	public readonly onDidChangeTranslationSets = this._onDidChangeTranslationSets.event;

	public get projectConfig() {
		return this._project?.config;
	}

	public get projectValid() {
		return this._project ? this._project.valid : false;
	}

	public get translationSets() {
		return this._translationSets;
	}

	public setTranslation(projectConfigFilename: string, id: string, language: string, value: string) {
		const project = this._projects.projects.get(projectConfigFilename);
		if (project) {
			project.setTranslation(id, language, value);
		}
	}

	private _saveAllChanges() {
		// TODO: Also queue async save operations.
		this._pendingOperations.put(this._projects.saveAllChanges());
	}

	private _interceptFileOperation(operation: vscode.TextDocumentWillSaveEvent
		| vscode.FileWillCreateEvent
		| vscode.FileWillDeleteEvent
		| vscode.FileWillRenameEvent
	) {
		this._saveAllChanges();
		operation.waitUntil(this._pendingOperations.wait());
	}

	@rateLimit()
	private _updateSelection(editor?: vscode.TextEditor) {
		if (!editor) {
			editor = vscode.window.activeTextEditor;
		}
		if (editor) {
			if (VscSourceFile.isSourceFile(editor.document.uri.fsPath)) {
				const source = this._projects.allSources.get(editor.document.uri.fsPath);
				if (source) {
					if (editor.selections.length > 0) {
						const selections = Array.from(editor.selections).map<[number, number]>(selection => {
							return [source.positionToOffset(selection.start), source.positionToOffset(selection.end)];
						}).sort(([a], [b]) => {
							return a > b ? 1 : (a < b ? -1 : 0);
						});
						this._selection = [];
						for (const [start, end] of selections) {
							const fragments = source.fragmentsAt(start - 1, end);
							this._selection.push(...fragments.map(fragment => fragment.id));
						}
					} else {
						this._selection = source.fragments.map(fragment => fragment.id);
					}
					this._setProject(source.project);
				} else {
					this._selection = [];
				}
				this._updateTranslationSets();
			} else {
				this._selection = [];
				this._updateTranslationSets();
			}
		}
	}

	private [onDeferredError](error: any) {
		this._output.error(error);
	}

	private _setProject(project: VscProject) {
		if (this._project !== project) {
			disposeAll(this._projectSubscriptions);
			this._project = project;
			if (project) {
				this._projectSubscriptions.push(
					project.onDidUpdateProjectData(() => {
						this._updateTranslationSets();
					}),
					project.onDidUpdateSource(() => {
						this._updateTranslationSets();
					}),
					project.onDidRemoveSource(() => {
						this._updateTranslationSets();
					}),
					project.onDidVerify(() => {
						this._onDidChangeProjectValid.fire();
					})
				);
			}
			this._onDidChangeProject.fire();
			this._onDidChangeProjectValid.fire();
		}
	}

	private _updateTranslationSets() {
		if (this._project) {
			const project = this._project.configFilename;
			this._translationSets = [];
			for (const id of this._selection) {
				const data = this._project.getTranslationSet(id);
				this._translationSets.push({ id, project, data });
			}
			this._onDidChangeTranslationSets.fire();
		} else {
			this._translationSets = [];
			this._onDidChangeTranslationSets.fire();
		}
	}

	private _getView(restore?: vscode.WebviewPanel) {
		if (!this._view) {
			this._view = new ViewController(this, this._context, restore);
			this._view.onDidDispose(() => {
				this._view = undefined;
			});
		}
		return this._view;
	}
}

export namespace Editor {
	export interface TranslationSet {
		readonly id: string;
		readonly project: string;
		readonly data: Project.TranslationSet;
	}
}
