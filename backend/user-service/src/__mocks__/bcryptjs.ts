// Mock implementation of bcryptjs for Jest tests
export const hash = jest.fn((password: string, rounds: number) =>
  Promise.resolve(`$2b$${rounds}$hashed_${password}`)
);

export const compare = jest.fn((password: string, hash: string) =>
  Promise.resolve(password === 'correct-password' || password === 'OldPass123!')
);

export const genSalt = jest.fn((rounds: number) =>
  Promise.resolve(`$2b$${rounds}$saltsaltsaltsaltsalt`)
);

export const hashSync = jest.fn(
  (password: string, rounds: number) => `$2b$${rounds}$hashed_${password}`
);

export const compareSync = jest.fn(
  (password: string, hash: string) => password === 'correct-password' || password === 'OldPass123!'
);

export const genSaltSync = jest.fn((rounds: number) => `$2b$${rounds}$saltsaltsaltsaltsalt`);

export const getRounds = jest.fn(() => 10);
