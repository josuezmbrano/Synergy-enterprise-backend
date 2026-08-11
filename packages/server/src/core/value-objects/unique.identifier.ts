import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { BaseIdentifier } from './base.identifier.js';

export abstract class UniqueIdentifier<ID extends string> extends BaseIdentifier<string, ID> {

    protected abstract readonly identifierType: ID

    private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    protected constructor(uuid: string) {
        UniqueIdentifier.validate(uuid)
        super(uuid)
    }

    public static validate(id: string, fieldName: string = 'id'): void {

        if (!this.UUID_REGEX.test(id)) {
            throw CommonErrorFactory.commonValidationFailed(
                `ID provided could not be validated due to wrong format, it must comply with the UUID v4 standard.`,
                {
                    field: fieldName,
                    reason: 'INVALID_UUID_FORMAT',
                    constraint: 'uuid_v4_standard',
                    description: `The identifier provided for ${fieldName} does not comply with the required security format.`
                }
            )
        }

    }

    public toString(): string {
        return this.value
    }

}