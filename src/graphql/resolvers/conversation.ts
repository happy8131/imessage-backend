import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";
import { ApolloError } from "apollo-server-core";
import { withFilter } from "graphql-subscriptions";
import { ConversationPopulated, GraphQLContext } from "./../../util/types";
const resolvers = {
  Query: {
    conversations: async (
      _: any,
      args: any,
      context: GraphQLContext
    ): Promise<Array<ConversationPopulated>> => {
      console.log("CONVERSATIONS QUERY");
      const { session, prisma } = context;

      if (!session?.user) {
        throw new ApolloError("Not authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversations: any = await prisma.conversation.findMany({
          /**
           * Below has been confirmed to be the correct
           * query by the Prisma team. Has been confirmed
           * that there is an issue on their end
           * Issue seems specific to Mongo
           */
          // where: {
          //   participants: {
          //     some: {
          //       userId: {
          //         equals: userId,
          //       },
          //     },
          //   },
          // },
          include: conversationPopulated,
        });

        return conversations.filter(
          (conversation: { participants: any[] }) =>
            !!conversation.participants.find((p) => p.userId === userId)
        );
      } catch (error: any) {
        console.log("conversations Err", error);
        throw new ApolloError(error?.message);
      }
    },
  },

  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: Array<string> },
      context: GraphQLContext
    ): Promise<{ conversationId: string }> => {
      console.log("INSIDE CREATE CONVERSATION", args);
      const { session, prisma, pubsub } = context;
      const { participantIds } = args;

      if (!session?.user) {
        throw new ApolloError("Not authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        pubsub.publish("CONVERSATION_CREATED", {
          conversationCreated: conversation,
        });

        return {
          conversationId: conversation.id,
        };
      } catch (error) {
        console.log("CreateConversation Err", error);
        throw new ApolloError("Err creating conversation");
      }
    },
  },

  Subscription: {
    conversationCreated: {
      // subscribe: (_: any, __: any, context: GraphQLContext) => {
      //   const { pubsub } = context;
      //   return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
      // },
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
        },
        (
          payload: ConversationCreatedSubscriptionPayload,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }
          const { id: userId } = session.user;
          const {
            conversationCreated: { participants },
          } = payload as any;
          const userIsParticipant = !!participants.find(
            (participant: { userId: string }) => participant.userId === userId
          );
          return userIsParticipant;
        }
      ),
    },
  },
};

export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
}

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export default resolvers;
