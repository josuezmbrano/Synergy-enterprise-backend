import { AsyncLocalStorage } from 'async_hooks';

export class TransactionStorage<T> {
    private storage = new AsyncLocalStorage<T>()

    public run<R>(tx: T, work: () => Promise<R>): Promise<R> {
        return this.storage.run(tx, work)
    }

    public getStore(): T | undefined {
        return this.storage.getStore()
    }

}