import { h, Component, render } from "preact";
import type { Config } from "@mpt/preact-i18n/tooling";
import { ViewMessage, ControllerMessage } from "../messages";
import { api } from "./api";
import { TranslationSetEditor } from "./translation-set-editor";
import { ValueType, TranslationSet } from "../internals";

class View extends Component<{}, View.State> {
	public constructor() {
		super();
		this.state = {
			projectConfig: undefined,
			projectValid: false,
			translationSets: []
		};
	}

	public render(props: any, state: View.State) {
		if (!state.projectConfig) {
			return <div class="info">
				Open a source file to continue.
			</div>;
		}

		if (!state.projectValid) {
			return <div class="error">
				Project data and sources are out of sync.
			</div>;
		}

		if (state.translationSets.length === 0) {
			return <div class="info">
				Select at least one text fragment to edit translations.
			</div>;
		}

		const sourceLanguage = state.projectConfig.sourceLanguage;
		const languages = state.projectConfig.languages || [];

		return <div class="editor">
			{state.translationSets.map(item => <TranslationSetEditor
				key={item.id}
				languages={languages}
				sourceLanguage={sourceLanguage}
				item={item}
				onValueInput={(language, value) => {
					switch (item.valueType) {
						case ValueType.Simple: {
							item.translations[language] = {
								value,
								valueType: ValueType.Simple as any,
								lastModified: new Date().toISOString()
							};
							break;
						}

						case ValueType.Plural: {
							item.translations[language] = {
								value,
								valueType: ValueType.Simple as any,
								lastModified: new Date().toISOString(),
								rule: item.rule
							};
							break;
						}
					}
					api.postMessage({
						type: ViewMessage.Type.SetTranslation,
						projectConfigFilename: item.project,
						id: item.id,
						language,
						value
					});
					this.setState({});
				}}
			/>)}
		</div>;
	}

	private readonly _onMessage = (event: MessageEvent) => {
		const message = event.data as ControllerMessage;
		switch (message.type) {
			case ControllerMessage.Type.UpdateProject:
				this.setState({ projectConfig: message.config });
				break;

			case ControllerMessage.Type.UpdateProjectValid:
				this.setState({ projectValid: message.valid });
				break;

			case ControllerMessage.Type.UpdateTranslationSets:
				this.setState({ translationSets: message.sets });
				break;
		}
	};

	public componentDidMount() {
		window.addEventListener("message", this._onMessage);
		api.postMessage({ type: ViewMessage.Type.Load });
	}

	public componentWillUnmount() {
		window.removeEventListener("message", this._onMessage);
	}
}

namespace View {
	export interface State {
		readonly projectConfig: Config | undefined;
		readonly projectValid: boolean;
		readonly translationSets: TranslationSet[];
	}
}

render(<View />, document.body);
