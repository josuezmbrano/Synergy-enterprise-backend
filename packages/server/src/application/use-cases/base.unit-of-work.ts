export interface IBaseUnitOfWork {
    run<T>(work: () => Promise<T>): Promise<T>
}