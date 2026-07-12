# Cloudlet — Cloud-Based E-Learning Platform

A working implementation of **Option A** for the Cloud Computing group project: a scalable
e-learning platform with course delivery, enrollment, and online assessments, built as a
REST API + static frontend, deployable to AWS as a serverless function.

This satisfies **Part 5 (Cloud Programming Model)** by implementing a REST API deployed as
an AWS Lambda function behind API Gateway.

---

## 1. Architecture

```
Students/instructors
        |
        v
CloudFront CDN + Load Balancer  (caches static frontend + video, routes API calls)
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

- **Compute**: AWS Lambda running an Express app via `serverless-http`. Auto-scales
  by design — no configuration needed, which is your evidence for the "auto-scaling"
  rubric item.
- **Networking**: API Gateway (HTTP API) fronts Lambda; CloudFront/S3 fronts the static
  frontend. CORS is enabled on the API for cross-origin browser calls.
- **Storage**: S3 for video/course materials (object storage); DynamoDB for structured
  data (database service) — see `backend/data/store.js` for the swap-in code.
- **Database**: the code currently uses an in-memory store so it runs with zero setup;
  swap comments in `store.js` show exactly how to point it at real DynamoDB.
- **Security**: JWT-based auth, bcrypt password hashing, role-based access control
  (student vs instructor), least-privilege IAM role in `serverless.yml`.

## 2. What's implemented (maps to the rubric)

| Part | Where |
|---|---|
| Cloud Programming Model (REST API on Lambda) | `backend/` |
| Storage & Data Management (S3 + DynamoDB design) | `backend/data/store.js`, README swap notes |
| Security (JWT, bcrypt, IAM, RBAC) | `backend/middleware/auth.js`, `serverless.yml` |
| Testing & Evaluation (load test) | `backend/loadtest.js` |
| Frontend / live demo | `frontend/` |

## 3. Run it locally (2 minutes)

```bash
cd backend
npm install
cp .env.example .env
npm start
# API now running at http://localhost:4000
```

In another terminal, serve the frontend (any static server works):

```bash
cd frontend
npx serve .
# or: python3 -m http.server 5500
```

`frontend/config.js` already points at `http://localhost:4000` by default.

Demo login: **instructor@demo.edu / password123**, or register as a new student.

## 4. Deploy to AWS for real (for your live presentation)

### Backend — AWS Lambda via Serverless Framework

```bash
cd backend
npm install
npx serverless deploy --stage prod
```

This provisions:
- A Lambda function running your Express app
- An HTTP API Gateway (this gives you a public HTTPS URL — your live API)
- CloudWatch Logs automatically
- A scoped IAM execution role

Copy the endpoint URL it prints (looks like
`https://abc123.execute-api.us-east-1.amazonaws.com`).

**Requires:** an AWS account with credentials configured (`aws configure`), free-tier
eligible. If your group doesn't want to set up AWS credentials yet, see the free
alternative below.

### Frontend — any static host

1. Edit `frontend/config.js` and set `API_BASE_URL` to your deployed API URL.
2. Deploy the `frontend/` folder to any of:
   - **S3 + CloudFront** (matches the "real cloud platform" requirement most directly —
     create a bucket, enable static website hosting, upload the folder, put CloudFront
     in front of it)
   - **Netlify** or **Vercel** (drag-and-drop the folder — fastest path to a public URL,
     good if you're short on time before the deadline)

### Alternative: no AWS account yet?

If your group hasn't set up AWS/Azure/GCP credentials, you can still get a real public
URL today:
- Backend → [Render](https://render.com) free tier (`npm start` as the start command)
  or [Railway](https://railway.app)
- Frontend → [Netlify](https://netlify.com) or [Vercel](https://vercel.com) (drop the
  `frontend/` folder)

This gets you a genuinely live, testable system for the presentation while you set up
proper AWS in parallel for the "must use a real cloud platform" requirement.

## 5. Testing the deployment

```bash
cd backend
node loadtest.js https://your-deployed-url.com 200
```

This prints latency percentiles and a ready-to-paste paragraph for your Part 7 write-up.

Test endpoints manually with Postman/curl for your report screenshots:
```bash
curl https://your-deployed-url.com/api/health
curl https://your-deployed-url.com/api/courses
```

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
| GET | `/api/courses/:id/quiz/results` | any | Your past results |

## 7. Cost estimate (free-tier friendly)

| Service | Free tier | Est. monthly cost beyond free tier |
|---|---|---|
| Lambda | 1M requests/month free | ~$0.20 per additional 1M requests |
| API Gateway | 1M calls/month free (12 months) | ~$1.00 per additional 1M calls |
| DynamoDB | 25GB + 25 WCU/RCU free | ~$1.25/GB-month beyond free tier |
| S3 | 5GB free (12 months) | ~$0.023/GB-month |
| CloudFront | 1TB transfer free (12 months) | ~$0.085/GB beyond free tier |

For a class project demo (low traffic), this stays entirely within free-tier limits —
put this table in your Part 2 cost estimation section.
