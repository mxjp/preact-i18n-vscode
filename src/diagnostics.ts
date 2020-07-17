import * as vscode from "vscode";
import { disposeAll, wrapRateLimit } from "./utility";
import { VscProject } from "./vsc-project";
import { VscProjectManager } from "./vsc-project-manager";
import { Diagnostic, getDiagnosticMessage } from "@mpt/preact-i18n/tooling";
import { VscSourceFile } from "./vsc-source-file";
import { Output } from "./output";

export function provideDiagnostics(output: Output, projects: VscProjectManager) {
	const projectDiagnostics = new Map<VscProject, vscode.Disposable>();

	projects.onDidLoadProject(project => {
		projectDiagnostics.set(project, provideProjectDiagnostics(output, project));
	});

	projects.onDidUnloadProject(project => {
		projectDiagnostics.get(project)?.dispose();
	});

	return new vscode.Disposable(() => {
		disposeAll(projectDiagnostics.values());
	});
}

function provideProjectDiagnostics(output: Output, project: VscProject) {
	const collection = vscode.languages.createDiagnosticCollection("Preact I18n");

	const update = wrapRateLimit(() => {
		output.message(`Updating diagnostics for: ${project.configFilename}`);
		collection.clear();

		if (project.valid) {
			const diagnostics = project.getDiagnostics();
			const sources = new Map<VscSourceFile, vscode.Diagnostic[]>();
			const projectDiagnostics: vscode.Diagnostic[] = [];

			for (const diagnostic of diagnostics) {
				switch (diagnostic.type) {
					case Diagnostic.Type.MissingTranslation:
					case Diagnostic.Type.OutdatedTranslation:
					case Diagnostic.Type.UnconfiguredTranslatedLanguage:
					case Diagnostic.Type.TranslationTypeMissmatch:
					case Diagnostic.Type.PluralFormCountMissmatch: {
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
									getDiagnosticMessage(diagnostic),
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

					case Diagnostic.Type.UnknownLanguagePlural:
						projectDiagnostics.push(
							new vscode.Diagnostic(
								new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
								getDiagnosticMessage(diagnostic),
								vscode.DiagnosticSeverity.Information
							)
						);
						break;
				}
			}
			for (const [source, diagnostics] of sources) {
				collection.set(source.uri, diagnostics);
			}
			collection.set(project.configUri, projectDiagnostics);
		} else {
			collection.set(project.configUri, [
				new vscode.Diagnostic(
					new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
					"Project data and sources are out of sync.",
					vscode.DiagnosticSeverity.Warning
				)
			])
		}
	});

	const subscriptions = [
		project.onDidUpdate(update),
		collection
	];

	return new vscode.Disposable(() => {
		disposeAll(subscriptions);
	});
}
