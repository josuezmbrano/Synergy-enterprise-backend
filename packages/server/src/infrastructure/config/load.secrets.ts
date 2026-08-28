import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

export const loadProductionSecrets = async (): Promise<void> => {

    if (process.env.NODE_ENV !== 'production') return
    if (process.env.DATABASE_URL) return

    const secretName = process.env.AWS_SECRET_NAME
    if (!secretName) {
        throw new Error('FATAL: AWS_SECRET_NAME is required in production environment')
    }

    const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
    })

    try {

        const command = new GetSecretValueCommand({ SecretId: secretName })
        const response = await client.send(command)

        if (!response.SecretString) {
            throw new Error(`FATAL: Secret ${secretName} returned an empty value`);
        }

        const secrets = JSON.parse(response.SecretString)

        if (secrets.DATABASE_URL) {
            process.env.DATABASE_URL = secrets.DATABASE_URL
        }

    } catch (error) {
        console.error('Failed to load secrets from AWS Secrets Manager.');
        throw error;
    }
}