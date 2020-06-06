import { dirname } from "path";
import { parse } from "json5";
import * as vscode from 'vscode';
import { Config, SourceFile } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "./vsc-project";
import { VscSourceFile } from "./vsc-source-file";
import { asyncQueue } from "./util";

const CONFIG_PATTERN = "**/i18n.json5";

/**
 * Keeps track of all i18n project configs in the current vscode workspace.
 */
export class VscProjectManager extends vscode.Disposable {
	public constructor() {
		super(() => {
			this._disposed = true;
			this._configWatcher?.dispose();
		});
		this._start().catch(error => {
			console.error(error);
		});
	}

	private readonly _onUpdate = new vscode.EventEmitter<void>();
	private readonly _onVerify = new vscode.EventEmitter<VscProject>();
	private readonly _onUpdateSource = new vscode.EventEmitter<VscSourceFile>();
	private readonly _onRemoveSource = new vscode.EventEmitter<string>();
	private readonly _onUpdateProjectData = new vscode.EventEmitter<VscProject>();

	public readonly onUpdate = this._onUpdate.event;
	public readonly onVerify = this._onVerify.event;
	public readonly onUpdateSource = this._onUpdateSource.event;
	public readonly onRemoveSource = this._onRemoveSource.event;
	public readonly onUpdateProjectData = this._onUpdateProjectData.event;

	private readonly _projects = new Map<string, VscProject>();
	private readonly _projectContext: VscProject.Context = {
		verify: (project, valid) => {
			this._onVerify.fire(project);
			this._onUpdate.fire();
		},

		updateSource: (project, sourceFile) => {
			this._sourceFiles.set(sourceFile.filename, sourceFile);
			this._onUpdateSource.fire(sourceFile);
			this._onUpdate.fire();
		},

		removeSource: (project, filename) => {
			this._sourceFiles.delete(filename);
			this._onRemoveSource.fire(filename);
			this._onUpdate.fire();
		},

		updateProjectData: (project) => {
			this._modifiedProjects.delete(project);
			this._onUpdateProjectData.fire(project);
			this._onUpdate.fire();
		},

		modifiedTranslations: (project) => {
			this._modifiedProjects.add(project);
		}
	};

	private readonly _sourceFiles = new Map<string, VscSourceFile>();
	private readonly _modifiedProjects = new Set<VscProject>();

	private readonly _saveModifiedProjects = asyncQueue(async () => {
		for (const project of this._modifiedProjects) {
			await project.saveTranslations();
			this._modifiedProjects.delete(project);
		}
	});

	private _disposed = false;
	private _configWatcher: vscode.FileSystemWatcher | null = null;

	public get projects(): ReadonlyMap<string, VscProject> {
		return this._projects;
	}

	public get sourceFiles(): ReadonlyMap<string, VscSourceFile> {
		return this._sourceFiles;
	}

	public saveModifiedProjects() {
		return this._saveModifiedProjects();
	}

	private async _start() {
		const files = await vscode.workspace.findFiles(CONFIG_PATTERN);
		await Promise.all(files.map(this._updateProject, this));
		if (!this._disposed) {
			this._configWatcher = vscode.workspace.createFileSystemWatcher(CONFIG_PATTERN);
			this._configWatcher.onDidCreate(this._updateProject, this);
			this._configWatcher.onDidChange(this._updateProject, this);
			this._configWatcher.onDidDelete(uri => this._disposeProject(uri.fsPath));
		}
	}

	private async _updateProject(uri: vscode.Uri) {
		const filename = uri.fsPath;
		this._disposeProject(filename);

		const content = await vscode.workspace.fs.readFile(uri);
		const text = new TextDecoder().decode(content);
		try {
			const context = dirname(filename);
			const config = Config.fromJson(parse(text), context);
			this._projects.set(filename, new VscProject(filename, config, this._projectContext));
		} catch (error) {
			console.error(error);
		}
	}

	private _disposeProject(filename: string) {
		const project = this._projects.get(filename);
		this._projects.delete(filename);
		if (project) {
			this._modifiedProjects.delete(project);
			project.dispose();
		}
	}
}
