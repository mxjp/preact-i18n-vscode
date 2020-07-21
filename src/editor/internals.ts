import type { Project, plurals } from "@mpt/preact-i18n/tooling";

export enum ValueType {
	Unsupported,
	Simple,
	Plural
}

export type Translation = {
	readonly valueType: ValueType.Simple;
	readonly value: Project.SimpleValue;
	readonly lastModified: string;
} | {
	readonly valueType: ValueType.Plural;
	readonly value: Project.PluralValue;
	readonly lastModified: string;
	readonly rule?: plurals.Rule;
} | {
	readonly valueType: ValueType.Unsupported;
	readonly value: Project.Value;
	readonly lastModified: string;
};

export type TranslationSet = Translation & {
	readonly id: string;
	readonly project: string;
	readonly translations: {
		[language: string]: Translation;
	};
}
