export interface FindUserOutput {
    id: string // PUBLIC ID
    username: string
    fullname: string
    email: string
    status: 'ACTIVE' | 'UNVERIFIED'
    verifiedAt: string | null
    createdAt: string 
}