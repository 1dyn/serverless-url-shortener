variable "cors_allow_origins" {
  type = list(string)
}

variable "api_gateway_name" {
  type = string
}

variable "bedrock_model_id" {
  type = string
}

variable "acm_certificate_arn" {
  type = string
}