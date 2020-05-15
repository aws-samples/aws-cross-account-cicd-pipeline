// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import codecommit = require('@aws-cdk/aws-codecommit');
import { App, Stack, StackProps } from '@aws-cdk/core';

export class RepositoryStack extends Stack {
  constructor(app: App, id: string, props?: StackProps) {

    super(app, id, props);

    new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: `repo-${this.account}`
    });

  }
}