# JobPilot Relationships

## User

User
├── 1 → 1 Profile
├── 1 → N Resume
├── 1 → N Session
├── 1 → N Application
├── 1 → N BrowserSession
├── 1 → N Notification
└── 1 → N AuditLog

---

## Resume

Resume
├── N → 1 User
└── 1 → N ResumeVersion

---

## Company

Company
└── 1 → N Job

---

## ATSProvider

ATSProvider
└── 1 → N Job

---

## Job

Job
├── N → 1 Company
├── N → 1 ATSProvider
└── 1 → N Application

---

## Application

Application
├── N → 1 User
├── N → 1 Job
├── 1 → N ApplicationQuestion
├── 1 → N ApplicationAnswer
└── 1 → 1 Workflow

---

## Workflow

Workflow
├── 1 → 1 Application
└── 1 → N WorkflowStep

---

## BrowserSession

BrowserSession
└── N → 1 User

---

## Notification

Notification
└── N → 1 User

---

## Session

Session
└── N → 1 User

---

## AuditLog

AuditLog
└── N → 1 User