# ROLE

You are a Senior Software Architect, Technical Product Manager, and Staff Software Engineer.

Your task is NOT to build the software.

Your task is to create a comprehensive development roadmap in a file called:

DEVELOPMENT_PLAN.md

The roadmap will be the single source of truth for building the application from MVP to production.

Do not skip steps.

Think like an architect planning a commercial SaaS platform.

---

# PROJECT

Build a web-based Digital Assessment Platform that allows users to prepare for professional certification exams through realistic, timed, and AI-proctored practice examinations.

Examples include:

- AWS
- Microsoft
- Cisco
- CompTIA
- Google Cloud
- Oracle
- PMI
- ISC²

The system should have two major interfaces:

1. Administration Portal
2. Candidate Portal

The application should simulate real certification exams as closely as possible.

There is NO payment or subscription module.

---

# TECHNOLOGY STACK

Frontend
- Next.js
- React
- TypeScript
- TailwindCSS
- Shadcn/UI

Backend

Choose and justify ONE architecture.

Either:

Option A
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Redis
- Celery

OR

Option B

- NestJS
- PostgreSQL
- Prisma
- Redis
- BullMQ

Authentication

JWT

Role Based Access Control (RBAC)

Storage

AWS S3 compatible storage

Deployment

Docker

Docker Compose

GitHub Actions

Future Kubernetes ready

---

# WHAT TO PRODUCE

Create a DEVELOPMENT_PLAN.md.

The document must be extremely detailed.

It should contain phases.

Each phase should contain milestones.

Each milestone should contain tasks.

Each task should contain subtasks.

Each subtask should be small enough to be completed in one coding session.

Every task should have dependencies.

Every phase should have acceptance criteria.

---

# REQUIRED SECTIONS

The document should include:

## 1. Vision

## 2. Product Goals

## 3. Functional Scope

## 4. Non Functional Requirements

## 5. Architecture

Describe

Frontend

Backend

Database

Authentication

Storage

Caching

Logging

Monitoring

Deployment

CI/CD

Folder structure

Coding standards

Branching strategy

---

## 6. Database Design

Identify all entities.

Example

Users

Roles

Permissions

Organizations

Question Banks

Questions

Question Options

Question Categories

Exam Templates

Exam Sessions

Exam Attempts

Answers

Proctor Logs

Notifications

Audit Logs

System Settings

Generate an ERD description.

Do NOT generate SQL.

---

## 7. API Planning

List every endpoint grouped by module.

Authentication

Users

Admin

Questions

Exams

Proctoring

Reports

Analytics

Settings

For each endpoint specify:

Purpose

HTTP method

Authentication required

Request

Response

Validation

---

## 8. Frontend Planning

Describe every page.

Authentication

Dashboard

Question Management

Exam Player

Reports

Candidate Profile

Settings

For every page describe:

Purpose

Components

State

API calls

Navigation

Permissions

---

## 9. Admin Portal

Break down every feature.

Question Bank

Exam Builder

Candidate Management

Organization Management

Analytics

Reports

Audit Logs

System Configuration

---

## 10. Candidate Portal

Dashboard

Exam History

Mock Exams

Timed Exams

Results

Performance

Profile

Notifications

---

## 11. Exam Engine

Break this into detailed tasks.

Timer

Randomization

Navigation

Autosave

Review Screen

Submission

Scoring

Passing Logic

Exam Resume

Question Flagging

Keyboard Shortcuts

Accessibility

---

## 12. AI Proctoring

Create a roadmap only.

Do not implement AI.

Describe phases.

Identity verification

Webcam

Face detection

Face tracking

Multiple faces

Tab switching

Fullscreen

Microphone

Risk scoring

Violation logs

Admin review

Future ML improvements

---

## 13. Reporting

Candidate reports

Organization reports

Question analytics

System analytics

Export options

---

## 14. Security

Authentication

Authorization

Rate limiting

CSRF

XSS

SQL Injection

Logging

Encryption

Secrets management

Audit logs

---

## 15. Testing Strategy

Unit tests

Integration tests

E2E tests

Performance testing

Security testing

Accessibility testing

---

## 16. DevOps

Environment setup

Docker

CI/CD

Deployment

Versioning

Backups

Monitoring

Logging

Disaster recovery

---

## 17. Coding Standards

Naming

Folder structure

Architecture

Design patterns

Error handling

Logging

Validation

Documentation

---

## 18. Phase-by-Phase Development Roadmap

Break the project into phases.

Example

Phase 1

Project Setup

Phase 2

Authentication

Phase 3

Admin Dashboard

Phase 4

Candidate Dashboard

Phase 5

Question Management

Phase 6

Exam Engine

Phase 7

Reporting

Phase 8

Proctoring

Phase 9

Testing

Phase 10

Deployment

Each phase must contain

Objectives

Deliverables

Tasks

Dependencies

Acceptance Criteria

Estimated Complexity

Estimated Duration

---

## 19. Sprint Plan

Convert phases into agile sprints.

Each sprint should be one week.

For each sprint include:

Goals

Stories

Tasks

Definition of Done

Risks

---

## 20. Future Enhancements

Adaptive testing

AI generated questions

Flashcards

Study planner

Learning paths

Discussion forums

Institution branding

LMS integrations

Native mobile apps

Offline support

---

# IMPORTANT

The roadmap should assume multiple developers will work on the project.

The document should be suitable for GitHub Projects or Jira.

Every feature should be decomposed into actionable engineering tasks.

Avoid vague statements like "Build authentication."

Instead write detailed implementation tasks.

The roadmap should be implementation-ready.

Output only the complete DEVELOPMENT_PLAN.md in Markdown.