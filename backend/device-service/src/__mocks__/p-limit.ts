// Mock for p-limit to avoid ESM issues in Jest
function pLimit(concurrency) {
  return async function (fn) {
    return Promise.resolve(fn());
  };
}

module.exports = pLimit;
module.exports.default = pLimit;
