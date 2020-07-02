import { h, Component, Fragment } from "preact";
import { Editor } from "..";
import { Project } from "@mpt/preact-i18n/dist/tooling";

export class TranslationSetEditor extends Component<TranslationSetEditor.Props> {
	public render(props: TranslationSetEditor.Props) {
		return <div>
			<div>#{props.item.id}</div>
			<div>{props.item.set.value}</div>

			{props.languages.map(language => {
				const translation: Project.Translation = props.item.set.translations[language];
				return <Fragment>
					<div>{language}</div>
					<div>
						<input type="text" value={translation?.value || ""} onInput={e => {
							props.onValueInput(language, (e.target as HTMLInputElement).value);
						}} />
					</div>
					<div>{translation && new Date(translation.lastModified).toLocaleString("en")}</div>
				</Fragment>;
			})}
		</div>;
	}
}

export namespace TranslationSetEditor {
	export interface Props {
		readonly languages: string[];
		readonly item: Editor.TranslationSet;
		readonly onValueInput: (language: string, value: string) => void;
	}
}
