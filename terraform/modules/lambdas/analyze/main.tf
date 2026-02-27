resource "aws_lambda_function" "this" {
  function_name = "analyze-url"

  role          = var.lambda_role_arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.11"

  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      URLS_TABLE     = var.urls_table_name
      CLICKS_TABLE   = var.clicks_table_name
      TRENDS_TABLE   = var.trends_table_name
      BEDROCK_MIN_CLICKS = "5"
      BEDROCK_ENABLED    = "true"
      BEDROCK_MODEL_ID = var.bedrock_model_id
    }
  }
}