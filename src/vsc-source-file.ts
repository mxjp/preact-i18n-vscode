import * as vscode from "vscode";
import type { SourceFile } from "@mpt/preact-i18n/tooling";
import { VscProject } from "./vsc-project";
import { relative } from "path";
import { PreactI18nAPI } from "./preact-i18n-api";

export class VscSourceFile {
	public constructor(
		public readonly api: PreactI18nAPI,
		public readonly project: VscProject,
		public readonly uri: vscode.Uri,
		sourceText: string
	) {
		this.displayName = relative(project.config.context, uri.fsPath);
		this.sourceFile = new api.SourceFile(uri.fsPath, sourceText);
	}

	public readonly displayName: string;
	public readonly sourceFile: SourceFile;
}
