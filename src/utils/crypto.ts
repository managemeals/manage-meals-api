import { randomBytes } from "crypto";

export const generatePassword = (length = 32): string => {
    const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

    return Array.from(randomBytes(length))
        .map((byte) => charset[byte % charset.length])
        .join("");
};
