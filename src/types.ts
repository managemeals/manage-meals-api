export interface JwtEmailPayload {
  email: string;
}

export interface BaseUser {
  uuid: string;
  createdAt: Date;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface User extends BaseUser {
  password: string;
}
