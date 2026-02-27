resource "aws_lambda_function" "this" {
  function_name = "trends-url"

  handler = "handler.lambda_handler"
  runtime = "python3.11"

  role = var.lambda_role_arn

  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  timeout = 10

  environment {
    variables = {
      TRENDS_TABLE = var.trends_table_name
    }
  }
}