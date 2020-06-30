import * as vscode from "vscode";
import { dirname } from "path";
import { Config } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "./vsc-project";
import { Output } from "./output";
import { VscSourceFile } from "./vsc-source-file";

const CONFIG_PATTERN = "**/i18n.json5";

export class VscProjectManager extends vscode.Disposable {
	public constructor(private readonly _output: Output) {
		super(() => {
			this._disposed = true;
			this._configWatcher?.dispose();
			for (const configFilename of this._projects.keys()) {
				this._removeProject(configFilename);
			}
		});
		this._start().catch(error => _output.error(error));
	}

	private _disposed = false;
	private _configWatcher: vscode.FileSystemWatcher | null = null;

	private _projects = new Map<string, VscProject>();
	private _allSources = new Map<string, VscSourceFile>();

	public get allSources() {
		return this._allSources as ReadonlyMap<string, VscSourceFile>;
	}

	private readonly _onDidChangeProjects = new vscode.EventEmitter<void>();
	private readonly _onDidChangeProject = new vscode.EventEmitter<VscProject>();

	public readonly onDidChangeProjects = this._onDidChangeProjects.event;
	public readonly onDidChangeProject = this._onDidChangeProject.event;

	public get projects(): ReadonlyMap<string, VscProject> {
		return this._projects;
	}

	private async _start() {
		const files = await vscode.workspace.findFiles(CONFIG_PATTERN);
		await Promise.all(files.map(this._updateProject, this));
		if (!this._disposed) {
			this._configWatcher = vscode.workspace.createFileSystemWatcher(CONFIG_PATTERN);
			this._configWatcher.onDidCreate(this._updateProject, this);
			this._configWatcher.onDidChange(this._updateProject, this);
			this._configWatcher.onDidDelete(uri => this._removeProject(uri.fsPath));
		}
	}

	private async _updateProject(uri: vscode.Uri) {
		const configFilename = uri.fsPath;
		this._removeProject(configFilename);
		try {
			const context = dirname(configFilename);
			const content = await vscode.workspace.fs.readFile(uri);
			const config = Config.parse(new TextDecoder().decode(content), context);

			const project = new VscProject(this._output, configFilename, config);
			project.onDidUpdateProjectData(() => this._onDidChangeProject.fire(project));
			project.onDidUpdateSource(source => {
				this._allSources.set(source.filename, source);
				this._onDidChangeProject.fire(project);
			});
			project.onDidRemoveSource(filename => {
				this._allSources.delete(filename);
				this._onDidChangeProject.fire(project);
			});

			this._projects.set(configFilename, project);

			this._output.message(`Updated project: ${configFilename}`);
			this._onDidChangeProjects.fire();
		} catch (error) {
			this._output.error(error);
		}
	}

	private async _removeProject(configFilename: string) {
		const project = this._projects.get(configFilename);
		if (project) {
			this._projects.delete(configFilename);
			project.dispose();

			this._output.message(`Removed project: ${configFilename}`);
			this._onDidChangeProjects.fire();
		}
	}
}
