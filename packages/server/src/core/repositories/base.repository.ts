
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js';

export interface IBaseRepository<V extends UniqueIdentifier<string>, E> {
    save(entity: E): Promise<E>
    findByPublicId(id: V): Promise<E | null>
    findById(id: V): Promise<E | null>
}