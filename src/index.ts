import * as vscode from 'vscode';
import { VscProjectManager } from './vsc-project-manager';
import { Output } from './output';
import { Editor } from './editor';
import { provideDiagnostics } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
	const output = new Output();
	const projects = new VscProjectManager(output);
	const editor = new Editor(output, context, projects);
	const diagnostics = provideDiagnostics(output, projects);

	// TODO: Configuration option for disabling diagnostics.

	context.subscriptions.push(output, projects, editor, diagnostics);
}

export function deactivate() {}
