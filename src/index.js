const { GraphQLServer } = require('graphql-yoga')
const { Prisma } = require('prisma-binding')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Context, getUserId, APP_SECRET } = require('./utils')

const resolvers = {
  Query: {
    me: (parent, args, context, info) => {
      const id = getUserId(context)
      return context.booben.query.user({ where: { id } }, info)
    },
    tasks: (_, args, context, info) => {
      const userId = getUserId(context)

      if (userId) {
        return context.booben.query.tasks(
          {
            where: {
              text_contains: args.searchString,
              author: {
                id: userId,
              }
            },
          },
          info,
        )
      }

      throw new Error(
        'Invalid permissions, you must be authenticated',
      )
    },
    Task: async (_, { id }, context, info) => {
      const userId = getUserId(context)

      const requestingUserIsAuthor = await context.booben.exists.Task({
        id,
        author: {
          id: userId,
        },
      })
      
      if (requestingUserIsAuthor) {
        return context.booben.query.task(
          {
            where: {
              id
            },
          },
          info,
        )
      }

      throw new Error(
        'Invalid permissions, you must be an author of this task.',
      )
    },
  },

  Mutation: {
    signup: async (_, args, context, info) => {
      const password = await bcrypt.hash(args.password, 10)
      const user = await context.booben.mutation.createUser({
        data: { ...args, password },
      })

      return {
        token: jwt.sign({ userId: user.id }, APP_SECRET),
        user,
      }
    },
    login: async (_, { email, password }, context, info) => {
      const user = await context.booben.query.user({ where: { email } })
      if (!user) {
        throw new Error(`No user found for email: ${email}`)
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        throw new Error('Invalid password')
      }

      return {
        token: jwt.sign({ userId: user.id }, APP_SECRET),
        user,
      }
    },
    createTask: (_, { text }, context, info) => {
      const userId = getUserId(context)

      if (userId) {
        return context.booben.mutation.createTask(
          {
            data: {
              text,
              author: {
                connect: {
                  id: userId,
                },
              },
            },
          },
          info,
        )
      }
      throw new Error(
        'Invalid permissions, you must be authenticated to create new task.',
      )
      
    },
    updateTask: async (_, { id, text, completed }, context, info) => {
      const userId = getUserId(context)
      const requestingUserIsAuthor = await context.booben.exists.Task({
        id,
        author: {
          id: userId,
        },
      })

      if (requestingUserIsAuthor) {
        return context.booben.mutation.updateTask(
          {
            where: {
              id,
            },
            data: {
              text,
              completed,
            },
          },
          info,
        )
      }

      throw new Error(
        'Invalid permissions, you must be the author of this task to update it.',
      )
    },
    deleteTask: async (_, { id }, context, info) => {
      const userId = getUserId(context)
      const requestingUserIsAuthor = await context.booben.exists.Task({
        id,
        author: {
          id: userId,
        },
      })

      if (requestingUserIsAuthor) {
        return context.booben.mutation.deleteTask(
          {
            where: {
              id,
            },
          },
          info,
        )
      }

      throw new Error(
        'Invalid permissions, you must be the author of this task to delete it.',
      )
    },
  },
  AuthPayload: {
    user: async ({ user: { id } }, args, context, info) => {
      return context.booben.query.user({ where: { id } }, info)
    },
  },
}

const server = new GraphQLServer({
  typeDefs: 'src/schema/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    booben: new Prisma({
      typeDefs: 'src/generated/prisma.graphql',
      endpoint: 'http://localhost:4466',
    }),
  }),
})

const options = {
  tracing: false,
  cacheControl: false
 };

server.start(options, () => console.log('Server is running on localhost:4000'))
