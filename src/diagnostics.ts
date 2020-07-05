import * as vscode from "vscode";
import { disposeAll } from "./utility";
import { VscProject } from "./vsc-project";
import { VscProjectManager } from "./vsc-project-manager";
import { Diagnostic } from "@mpt/preact-i18n/dist/tooling";
import { VscSourceFile } from "./vsc-source-file";

export function provideDiagnostics(projects: VscProjectManager) {
	const collection = vscode.languages.createDiagnosticCollection("Preact I18n");
	const projectDiagnostics = new Map<VscProject, vscode.Disposable>();

	projects.onDidLoadProject(project => {
		projectDiagnostics.set(project, provideProjectDiagnostics(collection, project));
	});

	projects.onDidUnloadProject(project => {
		projectDiagnostics.get(project)?.dispose();
	});

	return new vscode.Disposable(() => {
		disposeAll(projectDiagnostics.values());
		collection.dispose();
	});
}

function getMessage(diagnostic: Diagnostic) {
	switch (diagnostic.type) {
		case Diagnostic.Type.MissingTranslation:
			return `Translation for fragment #${diagnostic.id} for language "${diagnostic.language}" is missing.`;

		case Diagnostic.Type.OutdatedTranslation:
			return `Translation for fragment #${diagnostic.id} for language "${diagnostic.language}" is outdated.`;
	}
}

function provideProjectDiagnostics(collection: vscode.DiagnosticCollection, project: VscProject) {
	const usedSources: VscSourceFile[] = [];

	function update() {
		if (project.valid) {
			const diagnostics = project.getDiagnostics();
			const sources = new Map<VscSourceFile, vscode.Diagnostic[]>();

			for (const diagnostic of diagnostics) {
				switch (diagnostic.type) {
					case Diagnostic.Type.MissingTranslation:
					case Diagnostic.Type.OutdatedTranslation: {
						const source = project.getSourceForId(diagnostic.id);
						if (source) {
							const fragment = source.fragmentsById.get(diagnostic.id);
							if (fragment) {
								const start = source.offsetToPosition(fragment.start)!;
								const end = source.offsetToPosition(fragment.end)!;
								const vscDiagnostic = new vscode.Diagnostic(
									new vscode.Range(
										new vscode.Position(start.line, start.character),
										new vscode.Position(end.line, end.character)
									),
									getMessage(diagnostic),
									vscode.DiagnosticSeverity.Information
								);
								const vscDiagnostics = sources.get(source);
								if (vscDiagnostics) {
									vscDiagnostics.push(vscDiagnostic);
								} else {
									sources.set(source, [vscDiagnostic]);
								}
							}
						}
						break;
					}
				}
			}

			for (const usedSource of usedSources) {
				if (!sources.has(usedSource)) {
					collection.delete(usedSource.uri);
				}
			}
			usedSources.length = 0;

			for (const [source, diagnostics] of sources) {
				collection.set(source.uri, diagnostics);
				usedSources.push(source);
			}
			collection.delete(project.configUri);
		} else {
			usedSources.forEach(source => collection.delete(source.uri));
			usedSources.length = 0;
			collection.set(project.configUri, [
				new vscode.Diagnostic(
					new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
					"Project data and sources are out of sync.",
					vscode.DiagnosticSeverity.Warning
				)
			])
		}
	}

	const subscriptions = [
		project.onDidVerify(update)
	];

	return new vscode.Disposable(() => {
		disposeAll(subscriptions);
		for (const source of project.sources.values()) {
			collection.delete(source.uri);
		}
	});
}
