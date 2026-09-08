import { prisma } from "@/lib/prisma";

import type { QueryResolvers } from "./../../../types.generated";

export const users: NonNullable<QueryResolvers["users"]> = async () => {
  return await prisma.users.findMany({
    select: { id: true, name: true, age: true, email: true },
  });
};
