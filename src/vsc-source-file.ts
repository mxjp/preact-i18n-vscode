import * as vscode from "vscode";
import { SourceFile } from "@mpt/preact-i18n/dist/tooling";
import { VscProject } from "./vsc-project";
import { binarySearch, binarySearchIndex } from "./util";

export class VscSourceFile extends SourceFile {
	public constructor(public readonly project: VscProject, filename: string, sourceText: string) {
		super(filename, sourceText);

		const map: number[] = [0];
		let offset = -1;
		while ((offset = sourceText.indexOf("\n", offset + 1)) !== -1) {
			map.push(offset + 1);
		}
		this._lineMap = map;

		this.vscFragments = [];
		for (const [id, range] of this.fragments()) {
			this.vscFragments.push({
				id,
				pos: range.pos,
				end: range.end,
				range: new vscode.Range(
					this.offsetToPosition(range.pos)!,
					this.offsetToPosition(range.end)!
				)
			});
		}
	}

	private readonly _lineMap: number[];

	public readonly vscFragments: VscSourceFile.Fragment[];

	public positionToOffset(pos: vscode.Position) {
		return this._lineMap[pos.line] + pos.character;
	}

	public offsetToPosition(offset: number): vscode.Position | undefined {
		const line = binarySearchIndex(this._lineMap, (start, line, lineMap) => {
			const end = line === lineMap.length - 1 ? this.sourceText.length : lineMap[line + 1];
			return offset < start ? -1 : (offset >= end ? 1 : 0);
		});
		return line === undefined ? undefined : new vscode.Position(line, offset - this._lineMap[line]);
	}

	public vscFragmentAt(pos: vscode.Position): VscSourceFile.Fragment | undefined {
		const offset = this.positionToOffset(pos);
		return binarySearch(this.vscFragments, fragment => {
			return fragment.end <= offset ? 1 : (fragment.pos > offset ? -1 : 0);
		});
	}

	public vscFragmentsIn(range: vscode.Selection | vscode.Range) {
		const startOffset = this.positionToOffset(range.start);
		const start = binarySearchIndex(this.vscFragments, (fragment, index, fragments) => {
			if (fragment.end <= startOffset) {
				return 1;
			}
			const prev = fragments[index - 1];
			if (prev && prev.end > startOffset) {
				return -1;
			}
			return 0;
		});

		const endOffset = this.positionToOffset(range.end);
		const end = binarySearchIndex(this.vscFragments, (fragment, index, fragments) => {
			if (fragment.pos > endOffset) {
				return -1;
			}
			const next = fragments[index + 1];
			if (next && next.pos <= endOffset) {
				return 1;
			}
			return 0;
		});

		return (start === undefined || end === undefined) ? [] : this.vscFragments.slice(start, end + 1);
	}
}

export namespace VscSourceFile {
	export interface Fragment {
		readonly id: string;
		readonly pos: number;
		readonly end: number;
		readonly range: vscode.Range;
	}
}
