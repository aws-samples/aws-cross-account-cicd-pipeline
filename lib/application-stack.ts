// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { App, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { LambdaDeploymentConfig, LambdaDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import { Alias, CfnParametersCode, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';

export interface ApplicationStackProps extends StackProps {
  readonly stageName: string;
}

export class ApplicationStack extends Stack {
  public readonly lambdaCode: CfnParametersCode;

  constructor(app: App, id: string, props: ApplicationStackProps) {
    super(app, id, props);

    this.lambdaCode = Code.fromCfnParameters();

    const func = new Function(this, 'Lambda', {
      functionName: 'HelloLambda',
      code: this.lambdaCode,
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        STAGE_NAME: props.stageName
      }
    });

    new LambdaRestApi(this, 'HelloLambdaRestApi', {
      handler: func,
      endpointExportName: 'HelloLambdaRestApiEmdpoint',
      deployOptions: {
        stageName: props.stageName
      }
    });

    const alias = new Alias(this, 'LambdaAlias', {
      aliasName: props.stageName,
      version: func.currentVersion,
    });

    new LambdaDeploymentGroup(this, 'DeploymentGroup', {
      alias,
      deploymentConfig: LambdaDeploymentConfig.ALL_AT_ONCE,
    });

  }
}