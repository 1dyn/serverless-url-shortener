# Linkive

> Serverless URL Shortener & Analytics Platform

Linkive는 AWS 서버리스 아키텍처 기반의 URL 단축 및 클릭 분석 서비스입니다.  
단순 URL Shortener를 넘어, 클릭 데이터를 수집·분석하고 AI 기반 인사이트를 제공하는 분석형 링크 관리 플랫폼입니다.

---

## 🚀 Overview

사용자가 단축 URL로 접근하면:

1. API Gateway가 요청을 수신
2. Redirect Lambda가 실행
3. DynamoDB에서 원본 URL 조회
4. 301 Redirect 응답 반환
5. 클릭 로그 저장

이후 통계 및 AI 분석 API를 통해 링크 성과를 분석할 수 있습니다.

---

## 🏗 Architecture

- **API Gateway**
  - `POST /shorten` : 단축 URL 생성
  - `GET /{shortId}` : Redirect 처리
  - `GET /stats/{shortId}` : 클릭 통계 조회
  - `GET /analyze/{shortId}` : AI 기반 분석 (In Progress)

- **AWS Lambda (Python)**
  - shorten Lambda
  - redirect Lambda
  - stats Lambda
  - analyze Lambda (AI 기반 인사이트 분석)

- **Amazon DynamoDB**
  - `urls` 테이블: URL 메타데이터 저장
  - `clicks` 테이블: 클릭 로그 저장

- **Frontend**
  - 통계 대시보드 UI
  - 차트 기반 클릭 데이터 시각화
  - 분석 결과 표시 화면
  - API Gateway 연동

- **Terraform**
  - Lambda, API Gateway, DynamoDB, IAM 리소스 IaC 관리

- **CloudWatch Logs**
  - ACCESS / PERFORMANCE / ERROR 구조화 로그

---

## 🛠 Tech Stack

- AWS Lambda (Python 3.x)
- Amazon API Gateway
- Amazon DynamoDB
- AWS IAM
- Amazon CloudWatch Logs
- Terraform (Infrastructure as Code)
- Frontend Dashboard (Chart-based UI)
- AI Prompt Engineering (LLM 기반 분석 설계)

---

## 📊 Key Features

### 🔗 URL Shortening
- 고유 shortId 생성
- DynamoDB 기반 URL 매핑
- 301 Redirect 응답 처리

### 📈 Click Analytics
- 최근 7일 클릭 집계
- 시간대별 클릭 수 (`clicksByHour`)
- 일자별 클릭 수 (`clicksByDay`)
- 리퍼러별 분석 (`clicksByReferer`)
- 피크 시간대 및 주요 유입 도메인 분석

### 🤖 AI Insights (In Progress)
- 클릭 데이터 기반 분석 항목 설계
- 카테고리별 프롬프트 템플릿 구성
- 트래픽 패턴 및 유입 특성 분석
- 자동 인사이트 요약 생성

### 📊 Dashboard
- 통계 시각화 UI 구현
- 분석 결과 표시 영역 구성
- 프론트엔드 ↔ API Gateway 연동

---

## 🎯 Project Goals

- 서버리스 아키텍처 설계 및 구현 역량 강화
- DynamoDB 데이터 모델링 및 집계 전략 학습
- Lambda 기반 API 설계 및 성능 고려
- IaC(Terraform) 기반 인프라 자동화 경험
- 데이터 기반 기능 확장 구조 설계
- AI 분석 기능을 서버리스 환경에 통합하는 구조 설계