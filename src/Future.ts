
export class Future<T> {
    private _promise?: Promise<[T]>;
    private readonly _resolve?: (value: [T]) => void;
    private readonly _reject?: (reason: any) => void;
    private _rejected?: any;
    private _resolved?: T;

    constructor() {
        let resolve1: (value: [T]) => void;
        let reject1: (reason: any) => void;

        this._promise = new Promise((resolve, reject) => {
            reject1 = reject;
            resolve1 = resolve;
        });

        this._reject = reject1!;
        this._resolve = resolve1!;
    }

    async promise(): Promise<T> {
        if (this.resolved()) {
            if (this._rejected) {
                throw this._rejected;
            } else {
                return this._resolved!
            }
        } else {
            const result = await this._promise!;
            return result[0];
        }
    }

    resolved(): boolean {
        return this._promise == null
    }

    resolve(value: T) {
        if (this._promise == null)
            throw new Error("resolve of rejected");
        this._resolved = value;
        this._resolve!([value]);
        this._promise = undefined;
    }

    reject(reason: any) {
        if (this._promise == null)
            throw new Error("resolve of rejected");
        this._rejected = reason;
        this._reject!(reason);
        this._promise = undefined;
    }
}
