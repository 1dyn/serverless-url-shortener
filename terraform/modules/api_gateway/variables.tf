variable "api_name" {
  description = "API Gateway의 이름"
  type        = string
}

variable "stage_name" {
  description = "배포 스테이지 이름 (dev, prod 등)"
  type        = string
  default     = "dev"
}

variable "lambda_invoke_arn" {
  description = "연결할 Lambda의 Invoke ARN"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda 함수 이름 (권한 설정용)"
  type        = string
}