import { h, render, Component, Fragment } from "preact";
import { ViewMessage, RendererMessage } from "../messages";
import { Editor } from "..";
import { Config } from "@mpt/preact-i18n/dist/tooling";
import { TranslationSetEditor } from "./translation-set-editor";
import { vscode } from "./vscode";

class Renderer extends Component<{}, RendererState> {
	public constructor() {
		super();
		this.state = {
			projectConfig: null,
			projectValid: false,
			translationSets: []
		};
	}

	public render(props: any, state: RendererState) {
		const languages = state.projectConfig?.languages || [];

		return <Fragment>
			{state.translationSets.map(item => <TranslationSetEditor
				key={item.id}
				languages={languages}
				item={item}
				onValueInput={(language, value) => {
					vscode.postMessage({
						type: RendererMessage.Type.SetTranslationValue,
						id: item.id,
						language,
						value
					});
				}}
			/>)}

			<hr />
			<pre>
				{JSON.stringify(state, null, "  ")}
			</pre>
		</Fragment>;
	}

	private readonly _onMessage = (event: MessageEvent) => {
		const message = event.data as ViewMessage;
		switch (message.type) {
			case ViewMessage.Type.UpdateProject:
				this.setState({ projectConfig: message.projectConfig });
				break;

			case ViewMessage.Type.UpdateProjectValid:
				this.setState({ projectValid: message.projectValid });
				break;

			case ViewMessage.Type.UpdateTranslationSets:
				this.setState({ translationSets: message.translationSets });
				break;
		}
	};

	public componentDidMount() {
		window.addEventListener("message", this._onMessage);
		vscode.postMessage({
			type: RendererMessage.Type.Ready
		});
	}

	public componentWillUnmount() {
		window.removeEventListener("message", this._onMessage);
	}
}

interface RendererState {
	projectConfig: Config | null;
	projectValid: boolean;
	translationSets: Editor.TranslationSet[];
}

render(<Renderer />, document.body);
