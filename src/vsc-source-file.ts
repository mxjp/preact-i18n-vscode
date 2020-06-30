import { SourceFile } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "./vsc-project";
import { relative } from "path";

export class VscSourceFile extends SourceFile {
	public constructor(
		public readonly project: VscProject,
		filename: string,
		sourceText: string
	) {
		super(filename, sourceText);
		this.displayName = relative(project.config.context, filename);
	}

	public readonly displayName: string;
}
