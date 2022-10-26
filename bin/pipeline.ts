#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { App } from 'aws-cdk-lib';
import { ApplicationStack } from '../lib/application-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { RepositoryStack } from '../lib/repository-stack';

const app = new App();
const prodAccountId = app.node.tryGetContext('prod-account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

new RepositoryStack(app, 'RepositoryStack');

const devApplicationStack = new ApplicationStack(app, 'DevApplicationStack', { stageName: 'dev' });
const prodApplicationStack = new ApplicationStack(app, 'ProdApplicationStack', { stageName: 'prod' });
new PipelineStack(app, 'CrossAccountPipelineStack', {
  devApplicationStack: devApplicationStack,
  prodApplicationStack: prodApplicationStack,
  prodAccountId: prodAccountId,
});
