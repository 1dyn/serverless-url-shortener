# HTTP API 생성
resource "aws_apigatewayv2_api" "this" {
  name          = "url-shortener-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type"]
    max_age       = 3600
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