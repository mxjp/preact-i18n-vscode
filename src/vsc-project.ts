import { Config, SourceFile, Project } from "@mpt/preact-i18n/dist/tooling";
import * as vscode from "vscode";
import { VscSourceFile } from "./vsc-source-file";

export class VscProject extends vscode.Disposable {
	public constructor(
		public readonly filename: string,
		public readonly config: Config,
		context: VscProject.Context
	) {
		super(() => {
			this._disposed = true;
			this._watchers.forEach(watcher => watcher.dispose());
		});
		this._project = new Project(config);
		this._context = context;
		this._start().catch(error => {
			console.error(error);
		});
	}

	private readonly _project: Project;
	private readonly _context: VscProject.Context;
	private readonly _watchers: vscode.FileSystemWatcher[] = [];

	private _disposed = false;
	private _valid = false;

	public get valid() {
		return this._valid;
	}

	public translationSets(ids: string[]) {
		const translationSets: { [id: string]: Project.TranslationSet } = Object.create(null);
		for (const id of ids) {
			translationSets[id] = this._project.data.values[id];
		}
		return translationSets;
	}

	public setTranslation(id: string, lang: string, value: string) {
		const translationSet = this._project.data.values[id];
		if (translationSet) {
			translationSet.translations[lang] = {
				value,
				lastModified: new Date().toISOString()
			};
			this._context.modifiedTranslations(this);
		}
	}

	public async saveTranslations() {
		const content = new TextEncoder().encode(JSON.stringify(this._project.data, null, "\t") + "\n");
		await vscode.workspace.fs.writeFile(vscode.Uri.file(this._project.config.projectData), content);
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
			for (const pattern of this.config.sources) {
				const sourceWatcher = vscode.workspace.createFileSystemWatcher({ base: this.config.context, pattern });
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
				sourceWatcher.onDidDelete(async uri => {
					if (SourceFile.isSourceFile(uri.fsPath)) {
						this._removeSource(uri);
						this._verify();
					}
				});
				this._watchers.push(sourceWatcher);
			}

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
		}
	}

	private async _updateProjectData() {
		try {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(this.config.projectData));
			this._project.data = JSON.parse(new TextDecoder().decode(content));
			this._context.updateProjectData(this);
		} catch (error) {
			if (error?.code !== "FileNotFound") {
				console.error(error);
			}
		}
	}

	private async _updateSource(uri: vscode.Uri) {
		try {
			const content = await vscode.workspace.fs.readFile(uri);
			const sourceText = new TextDecoder().decode(content);
			const sourceFile = new VscSourceFile(this, uri.fsPath, sourceText);
			this._project.updateSource(sourceFile);
			this._context.updateSource(this, sourceFile);
		} catch (error) {
			console.error(error);
		}
	}

	private _removeSource(uri: vscode.Uri) {
		this._project.removeSource(uri.fsPath);
		this._context.removeSource(this, uri.fsPath);
	}

	private _verify() {
		const valid = this._project.verify();
		if (valid !== this._valid) {
			this._valid = valid;
			this._context.verify(this, valid);
		}
	}
}

export namespace VscProject {
	export interface Context {
		verify(project: VscProject, valid: boolean): void;
		updateSource(project: VscProject, sourceFile: VscSourceFile): void;
		removeSource(project: VscProject, filename: string): void;
		updateProjectData(project: VscProject): void;
		modifiedTranslations(project: VscProject): void;
	}
}
