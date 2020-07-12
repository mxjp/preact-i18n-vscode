import * as vscode from "vscode";
import { disposeAll, wrapRateLimit } from "./utility";
import { VscProject } from "./vsc-project";
import { VscProjectManager } from "./vsc-project-manager";
import { Diagnostic } from "@mpt/preact-i18n/tooling";
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

function getMessage(diagnostic: Diagnostic) {
	switch (diagnostic.type) {
		case Diagnostic.Type.MissingTranslation:
			return `Translation for fragment #${diagnostic.id} for language "${diagnostic.language}" is missing.`;

		case Diagnostic.Type.OutdatedTranslation:
			return `Translation for fragment #${diagnostic.id} for language "${diagnostic.language}" is outdated.`;

		case Diagnostic.Type.UnconfiguredTranslatedLanguage:
			return `Fragment #${diagnostic.id} is translated to the language "${diagnostic.language}" that is not configured for this project.`;

		case Diagnostic.Type.UnknownLanguagePlural:
			return `Pluralization for language "${diagnostic.language}" is not supported.`;

		case Diagnostic.Type.TranslationTypeMissmatch:
			return `Translation value type for fragment #${diagnostic.id} for language "${diagnostic.language}" is incorrect.`;

		case Diagnostic.Type.PluralFormCountMissmatch:
			return `Value for fragment #${diagnostic.id} for language "${diagnostic.language}" has a wrong number of plural forms.`;
	}
}

function provideProjectDiagnostics(output: Output, project: VscProject) {
	const collection = vscode.languages.createDiagnosticCollection("Preact I18n");

	const update = wrapRateLimit(() => {
		output.message(`Updating diagnostics for: ${project.configFilename}`);
		collection.clear();

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
			for (const [source, diagnostics] of sources) {
				collection.set(source.uri, diagnostics);
			}
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
