output "api_url" {
  value = module.api_gateway.api_url
}

output "api_base_url" {
  value = "${module.api_gateway.api_url}/prod"
}

output "api_domain_target" {
  value = module.api_gateway.api_domain_target
}