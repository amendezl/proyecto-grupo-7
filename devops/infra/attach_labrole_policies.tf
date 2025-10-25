/*
  Attach required policies to existing IAM role used by Serverless (LabRole).
  This looks up the role by name and attaches:
   - AmazonSSMManagedInstanceCore (so SSM commands can run)
   - the ecr-pull-policy-chaos policy (created in chaos_agent_example.tf)

  NOTE: This will modify the IAM role in your AWS account. Review before applying.
*/

data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# Attach AmazonSSMManagedInstanceCore to the role so instances assume this role can receive SSM commands
resource "aws_iam_role_policy_attachment" "attach_ssm_core_to_lab" {
  role       = data.aws_iam_role.lab_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach the ECR pull policy we defined earlier (if present). If you didn't keep that policy,
# you can create/attach your own or allow instance role to pull from ECR by other means.
resource "aws_iam_role_policy_attachment" "attach_ecr_pull_to_lab" {
  role       = data.aws_iam_role.lab_role.name
  policy_arn = aws_iam_policy.ecr_pull_policy_for_chaos.arn
}
