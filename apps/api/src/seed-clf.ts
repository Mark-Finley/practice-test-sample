import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not defined!');
    process.exit(1);
  }

  console.log('Initializing database connection pool...');
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Registering AWS Certified Cloud Practitioner (CLF-C02) Question Bank...');
    
    // Find or create the target SAA/CLF Question Bank
    const clfBank = await prisma.questionBank.upsert({
      where: { name: 'AWS Certified Cloud Practitioner (CLF-C02)' },
      update: {},
      create: {
        name: 'AWS Certified Cloud Practitioner (CLF-C02)',
        description: 'Comprehensive practice question set aligned with the CLF-C02 exam guide domains.',
      },
    });

    console.log('Registering Category Domains...');
    const domains = [
      { name: 'Cloud Concepts', description: 'AWS Cloud value proposition, cloud economics, and design principles.' },
      { name: 'Security and Compliance', description: 'AWS Shared Responsibility Model, IAM settings, and compliance resources.' },
      { name: 'Technology', description: 'Core AWS services, global infrastructure components, and developer tools.' },
      { name: 'Billing and Pricing', description: 'AWS Support plans, pricing tools, and consolidated billing models.' },
    ];

    const categories: Record<string, any> = {};
    for (const d of domains) {
      const category = await prisma.questionCategory.upsert({
        where: { name: d.name },
        update: {},
        create: d,
      });
      categories[d.name] = category;
    }

    console.log('Seeding exam practice questions...');

    const questionsData = [
      {
        text: 'Which of the following are benefits of migrating to the AWS Cloud? (Choose two.)',
        explanation: 'Operational resilience and business agility are two core benefits of the AWS Cloud value proposition.',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        categoryName: 'Cloud Concepts',
        options: [
          { text: 'Operational resilience', isCorrect: true },
          { text: 'Discounts for products on Amazon.com', isCorrect: false },
          { text: 'Business agility', isCorrect: true },
          { text: 'Business excellence', isCorrect: false },
          { text: 'Increased staff retention', isCorrect: false },
        ],
      },
      {
        text: 'A company is planning to replace its physical on-premises compute servers with AWS serverless compute services. The company wants to be able to take advantage of advanced technologies quickly after the migration. Which pillar of the AWS Well-Architected Framework does this plan represent?',
        explanation: 'Performance Efficiency is focused on using serverless resources and selecting the most appropriate technologies to maintain efficiency.',
        difficulty: 'MEDIUM',
        type: 'SINGLE_CHOICE',
        categoryName: 'Cloud Concepts',
        options: [
          { text: 'Security', isCorrect: false },
          { text: 'Performance efficiency', isCorrect: true },
          { text: 'Operational excellence', isCorrect: false },
          { text: 'Reliability', isCorrect: false },
        ],
      },
      {
        text: 'A company is planning to run a global marketing application in the AWS Cloud. The application will feature videos that can be viewed by users. The company must ensure that all users can view these videos with low latency. Which AWS service should the company use to meet this requirement?',
        explanation: 'Amazon CloudFront is a fast content delivery network (CDN) service that securely delivers data, videos, applications, and APIs to customers globally with low latency.',
        difficulty: 'EASY',
        type: 'SINGLE_CHOICE',
        categoryName: 'Technology',
        options: [
          { text: 'AWS Auto Scaling', isCorrect: false },
          { text: 'Amazon Kinesis Video Streams', isCorrect: false },
          { text: 'Elastic Load Balancing', isCorrect: false },
          { text: 'Amazon CloudFront', isCorrect: true },
        ],
      },
      {
        text: 'Which component of the AWS global infrastructure is made up of one or more discrete redundant power, networking, and connectivity?',
        explanation: 'An Availability Zone (AZ) consists of one or more discrete data centers with redundant power, networking, and connectivity in an AWS Region.',
        difficulty: 'EASY',
        type: 'SINGLE_CHOICE',
        categoryName: 'Cloud Concepts',
        options: [
          { text: 'AWS Region', isCorrect: false },
          { text: 'Availability Zone', isCorrect: true },
          { text: 'Edge location', isCorrect: false },
          { text: 'AWS Outposts', isCorrect: false },
        ],
      },
      {
        text: 'Which pillar of the AWS Well-Architected Framework refers to the ability of a system to recover from infrastructure or service disruptions and dynamically acquire computing resources to meet demand?',
        explanation: 'Reliability pillar focuses on the ability to prevent and quickly recover from failures to meet business and customer demand.',
        difficulty: 'EASY',
        type: 'SINGLE_CHOICE',
        categoryName: 'Cloud Concepts',
        options: [
          { text: 'Security', isCorrect: false },
          { text: 'Reliability', isCorrect: true },
          { text: 'Performance efficiency', isCorrect: false },
          { text: 'Cost optimization', isCorrect: false },
        ],
      },
      {
        text: 'Who is responsible for configuration management under the AWS shared responsibility model?',
        explanation: 'Configuration management is a shared control under the Shared Responsibility Model. AWS maintains configuration of infrastructure devices, while the customer configures guest OS, databases, and applications.',
        difficulty: 'MEDIUM',
        type: 'SINGLE_CHOICE',
        categoryName: 'Security and Compliance',
        options: [
          { text: 'It is solely the responsibility of the customer.', isCorrect: false },
          { text: 'It is solely the responsibility of AWS.', isCorrect: false },
          { text: 'It is shared between AWS and the customer.', isCorrect: true },
          { text: 'It is not part of the AWS shared responsibility model.', isCorrect: false },
        ],
      },
      {
        text: 'Which duties are the responsibility of a company that is using AWS Lambda? (Choose two.)',
        explanation: 'Under the Shared Responsibility Model for serverless resources like Lambda, customers are responsible for their own code safety and writing/updating applications.',
        difficulty: 'MEDIUM',
        type: 'MULTIPLE_CHOICE',
        categoryName: 'Security and Compliance',
        options: [
          { text: 'Security inside of code', isCorrect: true },
          { text: 'Selection of CPU resources', isCorrect: false },
          { text: 'Patching of operating system', isCorrect: false },
          { text: 'Writing and updating of code', isCorrect: true },
          { text: 'Security of underlying infrastructure', isCorrect: false },
        ],
      },
      {
        text: 'Which compute hosting model should be accounted for in the Total Cost of Ownership (TCO) when undertaking a cost analysis that allows physical isolation of a customer workload?',
        explanation: 'An Amazon EC2 Dedicated Host is a physical server with EC2 instance capacity fully dedicated to your use, providing physical isolation.',
        difficulty: 'MEDIUM',
        type: 'SINGLE_CHOICE',
        categoryName: 'Billing and Pricing',
        options: [
          { text: 'Dedicated Hosts', isCorrect: true },
          { text: 'Reserved Instances', isCorrect: false },
          { text: 'On-Demand Instances', isCorrect: false },
          { text: 'No Upfront Reserved Instances', isCorrect: false },
        ],
      },
      {
        text: 'Who is accountable for security and compliance under the AWS shared responsibility model?',
        explanation: 'Security and Compliance is a shared responsibility between AWS and the customer.',
        difficulty: 'EASY',
        type: 'SINGLE_CHOICE',
        categoryName: 'Security and Compliance',
        options: [
          { text: 'The customer is responsible.', isCorrect: false },
          { text: 'AWS is responsible.', isCorrect: false },
          { text: 'AWS and the customer share responsibility.', isCorrect: true },
          { text: 'AWS shares responsibility with the relevant governing body.', isCorrect: false },
        ],
      },
      {
        text: 'Which of the following is a critical design concept for architecting cloud applications?',
        explanation: 'Implementing elasticity allows compute resources to automatically scale out or in based on dynamic usage load patterns.',
        difficulty: 'EASY',
        type: 'SINGLE_CHOICE',
        categoryName: 'Cloud Concepts',
        options: [
          { text: 'Use the largest instance possible', isCorrect: false },
          { text: 'Provision capacity for peak load', isCorrect: false },
          { text: 'Use the Scrum development process', isCorrect: false },
          { text: 'Implement elasticity', isCorrect: true },
        ],
      },
    ];

    for (const q of questionsData) {
      const cat = categories[q.categoryName];
      
      // Check if question exists in this bank
      const existing = await prisma.question.findFirst({
        where: {
          text: q.text,
          bankId: clfBank.id,
        },
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            bankId: clfBank.id,
            categoryId: cat.id,
            text: q.text,
            explanation: q.explanation,
            difficulty: q.difficulty,
            type: q.type,
            options: {
              create: q.options.map(opt => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          },
        });
      }
    }

    console.log('Seeded AWS Certified Cloud Practitioner questions successfully finished!');
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
