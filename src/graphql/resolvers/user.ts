const resolvers = {
  Query: {
    searchUsers: () => {},
  },
  Mutation: {
    createUsername: (_: any, args: { username: string }, context: any) => {
      const { username } = args;
      console.log("log APi", username);
      console.log("HERE IS CONTEXTd", context);
    },
  },
};

export default resolvers;
