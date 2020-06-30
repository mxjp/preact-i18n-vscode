import * as vscode from 'vscode';
import { VscProjectManager } from './vsc-project-manager';
import { Output } from './output';
import { Editor } from './editor';

export function activate(context: vscode.ExtensionContext) {
	const output = new Output();
	const projects = new VscProjectManager(output);
	const editor = new Editor(context, output, projects);
	context.subscriptions.push(output, projects, editor);
}

export function deactivate() {}
