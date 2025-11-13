/*
  Attach an inline policy to the existing LabRole to allow Lambdas to read the chaos SSM parameter.
  This assumes the role `LabRole` exists in the account (serverless uses it in provider.iam.role).
  Review before applying.
*/


data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_iam_policy_document" "ssm_get_param" {
  statement {
    sid    = "AllowSSMGetParameterForChaos"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ]
    resources = [
      "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/proyecto-grupo-7/*"
    ]
  }
}

resource "aws_iam_role_policy" "labrole_ssm_get" {
  count  = var.labrole != "" ? 1 : 0
  name   = "labrole-ssm-get-parameter"
  role   = var.labrole
  policy = data.aws_iam_policy_document.ssm_get_param.json
}
