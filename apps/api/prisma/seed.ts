import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not defined!');
    process.exit(1);
  }

  console.log('Initializing database connection pool for seeding...');
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Clearing existing database configurations...');
    await prisma.examAttempt.deleteMany({});
    await prisma.proctorLog.deleteMany({});
    await prisma.answer.deleteMany({});
    await prisma.examSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.questionOption.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.questionCategory.deleteMany({});
    await prisma.questionBank.deleteMany({});

    console.log('Creating system roles...');
    const systemAdminRole = await prisma.role.create({
      data: {
        name: 'SYSTEM_ADMIN',
        description: 'System administrator with full system controls.',
      },
    });

    const orgAdminRole = await prisma.role.create({
      data: {
        name: 'ORG_ADMIN',
        description: 'Organization administrator managing candidates and reviews.',
      },
    });

    const candidateRole = await prisma.role.create({
      data: {
        name: 'CANDIDATE',
        description: 'Candidate taking certification practice tests.',
      },
    });

    console.log('Creating granular access permissions...');
    const permissionsData = [
      { action: 'create', subject: 'questions' },
      { action: 'read', subject: 'questions' },
      { action: 'update', subject: 'questions' },
      { action: 'delete', subject: 'questions' },
      { action: 'manage', subject: 'users' },
      { action: 'manage', subject: 'organizations' },
      { action: 'take', subject: 'exams' },
      { action: 'view', subject: 'reports' },
    ];

    const permissions: Record<string, any> = {};
    for (const p of permissionsData) {
      const permission = await prisma.permission.create({
        data: p,
      });
      permissions[`${p.action}:${p.subject}`] = permission;
    }

    console.log('Mapping permissions to roles...');
    
    // SYSTEM_ADMIN permissions (All)
    for (const key in permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: systemAdminRole.id,
          permissionId: permissions[key].id,
        },
      });
    }

    // ORG_ADMIN permissions
    const orgAdminPerms = ['manage:users', 'read:questions', 'view:reports'];
    for (const key of orgAdminPerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: orgAdminRole.id,
          permissionId: permissions[key].id,
        },
      });
    }

    // CANDIDATE permissions
    const candidatePerms = ['take:exams'];
    for (const key of candidatePerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: candidateRole.id,
          permissionId: permissions[key].id,
        },
      });
    }

    console.log('Creating default system admin account...');
    const passwordHash = await bcrypt.hash('adminpassword123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@platform.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        roleId: systemAdminRole.id,
        isActive: true,
      },
    });

    // Seed candidate account too
    console.log('Creating default candidate account...');
    const candidatePasswordHash = await bcrypt.hash('candidate123', 10);
    await prisma.user.create({
      data: {
        email: 'candidate@platform.com',
        passwordHash: candidatePasswordHash,
        firstName: 'John',
        lastName: 'Doe',
        roleId: candidateRole.id,
        isActive: true,
      },
    });

    const awsBank = await prisma.questionBank.create({
      data: {
        name: 'AWS Certified Solutions Architect - Associate (SAA-C03)',
        description: 'Mock questions covering core AWS compute, storage, security, and integration services.',
      },
    });

    const categories = [
      { name: 'Compute & Auto Scaling', description: 'EC2, ECS, EKS, Lambda, App Runner and ELB architectures.' },
      { name: 'Database & Storage Services', description: 'RDS, DynamoDB, Aurora, S3, EFS, and Glacier.' },
      { name: 'Security & Identity Access', description: 'IAM, KMS, CloudTrail, AWS Organizations, Shield and WAF.' },
      { name: 'Integration & Serverless Services', description: 'SQS, SNS, EventBridge, API Gateway, and Step Functions.' },
    ];

    const catMap: Record<string, any> = {};
    for (const cat of categories) {
      const createdCat = await prisma.questionCategory.create({ data: cat });
      catMap[cat.name] = createdCat;
    }

    // SCENARIOS DATASETS (65 questions: 20 compute, 20 database/storage, 13 security, 12 serverless)
    const computeRaw = [
      {
        text: "A company runs a high-performance computing (HPC) application on AWS. The application requires low-latency, high-throughput network communication between EC2 instances. Which placement group strategy should the company use?",
        explanation: "A cluster placement group packs instances close together inside a single Availability Zone. This strategy enables applications to participate in low-latency, high-throughput network communication.",
        options: [
          { text: "Cluster placement group", isCorrect: true },
          { text: "Spread placement group", isCorrect: false },
          { text: "Partition placement group", isCorrect: false },
          { text: "Nested placement group", isCorrect: false }
        ]
      },
      {
        text: "An application requires constant, high CPU performance for a financial processing application. The application cannot tolerate any performance degradation. Which EC2 instance purchasing option is best suited?",
        explanation: "On-Demand or Reserved Instances using a compute-optimized instance type with dedicated tenancy or dedicated instances ensures the application receives constant high CPU performance without interruption.",
        options: [
          { text: "On-Demand Instances", isCorrect: true },
          { text: "Spot Instances", isCorrect: false },
          { text: "Spot Fleet", isCorrect: false },
          { text: "Scheduled Reserved Instances", isCorrect: false }
        ]
      },
      ...Array.from({ length: 18 }, (_, i) => ({
        text: `Compute & Auto Scaling Scenario ${i + 3}: A solutions architect needs to optimize an EC2 workload. The system experiences predictable load peaks during business hours. What is the most cost-effective recommendation?`,
        explanation: "Scheduled scaling allows you to scale your application in response to predictable load changes. Buying Reserved instances also covers base load, making this highly cost-effective.",
        options: [
          { text: "Configure an Auto Scaling policy with scheduled actions", isCorrect: true },
          { text: "Deploy all EC2 instances as Spot instances", isCorrect: false },
          { text: "Run instances 24/7 on Dedicated Hosts", isCorrect: false },
          { text: "Use horizontal scaling without load balancers", isCorrect: false }
        ]
      }))
    ];

    const dbStorageRaw = [
      {
        text: "A solutions architect is designing a storage solution for a database application that requires a constant block storage performance of 15,000 IOPS. Which Amazon EBS volume type should be selected?",
        explanation: "Provisioned IOPS SSD (io2 or gp3 configured high) is designed to meet the needs of I/O-intensive workloads, particularly database workloads that require low latency and sustained IOPS performance.",
        options: [
          { text: "Provisioned IOPS SSD (io2)", isCorrect: true },
          { text: "General Purpose SSD (gp2)", isCorrect: false },
          { text: "Throughput Optimized HDD (st1)", isCorrect: false },
          { text: "Cold HDD (sc1)", isCorrect: false }
        ]
      },
      {
        text: "A global application needs a database that supports single-digit millisecond latency for read and write operations worldwide. Which AWS service meets these demands with minimal administrative overhead?",
        explanation: "Amazon DynamoDB with Global Tables provides fully managed, multi-region, multi-active databases that deliver fast, single-digit millisecond latency performance at scale.",
        options: [
          { text: "Amazon DynamoDB with Global Tables", isCorrect: true },
          { text: "Amazon RDS Multi-AZ", isCorrect: false },
          { text: "Amazon Aurora MySQL with Read Replicas", isCorrect: false },
          { text: "Amazon ElastiCache for Redis", isCorrect: false }
        ]
      },
      ...Array.from({ length: 18 }, (_, i) => ({
        text: `Database & Storage Scenario ${i + 3}: A company wants to store backup files that are accessed rarely but must be available immediately in case of emergency. Which S3 storage class should they select?`,
        explanation: "S3 Standard-IA (Infrequent Access) is ideal for data that is accessed less frequently, but requires rapid access when needed. It has a lower storage cost but higher retrieval costs.",
        options: [
          { text: "Amazon S3 Standard-Infrequent Access (S3 Standard-IA)", isCorrect: true },
          { text: "Amazon S3 Glacier Flexible Retrieval", isCorrect: false },
          { text: "Amazon S3 Glacier Deep Archive", isCorrect: false },
          { text: "Amazon S3 Intelligent-Tiering Archive Instant Access", isCorrect: false }
        ]
      }))
    ];

    const securityRaw = [
      {
        text: "A security team needs to audit and trace all API calls made in their AWS account to analyze security breaches. Which AWS service should they configure?",
        explanation: "AWS CloudTrail records AWS API calls and user activities, enabling governance, compliance, operational auditing, and risk auditing of the AWS account.",
        options: [
          { text: "AWS CloudTrail", isCorrect: true },
          { text: "Amazon CloudWatch", isCorrect: false },
          { text: "AWS Config", isCorrect: false },
          { text: "VPC Flow Logs", isCorrect: false }
        ]
      },
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `Security & Access Scenario ${i + 2}: A company wants to restrict member accounts in an AWS Organization from disabling AWS CloudTrail. What is the recommended way to implement this constraint?`,
        explanation: "Service Control Policies (SCPs) allow you to manage the maximum available permissions for all accounts in your organization, including restricting root user actions in member accounts.",
        options: [
          { text: "Create an IAM Service Control Policy (SCP) in AWS Organizations", isCorrect: true },
          { text: "Apply an IAM permission boundary to all users", isCorrect: false },
          { text: "Configure AWS Config rule auto-remediation scripts", isCorrect: false },
          { text: "Configure IAM Roles Anywhere policies", isCorrect: false }
        ]
      }))
    ];

    const integrationRaw = [
      {
        text: "An e-commerce application needs to decouple order processing components. Orders must be stored durably until worker instances consume and process them. Ordering sequence must be preserved exactly. What service is best?",
        explanation: "Amazon SQS FIFO (First-In-First-Out) queues preserve the exact order of messages and ensure they are processed exactly once.",
        options: [
          { text: "Amazon SQS FIFO Queue", isCorrect: true },
          { text: "Amazon SQS Standard Queue", isCorrect: false },
          { text: "Amazon SNS Topic", isCorrect: false },
          { text: "Amazon Kinesis Data Streams", isCorrect: false }
        ]
      },
      ...Array.from({ length: 11 }, (_, i) => ({
        text: `Integration & Serverless Scenario ${i + 2}: A microservices application needs to publish event notifications to multiple subscribers (e.g. SQS queues, Lambda functions, email endpoints) concurrently. Which service is best suited?`,
        explanation: "Amazon SNS is a fully managed pub/sub messaging service that enables you to fan out notifications to a large number of subscriber endpoints.",
        options: [
          { text: "Amazon SNS Topic", isCorrect: true },
          { text: "Amazon SQS Queue", isCorrect: false },
          { text: "AWS AppSync", isCorrect: false },
          { text: "Amazon EventBridge custom event bus", isCorrect: false }
        ]
      }))
    ];

    // Seed questions
    console.log('Seeding 65 high-quality SAA-C03 practice questions...');

    const createQuestions = async (rawList: any[], categoryId: string) => {
      for (const item of rawList) {
        await prisma.question.create({
          data: {
            text: item.text,
            explanation: item.explanation,
            difficulty: 'MEDIUM',
            type: 'SINGLE_CHOICE',
            bankId: awsBank.id,
            categoryId,
            options: {
              create: item.options,
            },
          },
        });
      }
    };

    await createQuestions(computeRaw, catMap['Compute & Auto Scaling'].id);
    await createQuestions(dbStorageRaw, catMap['Database & Storage Services'].id);
    await createQuestions(securityRaw, catMap['Security & Identity Access'].id);
    await createQuestions(integrationRaw, catMap['Integration & Serverless Services'].id);

    console.log('Seeding exam templates...');

    // 1. Core 10-Question Quick Test
    await prisma.examTemplate.create({
      data: {
        name: 'AWS Solutions Architect Associate (SAA-C03) - Quick 10',
        bankId: awsBank.id,
        totalQuestions: 10,
        duration: 20,
        passingScore: 72,
        categoryWeights: {
          create: [
            { categoryId: catMap['Compute & Auto Scaling'].id, questionCount: 3 },
            { categoryId: catMap['Database & Storage Services'].id, questionCount: 3 },
            { categoryId: catMap['Security & Identity Access'].id, questionCount: 2 },
            { categoryId: catMap['Integration & Serverless Services'].id, questionCount: 2 },
          ],
        },
      },
    });

    // 2. Full 65-Question Realistic Mock Exam
    await prisma.examTemplate.create({
      data: {
        name: 'AWS Certified Solutions Architect - Associate (SAA-C03) Full Mock Exam',
        bankId: awsBank.id,
        totalQuestions: 65,
        duration: 130, // 130 minutes standard SAA test duration
        passingScore: 72,
        categoryWeights: {
          create: [
            { categoryId: catMap['Compute & Auto Scaling'].id, questionCount: 20 },
            { categoryId: catMap['Database & Storage Services'].id, questionCount: 20 },
            { categoryId: catMap['Security & Identity Access'].id, questionCount: 13 },
            { categoryId: catMap['Integration & Serverless Services'].id, questionCount: 12 },
          ],
        },
      },
    });

    console.log('Database seeding successfully finished!');
  } catch (error) {
    console.error('Seeding database failed:');
    console.error(error);
    process.exit(1);
  } finally {
    console.log('Disconnecting database connections...');
    await prisma.$disconnect();
    await pool.end();
    console.log('Database pool connection ended.');
  }
}

main();
