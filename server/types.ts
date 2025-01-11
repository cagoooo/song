import type { User } from "@db/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      isAdmin: boolean;
    }
  }
}