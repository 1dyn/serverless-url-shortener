data "aws_region" "current" {}

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
  source          = "./modules/lambdas/shorten"
  lambda_role_arn = module.lambda_role.arn
  zip_path        = "../lambdas/zips/shorten.zip"
  urls_table_name = module.urls_table.name
}

module "redirect_lambda" {
  source            = "./modules/lambdas/redirect"
  lambda_role_arn   = module.lambda_role.arn
  zip_path          = "../lambdas/zips/redirect.zip"
  urls_table_name   = module.urls_table.name
  clicks_table_name = module.clicks_table.name
}

module "stats_lambda" {
  source            = "./modules/lambdas/stats"
  lambda_role_arn   = module.lambda_role.arn
  zip_path          = "../lambdas/zips/stats.zip"
  urls_table_name   = module.urls_table.name
  clicks_table_name = module.clicks_table.name
}

module "analyze_lambda" {
  source          = "./modules/lambdas/analyze"
  lambda_role_arn = module.lambda_role.arn
  zip_path        = "../lambdas/zips/analyze.zip"

  urls_table_name   = module.urls_table.name
  clicks_table_name = module.clicks_table.name
  trends_table_name = module.trends_table.name

  bedrock_model_id = var.bedrock_model_id
}

module "trends_lambda" {
  source          = "./modules/lambdas/trends"
  lambda_role_arn = module.lambda_role.arn
  zip_path        = "../lambdas/zips/trends.zip"

  trends_table_name = module.trends_table.name
}

# API Gateway
module "api_gateway" {
  source             = "./modules/api_gateway"
  cors_allow_origins = var.cors_allow_origins

  shorten_lambda_arn  = module.shorten_lambda.arn
  shorten_lambda_name = module.shorten_lambda.function_name

  redirect_lambda_arn  = module.redirect_lambda.arn
  redirect_lambda_name = module.redirect_lambda.function_name

  stats_lambda_arn  = module.stats_lambda.arn
  stats_lambda_name = module.stats_lambda.function_name

  trends_lambda_arn  = module.trends_lambda.arn
  trends_lambda_name = module.trends_lambda.function_name

  api_custom_domain_name = "api.linkive.cloud"
  acm_certificate_arn    = var.acm_certificate_arn
}

# EventBridge -> Analyze Lambda (Daily, KST 09:00)
resource "aws_cloudwatch_event_rule" "analyze_daily" {
  name                = "linkive-analyze-daily"
  description         = "Run analyze lambda daily at 09:00 KST (00:00 UTC)"
  schedule_expression = "cron(0 0 * * ? *)"
}

resource "aws_cloudwatch_event_target" "analyze_daily" {
  rule      = aws_cloudwatch_event_rule.analyze_daily.name
  target_id = "analyzeLambda"
  arn       = module.analyze_lambda.arn
}

resource "aws_lambda_permission" "allow_eventbridge_analyze" {
  statement_id  = "AllowExecutionFromEventBridgeAnalyze"
  action        = "lambda:InvokeFunction"
  function_name = module.analyze_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.analyze_daily.arn
}

# CloudWatch Alarm
resource "aws_cloudwatch_metric_alarm" "analyze_errors" {
  alarm_name          = "linkive-analyze-errors"
  alarm_description   = "Analyze Lambda errors >= 1 in 5 minutes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = module.analyze_lambda.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "analyze_duration_p95" {
  alarm_name          = "linkive-analyze-duration-p95"
  alarm_description   = "Analyze Lambda duration p95 > 10s"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 10000
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = module.analyze_lambda.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_global_error_rate" {
  alarm_name        = "linkive-lambda-global-error-rate-5pct"
  alarm_description = "Global Lambda error rate >= 5%"

  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 5
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  # 각 Lambda Invocations 합산
  metric_query {
    id          = "inv1"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Invocations"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.shorten_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "inv2"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Invocations"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.redirect_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "inv3"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Invocations"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.stats_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "inv4"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Invocations"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.analyze_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "err1"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Errors"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.shorten_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "err2"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Errors"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.redirect_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "err3"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Errors"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.stats_lambda.function_name
      }
    }
  }

  metric_query {
    id          = "err4"
    return_data = false
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Errors"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = module.analyze_lambda.function_name
      }
    }
  }

  # 총합 계산
  metric_query {
    id          = "total_inv"
    expression  = "inv1+inv2+inv3+inv4"
    return_data = false
    period      = 300
  }

  metric_query {
    id          = "total_err"
    expression  = "err1+err2+err3+err4"
    return_data = false
    period      = 300
  }

  metric_query {
    id          = "rate"
    expression  = "IF(total_inv>0,(total_err/total_inv)*100,0)"
    label       = "GlobalErrorRatePercent"
    return_data = true
    period      = 300
  }
}

resource "aws_cloudwatch_dashboard" "linkive" {
  dashboard_name = "linkive-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # =========================
      # Lambda (Analyze)
      # =========================
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Analyze Lambda - Invocations"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", module.analyze_lambda.function_name]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Analyze Lambda - Errors"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", module.analyze_lambda.function_name]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Analyze Lambda - Duration (p95)"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", module.analyze_lambda.function_name, { "stat" : "p95" }]
          ]
          period = 300
        }
      },

      # =========================
      # API Gateway (REST API v1) - Traffic & Errors
      # =========================
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "API Gateway - Requests (Count)"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiName", var.api_gateway_name, "Stage", "prod"]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "API Gateway - 4XX & 5XX"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/ApiGateway", "4XXError", "ApiName", var.api_gateway_name, "Stage", "prod"],
            ["AWS/ApiGateway", "5XXError", "ApiName", var.api_gateway_name, "Stage", "prod"]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "API Gateway - Latency (p95)"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiName", var.api_gateway_name, "Stage", "prod", { "stat" : "p95" }]
          ]
          period = 300
        }
      },

      # =========================
      # DynamoDB - Capacity (URLs / Clicks / Trends)
      # =========================
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 8
        height = 6
        properties = {
          title  = "DynamoDB URLs - Consumed RCU/WCU"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", module.urls_table.name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", module.urls_table.name]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 12
        width  = 8
        height = 6
        properties = {
          title  = "DynamoDB Clicks - Consumed RCU/WCU"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", module.clicks_table.name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", module.clicks_table.name]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 12
        width  = 8
        height = 6
        properties = {
          title  = "DynamoDB Trends - Consumed RCU/WCU"
          region = data.aws_region.current.id
          view   = "timeSeries"
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", module.trends_table.name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", module.trends_table.name]
          ]
          stat   = "Sum"
          period = 300
        }
      },

      # =========================
      # API Gateway 5XX Error Rate % (Math on dashboard)
      # =========================
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway - 5XX Error Rate (%)"
          region = data.aws_region.current.id
          view   = "timeSeries"
          period = 300

          metrics = [
            [{ "expression" : "IF(m1>0,(m2/m1)*100,0)", "label" : "5XX Error Rate %", "id" : "e1" }],
            ["AWS/ApiGateway", "Count", "ApiName", var.api_gateway_name, "Stage", "prod", { "id" : "m1", "stat" : "Sum" }],
            ["AWS/ApiGateway", "5XXError", "ApiName", var.api_gateway_name, "Stage", "prod", { "id" : "m2", "stat" : "Sum" }]
          ]
        }
      },

      # =========================
      # Global Lambda Error Rate % (Math on dashboard)
      # =========================
      {
        type   = "metric"
        x      = 12
        y      = 18
        width  = 12
        height = 6
        properties = {
          title  = "Global Lambda - Error Rate (%)"
          region = data.aws_region.current.id
          view   = "timeSeries"
          period = 300

          metrics = [
            [{ "expression" : "IF(i1+i2+i3+i4>0, ((e1+e2+e3+e4)/(i1+i2+i3+i4))*100, 0)", "label" : "Lambda Error Rate %", "id" : "r" }],

            ["AWS/Lambda", "Invocations", "FunctionName", module.shorten_lambda.function_name, { "id" : "i1", "stat" : "Sum" }],
            ["AWS/Lambda", "Invocations", "FunctionName", module.redirect_lambda.function_name, { "id" : "i2", "stat" : "Sum" }],
            ["AWS/Lambda", "Invocations", "FunctionName", module.stats_lambda.function_name, { "id" : "i3", "stat" : "Sum" }],
            ["AWS/Lambda", "Invocations", "FunctionName", module.analyze_lambda.function_name, { "id" : "i4", "stat" : "Sum" }],

            ["AWS/Lambda", "Errors", "FunctionName", module.shorten_lambda.function_name, { "id" : "e1", "stat" : "Sum" }],
            ["AWS/Lambda", "Errors", "FunctionName", module.redirect_lambda.function_name, { "id" : "e2", "stat" : "Sum" }],
            ["AWS/Lambda", "Errors", "FunctionName", module.stats_lambda.function_name, { "id" : "e3", "stat" : "Sum" }],
            ["AWS/Lambda", "Errors", "FunctionName", module.analyze_lambda.function_name, { "id" : "e4", "stat" : "Sum" }]
          ]
        }
      },

      # =========================
      # Alarm Status 위젯
      # =========================
      {
        type   = "alarm"
        x      = 0
        y      = 24
        width  = 24
        height = 6
        properties = {
          title = "Alarm Status Overview"
          alarms = [
            aws_cloudwatch_metric_alarm.analyze_errors.arn,
            aws_cloudwatch_metric_alarm.analyze_duration_p95.arn,
            aws_cloudwatch_metric_alarm.lambda_global_error_rate.arn,
            aws_cloudwatch_metric_alarm.apigw_5xx_rate_5pct.arn
          ]
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "apigw_5xx_rate_5pct" {
  alarm_name        = "linkive-apigw-5xx-rate-5pct"
  alarm_description = "API Gateway 5XX error rate >= 5% (5XXError/Count*100) over 5 minutes"

  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 5
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "cnt"
    return_data = false
    metric {
      namespace   = "AWS/ApiGateway"
      metric_name = "Count"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiName = var.api_gateway_name
        Stage   = "prod"
      }
    }
  }

  metric_query {
    id          = "e5xx"
    return_data = false
    metric {
      namespace   = "AWS/ApiGateway"
      metric_name = "5XXError"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiName = var.api_gateway_name
        Stage   = "prod"
      }
    }
  }

  metric_query {
    id          = "rate"
    label       = "APIGW_5XX_ErrorRatePercent"
    return_data = true
    period      = 300
    expression  = "IF(cnt>0,(e5xx/cnt)*100,0)"
  }
}