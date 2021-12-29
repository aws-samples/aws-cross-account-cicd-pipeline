// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { App, Stack, StackProps, RemovalPolicy, CfnOutput, CfnCapabilities } from 'aws-cdk-lib';
import { ApplicationStack } from '../lib/application-stack';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { AccountPrincipal, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, CodeCommitSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';

export interface PipelineStackProps extends StackProps {
  readonly devApplicationStack: ApplicationStack;
  readonly prodApplicationStack: ApplicationStack;
  readonly prodAccountId: string;
}

export class PipelineStack extends Stack {

  constructor(app: App, id: string, props: PipelineStackProps) {

    super(app, id, props);

    const repository = Repository.fromRepositoryName(this, 'CodeCommitRepo', `repo-${this.account}`);

    const prodDeploymentRole = Role.fromRoleArn(this, 'ProdDeploymentRole', `arn:aws:iam::${props.prodAccountId}:role/CloudFormationDeploymentRole`, {
      mutable: false
    });
    const prodCrossAccountRole = Role.fromRoleArn(this, 'ProdCrossAccountRole', `arn:aws:iam::${props.prodAccountId}:role/CodePipelineCrossAccountRole`, {
      mutable: false
    });

    const prodAccountRootPrincipal = new AccountPrincipal(props.prodAccountId);

    const key = new Key(this, 'ArtifactKey', {
      alias: 'key/artifact-key',
    });
    key.grantDecrypt(prodAccountRootPrincipal);
    key.grantDecrypt(prodCrossAccountRole);

    const artifactBucket = new Bucket(this, 'ArtifactBucket', {
      bucketName: `artifact-bucket-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.KMS,
      encryptionKey: key
    });
    artifactBucket.grantPut(prodAccountRootPrincipal);
    artifactBucket.grantRead(prodAccountRootPrincipal);

    const cdkBuild = new PipelineProject(this, 'CdkBuild', {
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install'
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -o dist'
            ],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: [
            '*ApplicationStack.template.json',
          ],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_ARM_2 //UBUNTU_14_04_NODEJS_10_14_1,
      },
      encryptionKey: key
    });
    const lambdaBuild = new PipelineProject(this, 'LambdaBuild', {
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd app',
              'npm install',
            ],
          },
          build: {
            commands: 'npm run build',
          },
        },
        artifacts: {
          'base-directory': 'app',
          files: [
            'index.js',
            'node_modules/**/*',
          ],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_ARM_2,
      },
      encryptionKey: key
    });

    const sourceOutput = new Artifact();
    const cdkBuildOutput = new Artifact('CdkBuildOutput');
    const lambdaBuildOutput = new Artifact('LambdaBuildOutput');

    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'CrossAccountPipeline',
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              repository: repository,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'Application_Build',
              project: lambdaBuild,
              input: sourceOutput,
              outputs: [lambdaBuildOutput],
            }),
            new CodeBuildAction({
              actionName: 'CDK_Synth',
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy_Dev',
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy',
              templatePath: cdkBuildOutput.atPath('DevApplicationStack.template.json'),
              stackName: 'DevApplicationDeploymentStack',
              adminPermissions: true,
              parameterOverrides: {
                ...props.devApplicationStack.lambdaCode.assign(lambdaBuildOutput.s3Location),
              },
              extraInputs: [lambdaBuildOutput],
            })
          ],
        },
        {
          stageName: 'Deploy_Prod',
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy',
              templatePath: cdkBuildOutput.atPath('ProdApplicationStack.template.json'),
              stackName: 'ProdApplicationDeploymentStack',
              adminPermissions: true,
              parameterOverrides: {
                ...props.prodApplicationStack.lambdaCode.assign(lambdaBuildOutput.s3Location),
              },
              deploymentRole: prodDeploymentRole,
              cfnCapabilities: [CfnCapabilities.ANONYMOUS_IAM],
              extraInputs: [lambdaBuildOutput],
              role: prodCrossAccountRole,
            }),
          ],
        },
      ],
    });

    pipeline.addToRolePolicy(new PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::${props.prodAccountId}:role/*`]
    }));

    new CfnOutput(this, 'ArtifactBucketEncryptionKeyArn', {
      value: key.keyArn,
      exportName: 'ArtifactBucketEncryptionKey'
    });

  }
}
