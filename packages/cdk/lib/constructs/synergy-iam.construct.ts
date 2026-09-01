import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from "constructs";


export interface SynergyIamConstructProps {
    secretArn: string
}

export class SynergyIamConstruct extends Construct {

    public readonly role: iam.Role

    constructor(scope: Construct, id: string, props: SynergyIamConstructProps) {
        super(scope, id)

        // CREATE IDENTITY FOR LAMBDA
        this.role = new iam.Role(this, 'ExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Synergy Execution Role with minimum privilege'
        })

        // PERMISSIONS TO WRITE LOGS IN AWS CLOUDWATCH
        this.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
        )

        // SECRET REFERENCE CREATION
        const importedSecrets = secretsmanager.Secret.fromSecretAttributes(
            this, 'ImportedProdSecrets', { secretCompleteArn: props.secretArn }
        )

        // READ ONLY PERMISSION ASSIGMENT TO LAMBDA ROLE
        importedSecrets.grantRead(this.role)

    }
}