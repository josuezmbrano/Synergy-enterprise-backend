import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { SynergyIamConstruct } from './constructs/synergy-iam.construct';
import { SynergyApiConstruct } from './constructs/synergy-api.construct';


export class SynergyStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const iamConstruct = new SynergyIamConstruct(this, 'SynergyIam')

    const apiConstruct = new SynergyApiConstruct(this, 'SynergyApi', {
      role: iamConstruct.role
    })

    // FINAL URL 
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: apiConstruct.httpApi.url ?? 'No URL generated',
      description: 'Public Synergy API URL'
    })

  }
}
