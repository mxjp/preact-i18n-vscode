import { h, Component, Fragment } from "preact";
import { Editor } from "..";
import { Project, plurals } from "@mpt/preact-i18n/tooling";

export class TranslationSetEditor extends Component<TranslationSetEditor.Props> {
	public render(props: TranslationSetEditor.Props) {
		const lastModified = Date.parse(props.item.data.lastModified);

		const sourceIsPlural = Project.isPlural(props.item.data.value);

		return <Fragment>
			<div class="editor-gap"></div>
			<div class="editor-id">#{props.item.id}</div>
			<Value sourceIsPlural={sourceIsPlural} value={props.item.data.value} />
			<div class="editor-last-modified">{new Date(props.item.data.lastModified).toLocaleString("en")}</div>

			{props.languages.map(language => {
				const translation: Project.Translation = props.item.data.translations[language];

				const invalid = !translation || Date.parse(translation.lastModified) < lastModified;

				return <Fragment>
					<div class="editor-translation-lang">
						{language}
					</div>
					<ValueEditor sourceIsPlural={sourceIsPlural} language={language} value={translation?.value} onInput={value => {
						props.onValueInput(language, value);
					}} />
					<div class={`editor-translation-last-modified ${invalid ? "editor-translation-invalid" : ""}`}>
						{translation ? new Date(translation.lastModified).toLocaleString("en") : "not translated yet"}
					</div>
				</Fragment>;
			})}
		</Fragment>;
	}
}

function Value(props: { sourceIsPlural: boolean, value: Project.Value }) {
	return <div class="editor-value">
		{props.sourceIsPlural
			? (props.value as string[]).map(value => <div>{value}</div>)
			: props.value}
	</div>;
}

function ValueEditor(props: { sourceIsPlural: boolean, language: string, value: Project.Value | undefined, onInput: (value: Project.Value) => void }) {
	if (props.sourceIsPlural) {
		const formCount = plurals.getFormCount(props.language);
		const parts: any[] = [];
		if (formCount === undefined) {
			parts.push("Unsupported language plural.");
		} else {
			let value: string[];
			if (props.value && Project.isPlural(props.value) && props.value.length === formCount) {
				value = Array.from(props.value);
			} else {
				value = new Array(formCount).fill("");
			}
			for (let f = 0; f < formCount; f++) {
				parts.push(<input type="text" value={value[f]} onInput={e => {
					value[f] = (e.target as HTMLInputElement).value;
					props.onInput(value);
				}} />);
			}
		}
		return <div class="editor-translation-plural-value">
			{parts}
		</div>;
	} else {
		return <div class="editor-translation-value">
			<input type="text" value={props.value} onInput={e => {
				props.onInput((e.target as HTMLInputElement).value);
			}} />
		</div>;
	}
}

export namespace TranslationSetEditor {
	export interface Props {
		readonly languages: string[];
		readonly item: Editor.TranslationSet;
		readonly onValueInput: (language: string, value: Project.Value) => void;
	}
}
