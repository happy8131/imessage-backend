import userResolvers from "./user";
import conversationResolvers from "./conversation";
import merge from "lodash.merge";
import messageResolvers from "./message";
import scalarResolvers from "./scalars";

const resolvers = merge(
  {},
  userResolvers,
  scalarResolvers,
  conversationResolvers,
  messageResolvers
);

export default resolvers;
