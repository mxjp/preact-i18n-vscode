
declare const acquireVsCodeApi: () => {
	postMessage(message: any): void;
};

export const vscode = acquireVsCodeApi();
