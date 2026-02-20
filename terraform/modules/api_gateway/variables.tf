variable "shorten_lambda_arn" {
  description = "ARN of shorten Lambda"
  type        = string
}

variable "shorten_lambda_name" {
  description = "Name of shorten Lambda"
  type        = string
}

variable "redirect_lambda_arn" {
  description = "ARN of redirect Lambda"
  type        = string
}

variable "redirect_lambda_name" {
  description = "Name of redirect Lambda"
  type        = string
}

variable "cors_allow_origins" {
  type = list(string)
  description = "Allowed CORS origins"
}