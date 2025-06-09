# API Testing Guide

This document provides `curl` commands to test API endpoints in **Command Prompt**.

## Prerequisites
- Ensure `curl.exe` is available on your system (`curl --version` to check).
- The server should be running at `http://localhost:3000`.

## Test Endpoints

### 1. Generate Questions
Retrieves questions based on the selected note and difficulty level.

```powershell
curl.exe -X GET "http://localhost:3000/.netlify/functions/generate-questions?noteId=lms15jned&difficulty=easy"
```

### 2. Submit Review Answers
Sends learner answers for review.

```powershell
curl -X POST "http://localhost:3000/.netlify/functions/review-answers" -H "Content-Type: application/json" --data @review_answers_body.json
```

