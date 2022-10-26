// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { App, Stack, StackProps } from 'aws-cdk-lib';

export class RepositoryStack extends Stack {
  constructor(app: App, id: string, props?: StackProps) {

    super(app, id, props);

    new Repository(this, 'CodeCommitRepo', {
      repositoryName: `repo-${this.account}`,
    });

  }
}