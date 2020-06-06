import { Component, render, h } from "preact";
import { EditorTarget } from "../editor-target";
import { TranslationSetView } from "./translation-set-view";

interface State {
	target: EditorTarget;
}

class MainView extends Component<{}, State> {
	public constructor() {
		super();
		this.state = {
			target: { type: "no-selection" }
		};
	}

	private _messageListener = (event: MessageEvent) => {
		switch (event.data?.type) {
			case "set-state":
				this.setState(event.data.state);
				break;
		}
	};

	public componentDidMount() {
		window.addEventListener("message", this._messageListener);
	}

	public componentWillUnmount() {
		window.removeEventListener("message", this._messageListener);
	}

	public render(props: any, state: State) {
		switch (state.target.type) {
			case "no-selection": return <p>Select at least one text fragment to edit translations.</p>;
			case "out-of-sync": return <p>Sources and project data are out of sync. Start your translation toolchain to continue.</p>;
			case "edit": {
				const parts: any[] = [];
				for (const id in state.target.translationSets) {
					parts.push(<TranslationSetView
						target={state.target}
						id={id}
						translationSet={state.target.translationSets[id]} />);
				}
				return parts;
			};
		}
	}
}

render(<MainView />, document.body);
