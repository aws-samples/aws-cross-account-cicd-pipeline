<#
    .Synopsis
    This is a short script to create the required roles in the Production account
#>
#Create cross-account role via PowerShell
param(
    $devAccountId,
    $currentAccountId = (aws sts get-caller-identity | jq -r .Account),
    $roleName = 'CodePipelineCrossAccountRole',
    $cloudRoleName = 'CloudFormationDeploymentRole',
    $keyArn = "*" # Change this to the actual key ARN before implementing!
)

$assumeRoleDoc = "{""Version"": ""2012-10-17"",""Statement"": [{""Sid"": """",""Effect"": ""Allow"",""Principal"": {""AWS"": ""arn:aws:iam::${devAccountId}:root""},""Action"": ""sts:AssumeRole""}]}"
New-IamRole -RoleName $roleName -AssumeRolePolicyDocument $assumeRoleDoc
$policyDoc = "{""Version"": ""2012-10-17"",""Statement"":[{""Action"": [""cloudformation:*"",""iam:PassRole""],""Resource"": ""*"",  ""Effect"": ""Allow""},{""Action"": [""s3:Get*"",""s3:Put*"",""s3:ListBucket""],""Resource"": [""arn:aws:s3:::artifact-bucket-${devAccountId}"",""arn:aws:s3:::artifact-bucket-${devAccountId}/*""],""Effect"": ""Allow""},{""Action"": [ ""kms:DescribeKey"", ""kms:GenerateDataKey*"", ""kms:Encrypt"", ""kms:ReEncrypt*"", ""kms:Decrypt"" ], ""Resource"": ""$keyArn"",""Effect"": ""Allow""}]}"
Write-IAMRolePolicy -RoleName $roleName -PolicyName "${roleName}Policy" -PolicyDocument $policyDoc

$cloudAssumeRoleDoc = "{""Version"": ""2012-10-17"",""Statement"": [{""Sid"": """",""Effect"": ""Allow"",""Principal"": {""Service"": ""cloudformation.amazonaws.com""},""Action"": ""sts:AssumeRole""}]}"
New-IamRole -RoleName $cloudRoleName -AssumeRolePolicyDocument $cloudAssumeRoleDoc
$cloudPolicyDoc = "{""Version"":""2012-10-17"", ""Statement"":[{""Action"":""iam:PassRole"",""Resource"":""arn:aws:iam::${currentAccountId}:role/*"",""Effect"":""Allow""},{""Action"":[""iam:GetRole"",""iam:CreateRole"",""iam:AttachRolePolicy""],""Resource"":""arn:aws:iam::${currentAccountId}:role/*"",""Effect"":""Allow""},{""Action"":""lambda:*"",""Resource"":""*"",""Effect"":""Allow""},{""Action"":""apigateway:*"",""Resource"":""*"",""Effect"":""Allow""},{""Action"":""codedeploy:*"",""Resource"":""*"",""Effect"":""Allow""},{""Action"":""ssm:GetParameters"",""Resource"":""arn:aws:ssm:*:*:parameter/cdk-bootstrap/hnb659fds/version"",""Effect"":""Allow""},{""Action"":[""s3:GetObject*"",""s3:GetBucket*"",""s3:List*""],""Resource"":[""arn:aws:s3:::artifact-bucket-${devAccountId}"",""arn:aws:s3:::artifact-bucket-${devAccountId}/*""],""Effect"":""Allow""},{""Action"":[""kms:Decrypt"",""kms:DescribeKey""],""Resource"":""${keyArn}"",""Effect"":""Allow""},{""Action"":[""cloudformation:CreateStack"",""cloudformation:DescribeStack*"",""cloudformation:GetStackPolicy"",""cloudformation:GetTemplate*"",""cloudformation:SetStackPolicy"",""cloudformation:UpdateStack"",""cloudformation:ValidateTemplate""],""Resource"":""arn:aws:cloudformation:us-east-2:${currentAccountId}:stack/ProdApplicationDeploymentStack/*"",""Effect"":""Allow""}]}"
Write-IAMRolePolicy -RoleName $cloudRoleName -PolicyName "${cloudRoleName}Policy" -PolicyDocument $cloudPolicyDoc
