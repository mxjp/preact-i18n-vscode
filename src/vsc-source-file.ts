import * as vscode from "vscode";
import { SourceFile } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "./vsc-project";
import { relative } from "path";

export class VscSourceFile extends SourceFile {
	public constructor(
		public readonly project: VscProject,
		public readonly uri: vscode.Uri,
		sourceText: string
	) {
		super(uri.fsPath, sourceText);
		this.displayName = relative(project.config.context, uri.fsPath);
	}

	public readonly displayName: string;
}
