import { h, Component } from "preact";
import { EditorTarget, EditorEditTarget } from "../editor-target";
import { vscode } from "./api";

export class TranslationSetView extends Component<TranslationSetView.Props> {
	public render(props: TranslationSetView.Props) {
		const parts: any[] = [];

		for (const lang of props.target.languages) {
			const translation = props.translationSet.translations[lang];
			const value = translation?.value ?? "";
			parts.push(
				<div class="i18n-ts-lang-name">{lang}</div>,

				<textarea
					class="i18n-ts-lang-value"
					value={value}
					rows={value.split("\n").length}
					onInput={e => vscode.postMessage({
						type: "set-translation",
						id: this.props.id,
						lang: lang,
						value: (e.target as HTMLInputElement).value
					})}
					// TODO: Set textarea rows on input.
				/>,

				translation ? (<div class="i18n-ts-last-modified">{
					new Date(translation.lastModified).toLocaleString("en")
				}</div>) : null
			);
		}

		return <div class="i18n-ts">
			<div class="i18n-ts-id">#{props.id}</div>
			<div class="i18n-ts-default-value">{
				props.translationSet.value
			}</div>
			<div class="i18n-ts-last-modified">{
				new Date(props.translationSet.lastModified).toLocaleString("en")
			}</div>

			{parts}
		</div>;
	}
}

export namespace TranslationSetView {
	export interface Props {
		readonly target: EditorEditTarget;
		readonly id: string;
		readonly translationSet: import("@mpt/preact-i18n/dist/tooling").Project.TranslationSet;
	}
}
