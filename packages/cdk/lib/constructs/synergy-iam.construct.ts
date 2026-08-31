import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from "constructs";


export interface SynergyIamConstructProps {
    secretNamePattern?: string
}

export class SynergyIamConstruct extends Construct {

    public readonly role: iam.Role

    constructor(scope: Construct, id: string, props?: SynergyIamConstructProps) {
        super(scope, id)

        const stack = cdk.Stack.of(this)
        const secretPattern = props?.secretNamePattern ?? 'prod/synergy/*'

        // CREATE IDENTITY FOR LAMBDA
        this.role = new iam.Role(this, 'ExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Synergy Execution Role with minimum privilege'
        })

        // PERMISSIONS TO WRITE LOGS IN AWS CLOUDWATCH
        this.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
        )

        // SECRETS MANAGER SECRETS DIRECTION DEFINITION
        const prodSecretArn = `arn:aws:secretsmanager:${stack.region}:${stack.account}:secret:${secretPattern}`

        // SECRET REFERENCE CREATION
        const importedSecrets = secretsmanager.Secret.fromSecretPartialArn(
            this, 'ImportedProdSecrets', `${prodSecretArn}-??????`
        )

        // READ ONLY PERMISSION ASSIGMENT TO LAMBDA ROLE
        importedSecrets.grantRead(this.role)
        
    }
}