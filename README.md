# Cloudlet — Cloud-Based E-Learning Platform

**Design, Implementation and Evaluation of a Cloud-Based Scalable Application**
Module: Cloud Computing — Group Project | KIU
Project Scenario: **Option A — Cloud-Based E-Learning Platform**

A working cloud-native e-learning platform with course delivery, enrollment, and online
assessments — implemented as a REST API + static frontend, architected for AWS serverless
deployment (Lambda, API Gateway, DynamoDB, S3), and live-deployed on free-tier hosting
for demonstration.

**Live API:** `<paste your Railway URL here>`
**Live site:** `<paste your Netlify URL here>`

---

## Group Members

| Name | ID | Role |
|---|---|---|
| M.M.F. Thahzeen | 11485 | Frontend Developer, QA/Testing & Report Lead — owns `frontend/`, Postman testing, `loadtest.js`, system limitations, and final report compilation (Parts 1, 5 testing evidence, 7) |
| K.M. Asam | 11131 | Cloud Infrastructure & DevOps Lead — owns AWS design, `serverless.yml`, deployment (Lambda, API Gateway, DynamoDB, S3), IAM roles, cost/monitoring (Parts 2, 3, 6) |
| J.A. Ahamed | 11526 | Backend/API Developer — owns the Express REST API, auth, routes, business logic (`backend/routes/`, `middleware/`) (Part 5) |
| M.A.A. Banu | 11258 | Data & Storage Engineer — owns DynamoDB table design, video storage/lifecycle policy, CAP theorem/durability write-up (Part 4) |

---

## 1. Architecture

The system is **designed** around a full AWS serverless architecture (see `backend/serverless.yml`
and the report's Part 2 for the complete design, cost estimate, and justification):

```
Students/instructors
        |
        v
CloudFront CDN + API Gateway  (HTTPS, request routing)
        |
        v
   VPC ---------------------------------------------
   |  REST API (Lambda, auto-scales automatically)  |
   |  Cognito/IAM (auth, role-based access)          |
   ---------------------------------------------------
        |                              |
        v                              v
   DynamoDB                        S3 object storage
   (users, courses,                (course videos,
    quiz results)                   materials)
        |                              |
        -------------------------------
                     |
                     v
       CloudWatch + automated backups
       (monitoring, alarms, disaster recovery)
```

**For the live demo specifically**, the team deployed on free-tier equivalents that require no
payment card, while keeping the AWS-targeted code (`serverless.yml`, `lambda.js`) intact and
deployable to real AWS at any time:

| Layer | Designed for (AWS) | Live demo uses |
|---|---|---|
| Compute | AWS Lambda + API Gateway | Railway (Node.js web service) |
| Frontend hosting | S3 + CloudFront | Netlify |
| Video storage | S3 (presigned URLs) | Cloudinary (signed uploads) |
| Database | DynamoDB | In-memory store (see `DYNAMODB_MIGRATION.md` for the swap-in path) |

This split is intentional and documented: AWS requires card verification even on its free tier,
so the team used card-free equivalents for the live presentation URL while the actual AWS
deployment path (`npx serverless deploy`) remains fully implemented and ready to run.

---

## 2. What's implemented (maps to the rubric)

| Part | Where |
|---|---|
| Cloud Conceptual Analysis | Full report, Section 1 |
| Infrastructure Design + cost table | `backend/serverless.yml`, report Section 2 |
| Virtualization (Lambda/Firecracker, SDN, SDS) | report Section 3 |
| Cloud Programming Model (REST API on Lambda) | `backend/` |
| Storage & Data Management (S3/DynamoDB design) | `backend/data/store.js`, `dynamoStore.js`, report Section 4 |
| Security (JWT, bcrypt, IAM, RBAC) | `backend/middleware/auth.js`, `serverless.yml` |
| Testing & Evaluation (load test) | `backend/loadtest.js` |
| Frontend / live demo | `frontend/` |

---

## 3. Run it locally

```bash
cd backend
npm install
cp .env.example .env
npm start
# API running at http://localhost:4000
```

In another terminal:
```bash
cd frontend
npx serve .
```

`frontend/config.js` points at `http://localhost:4000` by default.

Demo login: **instructor@demo.edu / password123**, or register as a new student.

---

## 4. Deployment

### Live demo (current) — no card required

**Backend → Railway**
1. Connect this GitHub repo to Railway
2. Set **Root Directory** to `backend`
3. Build command: `npm install` · Start command: `npm start`
4. Environment variables required:
   ```
   JWT_SECRET=<any random string>
   CLOUDINARY_CLOUD_NAME=<from cloudinary.com dashboard>
   CLOUDINARY_API_KEY=<from cloudinary.com dashboard>
   CLOUDINARY_API_SECRET=<from cloudinary.com dashboard>
   ```
5. Generate a public domain under **Settings → Networking**

**Frontend → Netlify**
1. Set `API_BASE_URL` in `frontend/config.js` to your Railway URL
2. Drag the `frontend/` folder into Netlify's dashboard, or connect the GitHub repo

**Video storage → Cloudinary** (free, no card)
Sign up at [cloudinary.com](https://cloudinary.com), copy the three credentials into Railway's
environment variables above. See `backend/data/cloudinaryStorage.js`.

### Full AWS deployment (as designed in the report)

```bash
cd backend
npm install
npx serverless deploy --stage prod
```
Provisions Lambda, API Gateway, 5 DynamoDB tables, and an S3 bucket in one command — see
report Section 2 and 5 for full justification. Requires an AWS account (card verification
required by AWS, refunded $1 hold — see report Section 1.2 for the cost/risk discussion).

To point the app at real DynamoDB instead of the in-memory store, follow
`backend/DYNAMODB_MIGRATION.md`.

---

## 5. Testing the deployment

```bash
cd backend
node loadtest.js https://your-live-url.com 200
```
Prints latency percentiles and a paste-ready paragraph for the report's Part 7.

```bash
curl https://your-live-url.com/api/health
curl https://your-live-url.com/api/courses
```

---

## 6. API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT |
| GET | `/api/courses` | — | List courses |
| POST | `/api/courses` | instructor | Create course |
| POST | `/api/courses/:id/enroll` | student | Enroll |
| GET | `/api/courses/:id/quiz` | any | Fetch quiz (answers hidden) |
| POST | `/api/courses/:id/quiz` | instructor | Create quiz |
| POST | `/api/courses/:id/quiz/submit` | any | Submit answers, get score |
| POST | `/api/courses/:id/upload-url` | instructor | Get a signed Cloudinary upload |
| PUT | `/api/courses/:id/video` | instructor | Save the uploaded video URL |
| GET | `/api/courses/:id/video-url` | any | Get the stored video URL |

---

## 7. Cost estimate (AWS, free-tier friendly)

| Service | Free tier | Est. cost beyond free tier |
|---|---|---|
| Lambda | 1M requests/month, always free | ~$0.20 per additional 1M requests |
| API Gateway | 1M calls/month (12 months) | ~$1.00 per additional 1M calls |
| DynamoDB | 25GB + 25 WCU/RCU, always free | ~$1.25/GB-month beyond free tier |
| S3 | 5GB (12 months) | ~$0.023/GB-month |
| CloudFront | 1TB transfer (12 months) | ~$0.085/GB beyond free tier |

At this project's traffic level, the AWS path runs at **$0.00/month**. See the full report,
Section 2.8, for details.

---

## 8. Known limitations

See the report's Section 7.2 for the full list. In short: data is in-memory (not yet migrated
to DynamoDB), no CI/CD pipeline, no CloudWatch Alarms configured, and video is served as
uploaded without transcoding.
