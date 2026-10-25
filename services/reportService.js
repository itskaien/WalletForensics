const axios = require("axios");
const prisma = require("../src/config/prismaClient");

const ALGORITHM_VERSION = "v1";
const PARSER_VERSION = "enhanced-tx-v1";

function newestSignature(rawTransactions) {
  if (!rawTransactions?.length) return null;
  const newest = [...rawTransactions].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0),
  )[0];
  return newest?.signature ?? null;
}

async function findCachedScan(address, signature) {
  if (!signature) return null;
  return prisma.walletScan.findFirst({
    where: {
      address,
      newestSignature: signature,
      algorithmVersion: ALGORITHM_VERSION,
      parserVersion: PARSER_VERSION,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function generateNarrative(result) {
  if (!process.env.OPENAI_API_KEY) {
    return { status: "AI_DISABLED", text: null };
  }

  const { data } = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write concise wallet-forensics reports. Use ONLY the provided numbers. Do not invent metrics, diagnoses, or market predictions. State clearly when data is unavailable.",
        },
        { role: "user", content: JSON.stringify(result) },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // OpenAI key
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    },
  );

  return { status: "OK", text: data.choices?.[0]?.message?.content ?? null };
}

async function getOrCreateScan({ address, rawTransactions, analyzeFn }) {
  const signature = newestSignature(rawTransactions);
  const cached = await findCachedScan(address, signature);

  if (cached) {
    return {
      ...cached.result,
      reportText: cached.reportText,
      cached: true,
      cachedAt: cached.createdAt.toISOString(),
    };
  }

  const result = await analyzeFn(address, rawTransactions);

  let narrative = { status: "AI_DISABLED", text: null };
  try {
    narrative = await generateNarrative(result);
  } catch (error) {
    narrative = { status: "AI_ERROR", text: null, reason: error.message };
  }

  const row = await prisma.walletScan.create({
    data: {
      address,
      newestSignature: signature,
      algorithmVersion: ALGORITHM_VERSION,
      parserVersion: PARSER_VERSION,
      stats: result.stats,
      grades: result.grades,
      result: result,
      reportText: narrative.text,
    },
  });

  return {
    ...result,
    reportText: narrative.text,
    reportStatus: narrative.status,
    cached: false,
    scanId: row.id,
    scannedAt: row.createdAt.toISOString(),
  };
}

module.exports = { getOrCreateScan };
