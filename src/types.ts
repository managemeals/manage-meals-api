export interface JwtEmailPayload {
  email: string;
}

export interface User {
  uuid: string;
  createdAt: Date;
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
}
