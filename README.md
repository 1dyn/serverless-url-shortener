# Serverless URL Shortener

사용자는 짧은 URL로 접근하면 API Gateway가 요청을 받아 redirect Lambda를 호출하고,
Lambda는 DynamoDB에서 원본 URL을 조회한 뒤 301 Redirect 응답을 반환합니다.

## Tech Stack
- AWS Lambda (Python)
- Amazon DynamoDB
- AWS IAM
- Amazon CloudWatch Logs

## Current Status
- URL 단축 Lambda 함수 구현 및 콘솔 테스트 완료
- DynamoDB 연동 및 데이터 저장 검증
- IAM Role 및 최소 권한 정책 구성
- CloudWatch 로그 정상 출력 확인

## Planned
- Redirect Lambda 구현
- API Gateway 연동
- AWS SAM / Terraform 기반 IaC 전환
- 클릭 통계 및 트렌드 기능 추가
