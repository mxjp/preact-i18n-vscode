import * as vscode from "vscode";

export function wrapRateLimit<A extends any[], T>(
	action: (this: T, ...args: A) => void,
	delay = 100,
	onError?: (this: T, error: any) => void
): (this: T, ...args: A) => void {
	let timer: any;
	let nextImmediate = -Infinity;
	return function (this: T, ...args) {
		const now = Date.now();
		if (timer) {
			return;
		}
		if (now > nextImmediate) {
			nextImmediate = now + delay;
			try {
				action.apply(this, args);
			} catch (error) {
				if (onError) {
					onError.call(this, error);
				} else {
					throw error;
				}
			}
		} else {
			timer = setTimeout(() => {
				timer = null;
				nextImmediate = now + delay;
				try {
					action.apply(this, args);
				} catch (error) {
					if (onError) {
						onError.call(this, error);
					} else {
						throw error;
					}
				}
			}, nextImmediate - now);
		}
	};
}

export function rateLimit(delay?: number) {
	return function (target: any, key: string | symbol, descriptor: PropertyDescriptor) {
		descriptor.value = wrapRateLimit(descriptor.value, delay, handleDeferredError);
	}
}

function handleDeferredError(this: any, error: any) {
	if (onDeferredError in this) {
		this[onDeferredError](error);
	} else {
		throw error;
	}
}

export const onDeferredError = Symbol("onDeferredError");

export function disposeAll(disposables: Iterable<vscode.Disposable>) {
	for (const disposable of disposables) {
		disposable.dispose();
	}
	if (Array.isArray(disposables)) {
		disposables.length = 0;
	}
}

export class PromiseBag {
	private _pending = new Set<Promise<any>>();

	public put(promise: Promise<any>) {
		this._pending.add(promise = promise.catch(() => {}));
		promise.then(() => {
			this._pending.delete(promise);
		});
	}

	public async wait() {
		while (this._pending.size > 0) {
			await Promise.all(this._pending);
		}
	}
}
