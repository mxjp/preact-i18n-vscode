import * as vscode from "vscode";
import { Config, Project, SourceFile, TranslationEditor } from "@mpt/preact-i18n/dist/tooling";
import { VscSourceFile } from "./vsc-source-file";
import { Output } from "./output";
import { basename } from "path";

export class VscProject extends vscode.Disposable {
	public constructor(
		private readonly _output: Output,
		public readonly configFilename: string,
		public readonly config: Config
	) {
		super(() => {
			this._disposed = true;
			this._watchers.forEach(watcher => watcher.dispose());
		});
		this._project = new Project(config);
		this._editor = new TranslationEditor(this._project);

		this._start().catch(error => _output.error(error));

		this.displayName = basename(config.context);
	}

	private readonly _project: Project;
	private readonly _editor: TranslationEditor;
	private readonly _watchers: vscode.FileSystemWatcher[] = [];

	private readonly _onDidUpdateProjectData = new vscode.EventEmitter<void>();
	private readonly _onDidUpdateSource = new vscode.EventEmitter<VscSourceFile>();
	private readonly _onDidRemoveSource = new vscode.EventEmitter<string>();
	private readonly _onDidVerify = new vscode.EventEmitter<void>();

	public readonly onDidUpdateProjectData = this._onDidUpdateProjectData.event;
	public readonly onDidUpdateSource = this._onDidUpdateSource.event;
	public readonly onDidRemoveSource = this._onDidRemoveSource.event;
	public readonly onDidVerify = this._onDidVerify.event;

	private _disposed = false;
	private _valid = false;

	public readonly displayName: string;

	public get valid() {
		return this._valid;
	}

	public get sources() {
		return this._project.sources as ReadonlyMap<string, VscSourceFile>;
	}

	public get editor() {
		return this._editor;
	}

	private async _updateProjectData() {
		try {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(this.config.projectData));
			this._project.data = Project.Data.parse(new TextDecoder().decode(content));
			this._output.message(`Updated data: ${this.config.projectData}`);
			this._onDidUpdateProjectData.fire();
		} catch (error) {
			if (error?.code !== "FileNotFound") {
				this._output.error(error);
			}
		}
	}

	private async _updateSource(uri: vscode.Uri) {
		try {
			const content = await vscode.workspace.fs.readFile(uri);
			const sourceText = new TextDecoder().decode(content);
			const source = new VscSourceFile(this, uri.fsPath, sourceText);
			this._project.updateSource(source);
			this._output.message(`Updated source: ${uri.fsPath}`);
			this._onDidUpdateSource.fire(source);
		} catch (error) {
			this._output.error(error);
		}
	}

	private _removeSource(uri: vscode.Uri) {
		this._project.removeSource(uri.fsPath);
		this._output.message(`Removed source: ${uri.fsPath}`);
		this._onDidRemoveSource.fire(uri.fsPath);
	}

	private _verify() {
		const valid = this._project.verify();
		if (valid !== this._valid) {
			this._valid = valid;
			this._onDidVerify.fire();
		}
	}

	private async _start() {
		await this._updateProjectData();
		for (const pattern of this.config.sources) {
			const sources = await vscode.workspace.findFiles({ base: this.config.context, pattern });
			for (const uri of sources) {
				if (SourceFile.isSourceFile(uri.fsPath)) {
					await this._updateSource(uri);
				}
			}
		}
		this._verify();
		if (!this._disposed) {
			const projectDataWatcher = vscode.workspace.createFileSystemWatcher({
				base: this.config.context,
				pattern: "*"
			});
			projectDataWatcher.onDidChange(async uri => {
				if (uri.fsPath === this._project.config.projectData) {
					await this._updateProjectData();
					this._verify();
				}
			});
			this._watchers.push(projectDataWatcher);

			for (const pattern of this.config.sources) {
				const sourceWatcher = vscode.workspace.createFileSystemWatcher({
					base: this.config.context,
					pattern
				});
				sourceWatcher.onDidCreate(async uri => {
					if (SourceFile.isSourceFile(uri.fsPath)) {
						await this._updateSource(uri);
						this._verify();
					}
				});
				sourceWatcher.onDidChange(async uri => {
					if (SourceFile.isSourceFile(uri.fsPath)) {
						await this._updateSource(uri);
						this._verify();
					}
				});
				sourceWatcher.onDidDelete(uri => {
					if (SourceFile.isSourceFile(uri.fsPath)) {
						this._removeSource(uri);
						this._verify();
					}
				});
				this._watchers.push(sourceWatcher);
			}
		}
	}
}
