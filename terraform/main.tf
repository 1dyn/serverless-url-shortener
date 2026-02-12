# DynamoDB
module "urls_table" {
  source = "./modules/dynamodb/urls"
}

module "clicks_table" {
  source = "./modules/dynamodb/clicks"
}

module "trends_table" {
  source = "./modules/dynamodb/trends"
}

# 공통 IAM Role
module "lambda_role" {
  source           = "./modules/iam/lambda_basic"
  urls_table_arn   = module.urls_table.arn
  clicks_table_arn = module.clicks_table.arn
  trends_table_arn = module.trends_table.arn
}

# Lambda
module "shorten_lambda" {
  source           = "./modules/lambdas/shorten"
  lambda_role_arn  = module.lambda_role.arn
  zip_path         = "../lambdas/zips/shorten.zip"
  urls_table_name  = module.urls_table.name
}

module "redirect_lambda" {
  source            = "./modules/lambdas/redirect"
  lambda_role_arn   = module.lambda_role.arn
  zip_path          = "../lambdas/zips/redirect.zip"
  urls_table_name   = module.urls_table.name
  clicks_table_name = module.clicks_table.name
}