import type { Config, Project } from "@mpt/preact-i18n/tooling";
import { TranslationSet } from "./internals";

export type ControllerMessage = {
	readonly type: ControllerMessage.Type.UpdateProject;
	readonly config?: Config;
} | {
	readonly type: ControllerMessage.Type.UpdateProjectValid;
	readonly valid: boolean;
} | {
	readonly type: ControllerMessage.Type.UpdateTranslationSets;
	readonly sets: TranslationSet[];
};

export namespace ControllerMessage {
	export enum Type {
		UpdateProject,
		UpdateProjectValid,
		UpdateTranslationSets
	}
}

export type ViewMessage = {
	readonly type: ViewMessage.Type.Load;
} | {
	readonly type: ViewMessage.Type.SetTranslation;
	readonly projectConfigFilename: string;
	readonly id: string;
	readonly language: string;
	readonly value: Project.Value;
};

export namespace ViewMessage {
	export enum Type {
		Load,
		SetTranslation
	}
}
