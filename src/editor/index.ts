import * as vscode from "vscode";
import { VscProjectManager } from "../vsc-project-manager";
import { Output } from "../output";
import { EditorView } from "./view";
import { useRateLimit, disposeAll } from "../utility";
import { VscSourceFile } from "../vsc-source-file";
import { Project } from "@mpt/preact-i18n/dist/tooling";

export class Editor extends vscode.Disposable {
	public constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _output: Output,
		private readonly _projects: VscProjectManager
	) {
		super(() => {
			disposeAll(this._subscriptions);
			this._view?.dispose();
		});

		this._subscriptions.push(
			vscode.commands.registerCommand("preact-i18n.show-editor", () => {
				this._getView().focus();
			}),

			vscode.window.onDidChangeActiveTextEditor(this._updateSelection, this),
			vscode.window.onDidChangeTextEditorSelection(e => this._updateSelection(e.textEditor)),
			vscode.workspace.onDidSaveTextDocument(() => this._updateSelection(), this)
		);
	}

	private readonly _subscriptions: vscode.Disposable[] = [];

	private readonly _onDidChangeTranslationSets = new vscode.EventEmitter<void>();
	public readonly onDidChangeTranslationSets = this._onDidChangeTranslationSets.event;

	private _view: EditorView | null = null;
	private _translationSets: Editor.TranslationSets = {};

	public get translationSets() {
		return this._translationSets;
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

			const translationSets = Object.create(null);
			for (const fragment of fragments) {
				const translationSet = source.project.getTranslationSet(fragment.id);
				if (translationSet) {
					translationSets[fragment.id] = translationSet;
				}
			}
			this._translationSets = translationSets;
			this._onDidChangeTranslationSets.fire();
		}
	}

	[useRateLimit.handleDeferredError](error: any) {
		this._output.error(error);
	}

	private _getView() {
		if (this._view === null) {
			this._view = new EditorView(this._context, this);
			this._view.onDidDispose(() => {
				this._view = null;
			});
		}
		return this._view;
	}
}

export namespace Editor {
	export interface TranslationSets {
		readonly [id: string]: Project.TranslationSet;
	}
}
