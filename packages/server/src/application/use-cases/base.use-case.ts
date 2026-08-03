export interface BaseUseCase<input, output> {
    execute(input: input): Promise<output>
}