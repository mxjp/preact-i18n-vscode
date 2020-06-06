import * as vscode from 'vscode';
import { VscProjectManager } from './vsc-project-manager';
import { VscSourceFile } from './vsc-source-file';
import { Editor } from './editor';
import { rateLimit, asyncQueue } from './util';

const DOC_SELECTOR = "typescriptreact";

export function activate(context: vscode.ExtensionContext) {
	const projects = new VscProjectManager();

	let editor: Editor | null = null;

	function updateEditor(target: Editor.Target | null, reveal = false) {
		if (reveal && editor === null) {
			editor = new Editor(context, projects);
			editor.onDidDispose(() => {
				editor = null;
			});
		}
		editor?.update(target, reveal);
	}

	const onTextEditorUpdate = rateLimit((editor?: vscode.TextEditor) => {
		if (editor && VscSourceFile.isSourceFile(editor.document.uri.fsPath) && !editor.document.isDirty) {
			const sourceFile = projects.sourceFiles.get(editor.document.uri.fsPath);
			if (sourceFile === undefined || !sourceFile.project.valid) {
				return null;
			}
			const fragments = sourceFile.vscFragmentsIn(editor.selection);
			updateEditor({
				sourceFile,
				ids: fragments.map(f => f.id)
			});
		}
	});

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(onTextEditorUpdate),
		vscode.window.onDidChangeTextEditorSelection(event => onTextEditorUpdate(event.textEditor)),
		vscode.workspace.onDidSaveTextDocument(() => onTextEditorUpdate(vscode.window.activeTextEditor)),

		vscode.commands.registerCommand("preact-i18n.edit", async (args: {
			filename?: string,
			sourceFile?: VscSourceFile,
			ids?: string[]
		} = {}) => {
			if (args.filename !== undefined) {
				args.sourceFile = projects.sourceFiles.get(args.filename);
			}
			if (args.sourceFile && args.ids) {
				updateEditor({ sourceFile: args.sourceFile, ids: args.ids }, true);
			} else {
				updateEditor(null, true);
			}
		}),

		vscode.languages.registerCodeActionsProvider(DOC_SELECTOR, {
			provideCodeActions(document, range, context) {
				const sourceFile = projects.sourceFiles.get(document.uri.fsPath);
				if (sourceFile === undefined || !sourceFile.project.valid) {
					return null;
				}

				const fragment = sourceFile.vscFragmentAt(range.start);
				if (fragment !== undefined) {
					const action = new vscode.CodeAction("Edit translation", vscode.CodeActionKind.Empty);
					action.command = {
						command: "preact-i18n.edit",
						title: "Edit translation",
						arguments: [{
							sourceFile,
							ids: [fragment.id]
						}]
					};
					return [action];
				}

				return null;
			}
		}, {
			providedCodeActionKinds: [vscode.CodeActionKind.Empty]
		}),

		projects
	);
}

export function deactivate() {}
