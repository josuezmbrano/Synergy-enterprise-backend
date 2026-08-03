
export interface AuthPayload {
    sub: string
    verified: boolean
    role: string
}

export interface IAuthService {
    generateToken(payload: AuthPayload): Promise<string>
    verifyToken(token: string): Promise<AuthPayload>
}