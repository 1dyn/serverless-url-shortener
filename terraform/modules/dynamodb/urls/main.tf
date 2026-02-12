resource "aws_dynamodb_table" "this" {
  name         = "urls"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "shortId"

  attribute {
    name = "shortId"
    type = "S"
  }
}