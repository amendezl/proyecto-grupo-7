/*
  SSM-only example: Deploy and run the chaos-engineering container on existing EC2 instances

  This file contains a safe, SSM-based approach to run the chaos container on instances that
  already have the SSM Agent and the proper IAM role (AmazonSSMManagedInstanceCore).

  Why SSM?
  - Does not require modifying/create instance resources
  - Works on running instances (no reprovision needed)
  - Auditable and reversible via SSM commands

  IMPORTANT: Review IAM and networking before running. Keep experiments short and conservative.
*/

/* -----------------------------
   Optional IAM snippet: attach this policy to the EC2 instance role if the role lacks ECR or Docker pull permissions.
   If you store the chaos image on ECR, ensure the instance role has permission to GetAuthorizationToken and Pull images.
------------------------------*/

# Example policy allowing ECR access (attach to the instance role)
resource "aws_iam_policy" "ecr_pull_policy_for_chaos" {
  name        = "ecr-pull-policy-chaos"
  description = "Allow ECR:GetAuthorizationToken and basic ECR read actions for pulling chaos image"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
          "ecr:DescribeRepositories"
        ],
        Resource = "*"
      }
    ]
  })
}

# To attach it to an existing role, use aws_iam_role_policy_attachment and pass the role name
# resource "aws_iam_role_policy_attachment" "attach_ecr_policy" {
#   role       = aws_iam_role.your_instance_role.name
#   policy_arn = aws_iam_policy.ecr_pull_policy_for_chaos.arn
# }

/* -----------------------------
   SSM document to pull/run the container on targeted instances
------------------------------*/

resource "aws_ssm_document" "run_chaos_container" {
  name          = "RunChaosContainer"
  document_type = "Command"

  content = jsonencode({
    schemaVersion = "2.2",
    description   = "Pull and run chaos-engineering container (safe-by-default: disabled by env)",
    mainSteps = [
      {
        action = "aws:runShellScript",
        name   = "run",
        inputs = {
          runCommand = [
            "#!/bin/bash",
            "set -euo pipefail",
            "# install docker if missing (only Debian/Ubuntu family)",
            "if ! command -v docker >/dev/null 2>&1; then apt-get update && apt-get install -y ca-certificates curl gnupg lsb-release; curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh; fi",
            "# pull image (if ECR private, login using aws credentials present on the instance)",
            "REGISTRY=$(echo ${var.chaos_image} | cut -d'/' -f1)",
            "if command -v aws >/dev/null 2>&1; then aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin $REGISTRY || true; fi",
            "docker pull ${var.chaos_image} || true",
            "# stop any previous container",
            "docker rm -f chaos-proxy || true",
            "# run container but default to no fault injection unless env overrides",
            "docker run -d --name chaos-proxy --restart unless-stopped -p 9000:9000 ${var.chaos_image} --target ${var.chaos_target} --port 9000 --latency 0 --error-rate 0"
          ]
        }
      }
    ]
  })
}

/* -----------------------------
   How to invoke (on-demand) from CLI or CI:

   aws ssm send-command \
     --region ${var.aws_region} \
     --document-name "RunChaosContainer" \
     --targets "Key=tag:Role,Values=app" \
     --comment "Start chaos proxy (pull latest image)" \
     --parameters '{}' \
     --timeout-seconds 600

   - Replace the --targets filter with the tags or instance IDs you want to target.
   - Keep experiments short and low-error-rate. Use `docker stop chaos-proxy` to stop.
------------------------------*/

/* NOTES
 - Ensure instances have SSM Agent and the role AmazonSSMManagedInstanceCore.
 - If using private ECR, either attach the ECR pull policy to the instance role or perform `aws ecr get-login-password` in the script.
 - This approach is reversible and auditable via CloudTrail/SSM command history.
*/

