resource "aws_lambda_function" "this" {
  function_name = "shorten-url"

  handler = "handler.lambda_handler"
  runtime = "python3.11"

  role = var.lambda_role_arn

  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  environment {
    variables = {
      URLS_TABLE = var.urls_table_name
      BASE_URL = "https://linkive.cloud"
    }
  }
}