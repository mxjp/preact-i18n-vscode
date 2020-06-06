
export type EditorTarget = {
	readonly type: "out-of-sync";
} | {
	readonly type: "no-selection";
} | EditorEditTarget

export interface EditorEditTarget {
	readonly type: "edit";
	readonly languages: string[];
	readonly translationSets: {
		readonly [id: string]: import("@mpt/preact-i18n/dist/tooling").Project.TranslationSet;
	};
}
