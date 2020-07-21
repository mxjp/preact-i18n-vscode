import { promisify } from "util";
import { dirname } from "path";
import * as resolve from "resolve";
import * as vscode from "vscode";
import * as semver from "semver";

const resolvePromise = promisify(resolve as (filename: string, options: resolve.AsyncOpts, cb: (error: any, filename: string) => void) => void);

export type PreactI18nAPI = typeof import("@mpt/preact-i18n/tooling");

export const preactI18nModuleName = "@mpt/preact-i18n";
export const preactI18nModuleVersionRange = "^0.6.0";

export async function getPreactI18nAPI(configFilename: string): Promise<PreactI18nAPI> {
	const resolveOptions: resolve.AsyncOpts = { basedir: dirname(configFilename) };

	const packagePath = await resolvePromise(`${preactI18nModuleName}/package.json`, resolveOptions);
	const apiEntry = await resolvePromise(`${preactI18nModuleName}/tooling`, resolveOptions);

	const packageData = await vscode.workspace.fs.readFile(vscode.Uri.file(packagePath));
	const packageInfo = JSON.parse(new TextDecoder().decode(packageData));

	if (!semver.satisfies(packageInfo.version, preactI18nModuleVersionRange)) {
		throw new Error("version range not satisfied.");
	}

	return await import(apiEntry);
}
