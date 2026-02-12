resource "aws_dynamodb_table" "this" {
  name         = "clicks"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "shortId"
  range_key = "timestamp"

  attribute {
    name = "shortId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }
}