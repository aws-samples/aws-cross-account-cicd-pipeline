// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import codedeploy = require('@aws-cdk/aws-codedeploy');
import lambda = require('@aws-cdk/aws-lambda');
import apigateway = require('@aws-cdk/aws-apigateway');
import { App, Stack, StackProps } from '@aws-cdk/core';

export interface ApplicationStackProps extends StackProps {
  readonly stageName: string;
}

export class ApplicationStack extends Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: App, id: string, props: ApplicationStackProps) {
    super(app, id, props);

    this.lambdaCode = lambda.Code.fromCfnParameters();

    const func = new lambda.Function(this, 'Lambda', {
      functionName: 'HelloLambda',
      code: this.lambdaCode,
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        STAGE_NAME: props.stageName
      }
    });

    new apigateway.LambdaRestApi(this, 'HelloLambdaRestApi', {
      handler: func,
      endpointExportName: 'HelloLambdaRestApiEmdpoint',
      deployOptions: {
        stageName: props.stageName
      }
    });

    const version = func.addVersion(new Date().toISOString());
    const alias = new lambda.Alias(this, 'LambdaAlias', {
      aliasName: props.stageName,
      version,
    });

    new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
      alias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
    });

  }
}