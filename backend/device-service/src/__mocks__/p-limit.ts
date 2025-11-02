// Mock for p-limit to avoid ESM issues in Jest
function pLimit(concurrency: number) {
  return async function (fn: () => any) {
    return Promise.resolve(fn());
  };
}

module.exports = pLimit;
module.exports.default = pLimit;
