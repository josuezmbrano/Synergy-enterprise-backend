const saltConfig = {
    production: 10,
    development: 8,
    test: 2
}

type EnvironmentKeys = keyof typeof saltConfig

export const saltRounds = (): number => {
    
    const actualEnvironment = process.env.NODE_ENV || 'development'

    return saltConfig[actualEnvironment as EnvironmentKeys] || saltConfig.development
}