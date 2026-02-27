# HTTP API 생성
resource "aws_apigatewayv2_api" "this" {
  name          = "url-shortener-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "OPTIONS"]

    allow_headers = [
      "content-type",
      "authorization",
      "x-requested-with"
    ]

    expose_headers = [
      "content-type"
    ]

    max_age = 3600
  }
}

# shorten Lambda 연동
resource "aws_apigatewayv2_integration" "shorten" {
  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.shorten_lambda_arn
}

resource "aws_apigatewayv2_route" "shorten" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "POST /shorten"
  target    = "integrations/${aws_apigatewayv2_integration.shorten.id}"
}

# redirect Lambda 연동
resource "aws_apigatewayv2_integration" "redirect" {
  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.redirect_lambda_arn
}
resource "aws_apigatewayv2_route" "redirect" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "GET /{shortId}"
  target    = "integrations/${aws_apigatewayv2_integration.redirect.id}"
}

# stats Lambda 연동
resource "aws_apigatewayv2_integration" "stats" {
    api_id           = aws_apigatewayv2_api.this.id
    integration_type = "AWS_PROXY"
    integration_uri  = var.stats_lambda_arn
}

resource "aws_apigatewayv2_route" "stats" {
    api_id    = aws_apigatewayv2_api.this.id
    route_key = "GET /stats/{shortId}"
    target    = "integrations/${aws_apigatewayv2_integration.stats.id}"
}

# trends Lambda 연동
resource "aws_apigatewayv2_integration" "trends" {
  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.trends_lambda_arn
}

resource "aws_apigatewayv2_route" "trends" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "GET /trends"
  target    = "integrations/${aws_apigatewayv2_integration.trends.id}"
}

# 커스텀 도메인 HTTP API: api.linkive.cloud
resource "aws_apigatewayv2_domain_name" "api_domain" {
  domain_name = var.api_custom_domain_name

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# Map the custom domain root to your API stage
resource "aws_apigatewayv2_api_mapping" "api_domain_mapping" {
  api_id      = aws_apigatewayv2_api.this.id
  domain_name = aws_apigatewayv2_domain_name.api_domain.id
  stage       = aws_apigatewayv2_stage.prod.id
  # api_mapping_key omitted => root mapping
}

# Stage (자동 배포)
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "prod"
  auto_deploy = true
}

# Lambda permission
resource "aws_lambda_permission" "shorten" {
  statement_id  = "AllowInvokeFromAPIGatewayShorten"
  action        = "lambda:InvokeFunction"
  function_name = var.shorten_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "redirect" {
  statement_id  = "AllowInvokeFromAPIGatewayRedirect"
  action        = "lambda:InvokeFunction"
  function_name = var.redirect_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "stats" {
    statement_id  = "AllowInvokeFromAPIGatewayStats"
    action        = "lambda:InvokeFunction"
    function_name = var.stats_lambda_name
    principal     = "apigateway.amazonaws.com"
    source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "trends" {
  statement_id  = "AllowInvokeFromAPIGatewayTrends"
  action        = "lambda:InvokeFunction"
  function_name = var.trends_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}