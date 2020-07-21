import * as vscode from "vscode";
import { inspect } from "util";

export class Output extends vscode.Disposable {
	public constructor() {
		super(() => {
			this._channel?.dispose();
		});
		this._channel = vscode.window.createOutputChannel("Preact I18n");
	}

	private readonly _channel: vscode.OutputChannel;

	public message(message: string) {
		this._channel.appendLine(`${prefix()} ${message}`);
	}

	public error(error: any) {
		this._channel.appendLine(`${prefix()} ${inspect(error, false, undefined, true)}`);
		vscode.window.showErrorMessage(`Preact I18n Error: ${error?.message || error}`, "Show Output").then(res => {
			if (res) {
				this._channel.show();
			}
		});
	}

	public warn(message: string, details?: any) {
		this._channel.appendLine(`${prefix()} ${message}${details ? ` - ${details}` : ""}`);
		vscode.window.showWarningMessage(`Preact I18n Warning: ${message}`, "Show Output").then(res => {
			if (res) {
				this._channel.show();
			}
		});
	}
}

function prefix() {
	return `[${new Date().toLocaleTimeString("en")}]`;
}
