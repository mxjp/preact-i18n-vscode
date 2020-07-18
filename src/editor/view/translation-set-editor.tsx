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
			<Value
				sourceIsPlural={sourceIsPlural}
				language={props.sourceLanguage}
				value={props.item.data.value}
			/>
			<div class="editor-last-modified">{new Date(props.item.data.lastModified).toLocaleString("en")}</div>

			{props.languages.map(language => {
				const translation: Project.Translation = props.item.data.translations[language];

				const invalid = !translation || Date.parse(translation.lastModified) < lastModified;

				return <Fragment>
					<div class="editor-translation-lang">
						{language}
					</div>
					<ValueEditor
						sourceIsPlural={sourceIsPlural}
						language={language}
						value={translation?.value}
						onInput={value => {
							props.onValueInput(language, value);
						}}
					/>
					<div class={`editor-translation-last-modified ${invalid ? "editor-translation-invalid" : ""}`}>
						{translation ? new Date(translation.lastModified).toLocaleString("en") : "not translated yet"}
					</div>
				</Fragment>;
			})}
		</Fragment>;
	}
}

function formTooltip(form: "default" | plurals.Form) {
	function matcher(matcher: plurals.FormMatcher, pad = 0) {
		function number(value: number) {
			return String(value).padStart(pad, "0");
		}
		return matcher.map(item => {
			return Array.isArray(item) ? `${number(item[0])}-${number(item[1])}` : number(item);
		}).join(", ");
	}
	if (form === "default") {
		return "everything else";
	} else {
		const parts: string[] = [];
		if (form.is) {
			parts.push(`is ${matcher(form.is)}`);
		}
		if (form.modE1) {
			parts.push(`ends in ${matcher(form.modE1, 1)}`);
		}
		if (form.modE2) {
			parts.push(`ends in ${matcher(form.modE2, 2)}`);
		}
		if (form.modE6) {
			parts.push(`ends in ${matcher(form.modE6, 6)}`);
		}
		return form.exclude
			? `${parts.join(" or ")} excluding ${matcher(form.exclude)}`
			: parts.join(" or ");
	}
}

function Value(props: { sourceIsPlural: boolean, language: string, value: Project.Value }) {
	const parts: any[] = [];
	if (props.sourceIsPlural) {
		const pluralRule = plurals.getRule(props.language);
		if (pluralRule === undefined) {
			parts.push("Unsupported language plural.");
		} else {
			const { forms } = pluralRule;
			(props.value as string[]).forEach((value, f) => {
				parts.push(<div title={f < forms.length ? formTooltip(forms[f]) : undefined}>{value}</div>);
			});
		}
	} else {
		parts.push(props.value);
	}
	return <div class="editor-value">{parts}</div>;
}

function ValueEditor(props: { sourceIsPlural: boolean, language: string, value: Project.Value | undefined, onInput: (value: Project.Value) => void }) {
	if (props.sourceIsPlural) {
		const pluralRule = plurals.getRule(props.language);
		const parts: any[] = [];
		if (pluralRule === undefined) {
			parts.push("Unsupported language plural.");
		} else {
			const formCount = pluralRule.forms.length;
			let value: string[];
			if (props.value && Project.isPlural(props.value) && props.value.length === formCount) {
				value = Array.from(props.value);
			} else {
				value = new Array(formCount).fill("");
			}
			for (let f = 0; f < formCount; f++) {
				const form = pluralRule.forms[f];
				console.log(form);

				parts.push(<input type="text" value={value[f]} onInput={e => {
					value[f] = (e.target as HTMLInputElement).value;
					props.onInput(value);
				}} title={formTooltip(form)} />);
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
		readonly sourceLanguage: string;
		readonly item: Editor.TranslationSet;
		readonly onValueInput: (language: string, value: Project.Value) => void;
	}
}
