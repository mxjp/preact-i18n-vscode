import { RendererMessage } from "../messages";

declare const acquireVsCodeApi: () => {
	postMessage(message: RendererMessage): void;
};

export const vscode = acquireVsCodeApi();
