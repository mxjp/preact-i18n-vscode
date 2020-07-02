import * as vscode from "vscode";

export function rateLimit<A extends any[], T>(
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
				action.call(this, ...args);
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
					action.call(this, ...args);
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

export function useRateLimit(delay?: number) {
	return function (target: any, key: string | symbol, descriptor: PropertyDescriptor) {
		descriptor.value = rateLimit(descriptor.value, delay, function(this: any, error: any) {
			if (useRateLimit.handleDeferredError in this) {
				this[useRateLimit.handleDeferredError](error);
			} else {
				throw error;
			}
		});
	}
}

export namespace useRateLimit {
	export const handleDeferredError = Symbol("onRateLimitError");
}

export function disposeAll(target: vscode.Disposable[]) {
	target.forEach(d => d.dispose());
	target.length = 0;
}
