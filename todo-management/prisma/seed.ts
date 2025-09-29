import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/jwt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await hashPassword('Admin123!')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@todoapp.com' },
    update: {},
    create: {
      email: 'admin@todoapp.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN'
    }
  })

  // Create regular users
  const johnPassword = await hashPassword('User123!')
  const john = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: johnPassword,
      role: 'USER'
    }
  })

  const janePassword = await hashPassword('User123!')
  const jane = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: janePassword,
      role: 'USER'
    }
  })

  console.log('👥 Users created:', { admin: admin.id, john: john.id, jane: jane.id })

  // Create sample todos
  const todo1 = await prisma.todo.create({
    data: {
      title: 'Design new landing page',
      description: 'Create mockups and prototypes for the new company landing page',
      creatorId: admin.id,
      assigneeId: john.id,
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      position: 1
    }
  })

  const todo2 = await prisma.todo.create({
    data: {
      title: 'Review database schema',
      description: 'Review and optimize the current database schema for performance',
      creatorId: john.id,
      assigneeId: jane.id,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      position: 2
    }
  })

  const todo3 = await prisma.todo.create({
    data: {
      title: 'Update documentation',
      description: 'Update the API documentation with new endpoints',
      creatorId: jane.id,
      assigneeId: john.id,
      priority: 'LOW',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      position: 3
    }
  })

  const todo4 = await prisma.todo.create({
    data: {
      title: 'Fix critical bug in payment system',
      description: 'Investigate and fix the payment processing issue reported by users',
      creatorId: admin.id,
      assigneeId: jane.id,
      priority: 'URGENT',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      position: 4
    }
  })

  const completedTodo = await prisma.todo.create({
    data: {
      title: 'Setup CI/CD pipeline',
      description: 'Configure automated deployment pipeline',
      creatorId: john.id,
      assigneeId: jane.id,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      completedAt: new Date(),
      position: 5
    }
  })

  console.log('✅ Sample todos created:', {
    todo1: todo1.id,
    todo2: todo2.id,
    todo3: todo3.id,
    todo4: todo4.id,
    completedTodo: completedTodo.id
  })

  // Create sample notifications
  await prisma.notification.create({
    data: {
      title: 'New Todo Assigned',
      message: 'You have been assigned a new todo: "Design new landing page"',
      type: 'todo_assigned',
      userId: john.id,
      todoId: todo1.id,
      metadata: {
        creatorName: 'Admin User',
        todoTitle: 'Design new landing page'
      }
    }
  })

  await prisma.notification.create({
    data: {
      title: 'Todo Due Soon',
      message: 'Your todo "Fix critical bug in payment system" is due tomorrow',
      type: 'todo_due_soon',
      userId: jane.id,
      todoId: todo4.id,
      metadata: {
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  })

  console.log('🔔 Sample notifications created')
  console.log('✨ Database seed completed successfully!')
  
  console.log('\n📝 Test credentials:')
  console.log('Admin: admin@todoapp.com / Admin123!')
  console.log('User 1: john@example.com / User123!')
  console.log('User 2: jane@example.com / User123!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })