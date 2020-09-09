import { h, Component, Fragment } from "preact";
import { Project, plurals } from "@mpt/preact-i18n/tooling";
import { Translation, ValueType, TranslationSet } from "../internals";

export class TranslationSetEditor extends Component<TranslationSetEditor.Props> {
	public render(props: TranslationSetEditor.Props) {
		const lastModified = Date.parse(props.item.lastModified);

		return <Fragment>
			<div class="editor-gap"></div>
			<div class="editor-id">#{props.item.id}</div>
			<Value
				language={props.sourceLanguage}
				translation={props.item}
			/>
			<div class="editor-last-modified">{new Date(props.item.lastModified).toLocaleString("en")}</div>

			{props.languages.map(language => {
				const translation = props.item.translations[language];

				const invalid = !translation || Date.parse(translation.lastModified) < lastModified;

				return <Fragment>
					<div class="editor-translation-lang">
						{language}
					</div>
					<ValueEditor
						language={language}
						source={props.item}
						translation={translation}
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

function Value(props: { language: string, translation: Translation }) {
	const parts: any[] = [];
	switch (props.translation.valueType) {
		case ValueType.Simple: {
			parts.push(props.translation.value);
			break;
		}

		case ValueType.Plural: {
			if (props.translation.rule === undefined) {
				parts.push("Unsupported language plural.");
			} else {
				const { forms } = props.translation.rule;
				(props.translation.value as string[]).forEach((value, f) => {
					parts.push(<div title={f < forms.length ? formTooltip(forms[f]) : undefined}>{value}</div>);
				});
			}
			break;
		}

		default: {
			parts.push("Unsupported value type.");
			break;
		}
	}
	return <div class="editor-value">{parts}</div>;
}

function ValueEditor(props: { language: string, source: Translation, translation: Translation, onInput: (value: Project.Value) => void }) {
	const parts: any[] = [];
	switch (props.source.valueType) {
		case ValueType.Simple: {
			return <div class="editor-translation-value">
				<input
					type="text"
					value={props.translation?.valueType === ValueType.Simple
						? props.translation.value
						: ""}
					onInput={e => {
						props.onInput((e.target as HTMLInputElement).value);
					}}
				/>
			</div>
		}

		case ValueType.Plural: {
			const parts: any[] = [];
			if (props.source.rule === undefined) {
				parts.push("Unsupported language plural.");
			} else {
				const forms = props.source.rule.forms;
				const value = (props.translation?.valueType === ValueType.Plural && props.translation.value.length === forms.length)
					? Array.from(props.translation.value)
					: new Array(forms.length).fill("");

				for (let f = 0; f < forms.length; f++) {
					const form = forms[f];
					parts.push(<input type="text" value={value[f]} onInput={e => {
						value[f] = (e.target as HTMLInputElement).value;
						props.onInput(value);
					}} title={formTooltip(form)} />);
				}
			}
			return <div class="editor-translation-plural-value">
				{parts}
			</div>;
		}

		default: {
			return <div class="editor-translation-value">Unsupported value type.</div>;
		}
	}
}

export namespace TranslationSetEditor {
	export interface Props {
		readonly languages: string[];
		readonly sourceLanguage: string;
		readonly item: TranslationSet;
		readonly onValueInput: (language: string, value: Project.Value) => void;
	}
}
