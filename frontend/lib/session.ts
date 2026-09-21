import { SessionOptions } from 'iron-session';

export interface SessionData {
  address?: string;
  nonce?: string;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'shree_swap_siwe_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};
