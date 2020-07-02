import { Editor } from ".";
import { Config } from "@mpt/preact-i18n/dist/tooling";

export type ViewMessage = {
	readonly type: ViewMessage.Type.UpdateProject;
	readonly projectConfig?: Config;
} | {
	readonly type: ViewMessage.Type.UpdateTranslationSets;
	readonly translationSets: Editor.TranslationSet[];
} | {
	readonly type: ViewMessage.Type.UpdateProjectValid;
	readonly projectValid: boolean;
};

export namespace ViewMessage {
	export enum Type {
		UpdateProject,
		UpdateProjectValid,
		UpdateTranslationSets
	}
}

export type RendererMessage = {
	readonly type: RendererMessage.Type.Ready;
} | {
	readonly type: RendererMessage.Type.SetTranslationValue;
	readonly id: string;
	readonly language: string;
	readonly value: string;
};

export namespace RendererMessage {
	export enum Type {
		Ready,
		SetTranslationValue
	}
}
