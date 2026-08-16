import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './schema/resolvers.js';

export const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphqlEndpoint: '/graphql',
  landingPage: true,
  maskedErrors: false,
  cors: {
    origin: '*',
    credentials: true,
  },
});
