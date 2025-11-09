export function v4() {
  return 'mock-uuid-v4';
}

export function v1() {
  return 'mock-uuid-v1';
}

export function validate(uuid: string) {
  return typeof uuid === 'string' && uuid.length > 0;
}

export default {
  v4,
  v1,
  validate,
};
