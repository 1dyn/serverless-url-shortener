resource "aws_dynamodb_table" "this" {
  name         = "trends"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "analysisDate"
  range_key = "type"

  attribute {
    name = "analysisDate"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }
}