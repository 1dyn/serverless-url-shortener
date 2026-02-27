output "api_url" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "api_domain_target" {
  value = aws_apigatewayv2_domain_name.api_domain.domain_name_configuration[0].target_domain_name
}