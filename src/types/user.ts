import { Permission } from "./permissions";

interface User {
  role: string;
  permissions?: Permission[];
} 