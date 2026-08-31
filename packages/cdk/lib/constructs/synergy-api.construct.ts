import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import { DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import path from 'path';

export interface SynergyApiConstructProps {
    role: iam.IRole;
    /**
     * 
     * @default 'prod/synergy/backend-secrets'
     */
    secretName?: string;
}

export class SynergyApiConstruct extends Construct {
    public readonly lambdaFunction: DockerImageFunction;
    public readonly httpApi: HttpApi;

    constructor(scope: Construct, id: string, props: SynergyApiConstructProps) {
        super(scope, id);

        // INSTANTIATE SERVERLESS CONTAINER
        const dockerfileDir = path.join(__dirname, '..', '..', '..', '..');
        this.lambdaFunction = new DockerImageFunction(this, 'ApiFunction', {
            code: DockerImageCode.fromImageAsset(dockerfileDir, {
                exclude: [
                    'cdk.out',
                    'packages/cdk/cdk.out',
                    '**/node_modules',
                    '**/.git',
                    '**/.dockerignore',
                ],
            }),
            role: props.role,
            environment: {
                NODE_ENV: 'production',
                PORT: '3000',
                AWS_SECRET_NAME: props.secretName ?? 'prod/synergy/backend-secrets'
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 1536,
        });

        // ADAPTER WITHIN API GATEWAY AND LAMBDA
        const lambdaIntegration = new HttpLambdaIntegration(
            'LambdaIntegration',
            this.lambdaFunction
        );

        // AWS HTTP API CREATION
        this.httpApi = new HttpApi(this, 'HttpApi', {
            apiName: 'SynergyServiceHttpApi',
            description: 'API Gateway HTTP for Synergy App',
        });

        // ROOT ROUTES TO LAMBDA
        this.httpApi.addRoutes({
            path: '/',
            methods: [HttpMethod.ANY],
            integration: lambdaIntegration,
        });

        // SUBROUTES TO LAMBDA
        this.httpApi.addRoutes({
            path: '/{proxy+}',
            methods: [HttpMethod.ANY],
            integration: lambdaIntegration,
        });
    }
}