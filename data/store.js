/**
 * Data store abstraction.
 *
 * This uses an in-memory JS object so the API runs anywhere with zero setup
 * (great for local dev and demoing the API design/logic in Part 5).
 *
 * FOR THE ACTUAL CLOUD DEPLOYMENT (Part 4 - Cloud Storage & Data Management),
 * replace the functions below with calls to AWS DynamoDB using the AWS SDK.
 * The function signatures are already shaped like async DB calls, so swapping
 * the internals for real DynamoDB.DocumentClient calls does not require
 * touching any route file. Example DynamoDB version is sketched at the
 * bottom of this file in comments.
 */

const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');

const db = {
  users: new Map(),      // id -> { id, name, email, passwordHash, role }
  courses: new Map(),    // id -> { id, title, description, instructorId, videoUrl }
  enrollments: new Map(),// id -> { id, userId, courseId, enrolledAt }
  quizzes: new Map(),    // id -> { id, courseId, questions: [{id, text, options, correctIndex}] }
  submissions: new Map() // id -> { id, quizId, userId, score, total, submittedAt }
};

// ---- seed data so the API is demoable immediately ----
function seed() {
  const instructorId = uuid();
  db.users.set(instructorId, {
    id: instructorId,
    name: 'Dr. Amara Perera',
    email: 'instructor@demo.edu',
    passwordHash: bcrypt.hashSync('password123', 8),
    role: 'instructor'
  });

  const courseId = uuid();
  db.courses.set(courseId, {
    id: courseId,
    title: 'Introduction to Cloud Computing',
    description: 'Foundations of IaaS, PaaS, SaaS, and virtualization.',
    instructorId,
    videoUrl: 'https://your-bucket.s3.amazonaws.com/intro-cloud-computing.mp4'
  });

  const quizId = uuid();
  db.quizzes.set(quizId, {
    id: quizId,
    courseId,
    questions: [
      {
        id: uuid(),
        text: 'Which cloud service model gives you the most control over the OS?',
        options: ['SaaS', 'PaaS', 'IaaS', 'FaaS'],
        correctIndex: 2
      },
      {
        id: uuid(),
        text: 'What does "elasticity" mean in cloud computing?',
        options: [
          'Data is encrypted',
          'Resources scale automatically with demand',
          'Servers never fail',
          'Storage is unlimited and free'
        ],
        correctIndex: 1
      }
    ]
  });

  return { instructorId, courseId, quizId };
}

const seeded = seed();

module.exports = { db, seeded, uuid };

/*
------------------------------------------------------------------
DynamoDB swap-in reference (for your real cloud deployment):

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

async function getCourse(id) {
  const res = await dynamo.get({ TableName: 'Courses', Key: { id } }).promise();
  return res.Item;
}

async function putCourse(course) {
  await dynamo.put({ TableName: 'Courses', Item: course }).promise();
  return course;
}

Table design (Part 4 discussion point - single-table vs multi-table):
  Users        PK: id
  Courses      PK: id
  Enrollments  PK: id, GSI: userId-courseId-index
  Quizzes      PK: id, GSI: courseId-index
  Submissions  PK: id, GSI: userId-quizId-index
------------------------------------------------------------------
*/
