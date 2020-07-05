import { ViewMessage } from "../messages";

declare const acquireVsCodeApi: () => {
	postMessage(message: ViewMessage): void;
};

export const api = acquireVsCodeApi();
