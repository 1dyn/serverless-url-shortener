output "arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.this.arn
}