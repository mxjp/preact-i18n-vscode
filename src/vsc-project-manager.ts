import * as vscode from "vscode";
import { dirname } from "path";
import { VscProject } from "./vsc-project";
import { Output } from "./output";
import { VscSourceFile } from "./vsc-source-file";
import { getPreactI18nAPI, PreactI18nAPI, preactI18nModuleName, preactI18nModuleVersionRange } from "./preact-i18n-api";

const CONFIG_PATTERN = "**/i18n.json5";

export class VscProjectManager extends vscode.Disposable {
	public constructor(private readonly _output: Output) {
		super(() => {
			this._disposed = true;
			this._configWatcher?.dispose();
			for (const configFilename of this._projects.keys()) {
				this._unloadProject(configFilename);
			}
		});
		this._start().catch(error => _output.error(error));
	}

	private _disposed = false;
	private _configWatcher: vscode.FileSystemWatcher | null = null;

	private readonly _projects = new Map<string, VscProject>();
	private readonly _dirtyProjects = new Set<VscProject>();
	private readonly _allSources = new Map<string, VscSourceFile>();
	private readonly _onDidLoadProject = new vscode.EventEmitter<VscProject>();
	private readonly _onDidUnloadProject = new vscode.EventEmitter<VscProject>();

	public readonly onDidLoadProject = this._onDidLoadProject.event;
	public readonly onDidUnloadProject = this._onDidUnloadProject.event;

	public get allSources() {
		return this._allSources as ReadonlyMap<string, VscSourceFile>;
	}

	public get projects(): ReadonlyMap<string, VscProject> {
		return this._projects;
	}

	public async saveAllChanges() {
		for (const project of this._dirtyProjects) {
			this._dirtyProjects.delete(project);
			await project.saveChanges().catch(error => {
				this._output.error(error);
			});
		}
	}

	private async _start() {
		const files = await vscode.workspace.findFiles(CONFIG_PATTERN);
		await Promise.all(files.map(this._loadProject, this));
		if (!this._disposed) {
			this._configWatcher = vscode.workspace.createFileSystemWatcher(CONFIG_PATTERN);
			this._configWatcher.onDidCreate(this._loadProject, this);
			this._configWatcher.onDidChange(this._loadProject, this);
			this._configWatcher.onDidDelete(uri => this._unloadProject(uri.fsPath));
		}
	}

	private async _loadProject(uri: vscode.Uri) {
		const configFilename = uri.fsPath;
		this._unloadProject(configFilename);
		try {
			let api: PreactI18nAPI;
			try {
				api = await getPreactI18nAPI(configFilename);
			} catch (error) {
				this._output.warn(`${preactI18nModuleName} ${preactI18nModuleVersionRange} must be installed locally in project: ${configFilename}.`, error);
				return;
			}

			const context = dirname(configFilename);
			const content = await vscode.workspace.fs.readFile(uri);
			const config = api.Config.parse(new TextDecoder().decode(content), context);

			const project = new VscProject(this._output, uri, config, api);
			project.onDidUpdateSource(source => {
				this._allSources.set(source.sourceFile.filename, source);
			});
			project.onDidRemoveSource(filename => {
				this._allSources.delete(filename);
			});
			project.onDidEdit(() => {
				this._dirtyProjects.add(project);
			});

			this._projects.set(configFilename, project);

			this._output.message(`Loaded project: ${configFilename}`);
			this._onDidLoadProject.fire(project);
		} catch (error) {
			this._output.error(error);
		}
	}

	private async _unloadProject(configFilename: string) {
		const project = this._projects.get(configFilename);
		if (project) {
			this._projects.delete(configFilename);
			for (const source of project.sources.keys()) {
				this._allSources.delete(source);
			}
			this._dirtyProjects.delete(project);

			project.dispose();

			this._output.message(`Unloaded project: ${configFilename}`);
			this._onDidUnloadProject.fire(project);
		}
	}
}
