#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { SynergyStack } from '../lib/cdk-stack';

const app = new cdk.App();
new SynergyStack(app, 'SynergyStack', {

  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION || 'us-east-1' },
});
