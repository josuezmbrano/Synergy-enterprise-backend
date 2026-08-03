import { UserStatusOptions } from '@project/common/constants/user.constants.js'

export interface RegisterUserOutput {
    user: {
        id: string // PUBLIC ID
        username: string
        fullname: string
        email: string
        status: UserStatusOptions
        createdAt: string
        verifiedAt: string | null
    }
    token: string
}