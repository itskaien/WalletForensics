// check

function median(values) {
  const nums = values
    .filter((n) => n != null && Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function utcDay(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function closeTs(position) {
  if (Number.isFinite(position.closeTs)) return position.closeTs;
  const parsed = Date.parse(position.closeDate);
  return Number.isFinite(parsed) ? parsed / 1000 : null;
}

function byCloseTime(a, b) {
  const at = closeTs(a);
  const bt = closeTs(b);
  if (at == null && bt == null) return 0;
  if (at == null) return 1;
  if (bt == null) return -1;
  return at - bt;
}

module.exports = { median, utcDay, closeTs, byCloseTime };
