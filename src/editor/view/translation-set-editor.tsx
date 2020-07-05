import { h, Component, Fragment } from "preact";
import { Editor } from "..";
import { Project } from "@mpt/preact-i18n/dist/tooling";

export class TranslationSetEditor extends Component<TranslationSetEditor.Props> {
	public render(props: TranslationSetEditor.Props) {
		const lastModified = Date.parse(props.item.data.lastModified);
		return <Fragment>
			<div class="editor-gap"></div>
			<div class="editor-id">#{props.item.id}</div>
			<div class="editor-value">{props.item.data.value}</div>
			<div class="editor-last-modified">{new Date(props.item.data.lastModified).toLocaleString("en")}</div>

			{props.languages.map(language => {
				const translation: Project.Translation = props.item.data.translations[language];

				const invalid = !translation || Date.parse(translation.lastModified) < lastModified;

				return <Fragment>
					<div class="editor-translation-lang">
						{language}
					</div>
					<div class="editor-translation-value">
						<input type="text" value={translation?.value || ""} onInput={e => {
							props.onValueInput(language, (e.target as HTMLInputElement).value);
						}} />
					</div>
					<div class={`editor-translation-last-modified ${invalid ? "editor-translation-invalid" : ""}`}>
						{translation ? new Date(translation.lastModified).toLocaleString("en") : "not translated yet"}
					</div>
				</Fragment>;
			})}
		</Fragment>;
	}
}

export namespace TranslationSetEditor {
	export interface Props {
		readonly languages: string[];
		readonly item: Editor.TranslationSet;
		readonly onValueInput: (language: string, value: string) => void;
	}
}
